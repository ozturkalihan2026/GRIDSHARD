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
