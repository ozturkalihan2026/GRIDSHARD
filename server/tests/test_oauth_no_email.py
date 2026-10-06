"""Google/Apple ile giriş e-posta istemez ve saklamaz.

Karar: docs/CHILD_AUDIENCE_AUDIT.md (kullanıcı seçimi "A"). Oyuncu,
sağlayıcının verdiği değişmeyen kimlikle tanınır; giriş ve yeni cihazda hesaba
dönüş çalışmaya devam eder. Karardan önce saklanmış e-postalara dokunulmaz.
"""

import json
from urllib.parse import parse_qs, urlsplit

import pytest

from app.platform_services import PlatformService


class Response:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


@pytest.fixture
def platform(tmp_path, monkeypatch):
    for provider in ("GOOGLE", "APPLE"):
        monkeypatch.setenv(f"GRIDSHARD_{provider}_OAUTH_CLIENT_ID", "fixture-client")
        monkeypatch.setenv(f"GRIDSHARD_{provider}_OAUTH_CLIENT_SECRET", "fixture-secret")
        monkeypatch.delenv(f"GRIDSHARD_{provider}_OAUTH_CLIENT_SECRET_FILE", raising=False)
        monkeypatch.setenv(
            f"GRIDSHARD_{provider}_OAUTH_REDIRECT_URI",
            f"https://play.gridshard.test/oauth/{provider.lower()}/callback",
        )
    service = PlatformService(
        tmp_path / "platform.json",
        now_func=lambda: 1000,
        web_base_url="https://play.gridshard.test",
    )
    service.identity = {"sub": "google-subject-1", "email": "cocuk@example.com", "email_verified": True}
    service.http_open = lambda request, timeout: Response(
        {"access_token": "fixture-token"} if request.full_url.endswith("/token") else service.identity
    )
    return service


def sign_in(platform, player_id: str, **kwargs) -> dict:
    started = platform.start_oauth(player_id, "google", **kwargs)
    state = parse_qs(urlsplit(started["authorization_url"]).query)["state"][0]
    return platform.complete_oauth("google", state, "authorization-code")


def test_providers_are_asked_only_for_the_account_identity(platform):
    google = parse_qs(urlsplit(platform.start_oauth("player-a", "google")["authorization_url"]).query)
    apple = parse_qs(urlsplit(platform.start_oauth("player-a", "apple")["authorization_url"]).query)

    assert google["scope"] == ["openid"]
    assert "scope" not in apple
    assert apple["response_mode"] == ["form_post"] and apple["nonce"][0]


def test_a_new_link_keeps_only_the_provider_identity(platform):
    result = sign_in(platform, "player-a")

    assert result == {"provider": "google", "player_id": "player-a", "linked": True}
    stored = platform._read()
    assert stored["accounts"]["player-a"]["oauth_links"]["google"] == {
        "subject": "google-subject-1", "linked_at": 1000,
    }
    # Sağlayıcı e-postayı yine de gönderdi; hiçbir yere yazılmadı.
    assert "cocuk@example.com" not in json.dumps(stored)
    view = platform.account_view("player-a")
    assert view["oauth"]["google"]["linked"] is True and view["contacts"] == {}
    assert platform.export_data("player-a")["account"]["contacts"] == {}


def test_sign_in_works_when_the_provider_sends_no_email(platform):
    platform.identity = {"sub": "google-subject-2"}

    assert sign_in(platform, "player-b")["linked"] is True
    assert platform.account_view("player-b")["oauth"]["google"]["linked"] is True


def test_the_same_provider_account_returns_to_its_profile_on_a_new_device(platform):
    sign_in(platform, "player-a")

    # Yeni cihazdaki misafir profil aynı Google hesabıyla giriş yapar.
    result = sign_in(platform, "new-device-guest", mode="login", code_challenge="a" * 43)

    assert result["player_id"] == "player-a" and result["exchange"]
    assert "google" not in platform._read()["accounts"]["new-device-guest"]["oauth_links"]


def test_a_link_made_before_the_decision_keeps_its_stored_email(platform):
    with platform._lock:
        data = platform._read()
        account = platform._account(data, "veteran")
        account["oauth_links"]["google"] = {
            "subject": "google-subject-1", "email": "eski@example.com", "linked_at": 500,
        }
        account["contacts"]["email"] = {"value": "eski@example.com", "verified_at": 500}
        platform._write(data)

    assert sign_in(platform, "veteran")["linked"] is True

    account = platform._read()["accounts"]["veteran"]
    assert account["oauth_links"]["google"] == {
        "subject": "google-subject-1", "email": "eski@example.com", "linked_at": 1000,
    }
    assert account["contacts"]["email"] == {"value": "eski@example.com", "verified_at": 500}
    # Eski doğrulanmış adresle kurtarma çalışmaya devam eder.
    assert platform.request_recovery("eski@example.com")["accepted"] is True


def test_linking_a_different_provider_account_does_not_carry_the_old_email(platform):
    with platform._lock:
        data = platform._read()
        platform._account(data, "veteran")["oauth_links"]["google"] = {
            "subject": "old-subject", "email": "eski@example.com", "linked_at": 500,
        }
        platform._write(data)

    sign_in(platform, "veteran")

    assert platform._read()["accounts"]["veteran"]["oauth_links"]["google"] == {
        "subject": "google-subject-1", "linked_at": 1000,
    }
