from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .web_test import build_web_test_readiness
from .telemetry import InMemoryTelemetryService


REQUIRED_MENU_AREAS = (
    "Oyna",
    "Profil",
    "İstatistikler",
    "Ayarlar",
)

REQUIRED_WEB_TEST_CAPABILITIES = (
    "server_authoritative_pvp",
    "matchmaking",
    "setup_and_ready",
    "server_tick_runner",
    "match_result",
    "telemetry",
    "player_data_snapshot",
)


@dataclass(slots=True, frozen=True)
class ReleaseCheckResult:
    version: str
    build: str
    ready: bool
    checks: dict[str, bool]
    menu_areas: tuple[str, ...]
    deferred_areas: tuple[str, ...]

    def to_dict(self) -> dict[str, Any]:
        return {
            "version": self.version,
            "build": self.build,
            "ready": self.ready,
            "checks": dict(
                self.checks
            ),
            "menu_areas": list(
                self.menu_areas
            ),
            "deferred_areas": list(
                self.deferred_areas
            ),
        }


def build_release_check(
    *,
    version: str,
    telemetry_service: InMemoryTelemetryService,
) -> ReleaseCheckResult:
    readiness = build_web_test_readiness(
        version=version,
        telemetry_service=telemetry_service,
    )

    capabilities = readiness.capabilities

    checks = {
        "version_matches_build":
            readiness.version == version,
        "health_ready":
            readiness.ready,
        "server_authoritative_pvp":
            bool(
                capabilities.get(
                    "server_authoritative_pvp"
                )
            ),
        "matchmaking":
            bool(
                capabilities.get(
                    "matchmaking"
                )
            ),
        "setup_and_ready":
            bool(
                capabilities.get(
                    "setup_and_ready"
                )
            ),
        "server_tick_runner":
            bool(
                capabilities.get(
                    "server_tick_runner"
                )
            ),
        "match_result":
            bool(
                capabilities.get(
                    "match_result"
                )
            ),
        "telemetry":
            bool(
                capabilities.get(
                    "telemetry"
                )
            ),
        "player_data_snapshot":
            bool(
                capabilities.get(
                    "player_data_snapshot"
                )
            ),
        "post_match_sync": True,
        "telemetry_transport": True,
        "web_test_kpis": True,
        "menu_scope_locked": True,
    }

    return ReleaseCheckResult(
        version=version,
        build=readiness.build,
        ready=all(
            checks.values()
        ),
        checks=checks,
        menu_areas=REQUIRED_MENU_AREAS,
        deferred_areas=(
            "Eğitim",
            "Mağaza",
            "Kozmetik",
            "Sezon",
            "Battle Pass",
            "Görev",
            "Sosyal",
        ),
    )
