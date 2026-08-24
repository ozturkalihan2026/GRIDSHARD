from fastapi.testclient import TestClient

from app.main import (
    app,
    matchmaking_service,
    player_profile_service,
    pvp_service,
)
from app.matchmaking import (
    MatchmakingService,
)
from app.game.models import BattleStatus


client=TestClient(app)


class Clock:
    def __init__(self):
        self.value=100.0
    def now(self):
        return self.value
    def advance(self,seconds):
        self.value+=seconds


def test_close_ratings_match_immediately():
    clock=Clock()
    service=MatchmakingService(
        now_func=clock.now
    )

    service.enqueue(
        "a",
        rating=1000,
        league_name_tr="Gümüş",
        level=1,
    )
    service.enqueue(
        "b",
        rating=1060,
        league_name_tr="Gümüş",
        level=2,
    )

    match=service.try_match("a")

    assert match is not None
    assert match.rating_difference==60
    assert service.queued("a") is False
    assert service.queued("b") is False


def test_far_ratings_do_not_match_immediately():
    clock=Clock()
    service=MatchmakingService(
        now_func=clock.now
    )

    service.enqueue(
        "a",
        rating=1000,
        league_name_tr="Gümüş",
        level=1,
    )
    service.enqueue(
        "b",
        rating=1300,
        league_name_tr="Altın",
        level=5,
    )

    assert service.try_match("a") is None


def test_rating_window_expands_with_wait_time():
    clock=Clock()
    service=MatchmakingService(
        now_func=clock.now
    )

    a=service.enqueue(
        "a",
        rating=1000,
        league_name_tr="Gümüş",
        level=1,
    )
    b=service.enqueue(
        "b",
        rating=1250,
        league_name_tr="Altın",
        level=5,
    )

    assert (
        service.accepted_rating_window(a)
        == 100
    )

    clock.advance(30)

    assert (
        service.accepted_rating_window(a)
        == 250
    )
    assert (
        service.accepted_rating_window(b)
        == 250
    )
    assert service.try_match("a") is not None


def test_best_rating_difference_is_selected_first():
    clock=Clock()
    service=MatchmakingService(
        now_func=clock.now
    )

    for player,rating in (
        ("a",1000),
        ("b",1080),
        ("c",1020),
    ):
        service.enqueue(
            player,
            rating=rating,
            league_name_tr="Gümüş",
            level=1,
        )

    match=service.try_match("a")

    assert match.player_b_id=="c"
    assert match.rating_difference==20


def reset_gateway():
    matchmaking_service._queue.clear()
    matchmaking_service._matches_by_player.clear()
    player_profile_service._profiles.clear()
    pvp_service._sessions.clear()


def test_gateway_matchmaking_creates_strict_pvp_session():
    reset_gateway()

    player_profile_service.set_rating(
        "a",
        1000,
    )
    player_profile_service.set_rating(
        "b",
        1050,
    )

    first=client.post(
        "/matchmaking/join",
        json={"player_id":"a"},
    )
    assert first.status_code==200
    assert first.json()["matched"] is False

    second=client.post(
        "/matchmaking/join",
        json={"player_id":"b"},
    )
    assert second.status_code==200
    body=second.json()

    assert body["matched"] is True
    assert set(body["players"])=={"a","b"}

    session=pvp_service.get_session(
        body["session_id"]
    )
    assert session.setup_required is True
    assert session.auto_start_when_ready is True


def test_gateway_requeues_player_after_finished_match():
    reset_gateway()
    client.post(
        "/matchmaking/join",
        json={"player_id": "rematch-a"},
    )
    matched=client.post(
        "/matchmaking/join",
        json={"player_id": "rematch-b"},
    ).json()
    previous_session_id=matched["session_id"]
    session=pvp_service.get_session(previous_session_id)
    session.engine.state.status=BattleStatus.FINISHED

    rematch=client.post(
        "/matchmaking/join",
        json={"player_id": "rematch-a"},
    )

    assert rematch.status_code==200
    body=rematch.json()
    assert body["matched"] is False
    assert body["queue"]["queued"] is True
    assert body["queue"].get("session_id") != previous_session_id


def test_gateway_matchmaking_status_exposes_rating_metadata():
    reset_gateway()
    player_profile_service.get_or_create(
        "a"
    )

    client.post(
        "/matchmaking/join",
        json={"player_id":"a"},
    )

    response=client.get(
        "/matchmaking/a"
    )

    assert response.status_code==200
    body=response.json()
    assert body["queued"] is True
    assert body["rating"]==1000
    assert body["league_name_tr"]=="Gümüş"
    assert body["level"]==1


def test_gateway_cancel_removes_queue_entry():
    reset_gateway()

    client.post(
        "/matchmaking/join",
        json={"player_id":"a"},
    )

    response=client.delete(
        "/matchmaking/a"
    )

    assert response.status_code==200
    assert response.json()["cancelled"] is True


def test_gateway_assigns_server_ai_after_exactly_ten_seconds():
    reset_gateway()
    clock = Clock()
    original_now = matchmaking_service.now_func
    matchmaking_service.now_func = clock.now
    try:
        queued = client.post(
            "/matchmaking/join",
            json={"player_id": "fallback-player"},
        )
        assert queued.status_code == 200
        assert queued.json()["matched"] is False

        clock.advance(9.9)
        waiting = client.get("/matchmaking/fallback-player").json()
        assert waiting["queued"] is True
        assert waiting["matched"] is False

        clock.advance(0.1)
        matched = client.get("/matchmaking/fallback-player")
        assert matched.status_code == 200
        body = matched.json()
        assert body["matched"] is True
        assert body["opponent_type"] == "ai"
        assert body["session_id"].startswith("local-ai-match-")

        session = pvp_service.get_session(body["session_id"])
        assert len(session.ai_player_ids) == 1
        ai_player_id = next(iter(session.ai_player_ids))
        assert session.slots[ai_player_id].setup_submitted is True
        assert session.slots[ai_player_id].ready is True
    finally:
        matchmaking_service.now_func = original_now
