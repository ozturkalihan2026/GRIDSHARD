from fastapi.testclient import TestClient

from app.main import (
    app,
    player_data_repository,
    player_profile_service,
    player_settings_service,
    player_statistics_service,
)

client=TestClient(app)


def reset_player(player_id: str):
    player_profile_service._profiles.pop(
        player_id,
        None,
    )
    player_statistics_service._statistics.pop(
        player_id,
        None,
    )
    player_settings_service._settings.pop(
        player_id,
        None,
    )


def test_settings_language_survives_service_memory_clear():
    player_id="settings-persist-beta8"

    response=client.put(
        f"/settings/{player_id}",
        json={
            "sound_volume":42,
            "music_volume":18,
            "vibration_enabled":False,
            "graphics_quality":"orta",
            "language":"en",
        },
    )
    assert response.status_code==200
    assert response.json()["language"]=="en"

    # Tarayıcı yenileme / yeni süreç davranışını taklit etmek için
    # servis içi cache temizlenir; kalıcı oyuncu verisi yeniden bootstrap edilir.
    reset_player(player_id)

    bootstrap=client.post(
        f"/participants/{player_id}/bootstrap"
    )
    assert bootstrap.status_code==200
    settings=bootstrap.json()["settings"]

    assert settings["language"]=="en"
    assert settings["sound_volume"]==42
    assert settings["music_volume"]==18
    assert settings["vibration_enabled"] is False
    assert settings["graphics_quality"]=="orta"

    reset_player(player_id)
    player_data_repository.path.unlink(
        missing_ok=True
    )
