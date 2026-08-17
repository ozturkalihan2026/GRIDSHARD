from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .game.battle_pool import default_battle_pool
from .game.engine import BATTLE_TIME_LIMIT_MS
from .game.models import Direction
from .game.pvp_runner import PvPTickRunner
from .game.pvp_session import PvPSessionService
from .game.pvp_setup import (
    InitialModulePlacement,
    PvPSetupPayload,
)
from .matchmaking import MatchmakingService
from .player_profile import PlayerProfileService
from .telemetry import InMemoryTelemetryService


WEB_TEST_BUILD = "web-test-beta.4.3"

RELEASE_CHECK_STEPS = (
    "health",
    "matchmaking",
    "setup",
    "ready",
    "server_tick",
    "match_result",
    "telemetry",
)


@dataclass(slots=True, frozen=True)
class WebTestReadiness:
    version: str
    build: str
    ready: bool
    release_checks: tuple[str, ...]
    telemetry_event_count: int
    capabilities: dict[str, bool]

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": self.version,
            "build": self.build,
            "ready": self.ready,
            "release_checks": list(
                self.release_checks
            ),
            "telemetry_event_count":
                self.telemetry_event_count,
            "capabilities": dict(
                self.capabilities
            ),
        }


def build_web_test_readiness(
    *,
    version: str,
    telemetry_service: InMemoryTelemetryService,
    persistence_ready: bool = True,
    telemetry_persistence_ready: bool = True,
    test_run_id_ready: bool = True,
) -> WebTestReadiness:
    capabilities = {
        "server_authoritative_pvp": True,
        "matchmaking": True,
        "setup_and_ready": True,
        "server_tick_runner": True,
        "match_result": True,
        "telemetry": True,
        "player_data_snapshot": True,
        "player_data_persistence":
            bool(
                persistence_ready
            ),
        "telemetry_persistence":
            bool(
                telemetry_persistence_ready
            ),
        "test_run_id":
            bool(
                test_run_id_ready
            ),
    }

    return WebTestReadiness(
        version=version,
        build=WEB_TEST_BUILD,
        ready=all(capabilities.values()),
        release_checks=RELEASE_CHECK_STEPS,
        telemetry_event_count=len(
            telemetry_service.events()
        ),
        capabilities=capabilities,
    )


class WebTestSmokeRunner:
    def __init__(
        self,
        *,
        matchmaking_service: MatchmakingService,
        profile_service: PlayerProfileService,
        pvp_service: PvPSessionService,
        tick_runner: PvPTickRunner,
        telemetry_service: InMemoryTelemetryService,
    ):
        self.matchmaking_service = (
            matchmaking_service
        )
        self.profile_service = profile_service
        self.pvp_service = pvp_service
        self.tick_runner = tick_runner
        self.telemetry_service = telemetry_service

    async def run(
        self,
        *,
        player_a: str = "smoke-a",
        player_b: str = "smoke-b",
    ) -> dict[str, Any]:
        profile_a = (
            self.profile_service
            .get_or_create(player_a)
        )
        profile_b = (
            self.profile_service
            .get_or_create(player_b)
        )

        self.matchmaking_service.enqueue(
            player_a,
            rating=profile_a.rating,
            league_name_tr=(
                profile_a.league_name_tr
            ),
            level=profile_a.level,
        )
        self.matchmaking_service.enqueue(
            player_b,
            rating=profile_b.rating,
            league_name_tr=(
                profile_b.league_name_tr
            ),
            level=profile_b.level,
        )

        pair = self.matchmaking_service.try_match(
            player_b
        )
        if pair is None:
            raise RuntimeError(
                "Smoke test eşleştirmesi oluşturulamadı."
            )

        session = self.pvp_service.create_session(
            pair.match_id,
            setup_required=True,
            auto_start_when_ready=True,
        )
        self.pvp_service.join(
            session.session_id,
            pair.player_a_id,
        )
        self.pvp_service.join(
            session.session_id,
            pair.player_b_id,
        )

        for player_id in (
            pair.player_a_id,
            pair.player_b_id,
        ):
            self.pvp_service.submit_setup(
                session.session_id,
                player_id,
                self._setup_payload(
                    player_id
                ),
            )
            self.pvp_service.set_ready(
                session.session_id,
                player_id,
                True,
            )

        if (
            session.engine.state.status.value
            != "running"
        ):
            raise RuntimeError(
                "Smoke test maçı ready sonrasında başlamadı."
            )

        session.engine.state.elapsed_ms = (
            BATTLE_TIME_LIMIT_MS - 100
        )

        await self.tick_runner.run_single_tick(
            session.session_id
        )

        result_a = (
            self.pvp_service
            .final_result_payload(
                session.session_id,
                pair.player_a_id,
            )
        )
        result_b = (
            self.pvp_service
            .final_result_payload(
                session.session_id,
                pair.player_b_id,
            )
        )

        telemetry = self.telemetry_service.events(
            session_id=session.session_id
        )

        return {
            "ok": True,
            "session_id": session.session_id,
            "steps": list(
                RELEASE_CHECK_STEPS
            ),
            "status":
                session.engine.state.status.value,
            "result_players": sorted([
                result_a[
                    "viewer_player_id"
                ],
                result_b[
                    "viewer_player_id"
                ],
            ]),
            "telemetry_event_count":
                len(telemetry),
        }

    def _setup_payload(
        self,
        player_id: str,
    ) -> PvPSetupPayload:
        pool = default_battle_pool()

        return PvPSetupPayload(
            battle_pool_ids=(
                pool.module_definition_ids
            ),
            initial_modules=(
                InitialModulePlacement(
                    f"{player_id}-core",
                    "core",
                    2,
                    2,
                ),
                InitialModulePlacement(
                    f"{player_id}-gen",
                    "generator",
                    2,
                    3,
                    Direction.UP,
                ),
                InitialModulePlacement(
                    f"{player_id}-split",
                    "splitter",
                    2,
                    1,
                    Direction.DOWN,
                ),
                InitialModulePlacement(
                    f"{player_id}-laser",
                    "laser",
                    1,
                    1,
                    Direction.RIGHT,
                ),
            ),
        )
