"""Static package/deployment contracts; NOT a substitute for Docker/TLS tests."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_runtime_image_has_an_allowlist_and_unprivileged_single_worker():
    source = (ROOT / "Dockerfile").read_text()
    assert "COPY server /app/server" not in source
    assert "COPY docs" not in source
    assert "COPY server/app /app/server/app" in source
    assert "COPY server/migrations" in source
    assert "COPY server/json_migrations" in source
    assert "USER 10001:10001" in source
    assert '"--workers", "1"' in source
    assert '"--no-access-log"' in source
    assert '"--no-proxy-headers"' in source
    assert "COPY tools/build-client.js tools/mobile-network-policy.js ./tools/" in source


def test_production_file_does_not_expose_database_or_api_or_inline_secrets():
    source = (ROOT / "docker-compose.production.yml").read_text()
    assert source.count("ports:") == 1
    assert "8000:8000" not in source and "5432:5432" not in source and "6379:6379" not in source
    assert "gridshard-local-only" not in source
    assert "DATABASE_URL_FILE" in source and "GRIDSHARD_AUTH_SIGNING_KEY_FILE" in source
    assert "POSTGRES_PASSWORD_FILE" in source
    assert "internal: true" in source and "read_only: true" in source
    assert "GRIDSHARD_RUNTIME_MODE: production" in source
    assert "./server/data" not in source
    assert "GRIDSHARD_SECRETS_DIR:?" in source


def test_proxy_uses_tls_and_does_not_log_session_token_urls():
    source = (ROOT / "deploy" / "Caddyfile").read_text()
    assert "reverse_proxy relay-web:8000" in source
    assert "health_uri /health" in source
    assert "Strict-Transport-Security" in source
    assert not any(line.strip().startswith("log") for line in source.splitlines())


def test_cloudflare_origin_overlay_replaces_ports_and_mounts_external_tls_secrets():
    source = (ROOT / "docker-compose.cloudflare.yml").read_text()
    assert "ports: !override ['443:443']" in source
    assert "./deploy/Caddyfile.cloudflare:/etc/caddy/Caddyfile:ro" in source
    assert "secrets: [origin_certificate, origin_private_key]" in source
    assert source.count("GRIDSHARD_ORIGIN_TLS_DIR:?") == 2
    assert "8000:8000" not in source and "5432:5432" not in source and "6379:6379" not in source
    assert "BEGIN PRIVATE KEY" not in source


def test_cloudflare_proxy_uses_mounted_certificates_without_http_or_access_logs():
    source = (ROOT / "deploy" / "Caddyfile.cloudflare").read_text()
    assert "auto_https disable_redirects" in source
    assert "https://{$GRIDSHARD_HOST}" in source
    assert "tls /run/secrets/origin_certificate /run/secrets/origin_private_key" in source
    assert "reverse_proxy relay-web:8000" in source
    assert "health_uri /health" in source
    assert "Strict-Transport-Security" in source
    assert not any(line.strip().startswith("log") for line in source.splitlines())


def test_tmpfs_options_are_one_yaml_scalar_not_multiple_mount_paths():
    import yaml

    services = yaml.safe_load((ROOT / "docker-compose.production.yml").read_text())["services"]
    for name in ("relay-web", "maintenance"):
        assert services[name]["tmpfs"] == ["/tmp:rw,noexec,nosuid,size=32m"]


def test_backup_tool_is_an_explicit_offline_unprivileged_profile():
    compose = (ROOT / "docker-compose.production.yml").read_text()
    source = (ROOT / "deploy" / "Dockerfile.maintenance").read_text()
    assert "profiles: [maintenance]" in compose
    assert "GRIDSHARD_BACKUPS_DIR:?" in compose
    assert "FROM postgres:17-bookworm" in source
    assert "USER 10001:10001" in source
    assert '"/app/tools/server_backup.py"' in source
    assert "COPY server/app" in source and "COPY server/migrations" in source
    assert "COPY server/data" not in source and "COPY . " not in source


def test_optional_oauth_overlays_keep_credentials_in_external_secret_files():
    import yaml
    google = yaml.safe_load((ROOT / "docker-compose.oauth-google.yml").read_text())
    apple = yaml.safe_load((ROOT / "docker-compose.oauth-apple.yml").read_text())
    for overlay, secret in ((google,"google_oauth_client_secret"),(apple,"apple_oauth_private_key")):
        assert set(overlay["services"]) == {"relay-web"}
        assert overlay["services"]["relay-web"]["secrets"] == [secret]
        assert overlay["secrets"][secret]["file"].startswith("${GRIDSHARD_SECRETS_DIR:?")
        assert "ports" not in overlay["services"]["relay-web"]
    g = google["services"]["relay-web"]["environment"]
    a = apple["services"]["relay-web"]["environment"]
    assert g["GRIDSHARD_GOOGLE_OAUTH_CLIENT_SECRET_FILE"] == "/run/secrets/google_oauth_client_secret"
    assert "GRIDSHARD_GOOGLE_OAUTH_CLIENT_SECRET" not in g
    assert a["GRIDSHARD_APPLE_OAUTH_PRIVATE_KEY_FILE"] == "/run/secrets/apple_oauth_private_key"
    assert "GRIDSHARD_APPLE_OAUTH_CLIENT_SECRET" not in a
    for provider, env in (("GOOGLE",g),("APPLE",a)):
        assert env[f"GRIDSHARD_{provider}_OAUTH_REDIRECT_URI"].endswith(f"/oauth/{provider.lower()}/callback")


def test_web_builder_uses_only_its_exact_locked_tool_not_mobile_sdk():
    import json
    docker = (ROOT / "Dockerfile").read_text()
    manifest = json.loads((ROOT / "tools/web-build/package.json").read_text())
    app_manifest = json.loads((ROOT / "package.json").read_text())
    assert manifest["dependencies"] == {"esbuild": app_manifest["devDependencies"]["esbuild"]}
    assert "COPY tools/web-build/package.json tools/web-build/pnpm-lock.yaml ./" in docker
    assert "pnpm install --frozen-lockfile --ignore-scripts" in docker
    assert "RUN node tools/build-client.js" in docker
    assert "COPY package.json pnpm-lock.yaml" not in docker
    lock = (ROOT / "tools/web-build/pnpm-lock.yaml").read_text()
    assert "esbuild@0.28.2" in lock and "integrity: sha512-" in lock
    assert "@capacitor" not in lock and "minimumReleaseAge" not in docker


def test_play_games_secret_overlay_and_image_boundary():
    import yaml
    overlay = yaml.safe_load((ROOT / "docker-compose.play-games.yml").read_text())
    service = overlay["services"]["relay-web"]
    assert set(overlay["services"]) == {"relay-web"}
    assert service["secrets"] == ["play_games_client_secret"]
    assert service["environment"]["GRIDSHARD_PLAY_GAMES_CLIENT_SECRET_FILE"] == "/run/secrets/play_games_client_secret"
    assert "GRIDSHARD_PLAY_GAMES_CLIENT_SECRET" not in service["environment"]
    assert overlay["secrets"]["play_games_client_secret"]["file"].startswith("${GRIDSHARD_SECRETS_DIR:?")
    assert "ports" not in service
    ignored = (ROOT / ".dockerignore").read_text()
    assert "**/play_games_client_secret" in ignored and "**/client_secret*.json" in ignored
