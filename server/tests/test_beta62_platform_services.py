from pathlib import Path

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
