from app.telemetry import (
    InMemoryTelemetryService,
    TelemetryEvent,
)
from app.web_test_run import (
    build_test_run_catalog,
    build_test_run_summary,
)


def event(
    event_id,
    event_type,
    timestamp_ms,
    *,
    run_id="run-a",
    metadata=None,
):
    data={
        "test_run_id":run_id,
    }
    data.update(
        metadata or {}
    )

    return TelemetryEvent(
        event_id=event_id,
        event_type=event_type,
        timestamp_ms=timestamp_ms,
        player_id="p",
        session_id=(
            "s1"
            if event_type
            != "web_test_session_started"
            else None
        ),
        metadata=data,
    )


def test_run_summary_reports_technical_time_window():
    telemetry=InMemoryTelemetryService()

    telemetry.record(
        event(
            "a1",
            "web_test_session_started",
            1000,
        )
    )
    telemetry.record(
        event(
            "b1",
            "web_test_session_bound",
            2500,
            metadata={
                "audit_event_id":"a1",
            },
        )
    )
    telemetry.record(
        event(
            "f1",
            "web_test_session_finished",
            7000,
            metadata={
                "audit_event_id":"a1",
                "technical_completed":True,
            },
        )
    )

    summary=build_test_run_summary(
        telemetry_service=telemetry,
        test_run_id="run-a",
    )

    assert summary["first_event_at_ms"]==1000
    assert summary["last_event_at_ms"]==7000
    assert summary["first_audit_started_at_ms"]==1000
    assert summary["last_audit_finished_at_ms"]==7000
    assert summary["measured_duration_ms"]==6000


def test_empty_run_has_no_personal_timeline_and_zero_duration():
    summary=build_test_run_summary(
        telemetry_service=
            InMemoryTelemetryService(),
        test_run_id="empty-run",
    )

    assert summary["first_event_at_ms"] is None
    assert summary["last_event_at_ms"] is None
    assert summary["first_audit_started_at_ms"] is None
    assert summary["last_audit_finished_at_ms"] is None
    assert summary["measured_duration_ms"]==0


def test_catalog_exposes_only_aggregate_run_window():
    telemetry=InMemoryTelemetryService()
    telemetry.record(
        event(
            "a1",
            "web_test_session_started",
            100,
        )
    )
    telemetry.record(
        event(
            "a2",
            "web_test_session_started",
            900,
        )
    )

    catalog=build_test_run_catalog(
        telemetry_service=telemetry,
        active_test_run_id="run-a",
    )

    run=catalog["runs"][0]
    assert run["first_event_at_ms"]==100
    assert run["last_event_at_ms"]==900
    assert run["measured_duration_ms"]==800
    assert "player_id" not in run
