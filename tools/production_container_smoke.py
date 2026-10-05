"""CI-only smoke test of the real image against isolated local PG/Redis.

This creates/drops only uniquely named test databases on gridshard_test's
localhost cluster, and removes only containers created by this invocation.
It neither publishes the image nor deploys a real server/domain.
"""
import argparse
from contextlib import ExitStack
import json
import os
from pathlib import Path
import secrets
import subprocess
import tempfile
import time
from urllib.parse import urlsplit, urlunsplit
from uuid import uuid4

import httpx
import psycopg
from psycopg import sql


def _base_url(container, network):
    port = 8000
    if network != "host":
        binding = subprocess.check_output(["docker", "port", container, "8000/tcp"], text=True, timeout=10).strip()
        port = int(binding.rsplit(":", 1)[1])
    return f"http://127.0.0.1:{port}"


def _wait_profile(client, actor, headers):
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        try:
            response = client.get(f"/profile/{actor}", headers=headers)
            if response.status_code == 200:
                return response.json()
        except httpx.HTTPError:
            pass
        time.sleep(1)
    raise RuntimeError("Profile/token did not survive the container restart or restore")


def _assert_profile_preserved(before, after):
    for key in ("player_id", "display_name", "display_name_changes", "display_name_changes_remaining", "rating", "level", "experience", "cosmetics", "preferred_battle_pool_ids"):
        assert after[key] == before[key], f"Profile field changed after restart/restore: {key}"
    assert after["engagement"]["season_xp"] == before["engagement"]["season_xp"]


def _assert_review_access(client, actor, headers):
    response = client.get(f"/profile/{actor}", headers=headers)
    assert response.status_code == 200
    profile = response.json()
    assert profile["engagement"]["premium_pass"]["active"]
    assert all(item["unlocked"] for item in profile["engagement"]["premium_reward_track"])
    assert profile["engagement"]["flux_shards"] >= 1050
    assert profile["meta_progression_summary"]["circuit_credits"] >= 9000
    store = client.get(f"/store/{actor}", headers=headers)
    assert store.status_code == 200 and store.json()["battle_premium"]["active"]
    return profile


def _restore_drill(image, maintenance_image, network, root, private, arguments, container,
                   url, container_database, databases, cleanup, actor, headers, before, review_session=None):
    subprocess.run(["docker", "stop", container], check=True, stdout=subprocess.DEVNULL, timeout=40)
    backups = root / "backups"
    backups.mkdir(mode=0o777)
    backups.chmod(0o777)
    common = ["docker", "run", "--rm", "--network", network, "--read-only", "--cap-drop", "ALL",
              "--security-opt", "no-new-privileges:true", "--tmpfs", "/tmp:rw,noexec,nosuid,size=32m",
              "--mount", f"type=bind,source={private},target=/run/secrets,readonly",
              "--mount", f"type=bind,source={backups},target=/backups",
              "--env", "DATABASE_URL_FILE=/run/secrets/database_url"]
    subprocess.run([*common, maintenance_image, "backup", "--directory", "/backups/drill"],
                   check=True, stdout=subprocess.DEVNULL, timeout=120)
    metadata = json.loads((backups / "drill" / "backup.json").read_text())
    target = "gridshard_container_test_" + uuid4().hex
    with psycopg.connect(url, autocommit=True) as admin:
        admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(target)))
    databases.append(target)
    (private / "database_url").write_text(urlunsplit(container_database._replace(path="/" + target)))
    restored_runtime = root / "restored-runtime"
    restored_runtime.mkdir(mode=0o777)
    restored_runtime.chmod(0o777)
    subprocess.run([*common, "--mount", f"type=bind,source={restored_runtime},target=/var/lib/gridshard",
                    maintenance_image, "restore", "--directory", "/backups/drill", "--runtime-dir", "/var/lib/gridshard",
                    "--confirm-installation-id", metadata["installation_id"]],
                   check=True, stdout=subprocess.DEVNULL, timeout=120)
    restored_container = "gridshard-smoke-restore-" + uuid4().hex
    cleanup.callback(subprocess.run, ["docker", "rm", "--force", restored_container],
                     stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)
    restored_arguments = list(arguments)
    restored_arguments[restored_arguments.index(container)] = restored_container
    runtime_mount = next(item for item in restored_arguments if item.startswith("type=bind,") and "target=/var/lib/gridshard" in item)
    restored_arguments[restored_arguments.index(runtime_mount)] = f"type=bind,source={restored_runtime},target=/var/lib/gridshard"
    subprocess.run([*restored_arguments, image], check=True, stdout=subprocess.DEVNULL, timeout=30)
    with httpx.Client(base_url=_base_url(restored_container, network), timeout=3) as client:
        _assert_profile_preserved(before, _wait_profile(client, actor, headers))
        if review_session:
            _wait_profile(client, *review_session)
            _assert_review_access(client, *review_session)


def smoke(image, network="host", maintenance_image=None, soak_seconds=0, admob_signature_only=False, play_review=False):
    url = os.environ["GRIDSHARD_TEST_DATABASE_URL"]
    parsed = urlsplit(url)
    assert parsed.hostname in {"localhost", "127.0.0.1"} and parsed.path == "/gridshard_test"
    database = "gridshard_container_test_" + uuid4().hex
    databases = [database]
    container = "gridshard-smoke-" + uuid4().hex
    container_database = urlsplit(os.environ.get("GRIDSHARD_SMOKE_CONTAINER_DATABASE_URL", url))
    if container_database.path != "/gridshard_test":
        raise ValueError("Container smoke requires a dedicated gridshard_test cluster")
    container_source_url = urlunsplit(container_database._replace(path="/" + database))
    with psycopg.connect(url, autocommit=True) as admin:
        admin.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database)))
    try:
        with ExitStack() as cleanup:
            directory = cleanup.enter_context(tempfile.TemporaryDirectory(prefix="gridshard-container-smoke-"))
            # LIFO: remove our container before deleting its mounted files.
            cleanup.callback(subprocess.run, ["docker", "rm", "--force", container],
                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)
            root = Path(directory)
            root.chmod(0o755)
            runtime = root / "runtime"
            runtime.mkdir(mode=0o777)
            runtime.chmod(0o777)  # Disposable fixture only; production uses volume owner 10001.
            private = root / "private"
            private.mkdir(mode=0o755)
            (private / "database_url").write_text(container_source_url)
            (private / "auth_key").write_text(secrets.token_hex(48))
            review_session = None
            if play_review:
                from server.app.review_access import new_review_config
                review_config, review_password = new_review_config()
                (private / "play_review_config").write_text(json.dumps(review_config))
            for item in private.iterdir():
                item.chmod(0o644)  # Disposable fixture mount for the unprivileged container.
            env = {"GRIDSHARD_RUNTIME_MODE": "production", "GRIDSHARD_RUNTIME_DATA_DIR": "/var/lib/gridshard",
                   "DATABASE_URL_FILE": "/run/secrets/database_url", "GRIDSHARD_AUTH_SIGNING_KEY_FILE": "/run/secrets/auth_key",
                   "REDIS_URL": os.environ.get("GRIDSHARD_SMOKE_CONTAINER_REDIS_URL", "redis://127.0.0.1:6379/14"), "GRIDSHARD_PUBLIC_WEB_URL": "https://gridshard.invalid",
                   "GRIDSHARD_PUBLIC_WS_BASE_URL": "wss://gridshard.invalid", "GRIDSHARD_PURCHASE_TEST_MODE": "0", "GRIDSHARD_AD_TEST_MODE": "0"}
            if play_review:
                env["GRIDSHARD_PLAY_REVIEW_CONFIG_FILE"] = "/run/secrets/play_review_config"
            if admob_signature_only:
                env.update({"GRIDSHARD_ADMOB_SSV_ENABLED":"1", "GRIDSHARD_ADMOB_ROLLOUT_MODE":"disabled",
                            "GRIDSHARD_ADMOB_TEST_PLAYER_IDS":"",
                            "GRIDSHARD_ADMOB_REWARDED_AD_UNIT_ANDROID":"ca-app-pub-4974825529326987/6776291719",
                            "GRIDSHARD_ADMOB_REWARDED_AD_UNIT_IOS":""})
            arguments = ["docker", "run", "--detach", "--name", container, "--network", network, "--read-only", "--cap-drop", "ALL",
                         "--security-opt", "no-new-privileges:true", "--tmpfs", "/tmp:rw,noexec,nosuid,size=32m",
                         "--mount", f"type=bind,source={runtime},target=/var/lib/gridshard",
                         "--mount", f"type=bind,source={private},target=/run/secrets,readonly"]
            if network != "host":
                arguments.extend(["--publish", "127.0.0.1::8000"])
            for key, value in env.items():
                arguments.extend(["--env", f"{key}={value}"])
            subprocess.run([*arguments, image], check=True, stdout=subprocess.DEVNULL, timeout=30)
            with httpx.Client(base_url=_base_url(container, network), timeout=3) as client:
                for _ in range(60):
                    try:
                        if client.get("/health").status_code == 200:
                            break
                    except httpx.HTTPError:
                        pass
                    time.sleep(1)
                else:
                    raise RuntimeError("Production container did not become ready")
                assert client.get("/").status_code == 200
                assert client.get("/health", headers={"Host": "wrong.invalid"}).status_code == 400
                actor = "container-" + uuid4().hex
                assert client.get(f"/store/{actor}").status_code == 401
                auth = client.post("/auth/session", json={"player_id": actor, "device_secret": secrets.token_hex(32), "platform": "android"})
                assert auth.status_code == 200, "First account creation failed"
                headers = {"Authorization": "Bearer " + auth.json()["access_token"]}
                assert client.get(f"/store/{actor}", headers=headers).status_code == 200
                if admob_signature_only:
                    for query in ("", "?ad_protocol=child-safe-v1&ad_platform=android"):
                        providers=client.get(f"/store/{actor}{query}", headers=headers).json()["providers"]
                        assert providers["ad_platforms"] == {"admob":False}
                        assert providers["ad_units"] == {} and providers["ad_policy"] is None
                    assert client.get("/ads/admob/ssv?user_id=non-player-probe&signature=invalid").status_code == 403
                before = _wait_profile(client, actor, headers)
                assert before["display_name_changes_remaining"] == 1
                name = "Test-" + uuid4().hex[:12]
                renamed = client.put(f"/profile/{actor}/display-name", headers=headers, json={"display_name":name})
                assert renamed.status_code == 200
                before = renamed.json()
                assert before["display_name_changes_remaining"] == 0
                assert client.put(f"/profile/{actor}/display-name", headers=headers, json={"display_name":name}).status_code == 200
                assert client.put(f"/profile/{actor}/display-name", headers=headers, json={"display_name":name+"2"}).status_code == 409
                if play_review:
                    for index in range(2):
                        signed = client.post("/auth/review-session", json={
                            "username": review_config["username"], "password": review_password,
                            "device_id": f"isolated-review-{index}", "device_secret": secrets.token_hex(32)})
                        assert signed.status_code == 200 and signed.headers["Cache-Control"] == "no-store"
                        result = signed.json()
                        assert result["player_id"] == review_config["player_id"] and result["review_access"]
                        review_headers = {"Authorization": "Bearer " + result["access_token"]}
                        _assert_review_access(client, result["player_id"], review_headers)
                    review_session = (result["player_id"], review_headers)
                    _assert_profile_preserved(before, _wait_profile(client, actor, headers))
                    assert client.put(f"/profile/{actor}/display-name", headers=review_headers,
                                      json={"display_name": "forbidden"}).status_code == 403
                    rejected = client.post("/auth/review-session", json={
                        "username": review_config["username"], "password": "incorrect-fixture-password",
                        "device_id": "denied", "device_secret": secrets.token_hex(32)})
                    assert rejected.status_code == 401
                    print("Private fixture review sign-in/premium/two devices/ordinary-profile preservation passed", flush=True)
                if soak_seconds:
                    assert 0 < soak_seconds <= 3600
                    deadline = time.monotonic() + soak_seconds
                    checks = 0
                    while time.monotonic() < deadline:
                        health = client.get("/health")
                        assert health.status_code == 200 and health.json()["runtime"]["redis"]["worker_lease_ready"]
                        assert client.get(f"/profile/{actor}", headers=headers).status_code == 200
                        checks += 1
                        if checks % 3 == 0:
                            print(f"Isolated production lease/profile soak: {checks} successful checks", flush=True)
                        time.sleep(min(10, max(0, deadline - time.monotonic())))
                subprocess.run(["docker", "restart", container], check=True, stdout=subprocess.DEVNULL, timeout=40)
                # Docker Desktop can assign a new random host port on restart.
                with httpx.Client(base_url=_base_url(container, network), timeout=3) as restarted_client:
                    _assert_profile_preserved(before, _wait_profile(restarted_client, actor, headers))
                    if review_session:
                        _wait_profile(restarted_client, *review_session)
                        _assert_review_access(restarted_client, *review_session)
            subprocess.run(["docker", "exec", container, "python", "-c",
                            "from pathlib import Path; import os; assert os.getuid()==10001; assert not Path('/app/server/tests').exists(); assert not Path('/app/server/data/player_data.json').exists(); assert not Path('/app/.env').exists()"], check=True, timeout=10)
            if maintenance_image:
                _restore_drill(image, maintenance_image, network, root, private, arguments, container,
                               url, container_database, databases, cleanup, actor, headers, before, review_session)
    finally:
        subprocess.run(["docker", "rm", "--force", container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)
        with psycopg.connect(url, autocommit=True) as admin:
            for name in databases:
                assert name.startswith("gridshard_container_test_")
                admin.execute(sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(name)))
    print(json.dumps({"production_container_smoke": "passed", "image_backup_restore": "passed" if maintenance_image else "not_requested"}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    parser.add_argument("--network", default="host", help="Isolated Docker bridge for Desktop; publishes a random localhost API port")
    parser.add_argument("--maintenance-image", help="Also back up the stopped image and restore its profile/token into a new empty database/runtime")
    parser.add_argument("--soak-seconds", type=int, default=0, help="Bounded health/lease soak on the disposable test image only")
    parser.add_argument("--admob-signature-only", action="store_true", help="Enable signature verification while asserting ads/units remain hidden for both legacy and new clients")
    parser.add_argument("--play-review", action="store_true", help="Verify reviewer access with random disposable fixture credentials, including restart/restore")
    args = parser.parse_args()
    smoke(args.image, args.network, args.maintenance_image, args.soak_seconds, args.admob_signature_only, args.play_review)
