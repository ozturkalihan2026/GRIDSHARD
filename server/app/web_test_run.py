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
