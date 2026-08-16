import asyncio

from app.game.engine import BATTLE_TIME_LIMIT_MS
from app.game.models import Direction
from app.main import (
    pvp_service,
    pvp_tick_runner,
    telemetry_service,
)


def test_main_runner_records_match_completion_telemetry():
    async def scenario():
        pvp_service._sessions.clear()
        telemetry_service.clear()

        session = pvp_service.create_session("telemetry-runner")
        for player in ("a", "b"):
            pvp_service.join("telemetry-runner", player)
            session.engine.grant_module(player, f"{player}-core", "core")
            session.engine.grant_module(player, f"{player}-gen", "generator")
            session.engine.set_initial_active_module(
                player, f"{player}-core", 2, 2
            )
            session.engine.set_initial_active_module(
                player, f"{player}-gen", 2, 3, Direction.UP
            )

        pvp_service.start("telemetry-runner")
        session.engine.state.elapsed_ms = BATTLE_TIME_LIMIT_MS - 100

        await pvp_tick_runner.run_single_tick("telemetry-runner")

        completed = telemetry_service.events(
            session_id="telemetry-runner",
            event_type="match_completed",
        )
        assert len(completed) == 2

    asyncio.run(scenario())
