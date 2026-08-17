from app.telemetry import InMemoryTelemetryService, TelemetryEvent
from app.web_test_metrics import WebTestKpiService
from app.web_test_run import build_test_run_summary


def snapshot(event_id,ready,run_id="r"):
    return TelemetryEvent(
        event_id=event_id,
        event_type="web_test_preflight_snapshot",
        timestamp_ms=1,
        metadata={
            "test_run_id":run_id,
            "preflight_ready":ready,
            "failed_checks":[],
            "checklist_snapshots":0,
            "launch_attempts":0,
        },
    )


def test_preflight_ready_rate_global_and_per_run():
    telemetry=InMemoryTelemetryService()
    telemetry.record(snapshot("a",True,"r1"))
    telemetry.record(snapshot("b",False,"r1"))
    telemetry.record(snapshot("c",True,"r2"))

    kpis=WebTestKpiService(
        telemetry
    ).snapshot()

    assert kpis["preflight_snapshots"]==3
    assert kpis["preflight_ready_snapshots"]==2
    assert kpis["preflight_ready_rate"]==0.666667

    summary=build_test_run_summary(
        telemetry_service=telemetry,
        test_run_id="r1",
    )

    assert summary["preflight_snapshots"]==2
    assert summary["preflight_ready_snapshots"]==1
    assert summary["preflight_ready_rate"]==0.5
