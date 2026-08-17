from __future__ import annotations

from typing import Any

from .build_manifest import build_manifest
from .release_check import build_release_check
from .telemetry import InMemoryTelemetryService
from .web_test_metrics import WebTestKpiService


def build_rc_report(
    *,
    version: str,
    telemetry_service: InMemoryTelemetryService,
    persistence_ready: bool = True,
    telemetry_persistence_ready: bool = True,
    test_run_id: str = "default-run",
) -> dict[str, Any]:
    manifest = build_manifest(
        version=version,
        telemetry_service=telemetry_service,
        persistence_ready=
            persistence_ready,
        telemetry_persistence_ready=
            telemetry_persistence_ready,
        test_run_id=
            test_run_id,
    )
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
    kpis = WebTestKpiService(
        telemetry_service
    ).snapshot()

    critical_failures = [
        name
        for name, ok
        in release.checks.items()
        if not ok
    ]

    return {
        "version": version,
        "build":
            manifest["web_test_build"],
        "test_run_id":
            str(test_run_id),
        "ready":
            (
                release.ready
                and manifest[
                    "release_ready"
                ]
                and not critical_failures
            ),
        "critical_failures":
            critical_failures,
        "manifest": manifest,
        "release_check":
            release.to_dict(),
        "kpis": kpis,
        "scope": {
            "menu_areas":
                manifest[
                    "menu_areas"
                ],
            "education_deferred":
                "Eğitim"
                in release.deferred_areas,
        },
    }
