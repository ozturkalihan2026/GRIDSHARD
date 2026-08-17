from __future__ import annotations

from typing import Any


DEFAULT_MIN_SAMPLE = 10


def _behavior_signal(
    *,
    value: float,
    sample: int,
    min_sample: int,
) -> dict[str, Any]:
    return {
        "status":
            (
                "observed"
                if sample >= min_sample
                else "insufficient_data"
            ),
        "sample": sample,
        "minimum_sample":
            min_sample,
        "value": value,
    }


def build_go_no_go(
    *,
    operation_readiness: dict[str, Any],
    kpis: dict[str, Any],
    min_sample: int = DEFAULT_MIN_SAMPLE,
) -> dict[str, Any]:
    technical_ready = bool(
        operation_readiness.get(
            "ready"
        )
    )

    behavior = {
        "audit_to_session": _behavior_signal(
            value=float(
                kpis.get(
                    "audit_to_session_rate",
                    0.0,
                )
            ),
            sample=int(
                kpis.get(
                    "audit_session_starts",
                    0,
                )
            ),
            min_sample=min_sample,
        ),
        "match_completion": _behavior_signal(
            value=float(
                kpis.get(
                    "match_completion_rate",
                    0.0,
                )
            ),
            sample=int(
                kpis.get(
                    "started_matches",
                    0,
                )
            ),
            min_sample=min_sample,
        ),
        "second_match_transition": _behavior_signal(
            value=float(
                kpis.get(
                    "second_match_transition_rate",
                    0.0,
                )
            ),
            sample=int(
                kpis.get(
                    "players_with_completed_match",
                    0,
                )
            ),
            min_sample=min_sample,
        ),
        "audit_to_finish": _behavior_signal(
            value=float(
                kpis.get(
                    "audit_to_finish_rate",
                    0.0,
                )
            ),
            sample=int(
                kpis.get(
                    "audit_session_starts",
                    0,
                )
            ),
            min_sample=min_sample,
        ),
        "bound_to_finish": _behavior_signal(
            value=float(
                kpis.get(
                    "bound_to_finish_rate",
                    0.0,
                )
            ),
            sample=int(
                kpis.get(
                    "audit_session_bounds",
                    0,
                )
            ),
            min_sample=min_sample,
        ),
    }

    return {
        "decision":
            (
                "GO"
                if technical_ready
                else "NO_GO"
            ),
        "technical_ready":
            technical_ready,
        "test_run_id":
            operation_readiness.get(
                "test_run_id"
            ),
        "technical_checks":
            dict(
                operation_readiness.get(
                    "checks",
                    {},
                )
            ),
        "technical_warnings":
            list(
                operation_readiness.get(
                    "warnings",
                    [],
                )
            ),
        "behavior_signals":
            behavior,
        "behavior_blocks_release":
            False,
        "minimum_behavior_sample":
            min_sample,
    }
