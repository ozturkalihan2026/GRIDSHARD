from __future__ import annotations
from typing import Any


def build_post_run_report(
    *,
    version: str,
    build: str,
    test_run_id: str,
    run_summary: dict[str, Any],
    monitoring: dict[str, Any],
    operation_history: dict[str, Any],
    operation_transitions: dict[str, Any],
    stability_history: dict[str, Any],
    data_health: dict[str, Any],
) -> dict[str, Any]:
    started = bool(
        run_summary.get(
            "run_started"
        )
    )
    finished = bool(
        run_summary.get(
            "run_finished"
        )
    )
    started_at = run_summary.get(
        "run_started_at_ms"
    )
    finished_at = run_summary.get(
        "run_finished_at_ms"
    )

    duration_ms = None
    if (
        isinstance(started_at, int)
        and isinstance(finished_at, int)
        and finished_at >= started_at
    ):
        duration_ms = (
            finished_at
            - started_at
        )

    return {
        "version":version,
        "build":build,
        "test_run_id":
            test_run_id,
        "status":
            (
                "finished"
                if finished
                else (
                    "running"
                    if started
                    else "not_started"
                )
            ),
        "run_started":
            started,
        "run_finished":
            finished,
        "run_started_at_ms":
            started_at,
        "run_finished_at_ms":
            finished_at,
        "run_duration_ms":
            duration_ms,
        "monitoring":
            monitoring,
        "operation_history":
            operation_history,
        "operation_transitions":
            operation_transitions,
        "stability_history":
            stability_history,
        "data_health":
            data_health,
        "human_test_completed":
            False,
        "note":
            (
                "Bu rapor teknik test koşusunu özetler. "
                "Gerçek insan kullanıcı geri bildirimi ayrıca değerlendirilmelidir."
            ),
    }
