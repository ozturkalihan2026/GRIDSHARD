import asyncio

from app.game.pvp_runner import (
    PvPTickRunner,
)
from app.game.pvp_session import (
    PvPSessionService,
)
from app.game.pvp_websocket import (
    PvPWebSocketAdapter,
)
from app.matchmaking import (
    MatchmakingService,
)
from app.player_profile import (
    PlayerProfileService,
)
from app.telemetry import (
    InMemoryTelemetryService,
)
from app.web_test import (
    WebTestSmokeRunner,
)


class Clock:
    def __init__(self):
        self.value = 100.0

    def now(self):
        return self.value


def test_full_web_test_smoke_flow():
    async def scenario():
        clock = Clock()
        matchmaking = (
            MatchmakingService(
                now_func=clock.now
            )
        )
        profiles = (
            PlayerProfileService()
        )
        pvp = PvPSessionService()
        adapter = (
            PvPWebSocketAdapter(pvp)
        )
        telemetry = (
            InMemoryTelemetryService(
                now_func=clock.now
            )
        )

        def on_finished(state):
            telemetry.ingest_finished_battle(
                state
            )

        tick_runner = PvPTickRunner(
            pvp,
            adapter,
            match_finished_callback=(
                on_finished
            ),
        )

        smoke = WebTestSmokeRunner(
            matchmaking_service=matchmaking,
            profile_service=profiles,
            pvp_service=pvp,
            tick_runner=tick_runner,
            telemetry_service=telemetry,
        )

        result = await smoke.run()

        assert result["ok"] is True
        assert result["status"] == "finished"
        assert result["result_players"] == [
            "smoke-a",
            "smoke-b",
        ]
        assert (
            result["telemetry_event_count"]
            >= 4
        )
        assert result["steps"] == [
            "health",
            "matchmaking",
            "setup",
            "ready",
            "server_tick",
            "match_result",
            "telemetry",
        ]

    asyncio.run(scenario())
