from fastapi.testclient import TestClient

from app.main import (
    app,
    player_profile_service,
)


client=TestClient(app)


def test_display_name_update_does_not_change_player_id():
    player_profile_service._profiles.clear()

    player_id="wt-test-abcdef"
    response=client.put(
        f"/profile/{player_id}/display-name",
        json={
            "display_name":
                "Relay Ustası"
        },
    )

    assert response.status_code==200
    body=response.json()
    assert body["player_id"]==player_id
    assert body["display_name"]=="Relay Ustası"

    profile=client.get(
        f"/profile/{player_id}"
    ).json()

    assert profile["player_id"]==player_id
    assert profile["display_name"]=="Relay Ustası"
