from app.telemetry import InMemoryTelemetryService, TelemetryEvent
from app.web_test_metrics import WebTestKpiService


def start_event(event_id,run_id):
    return TelemetryEvent(
        event_id=event_id,
        event_type="web_test_run_started",
        timestamp_ms=1,
        metadata={
            "test_run_id":run_id,
            "preflight_ready":True,
            "build":"x",
        },
    )


def test_run_started_kpis_count_events_and_unique_runs():
    telemetry=InMemoryTelemetryService()
    telemetry.record(start_event("a","r1"))
    telemetry.record(start_event("b","r2"))

    kpis=WebTestKpiService(
        telemetry
    ).snapshot()

    assert kpis["run_started_events"]==2
    assert kpis["started_test_runs"]==2
