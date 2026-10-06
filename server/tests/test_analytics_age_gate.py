"""Ürün analitiği yaş sorusu: izin kapalı gelir, açmak isteyene doğum yılı sorulur.

Karar sunucudadır; doğum yılı saklanmaz, hesapta yalnız sonuç ve sorunun
sorulduğu yıl kalır (server/app/player_settings.py).
"""

from datetime import datetime, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app import main as gateway
from app.player_data_store import InMemoryPlayerDataRepository, PlayerDataStoreService
from app.player_profile import PlayerProfileService
from app.player_settings import (
    ANALYTICS_AGE_REQUIRED_MESSAGE,
    PlayerSettingsError,
    PlayerSettingsService,
    analytics_enabled,
)
from app.player_statistics import PlayerStatisticsService


client = TestClient(gateway.app)
YEAR = 2026


def test_analytics_starts_off_and_cannot_be_enabled_without_a_birth_year():
    service = PlayerSettingsService()
    assert service.get_or_create("a").analytics_consent is False

    with pytest.raises(PlayerSettingsError) as rejected:
        service.update("a", music_volume=15, analytics_consent=True, current_year=YEAR)

    assert str(rejected.value) == ANALYTICS_AGE_REQUIRED_MESSAGE
    settings = service.get_or_create("a")
    assert settings.analytics_consent is False and settings.analytics_age_gate == ""
    # Reddedilen istek başka ayarı da değiştirmez.
    assert settings.music_volume == 70


def test_an_adult_answer_enables_analytics_and_the_birth_year_is_not_kept():
    service = PlayerSettingsService()

    settings = service.update("a", analytics_consent=True, analytics_birth_year=1990, current_year=YEAR)

    assert settings.analytics_consent is True
    assert settings.analytics_age_gate == "adult" and settings.analytics_age_asked_year == YEAR
    assert "1990" not in repr(settings.to_view())
    assert analytics_enabled(settings.to_view())

    # Yanıt verildikten sonra kapatıp açmak yeniden soru gerektirmez.
    assert service.update("a", analytics_consent=False).analytics_consent is False
    assert not analytics_enabled(service.get_or_create("a").to_view())
    assert service.update("a", analytics_consent=True, current_year=YEAR).analytics_consent is True


@pytest.mark.parametrize("birth_year,enabled", [(YEAR - 18, True), (YEAR - 17, False), (YEAR - 9, False)])
def test_the_threshold_is_eighteen_by_calendar_year(birth_year, enabled):
    settings = PlayerSettingsService().update(
        "a", analytics_consent=True, analytics_birth_year=birth_year, current_year=YEAR
    )

    assert settings.analytics_consent is enabled
    assert settings.analytics_age_gate == ("adult" if enabled else "minor")


def test_a_minor_answer_keeps_analytics_off_and_cannot_be_changed_in_the_same_year():
    service = PlayerSettingsService()
    service.update("a", analytics_consent=True, analytics_birth_year=2015, current_year=YEAR)

    # Aynı yıl içinde başka bir yıl denemek sonucu değiştirmez; hata da vermez.
    retried = service.update("a", analytics_consent=True, analytics_birth_year=1980, current_year=YEAR)
    assert retried.analytics_consent is False and retried.analytics_age_gate == "minor"
    silent = service.update("a", sound_volume=30, analytics_consent=True, current_year=YEAR)
    assert silent.analytics_consent is False and silent.sound_volume == 30
    assert not analytics_enabled(silent.to_view())

    # Takvim yılı değişince soru yeniden sorulabilir.
    with pytest.raises(PlayerSettingsError):
        service.update("a", analytics_consent=True, current_year=YEAR + 1)
    later = service.update("a", analytics_consent=True, analytics_birth_year=YEAR - 16, current_year=YEAR + 1)
    assert later.analytics_consent is False and later.analytics_age_asked_year == YEAR + 1
    grown = service.update("a", analytics_consent=True, analytics_birth_year=YEAR - 16, current_year=YEAR + 2)
    assert grown.analytics_consent is True and grown.analytics_age_gate == "adult"


@pytest.mark.parametrize("birth_year", [YEAR + 1, YEAR - 121, True, 19.5, "1990"])
def test_invalid_birth_years_are_rejected_without_recording_an_answer(birth_year):
    service = PlayerSettingsService()

    with pytest.raises(PlayerSettingsError):
        service.update("a", analytics_consent=True, analytics_birth_year=birth_year, current_year=YEAR)

    settings = service.get_or_create("a")
    assert settings.analytics_consent is False and settings.analytics_age_gate == ""


def test_stored_consent_counts_only_with_an_adult_answer():
    assert analytics_enabled({"analytics_consent": True, "analytics_age_gate": "adult"})
    # Yaş sorusundan önce verilmiş izin (eski kayıt) artık yetmez.
    assert not analytics_enabled({"analytics_consent": True})
    assert not analytics_enabled({"analytics_consent": True, "analytics_age_gate": "minor"})
    assert not analytics_enabled({"analytics_consent": False, "analytics_age_gate": "adult"})
    assert not analytics_enabled(None)


def test_consent_given_before_the_age_question_is_dropped_when_the_account_loads():
    profiles = PlayerProfileService()
    statistics = PlayerStatisticsService()
    settings = PlayerSettingsService()
    repository = InMemoryPlayerDataRepository()
    store = PlayerDataStoreService(
        profile_service=profiles, statistics_service=statistics,
        settings_service=settings, repository=repository,
    )
    profiles.get_or_create("legacy")
    store.save_player("legacy")
    snapshot = repository.load("legacy")
    snapshot.settings["analytics_consent"] = True
    snapshot.settings.pop("analytics_age_gate", None)
    snapshot.settings.pop("analytics_age_asked_year", None)
    repository.save(snapshot)
    settings._settings.clear()

    store.load_player("legacy")

    restored = settings.get_or_create("legacy")
    assert restored.analytics_consent is False and restored.analytics_age_gate == ""

    # Yetişkin yanıtı olan kayıt olduğu gibi döner.
    settings.update("legacy", analytics_consent=True, analytics_birth_year=1985, current_year=YEAR)
    store.save_player("legacy")
    settings._settings.clear()
    store.load_player("legacy")
    assert settings.get_or_create("legacy").analytics_consent is True


def _event(player_id: str) -> bool:
    return gateway.product_analytics_service.record(
        player_id, "session_started", {}, request_id=uuid4().hex,
    )


def test_gateway_asks_for_the_birth_year_and_records_events_only_for_adults():
    adult, minor = "age-adult-" + uuid4().hex, "age-minor-" + uuid4().hex
    try:
        # Eski istemci: yıl göndermeden açmaya çalışır.
        rejected = client.put(f"/settings/{adult}", json={"music_volume": 11, "analytics_consent": True})
        assert rejected.status_code == 422
        assert rejected.json()["detail"] == ANALYTICS_AGE_REQUIRED_MESSAGE
        assert client.get(f"/settings/{adult}").json()["music_volume"] == 70
        assert _event(adult) is False

        current_year = datetime.now(timezone.utc).year
        opened = client.put(
            f"/settings/{adult}", json={"analytics_consent": True, "analytics_birth_year": current_year - 30},
        )
        assert opened.status_code == 200
        body = opened.json()
        assert body["analytics_consent"] is True and body["analytics_age_gate"] == "adult"
        assert "analytics_birth_year" not in body and str(current_year - 30) not in opened.text
        assert _event(adult) is True

        closed = client.put(
            f"/settings/{minor}", json={"analytics_consent": True, "analytics_birth_year": current_year - 10},
        )
        assert closed.status_code == 200
        assert closed.json()["analytics_consent"] is False and closed.json()["analytics_age_gate"] == "minor"
        assert _event(minor) is False
        # Aynı hesap yetişkin yılıyla yeniden denese de açılmaz.
        again = client.put(
            f"/settings/{minor}", json={"analytics_consent": True, "analytics_birth_year": current_year - 40},
        )
        assert again.status_code == 200 and again.json()["analytics_consent"] is False
        assert _event(minor) is False

        # Kapatınca kayıtlar silinir, yanıt hesapta kalır.
        assert client.put(f"/settings/{adult}", json={"analytics_consent": False}).json()["analytics_consent"] is False
        assert gateway.product_analytics_service.events_for(adult) == []
        assert _event(adult) is False
        reopened = client.put(f"/settings/{adult}", json={"analytics_consent": True})
        assert reopened.status_code == 200 and reopened.json()["analytics_consent"] is True
    finally:
        for player_id in (adult, minor):
            gateway.product_analytics_service.erase_player(player_id)
            gateway.player_settings_service._settings.pop(player_id, None)
