from fastapi.testclient import TestClient

from app.main import (
    app,
    matchmaking_service,
    player_profile_service,
    pvp_service,
)


client = TestClient(app)


def reset():
    matchmaking_service._queue.clear()
    matchmaking_service._matches_by_player.clear()
    player_profile_service._profiles.clear()
    pvp_service._sessions.clear()


def test_first_player_can_discover_match_after_second_joins():
    reset()

    first = client.post(
        "/matchmaking/join",
        json={"player_id": "a"},
    )
    assert first.json()["matched"] is False

    second = client.post(
        "/matchmaking/join",
        json={"player_id": "b"},
    )
    assert second.json()["matched"] is True

    status = client.get(
        "/matchmaking/a"
    )

    assert status.status_code == 200
    body = status.json()
    assert body["matched"] is True
    assert (
        body["session_id"]
        == second.json()["session_id"]
    )
    assert set(body["players"]) == {"a", "b"}


def test_matched_player_rejoin_returns_same_session():
    reset()

    client.post(
        "/matchmaking/join",
        json={"player_id": "a"},
    )
    second = client.post(
        "/matchmaking/join",
        json={"player_id": "b"},
    ).json()

    again = client.post(
        "/matchmaking/join",
        json={"player_id": "a"},
    )

    assert again.status_code == 200
    assert again.json()["matched"] is True
    assert (
        again.json()["session_id"]
        == second["session_id"]
    )


def test_queue_status_explicitly_reports_not_matched():
    reset()

    client.post(
        "/matchmaking/join",
        json={"player_id": "a"},
    )

    body = client.get(
        "/matchmaking/a"
    ).json()

    assert body["queued"] is True
    assert body["matched"] is False
