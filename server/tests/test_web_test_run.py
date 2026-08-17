from app.telemetry import (
    InMemoryTelemetryService,
    TelemetryEvent,
)
from app.web_test_run import (
    build_test_run_summary,
)


def test_run_summary_filters_events_by_test_run_id():
    telemetry=InMemoryTelemetryService()

    for run_id,audit,player in (
        ("run-a","a1","p1"),
        ("run-b","b1","p2"),
    ):
        telemetry.record(
            TelemetryEvent(
                event_id=audit,
                event_type=
                    "web_test_session_started",
                timestamp_ms=1,
                player_id=player,
                metadata={
                    "test_run_id":
                        run_id,
                },
            )
        )

    telemetry.record(
        TelemetryEvent(
            event_id="a1-bound-s1",
            event_type=
                "web_test_session_bound",
            timestamp_ms=2,
            player_id="p1",
            session_id="s1",
            metadata={
                "audit_event_id":"a1",
                "test_run_id":"run-a",
            },
        )
    )
    telemetry.record(
        TelemetryEvent(
            event_id="a1-finished-s1",
            event_type=
                "web_test_session_finished",
            timestamp_ms=3,
            player_id="p1",
            session_id="s1",
            metadata={
                "audit_event_id":"a1",
                "technical_completed":True,
                "test_run_id":"run-a",
            },
        )
    )

    summary=build_test_run_summary(
        telemetry_service=telemetry,
        test_run_id="run-a",
    )

    assert summary["audit_session_starts"]==1
    assert summary["audit_session_bounds"]==1
    assert summary["audit_session_finishes"]==1
    assert summary["audit_to_finish_rate"]==1.0
    assert summary["event_count"]==3
