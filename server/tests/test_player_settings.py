from fastapi.testclient import TestClient

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
    assert settings.music_volume==70
    assert settings.vibration_enabled is True
    assert settings.graphics_quality=="yuksek"
    assert settings.language=="tr"


def test_update_all_basic_preferences():
    service=PlayerSettingsService()

    settings=service.update(
        "a",
        sound_volume=40,
        music_volume=20,
        vibration_enabled=False,
        graphics_quality="orta",
        language="en",
    )

    assert settings.sound_volume==40
    assert settings.music_volume==20
    assert settings.vibration_enabled is False
    assert settings.graphics_quality=="orta"
    assert settings.language=="en"


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
    assert body["music_volume"]==70


def test_settings_endpoint_rejects_invalid_language():
    reset()

    response=client.put(
        "/settings/a",
        json={"language":"xx"},
    )

    assert response.status_code==422
