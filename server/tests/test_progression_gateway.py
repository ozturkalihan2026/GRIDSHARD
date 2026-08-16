import asyncio

from fastapi.testclient import TestClient

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


def test_runner_finish_updates_profile_and_progression_endpoint():
    async def scenario():
        reset()

        session=pvp_service.create_session(
            "ranked"
        )

        for p in ("a","b"):
            pvp_service.join(
                "ranked",
                p,
            )
            session.engine.grant_module(
                p,
                f"{p}-core",
                "core",
            )
            session.engine.grant_module(
                p,
                f"{p}-gen",
                "generator",
            )
            session.engine.set_initial_active_module(
                p,
                f"{p}-core",
                2,
                2,
            )
            session.engine.set_initial_active_module(
                p,
                f"{p}-gen",
                2,
                3,
                Direction.UP,
            )

        pvp_service.start("ranked")

        session.engine.state.elapsed_ms=(
            BATTLE_TIME_LIMIT_MS-100
        )

        await pvp_tick_runner.run_single_tick(
            "ranked"
        )

        result=client.get(
            "/progression/battles/ranked/a"
        )
        assert result.status_code==200

        profile=client.get(
            "/profile/a"
        ).json()

        assert profile["experience"]==90
        assert profile["rating"]==1000

    asyncio.run(scenario())
