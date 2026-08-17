from app.telemetry import InMemoryTelemetryService, TelemetryEvent
from app.web_test_run import build_test_run_summary


def test_empty_run_lifecycle():
    summary=build_test_run_summary(
        telemetry_service=InMemoryTelemetryService(),
        test_run_id="r",
    )
    assert summary["lifecycle_state"]=="empty"


def test_active_run_lifecycle():
    telemetry=InMemoryTelemetryService()
    telemetry.record(TelemetryEvent(
        event_id="a1",
        event_type="web_test_session_started",
        timestamp_ms=1,
        player_id="p",
        metadata={"test_run_id":"r"},
    ))
    summary=build_test_run_summary(
        telemetry_service=telemetry,
        test_run_id="r",
    )
    assert summary["lifecycle_state"]=="active"


def test_completed_run_lifecycle():
    telemetry=InMemoryTelemetryService()
    telemetry.record(TelemetryEvent(
        event_id="a1",
        event_type="web_test_session_started",
        timestamp_ms=1,
        player_id="p",
        metadata={"test_run_id":"r"},
    ))
    telemetry.record(TelemetryEvent(
        event_id="f1",
        event_type="web_test_session_finished",
        timestamp_ms=2,
        player_id="p",
        session_id="s",
        metadata={
            "test_run_id":"r",
            "audit_event_id":"a1",
            "technical_completed":True,
        },
    ))
    summary=build_test_run_summary(
        telemetry_service=telemetry,
        test_run_id="r",
    )
    assert summary["lifecycle_state"]=="completed"
