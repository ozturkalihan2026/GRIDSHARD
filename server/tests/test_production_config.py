import pytest

from app.production_config import environment_secret, production_endpoints


def test_secret_file_is_bounded_and_never_falls_back(tmp_path):
    path = tmp_path / "secret"
    path.write_text("  " + "x" * 48 + "\n", encoding="utf-8")
    assert environment_secret("KEY", {"KEY_FILE": str(path)}) == "x" * 48
    for invalid in ({"KEY": "inline", "KEY_FILE": str(path)}, {"KEY_FILE": "relative"}, {"KEY_FILE": str(tmp_path / "absent")}):
        with pytest.raises(RuntimeError):
            environment_secret("KEY", invalid)
    path.write_bytes(b"x" * 8193)
    with pytest.raises(RuntimeError):
        environment_secret("KEY", {"KEY_FILE": str(path)})


@pytest.mark.parametrize("web,ws,cors", [
    ("http://example.com", "wss://example.com", ""),
    ("https://example.com", "ws://example.com", ""),
    ("https://example.com", "wss://other.com", ""),
    ("https://name:password@example.com", "wss://example.com", ""),
    ("https://example.com/path", "wss://example.com", ""),
    ("https://example.com", "wss://example.com?token=secret", ""),
    ("https://example.com", "wss://example.com", "*"),
    ("", "", ""),
])
def test_production_rejects_insecure_or_ambiguous_endpoints(web, ws, cors):
    with pytest.raises(RuntimeError):
        production_endpoints({"GRIDSHARD_PUBLIC_WEB_URL": web, "GRIDSHARD_PUBLIC_WS_BASE_URL": ws, "GRIDSHARD_CORS_ORIGINS": cors})


def test_explicit_public_and_native_origins():
    assert production_endpoints({"GRIDSHARD_PUBLIC_WEB_URL": "https://example.com/", "GRIDSHARD_PUBLIC_WS_BASE_URL": "wss://example.com", "GRIDSHARD_CORS_ORIGINS": "capacitor://localhost,https://localhost,https://example.com"}) == ("https://example.com", "wss://example.com", "example.com")
