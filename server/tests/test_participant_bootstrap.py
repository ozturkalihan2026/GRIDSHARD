from fastapi.testclient import TestClient

from app.main import (
    app,
    player_profile_service,
    player_settings_service,
    player_statistics_service,
)


client=TestClient(app)


def reset():
    player_profile_service._profiles.clear()
    player_statistics_service._statistics.clear()
    player_settings_service._settings.clear()


def test_bootstrap_creates_all_player_domains():
    reset()

    response=client.post(
        "/participants/wt-test-123456/bootstrap"
    )

    assert response.status_code==200
    body=response.json()

    assert body["player_id"]=="wt-test-123456"
    assert body["profile"]["rating"]==1000
    assert body["statistics"]["total_matches"]==0
    assert body["settings"]["language"]=="tr"


def test_bootstrap_is_idempotent_and_preserves_existing_values():
    reset()

    player_profile_service.set_rating(
        "wt-test-123456",
        1230,
    )
    player_settings_service.update(
        "wt-test-123456",
        sound_volume=35,
    )

    first=client.post(
        "/participants/wt-test-123456/bootstrap"
    ).json()
    second=client.post(
        "/participants/wt-test-123456/bootstrap"
    ).json()

    assert first["profile"]["rating"]==1230
    assert second["profile"]["rating"]==1230
    assert first["settings"]["sound_volume"]==35
    assert second["settings"]["sound_volume"]==35
