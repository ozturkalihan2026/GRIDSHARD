from __future__ import annotations
from typing import Any


def build_operation_stability(
    *,
    operation_status: dict[str, Any],
    run_summary: dict[str, Any],
    transition_summary: dict[str, Any],
) -> dict[str, Any]:
    running_rate = float(
        run_summary.get(
            "operation_running_rate",
            0.0,
        )
    )
    regressions = int(
        transition_summary.get(
            "transitions",
            {},
        ).get(
            "running_to_other",
            0,
        )
    )
    current_state = (
        operation_status.get(
            "operational_state",
            "not_ready",
        )
    )

    if current_state != "running":
        stability = "not_running"
    elif (
        regressions > 0
        or running_rate < 0.5
    ):
        stability = "degraded"
    else:
        stability = "stable"

    return {
        "stability":
            stability,
        "current_operational_state":
            current_state,
        "operation_running_rate":
            running_rate,
        "running_to_other_regressions":
            regressions,
        "blocks_launch":
            False,
    }
