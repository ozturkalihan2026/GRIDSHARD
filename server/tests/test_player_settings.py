from fastapi.testclient import TestClient
import pytest
from types import SimpleNamespace
from app.player_data_store import PlayerDataStoreService

from app.main import (
    app,
    player_settings_service,
)
from app.player_settings import (
    PlayerSettingsError,
    PlayerSettingsService,
)


client=TestClient(app)


def reset():
    player_settings_service._settings.clear()


def test_default_settings_are_turkish_and_high_graphics():
    service=PlayerSettingsService()
    settings=service.get_or_create("a")

    assert settings.sound_volume==100
    assert settings.music_volume==5
    assert settings.battle_music_volume==50
    assert settings.vibration_enabled is True
    assert settings.graphics_quality=="yuksek"
    assert settings.language=="tr"
    assert settings.analytics_consent is False


def test_update_all_basic_preferences():
    service=PlayerSettingsService()

    settings=service.update(
        "a",
        sound_volume=40,
        music_volume=20,
        vibration_enabled=False,
        graphics_quality="orta",
        language="en",
        analytics_consent=True,
        analytics_birth_year=1990,
        current_year=2026,
    )

    assert settings.sound_volume==40
    assert settings.music_volume==20
    assert settings.vibration_enabled is False
    assert settings.graphics_quality=="orta"
    assert settings.language=="en"
    assert settings.analytics_consent is True


def test_new_music_default_does_not_reset_an_existing_explicit_preference():
    service=PlayerSettingsService()
    service.update('existing', music_volume=38)
    service.update('existing', sound_muted=True)
    assert service.get_or_create('existing').music_volume == 38
    assert service.get_or_create('new').music_volume == 5


def test_menu_and_battle_music_are_independent_and_legacy_updates_preserve_battle_level():
    service=PlayerSettingsService()
    service.update('split', music_volume=0, battle_music_volume=65)
    assert service.get_or_create('split').music_volume == 0
    assert service.get_or_create('split').battle_music_volume == 65
    service.update('split', music_volume=10)
    assert service.get_or_create('split').battle_music_volume == 65
    with pytest.raises(PlayerSettingsError):
        service.update('split', battle_music_volume=101)


def test_battle_music_setting_api_round_trip():
    response=client.put('/settings/split-api', json={'music_volume':10,'battle_music_volume':61})
    assert response.status_code==200
    assert response.json()['battle_music_volume']==61
    old_client=client.put('/settings/split-api', json={'music_volume':18})
    assert old_client.json()['battle_music_volume']==61


def test_old_settings_restore_starts_an_audible_battle_channel_and_preserves_explicit_zero():
    service=PlayerSettingsService()
    legacy=service.get_or_create('legacy-split').to_view()
    legacy.pop('battle_music_volume')
    legacy['music_volume']=0
    store=SimpleNamespace(settings_service=service)
    PlayerDataStoreService._restore_settings(store,legacy)
    assert service.get_or_create('legacy-split').music_volume == 0
    assert service.get_or_create('legacy-split').battle_music_volume == 50
    legacy['battle_music_volume']=0
    PlayerDataStoreService._restore_settings(store,legacy)
    assert service.get_or_create('legacy-split').battle_music_volume == 0


def test_volume_out_of_range_is_rejected():
    service=PlayerSettingsService()

    try:
        service.update(
            "a",
            sound_volume=101,
        )
    except PlayerSettingsError:
        pass
    else:
        raise AssertionError(
            "101 ses seviyesi reddedilmeliydi."
        )


def test_invalid_graphics_quality_is_rejected():
    service=PlayerSettingsService()

    try:
        service.update(
            "a",
            graphics_quality="ultra",
        )
    except PlayerSettingsError:
        pass
    else:
        raise AssertionError(
            "Tanımsız grafik kalitesi reddedilmeliydi."
        )


def test_settings_endpoint_returns_defaults():
    reset()

    response=client.get(
        "/settings/a"
    )

    assert response.status_code==200
    body=response.json()
    assert body["language"]=="tr"
    assert body["graphics_quality"]=="yuksek"


def test_settings_endpoint_updates_partial_preferences():
    reset()

    response=client.put(
        "/settings/a",
        json={
            "sound_volume":35,
            "vibration_enabled":False,
        },
    )

    assert response.status_code==200
    body=response.json()
    assert body["sound_volume"]==35
    assert body["vibration_enabled"] is False
    assert body["music_volume"]==5


def test_settings_endpoint_rejects_invalid_language():
    reset()

    response=client.put(
        "/settings/a",
        json={"language":"xx"},
    )

    assert response.status_code==422
