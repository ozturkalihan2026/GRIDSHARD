from __future__ import annotations
from typing import Any


def build_operation_status(
    *,
    version: str,
    build: str,
    test_run_id: str,
    preflight: dict[str, Any],
    run_status: dict[str, Any],
    consistency: dict[str, Any],
) -> dict[str, Any]:
    return {
        "version":version,
        "build":build,
        "test_run_id":
            test_run_id,
        "preflight_ready":
            bool(
                preflight.get(
                    "preflight_ready"
                )
            ),
        "run_started":
            bool(
                run_status.get(
                    "started"
                )
            ),
        "consistency_status":
            consistency.get(
                "status",
                "unknown",
            ),
        "consistent":
            bool(
                consistency.get(
                    "consistent"
                )
            ),
        "operational_state":
            (
                "running"
                if (
                    run_status.get(
                        "started"
                    )
                    and consistency.get(
                        "consistent"
                    )
                )
                else (
                    "ready_not_started"
                    if preflight.get(
                        "preflight_ready"
                    )
                    else "not_ready"
                )
            ),
        "failed_checks":
            list(
                consistency.get(
                    "failed_checks",
                    [],
                )
            ),
    }
