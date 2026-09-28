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
