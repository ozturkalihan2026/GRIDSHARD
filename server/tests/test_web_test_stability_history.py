from app.telemetry import InMemoryTelemetryService, TelemetryEvent
from app.web_test_run import build_stability_history_summary


def snap(event_id,state,timestamp):
    return TelemetryEvent(
        event_id=event_id,
        event_type="web_test_stability_snapshot",
        timestamp_ms=timestamp,
        metadata={
            "test_run_id":"r",
            "stability":state,
        },
    )


def test_stability_history_is_aggregate_only():
    telemetry=InMemoryTelemetryService()
    telemetry.record(snap("a","not_running",100))
    telemetry.record(snap("b","stable",200))
    telemetry.record(snap("c","stable",300))
    telemetry.record(snap("d","degraded",400))

    result=build_stability_history_summary(
        telemetry_service=telemetry,
        test_run_id="r",
    )

    assert result["snapshot_count"]==4
    assert result["stability_counts"]=={
        "not_running":1,
        "stable":2,
        "degraded":1,
    }
    assert result["first_snapshot_at_ms"]==100
    assert result["last_snapshot_at_ms"]==400
    assert "players" not in result
