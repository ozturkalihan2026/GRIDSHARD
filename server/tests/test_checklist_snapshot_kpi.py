from app.telemetry import InMemoryTelemetryService, TelemetryEvent
from app.web_test_metrics import WebTestKpiService
from app.web_test_run import build_test_run_summary


def snapshot(event_id,ready,run_id="r"):
    return TelemetryEvent(
        event_id=event_id,
        event_type="web_test_checklist_snapshot",
        timestamp_ms=1,
        metadata={
            "test_run_id":run_id,
            "checklist_ready":ready,
            "failed_checks":[],
            "note_count":0,
        },
    )


def test_checklist_ready_rate_global_and_per_run():
    telemetry=InMemoryTelemetryService()
    telemetry.record(snapshot("a",True,"r1"))
    telemetry.record(snapshot("b",True,"r1"))
    telemetry.record(snapshot("c",False,"r2"))

    kpis=WebTestKpiService(
        telemetry
    ).snapshot()

    assert kpis["checklist_snapshots"]==3
    assert kpis["checklist_ready_snapshots"]==2
    assert kpis["checklist_ready_rate"]==0.666667

    summary=build_test_run_summary(
        telemetry_service=telemetry,
        test_run_id="r1",
    )

    assert summary["checklist_snapshots"]==2
    assert summary["checklist_ready_snapshots"]==2
    assert summary["checklist_ready_rate"]==1.0
