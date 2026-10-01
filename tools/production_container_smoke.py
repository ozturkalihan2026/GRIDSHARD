"""CI-only smoke test of the real image against isolated local PG/Redis.

This creates/drops only a uniquely named test database on gridshard_test's
localhost cluster, and removes only the container created by this invocation.
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


def smoke(image):
    url = os.environ["GRIDSHARD_TEST_DATABASE_URL"]
    parsed = urlsplit(url)
    assert parsed.hostname in {"localhost", "127.0.0.1"} and parsed.path == "/gridshard_test"
    database = "gridshard_container_test_" + uuid4().hex
    container = "gridshard-smoke-" + uuid4().hex
    source_url = urlunsplit(parsed._replace(path="/" + database))
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
            (private / "database_url").write_text(source_url)
            (private / "auth_key").write_text(secrets.token_hex(48))
            for item in private.iterdir():
                item.chmod(0o644)  # Disposable fixture mount for the unprivileged container.
            env = {"GRIDSHARD_RUNTIME_MODE": "production", "GRIDSHARD_RUNTIME_DATA_DIR": "/var/lib/gridshard",
                   "DATABASE_URL_FILE": "/run/secrets/database_url", "GRIDSHARD_AUTH_SIGNING_KEY_FILE": "/run/secrets/auth_key",
                   "REDIS_URL": "redis://127.0.0.1:6379/14", "GRIDSHARD_PUBLIC_WEB_URL": "https://gridshard.invalid",
                   "GRIDSHARD_PUBLIC_WS_BASE_URL": "wss://gridshard.invalid", "GRIDSHARD_PURCHASE_TEST_MODE": "0", "GRIDSHARD_AD_TEST_MODE": "0"}
            arguments = ["docker", "run", "--detach", "--name", container, "--network", "host", "--read-only", "--cap-drop", "ALL",
                         "--security-opt", "no-new-privileges:true", "--tmpfs", "/tmp:rw,noexec,nosuid,size=32m",
                         "--mount", f"type=bind,source={runtime},target=/var/lib/gridshard",
                         "--mount", f"type=bind,source={private},target=/run/secrets,readonly"]
            for key, value in env.items():
                arguments.extend(["--env", f"{key}={value}"])
            subprocess.run([*arguments, image], check=True, stdout=subprocess.DEVNULL, timeout=30)
            with httpx.Client(base_url="http://127.0.0.1:8000", timeout=3) as client:
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
                assert client.get(f"/profile/{actor}", headers=headers).status_code == 200
                subprocess.run(["docker", "restart", container], check=True, stdout=subprocess.DEVNULL, timeout=40)
                for _ in range(40):
                    try:
                        if client.get(f"/profile/{actor}", headers=headers).status_code == 200:
                            break
                    except httpx.HTTPError:
                        pass
                    time.sleep(1)
                else:
                    raise RuntimeError("Profile/token did not survive a container restart")
            subprocess.run(["docker", "exec", container, "python", "-c",
                            "from pathlib import Path; import os; assert os.getuid()==10001; assert not Path('/app/server/tests').exists(); assert not Path('/app/server/data/player_data.json').exists(); assert not Path('/app/.env').exists()"], check=True, timeout=10)
    finally:
        subprocess.run(["docker", "rm", "--force", container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=30)
        with psycopg.connect(url, autocommit=True) as admin:
            assert database.startswith("gridshard_container_test_")
            admin.execute(sql.SQL("DROP DATABASE {} WITH (FORCE)").format(sql.Identifier(database)))
    print(json.dumps({"production_container_smoke": "passed"}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True)
    smoke(parser.parse_args().image)
