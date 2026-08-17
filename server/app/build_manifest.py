from __future__ import annotations

from typing import Any

from .release_check import (
    REQUIRED_MENU_AREAS,
    build_release_check,
)
from .telemetry import InMemoryTelemetryService
from .web_test import WEB_TEST_BUILD


PVP_PROTOCOL_VERSION = 1


def build_manifest(
    *,
    version: str,
    telemetry_service: InMemoryTelemetryService,
    persistence_ready: bool = True,
    telemetry_persistence_ready: bool = True,
    test_run_id: str = "default-run",
) -> dict[str, Any]:
    release = build_release_check(
        version=version,
        telemetry_service=telemetry_service,
        persistence_ready=
            persistence_ready,
        telemetry_persistence_ready=
            telemetry_persistence_ready,
        test_run_id_ready=
            bool(
                str(test_run_id).strip()
            ),
    )

    return {
        "server_version": version,
        "web_test_build":
            WEB_TEST_BUILD,
        "test_run_id":
            str(test_run_id),
        "pvp_protocol_version":
            PVP_PROTOCOL_VERSION,
        "menu_areas":
            list(
                REQUIRED_MENU_AREAS
            ),
        "player_data_persistence_ready":
            bool(
                persistence_ready
            ),
        "telemetry_persistence_ready":
            bool(
                telemetry_persistence_ready
            ),
        "release_ready":
            release.ready,
        "release_failed_checks": [
            name
            for name, ok
            in release.checks.items()
            if not ok
        ],
    }
