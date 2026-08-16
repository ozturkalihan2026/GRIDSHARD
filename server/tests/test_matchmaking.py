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
