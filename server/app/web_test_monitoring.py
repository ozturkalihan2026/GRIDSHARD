from __future__ import annotations
from typing import Any


def build_monitoring_summary(
    *,
    version: str,
    build: str,
    test_run_id: str,
    operation_status: dict[str, Any],
    stability: dict[str, Any],
    run_summary: dict[str, Any],
    kpis: dict[str, Any],
) -> dict[str, Any]:
    return {
        "version":version,
        "build":build,
        "test_run_id":
            test_run_id,
        "operation": {
            "state":
                operation_status.get(
                    "operational_state",
                    "not_ready",
                ),
            "preflight_ready":
                bool(
                    operation_status.get(
                        "preflight_ready"
                    )
                ),
            "run_started":
                bool(
                    operation_status.get(
                        "run_started"
                    )
                ),
            "consistency_status":
                operation_status.get(
                    "consistency_status",
                    "unknown",
                ),
        },
        "stability": {
            "state":
                stability.get(
                    "stability",
                    "not_running",
                ),
            "operation_running_rate":
                float(
                    stability.get(
                        "operation_running_rate",
                        0.0,
                    )
                ),
            "running_to_other_regressions":
                int(
                    stability.get(
                        "running_to_other_regressions",
                        0,
                    )
                ),
        },
        "funnel": {
            "audit_session_starts":
                int(
                    run_summary.get(
                        "audit_session_starts",
                        0,
                    )
                ),
            "audit_session_bounds":
                int(
                    run_summary.get(
                        "audit_session_bounds",
                        0,
                    )
                ),
            "audit_session_finishes":
                int(
                    run_summary.get(
                        "audit_session_finishes",
                        0,
                    )
                ),
            "audit_to_session_rate":
                float(
                    run_summary.get(
                        "audit_to_session_rate",
                        0.0,
                    )
                ),
            "audit_to_finish_rate":
                float(
                    run_summary.get(
                        "audit_to_finish_rate",
                        0.0,
                    )
                ),
            "bound_to_finish_rate":
                float(
                    run_summary.get(
                        "bound_to_finish_rate",
                        0.0,
                    )
                ),
        },
        "operational_kpis": {
            "operation_snapshots":
                int(
                    kpis.get(
                        "operation_snapshots",
                        0,
                    )
                ),
            "operation_running_rate":
                float(
                    kpis.get(
                        "operation_running_rate",
                        0.0,
                    )
                ),
            "stability_snapshots":
                int(
                    kpis.get(
                        "stability_snapshots",
                        0,
                    )
                ),
            "stability_stable_rate":
                float(
                    kpis.get(
                        "stability_stable_rate",
                        0.0,
                    )
                ),
            "launch_attempts":
                int(
                    kpis.get(
                        "launch_attempts",
                        0,
                    )
                ),
            "launch_ready_rate":
                float(
                    kpis.get(
                        "launch_ready_rate",
                        0.0,
                    )
                ),
        },
        "observational_only":
            True,
    }
