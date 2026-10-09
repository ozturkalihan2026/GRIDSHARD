from fastapi.testclient import TestClient
from types import SimpleNamespace
import pytest
from app import main as gateway

from app.main import (
    app,
    matchmaking_service,
    player_profile_service,
    pvp_service,
)


client = TestClient(app)


@pytest.fixture(autouse=True)
def human_matchmaking_contract(monkeypatch):
    # Preserve the human-first contract even when an operator/test env forces AI.
    monkeypatch.setattr(gateway, "MATCHMAKING_AI_ONLY", False)


def reset():
    matchmaking_service._queue.clear()
    matchmaking_service._matches_by_player.clear()
    player_profile_service._profiles.clear()
    pvp_service._sessions.clear()


def test_partial_provision_is_removed_and_retry_builds_a_complete_session(monkeypatch):
    reset()
    pair = SimpleNamespace(match_id="partial-human", player_a_id="a", player_b_id="b", opponent_type="human")
    attach = gateway.attach_player_progression_to_session
    with monkeypatch.context() as patch:
        patch.setattr(gateway, "attach_player_progression_to_session", lambda *args: (_ for _ in ()).throw(RuntimeError("fixture provision failure")))
        with pytest.raises(RuntimeError):
            gateway._provision_match_state(pair, None)
    assert pair.match_id not in pvp_service._sessions
    gateway._provision_match_state(pair, None)
    assert set(pvp_service.get_session(pair.match_id).engine.state.players) == {"a", "b"}
    assert gateway.attach_player_progression_to_session is attach


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


def test_normal_pvp_waits_ten_seconds_then_falls_back_once(monkeypatch):
    reset()
    now = [100.0]
    monkeypatch.setattr(matchmaking_service, "now_func", lambda: now[0])
    first = client.post("/matchmaking/join", json={"player_id": "a"}).json()
    assert first["matched"] is False
    assert first["queue"]["ai_only"] is False
    assert first["queue"]["ai_fallback_after_seconds"] == 10
    now[0] = 109.999
    assert client.get("/matchmaking/a").json()["queued"] is True
    now[0] = 110.0
    matched = client.get("/matchmaking/a").json()
    assert matched["matched"] is True
    assert matched["opponent_type"] == "ai"
    assert client.get("/matchmaking/a").json()["session_id"] == matched["session_id"]
    assert len(pvp_service._sessions) == 1


def test_human_at_fallback_boundary_wins_over_bot(monkeypatch):
    reset()
    now = [100.0]
    monkeypatch.setattr(matchmaking_service, "now_func", lambda: now[0])
    client.post("/matchmaking/join", json={"player_id": "a"})
    # Enqueue directly to exercise the status path, not join's immediate match.
    source = matchmaking_service._queue["a"]
    matchmaking_service.enqueue("b", rating=source.rating, league_name_tr=source.league_name_tr, level=source.level)
    now[0] = 110.0
    matched = client.get("/matchmaking/a").json()
    assert matched["opponent_type"] == "human"
    assert set(matched["players"]) == {"a", "b"}
    assert len(pvp_service._sessions) == 1


def test_cancelled_queue_never_falls_back_to_bot(monkeypatch):
    reset()
    now = [100.0]
    monkeypatch.setattr(matchmaking_service, "now_func", lambda: now[0])
    client.post("/matchmaking/join", json={"player_id": "a"})
    assert client.delete("/matchmaking/a").json()["cancelled"] is True
    now[0] = 120.0
    status = client.get("/matchmaking/a").json()
    assert status["queued"] is False
    assert status["matched"] is False
    assert not pvp_service._sessions
