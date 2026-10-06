"""Çocuk hedef kitle kararı: yeni e-posta/telefon bağlanmaz, eski kurtarma çalışır.

Karar ve gerekçe: docs/CHILD_AUDIENCE_AUDIT.md. Oyuncunun yaşı sorulmadığı
için sunucu yeni iletişim bilgisi almaz; daha önce doğrulanmış bilgiyle hesap
kurtarma yerinde durur.
"""

import pytest
from fastapi import HTTPException

from app import main as gateway
from app.platform_services import PlatformService


PLAYER = "contact-closed-player"


@pytest.fixture
def platform(tmp_path, monkeypatch):
    service = PlatformService(
        tmp_path / "platform.json",
        now_func=lambda: 1000,
        expose_codes=True,
        web_base_url="https://play.gridshard.test",
    )
    monkeypatch.setattr(gateway, "platform_service", service)
    return service


@pytest.mark.parametrize("channel, destination", [
    ("email", "cocuk@example.com"),
    ("phone", "+905551112233"),
])
def test_new_contact_request_is_rejected_before_anything_is_stored(platform, channel, destination):
    with pytest.raises(HTTPException) as rejected:
        gateway.request_account_verification(PLAYER, gateway.ContactVerificationRequest(
            player_id=PLAYER, channel=channel, destination=destination,
        ))
    assert rejected.value.status_code == 422
    assert rejected.value.detail == gateway.CONTACT_BINDING_CLOSED_MESSAGE

    stored = platform._read()
    assert destination not in str(stored)
    assert platform.account_view(PLAYER)["contacts"] == {}


def test_a_code_requested_before_the_decision_cannot_create_a_binding(platform):
    # Karardan önce istenmiş, süresi dolmamış bir doğrulama kodu.
    pending = platform.request_verification(PLAYER, "email", "eski@example.com")

    with pytest.raises(HTTPException) as rejected:
        gateway.confirm_account_verification(PLAYER, gateway.ContactVerificationConfirmRequest(
            player_id=PLAYER, channel="email", code=pending["development_code"],
        ))
    assert rejected.value.status_code == 422
    assert platform.account_view(PLAYER)["contacts"] == {}


def test_another_players_request_is_still_forbidden_first(platform):
    with pytest.raises(HTTPException) as rejected:
        gateway.request_account_verification(PLAYER, gateway.ContactVerificationRequest(
            player_id="someone-else", channel="email", destination="a@example.com",
        ))
    assert rejected.value.status_code == 403


def test_recovery_with_an_already_verified_contact_still_works(platform):
    # Karardan önce bağlanmış hesap: doğrulanmış e-posta kayıtlıdır.
    earlier = platform.request_verification(PLAYER, "email", "bagli@example.com")
    platform.confirm_verification(PLAYER, "email", earlier["development_code"])

    recovery = gateway.request_account_recovery(gateway.RecoveryRequest(identifier="bagli@example.com"))
    assert recovery["accepted"] is True
    assert recovery["development_player_id"] == PLAYER
    assert platform.confirm_recovery(PLAYER, recovery["development_code"]) is True
