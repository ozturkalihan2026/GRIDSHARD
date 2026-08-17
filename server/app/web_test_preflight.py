from __future__ import annotations
from typing import Any


def build_preflight_report(
    *,
    version: str,
    build: str,
    test_run_id: str,
    checklist: dict[str, Any],
    launch: dict[str, Any],
    rc_candidate: dict[str, Any],
    data_health: dict[str, Any],
    run_summary: dict[str, Any],
    kpis: dict[str, Any],
) -> dict[str, Any]:
    checks = {
        "checklist_ready":
            bool(
                checklist.get(
                    "ready"
                )
            ),
        "launch_ready":
            bool(
                launch.get(
                    "launch_ready"
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
        "test_run_match":
            checklist.get(
                "test_run_id"
            )
            == launch.get(
                "test_run_id"
            )
            == rc_candidate.get(
                "test_run_id"
            )
            == test_run_id,
    }

    return {
        "preflight_ready":
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
        "failed_checks": [
            name
            for name,ok
            in checks.items()
            if not ok
        ],
        "checklist":
            checklist,
        "launch":
            launch,
        "rc_candidate":
            rc_candidate,
        "data_health":
            data_health,
        "test_run": {
            "run_started":
                bool(
                    run_summary.get(
                        "run_started"
                    )
                ),
            "run_started_at_ms":
                run_summary.get(
                    "run_started_at_ms"
                ),
            "lifecycle_state":
                run_summary.get(
                    "lifecycle_state",
                    "empty",
                ),
            "checklist_snapshots":
                int(
                    run_summary.get(
                        "checklist_snapshots",
                        0,
                    )
                ),
            "checklist_ready_rate":
                float(
                    run_summary.get(
                        "checklist_ready_rate",
                        0.0,
                    )
                ),
            "launch_attempts":
                int(
                    run_summary.get(
                        "launch_attempts",
                        0,
                    )
                ),
            "launch_ready_rate":
                float(
                    run_summary.get(
                        "launch_ready_rate",
                        0.0,
                    )
                ),
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
        },
        "operational_kpis": {
            "run_started_events":
                int(
                    kpis.get(
                        "run_started_events",
                        0,
                    )
                ),
            "started_test_runs":
                int(
                    kpis.get(
                        "started_test_runs",
                        0,
                    )
                ),
            "checklist_snapshots":
                int(
                    kpis.get(
                        "checklist_snapshots",
                        0,
                    )
                ),
            "checklist_ready_rate":
                float(
                    kpis.get(
                        "checklist_ready_rate",
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
        "behavior_blocks_preflight":
            False,
    }
