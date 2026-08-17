from app.telemetry import InMemoryTelemetryService, TelemetryEvent
from app.web_test_run import build_test_run_summary


def test_run_summary_reports_started_state_and_time():
    telemetry=InMemoryTelemetryService()

    telemetry.record(
        TelemetryEvent(
            event_id="run-started-r",
            event_type="web_test_run_started",
            timestamp_ms=1234,
            metadata={
                "test_run_id":"r",
                "preflight_ready":True,
                "build":"web-test-alpha.123",
            },
        )
    )

    summary=build_test_run_summary(
        telemetry_service=telemetry,
        test_run_id="r",
    )

    assert summary["run_started"] is True
    assert summary["run_started_at_ms"]==1234


def test_unstarted_run_summary_reports_false():
    summary=build_test_run_summary(
        telemetry_service=InMemoryTelemetryService(),
        test_run_id="r",
    )

    assert summary["run_started"] is False
    assert summary["run_started_at_ms"] is None
