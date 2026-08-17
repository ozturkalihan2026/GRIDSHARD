from fastapi.testclient import TestClient

from app.main import (
    app,
    player_profile_service,
)


client=TestClient(app)


def test_repeated_bootstrap_returns_same_identity_and_profile():
    player_profile_service._profiles.clear()

    player_id="wt-continuity-123456"

    first=client.post(
        f"/participants/{player_id}/bootstrap"
    ).json()

    client.put(
        f"/profile/{player_id}/display-name",
        json={
            "display_name":
                "Süreklilik Oyuncusu"
        },
    )

    second=client.post(
        f"/participants/{player_id}/bootstrap"
    ).json()

    assert first["identity"]["kind"]=="web_test_participant"
    assert first["identity"]["player_id"]==player_id
    assert second["identity"]["player_id"]==player_id
    assert second["profile"]["display_name"]=="Süreklilik Oyuncusu"
