from __future__ import annotations

from typing import Any

from .telemetry import InMemoryTelemetryService


def build_test_run_summary(
    *,
    telemetry_service: InMemoryTelemetryService,
    test_run_id: str,
) -> dict[str, Any]:
    events = [
        event
        for event in telemetry_service.events()
        if (
            event.get(
                "metadata",
                {},
            ).get(
                "test_run_id"
            )
            == test_run_id
        )
    ]

    started = [
        event
        for event in events
        if event["event_type"]
        == "web_test_session_started"
    ]
    bound = [
        event
        for event in events
        if event["event_type"]
        == "web_test_session_bound"
    ]
    finished = [
        event
        for event in events
        if (
            event["event_type"]
            == "web_test_session_finished"
            and event.get(
                "metadata",
                {},
            ).get(
                "technical_completed"
            )
        )
    ]

    started_ids = {
        event["event_id"]
        for event in started
    }
    bound_sources = {
        event["metadata"].get(
            "audit_event_id"
        )
        for event in bound
        if event["metadata"].get(
            "audit_event_id"
        )
    }
    finished_sources = {
        event["metadata"].get(
            "audit_event_id"
        )
        for event in finished
        if event["metadata"].get(
            "audit_event_id"
        )
    }

    bound_count = len(
        started_ids
        & bound_sources
    )
    finish_count = len(
        started_ids
        & finished_sources
    )

    return {
        "test_run_id": test_run_id,
        "audit_session_starts":
            len(started_ids),
        "audit_session_bounds":
            bound_count,
        "audit_session_finishes":
            finish_count,
        "audit_to_session_rate":
            round(
                (
                    bound_count
                    / len(started_ids)
                )
                if started_ids
                else 0.0,
                6,
            ),
        "audit_to_finish_rate":
            round(
                (
                    finish_count
                    / len(started_ids)
                )
                if started_ids
                else 0.0,
                6,
            ),
        "bound_to_finish_rate":
            round(
                (
                    finish_count
                    / bound_count
                )
                if bound_count
                else 0.0,
                6,
            ),
        "event_count":
            len(events),
    }


def build_test_run_go_no_go(
    *,
    test_run_id: str,
    active_test_run_id: str,
    operation_readiness: dict[str, Any],
    run_summary: dict[str, Any],
    min_sample: int = 10,
) -> dict[str, Any]:
    def signal(
        value: float,
        sample: int,
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

    started = int(
        run_summary.get(
            "audit_session_starts",
            0,
        )
    )
    bound = int(
        run_summary.get(
            "audit_session_bounds",
            0,
        )
    )

    return {
        "test_run_id":
            test_run_id,
        "active_test_run_id":
            active_test_run_id,
        "historical_run":
            test_run_id
            != active_test_run_id,
        "decision":
            (
                "GO"
                if operation_readiness.get(
                    "ready"
                )
                else "NO_GO"
            ),
        "technical_ready":
            bool(
                operation_readiness.get(
                    "ready"
                )
            ),
        "behavior_blocks_release":
            False,
        "behavior_signals": {
            "audit_to_session":
                signal(
                    float(
                        run_summary.get(
                            "audit_to_session_rate",
                            0.0,
                        )
                    ),
                    started,
                ),
            "audit_to_finish":
                signal(
                    float(
                        run_summary.get(
                            "audit_to_finish_rate",
                            0.0,
                        )
                    ),
                    started,
                ),
            "bound_to_finish":
                signal(
                    float(
                        run_summary.get(
                            "bound_to_finish_rate",
                            0.0,
                        )
                    ),
                    bound,
                ),
        },
    }


def build_test_run_catalog(
    *,
    telemetry_service: InMemoryTelemetryService,
    active_test_run_id: str,
) -> dict[str, Any]:
    run_ids = {
        str(
            event.get(
                "metadata",
                {},
            ).get(
                "test_run_id"
            )
        )
        for event in telemetry_service.events()
        if event.get(
            "metadata",
            {},
        ).get(
            "test_run_id"
        )
    }

    run_ids.add(
        active_test_run_id
    )

    runs = []

    for run_id in sorted(
        run_ids
    ):
        summary = build_test_run_summary(
            telemetry_service=
                telemetry_service,
            test_run_id=run_id,
        )

        runs.append({
            "test_run_id":
                run_id,
            "active":
                run_id
                == active_test_run_id,
            "audit_session_starts":
                summary[
                    "audit_session_starts"
                ],
            "audit_session_bounds":
                summary[
                    "audit_session_bounds"
                ],
            "audit_session_finishes":
                summary[
                    "audit_session_finishes"
                ],
            "event_count":
                summary[
                    "event_count"
                ],
        })

    return {
        "active_test_run_id":
            active_test_run_id,
        "run_count":
            len(runs),
        "runs":
            runs,
    }
