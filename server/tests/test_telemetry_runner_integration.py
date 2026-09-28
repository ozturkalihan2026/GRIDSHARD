import asyncio

from app.main import (
    pvp_service,
    pvp_tick_runner,
    telemetry_service,
)


def destroy_core(engine, player_id):
    # Savaş yalnız bir Çekirdek yok olunca biter.
    for module in engine.state.players[player_id].modules.values():
        if module.definition.id == "core":
            module.hp = 0


def test_main_runner_records_match_completion_telemetry():
    async def scenario():
        pvp_service._sessions.clear()
        telemetry_service.clear()

        session = pvp_service.create_session("telemetry-runner")
        for player in ("a", "b"):
            pvp_service.join("telemetry-runner", player)
            session.engine.grant_module(player, f"{player}-core", "core")
            session.engine.set_initial_active_module(
                player, f"{player}-core", 2, 1
            )

        pvp_service.start("telemetry-runner")
        destroy_core(session.engine, "b")
        await pvp_tick_runner.run_single_tick("telemetry-runner")

        completed = telemetry_service.events(
            session_id="telemetry-runner",
            event_type="match_completed",
        )
        assert len(completed) == 2

    asyncio.run(scenario())
