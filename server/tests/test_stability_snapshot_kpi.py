from app.telemetry import InMemoryTelemetryService, TelemetryEvent
from app.web_test_metrics import WebTestKpiService
from app.web_test_run import build_test_run_summary


def snap(event_id,state,run_id="r"):
    return TelemetryEvent(
        event_id=event_id,
        event_type="web_test_stability_snapshot",
        timestamp_ms=1,
        metadata={
            "test_run_id":run_id,
            "stability":state,
            "operation_running_rate":1.0,
            "running_to_other_regressions":0,
        },
    )


def test_stability_stable_rate_global_and_per_run():
    telemetry=InMemoryTelemetryService()
    telemetry.record(snap("a","stable","r1"))
    telemetry.record(snap("b","degraded","r1"))
    telemetry.record(snap("c","stable","r2"))

    kpis=WebTestKpiService(
        telemetry
    ).snapshot()

    assert kpis["stability_snapshots"]==3
    assert kpis["stability_stable_snapshots"]==2
    assert kpis["stability_stable_rate"]==0.666667

    summary=build_test_run_summary(
        telemetry_service=telemetry,
        test_run_id="r1",
    )

    assert summary["stability_snapshots"]==2
    assert summary["stability_stable_snapshots"]==1
    assert summary["stability_stable_rate"]==0.5
