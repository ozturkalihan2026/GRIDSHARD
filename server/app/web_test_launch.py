from __future__ import annotations

from typing import Any


def build_launch_snapshot(
    *,
    version: str,
    build: str,
    test_run_id: str,
    manifest: dict[str, Any],
    operation_readiness: dict[str, Any],
    rc_candidate: dict[str, Any],
    data_health: dict[str, Any],
) -> dict[str, Any]:
    checks = {
        "operation_ready":
            bool(
                operation_readiness.get(
                    "ready"
                )
            ),
        "rc_candidate":
            bool(
                rc_candidate.get(
                    "rc_candidate"
                )
            ),
        "data_health":
            bool(
                data_health.get(
                    "ready"
                )
            ),
        "version_match":
            manifest.get(
                "server_version"
            )
            == version,
        "build_match":
            manifest.get(
                "web_test_build"
            )
            == build,
        "test_run_match":
            manifest.get(
                "test_run_id"
            )
            == test_run_id
            == rc_candidate.get(
                "test_run_id"
            ),
    }

    failed_checks = [
        name
        for name,ok
        in checks.items()
        if not ok
    ]

    return {
        "launch_ready":
            all(
                checks.values()
            ),
        "version":
            version,
        "build":
            build,
        "test_run_id":
            test_run_id,
        "checks":
            checks,
        "failed_checks":
            failed_checks,
        "behavior_blocks_launch":
            False,
        "behavior_insufficient_signal_count":
            int(
                rc_candidate.get(
                    "behavior",
                    {},
                ).get(
                    "insufficient_signal_count",
                    0,
                )
            ),
    }
