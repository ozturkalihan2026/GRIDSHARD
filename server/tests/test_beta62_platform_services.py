from pathlib import Path
import json

import pytest

from app.auth import AuthenticationError, JsonIdentityRepository, ParticipantAuthService
from app.platform_services import PlatformService, PlatformServiceError


def service(tmp_path: Path, *, now: int = 1000) -> PlatformService:
    return PlatformService(
        tmp_path / "platform.json",
        now_func=lambda: now,
        expose_codes=True,
        web_base_url="https://play.gridshard.test",
    )


def test_contact_verification_is_expiring_and_never_exposes_contact_in_view(tmp_path):
    platform = service(tmp_path)
    requested = platform.request_verification("player-a", "email", "a@example.com")
    confirmed = platform.confirm_verification(
        "player-a", "email", requested["development_code"]
    )
    view = platform.account_view("player-a")

    assert confirmed["verified"] is True
    assert view["contacts"]["email"]["masked"] == "a***@example.com"
    assert "value" not in view["contacts"]["email"]


def test_devices_revoke_all_associated_token_ids(tmp_path):
    platform = service(tmp_path)
    platform.register_device("player-a", "device-1", "Chrome", "web", "jti-1", 2000)
    platform.register_device("player-a", "device-1", "Chrome", "web", "jti-2", 2000)

    platform.revoke_device("player-a", "device-1")

    assert platform.token_is_revoked("player-a", "jti-1") is True
    assert platform.token_is_revoked("player-a", "jti-2") is True
    assert platform.account_view("player-a")["devices"] == []


def test_invite_dm_block_report_export_and_erasure_are_durable(tmp_path):
    platform = service(tmp_path)
    invite = platform.create_invite("player-a")
    accepted = platform.accept_invite("player-b", invite["code"])
    message = platform.send_message("player-a", "player-b", "Merhaba")
    report = platform.report("player-b", "player-a", "spam", "tekrar ediyor")
    blocked = platform.set_block("player-b", "player-a", True)
    exported = platform.export_data("player-b")

    assert accepted["inviter_id"] == "player-a"
    assert message in platform.messages("player-b", "player-a")
    assert report["status"] == "queued"
    assert blocked == ["player-a"]
    assert exported["messages"]

    platform.erase("player-b")
    assert platform.messages("player-a", "player-b") == []
    assert platform.account_view("player-b")["devices"] == []


def test_oauth_adapter_does_not_fake_an_unconfigured_provider(tmp_path, monkeypatch):
    for key in (
        "GRIDSHARD_GOOGLE_OAUTH_CLIENT_ID",
        "GRIDSHARD_GOOGLE_OAUTH_AUTHORIZE_URL",
        "GRIDSHARD_GOOGLE_OAUTH_REDIRECT_URI",
    ):
        monkeypatch.delenv(key, raising=False)
    platform = service(tmp_path)

    result = platform.start_oauth("player-a", "google")

    assert result == {
        "provider": "google", "configured": False, "authorization_url": None
    }


def test_google_oauth_callback_exchanges_code_and_links_verified_email(tmp_path, monkeypatch):
    monkeypatch.setenv("GRIDSHARD_GOOGLE_OAUTH_CLIENT_ID", "client-id")
    monkeypatch.setenv("GRIDSHARD_GOOGLE_OAUTH_CLIENT_SECRET", "client-secret")
    monkeypatch.setenv(
        "GRIDSHARD_GOOGLE_OAUTH_REDIRECT_URI",
        "https://play.gridshard.test/oauth/google/callback",
    )
    calls = []

    class Response:
        def __init__(self, payload):
            self.payload = payload

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def read(self):
            return json.dumps(self.payload).encode("utf-8")

    def fake_open(request, timeout):
        calls.append((request, timeout))
        if request.full_url.endswith("/token"):
            return Response({"access_token": "google-access-token"})
        return Response({
            "sub": "google-subject-1",
            "email": "pilot@example.com",
            "email_verified": True,
        })

    platform = PlatformService(
        tmp_path / "platform.json",
        now_func=lambda: 1000,
        expose_codes=True,
        web_base_url="https://play.gridshard.test",
        http_open=fake_open,
    )
    started = platform.start_oauth("player-a", "google")
    state = started["authorization_url"].split("state=", 1)[1].split("&", 1)[0]
    result = platform.complete_oauth("google", state, "authorization-code")

    assert result == {"provider": "google", "player_id": "player-a", "linked": True}
    view = platform.account_view("player-a")
    assert view["oauth"]["google"]["linked"] is True
    assert view["contacts"]["email"]["masked"] == "pi***@example.com"
    assert len(calls) == 2


def test_smtp_provider_delivers_the_verification_code(tmp_path, monkeypatch):
    monkeypatch.setenv("GRIDSHARD_EMAIL_PROVIDER", "smtp")
    monkeypatch.setenv("GRIDSHARD_SMTP_HOST", "smtp.example.test")
    monkeypatch.setenv("GRIDSHARD_SMTP_PORT", "587")
    monkeypatch.setenv("GRIDSHARD_SMTP_USERNAME", "sender@example.test")
    monkeypatch.setenv("GRIDSHARD_SMTP_PASSWORD", "app-password")
    monkeypatch.setenv("GRIDSHARD_SMTP_FROM", "sender@example.test")
    sent = []

    class FakeSmtp:
        def __init__(self, host, port, timeout):
            assert (host, port, timeout) == ("smtp.example.test", 587, 12)

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return False

        def ehlo(self):
            return None

        def starttls(self, context):
            assert context is not None

        def login(self, username, password):
            assert (username, password) == ("sender@example.test", "app-password")

        def send_message(self, message):
            sent.append(message)

    monkeypatch.setattr("app.platform_services.smtplib.SMTP", FakeSmtp)
    result = service(tmp_path).request_verification(
        "player-a", "email", "pilot@example.com"
    )

    assert result["delivery_configured"] is True
    assert sent[0]["To"] == "pilot@example.com"
    assert result["development_code"] in sent[0].get_content()


def test_account_recovery_rotates_the_device_secret(tmp_path):
    platform = service(tmp_path)
    identity = ParticipantAuthService(
        JsonIdentityRepository(tmp_path / "identity.json"),
        b"x" * 48,
    )
    identity.register_or_login("player-a", "old-secret-" * 4)
    verification = platform.request_verification(
        "player-a", "email", "recover@example.com"
    )
    platform.confirm_verification(
        "player-a", "email", verification["development_code"]
    )
    recovery = platform.request_recovery("recover@example.com")
    platform.confirm_recovery("player-a", recovery["development_code"])
    identity.reset_device_secret("player-a", "new-secret-" * 4)

    with pytest.raises(AuthenticationError):
        identity.register_or_login("player-a", "old-secret-" * 4)
    assert identity.register_or_login("player-a", "new-secret-" * 4)["access_token"]
