from app.telemetry import InMemoryTelemetryService, TelemetryEvent
from app.web_test_metrics import WebTestKpiService
from app.web_test_run import build_test_run_summary


def snap(event_id,state,run_id="r"):
    return TelemetryEvent(
        event_id=event_id,
        event_type="web_test_operation_snapshot",
        timestamp_ms=1,
        metadata={
            "test_run_id":run_id,
            "operational_state":state,
            "preflight_ready":state!="not_ready",
            "run_started":state=="running",
            "consistency_status":"consistent",
        },
    )


def test_operation_running_rate_global_and_per_run():
    telemetry=InMemoryTelemetryService()
    telemetry.record(snap("a","running","r1"))
    telemetry.record(snap("b","ready_not_started","r1"))
    telemetry.record(snap("c","running","r2"))

    kpis=WebTestKpiService(
        telemetry
    ).snapshot()

    assert kpis["operation_snapshots"]==3
    assert kpis["operation_running_snapshots"]==2
    assert kpis["operation_running_rate"]==0.666667

    summary=build_test_run_summary(
        telemetry_service=telemetry,
        test_run_id="r1",
    )

    assert summary["operation_snapshots"]==2
    assert summary["operation_running_snapshots"]==1
    assert summary["operation_running_rate"]==0.5
