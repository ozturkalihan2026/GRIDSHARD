import asyncio

from fastapi.testclient import TestClient
import pytest

from app.game.engine import BATTLE_TIME_LIMIT_MS
from app.game.models import Direction
from app.main import (
    app,
    player_profile_service,
    player_progression_service,
    player_statistics_service,
    pvp_service,
    pvp_tick_runner,
)


client=TestClient(app)


def reset():
    pvp_service._sessions.clear()
    player_profile_service._profiles.clear()
    player_progression_service._processed_battle_ids.clear()
    player_progression_service._results_by_battle_id.clear()
    player_statistics_service._statistics.clear()
    player_statistics_service._processed_battle_ids.clear()


@pytest.mark.parametrize(
    "battle_id",
    [
        "post-match",
        "local-ai-match-hotfix",
    ],
)
def test_post_match_endpoint_returns_progression_profile_and_statistics(
    battle_id,
):
    async def scenario():
        reset()
        session=pvp_service.create_session(battle_id)

        for p in ("a","b"):
            pvp_service.join(battle_id,p)
            session.engine.grant_module(p,f"{p}-core","core")
            session.engine.grant_module(p,f"{p}-gen","generator")
            session.engine.set_initial_active_module(p,f"{p}-core",2,2)
            session.engine.set_initial_active_module(
                p,f"{p}-gen",2,3,Direction.UP
            )

        pvp_service.start(battle_id)
        session.engine.state.elapsed_ms=BATTLE_TIME_LIMIT_MS-100

        await pvp_tick_runner.run_single_tick(battle_id)

        response=client.get(f"/post-match/{battle_id}/a")
        assert response.status_code==200

        body=response.json()
        assert body["battle_id"]==battle_id
        assert body["player_id"]=="a"
        assert body["progression"]["xp_awarded"]==90
        assert body["profile"]["experience"]==90
        assert body["profile"]["rating"]==1000
        assert body["statistics"]["total_matches"]==1
        assert body["statistics"]["draws"]==1

    asyncio.run(scenario())


def test_post_match_endpoint_rejects_unknown_result():
    reset()

    response=client.get("/post-match/missing/a")

    assert response.status_code==404
