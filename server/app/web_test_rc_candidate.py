from __future__ import annotations

from typing import Any


def build_rc_candidate_summary(
    *,
    version: str,
    build: str,
    test_run_id: str,
    operation_readiness: dict[str, Any],
    go_no_go: dict[str, Any],
    data_health: dict[str, Any],
    run_summary: dict[str, Any],
) -> dict[str, Any]:
    behavior_signals = dict(
        go_no_go.get(
            "behavior_signals",
            {},
        )
    )

    insufficient_behavior_signals = sorted(
        name
        for name,value
        in behavior_signals.items()
        if value.get(
            "status"
        )
        == "insufficient_data"
    )

    technical_ready = bool(
        operation_readiness.get(
            "ready"
        )
    )

    return {
        "version": version,
        "build": build,
        "test_run_id":
            test_run_id,
        "rc_candidate":
            technical_ready,
        "decision":
            (
                "GO"
                if technical_ready
                else "NO_GO"
            ),
        "technical": {
            "ready":
                technical_ready,
            "checks":
                dict(
                    operation_readiness.get(
                        "checks",
                        {},
                    )
                ),
            "warnings":
                list(
                    operation_readiness.get(
                        "warnings",
                        [],
                    )
                ),
        },
        "data_health": {
            "ready":
                bool(
                    data_health.get(
                        "ready"
                    )
                ),
            "player_data_ready":
                bool(
                    data_health.get(
                        "player_data",
                        {},
                    ).get(
                        "ready"
                    )
                ),
            "telemetry_ready":
                bool(
                    data_health.get(
                        "telemetry",
                        {},
                    ).get(
                        "ready"
                    )
                ),
        },
        "test_run": {
            "lifecycle_state":
                run_summary.get(
                    "lifecycle_state",
                    "empty",
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
            "first_event_at_ms":
                run_summary.get(
                    "first_event_at_ms"
                ),
            "last_event_at_ms":
                run_summary.get(
                    "last_event_at_ms"
                ),
            "measured_duration_ms":
                int(
                    run_summary.get(
                        "measured_duration_ms",
                        0,
                    )
                ),
        },
        "behavior": {
            "blocks_release":
                False,
            "signals":
                behavior_signals,
            "insufficient_signal_count":
                len(
                    insufficient_behavior_signals
                ),
            "insufficient_signals":
                insufficient_behavior_signals,
        },
    }
