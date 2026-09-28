import asyncio

from app.game.pvp_runner import PvPTickRunner
from app.game.pvp_session import PvPSessionService
from app.game.pvp_websocket import PvPWebSocketAdapter
from app.player_statistics import PlayerStatisticsService


def destroy_core(engine, player_id):
    # Savaş yalnız bir Çekirdek yok olunca biter.
    for module in engine.state.players[player_id].modules.values():
        if module.definition.id == "core":
            module.hp = 0


def test_runner_processes_finished_match_once():
    async def scenario():
        service=PvPSessionService()
        session=service.create_session("stats")

        for p in ("a","b"):
            service.join("stats",p)
            session.engine.grant_module(
                p,f"{p}-core","core"
            )
            session.engine.set_initial_active_module(
                p,f"{p}-core",2,1
            )

        service.start("stats")

        stats=PlayerStatisticsService()
        runner=PvPTickRunner(
            service,
            PvPWebSocketAdapter(service),
            match_finished_callback=(
                stats.process_finished_battle
            ),
        )

        destroy_core(session.engine, "b")
        await runner.run_single_tick(
            "stats"
        )

        assert (
            stats.get_or_create("a").total_matches
            == 1
        )
        assert (
            stats.get_or_create("b").total_matches
            == 1
        )

    asyncio.run(scenario())
