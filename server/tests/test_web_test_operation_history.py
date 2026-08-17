from app.telemetry import InMemoryTelemetryService, TelemetryEvent
from app.web_test_run import build_operation_history_summary


def snap(event_id,state,timestamp):
    return TelemetryEvent(
        event_id=event_id,
        event_type="web_test_operation_snapshot",
        timestamp_ms=timestamp,
        metadata={
            "test_run_id":"r",
            "operational_state":state,
        },
    )


def test_operation_history_is_aggregate_only():
    telemetry=InMemoryTelemetryService()
    telemetry.record(snap("a","not_ready",100))
    telemetry.record(snap("b","ready_not_started",200))
    telemetry.record(snap("c","running",300))
    telemetry.record(snap("d","running",400))

    result=build_operation_history_summary(
        telemetry_service=telemetry,
        test_run_id="r",
    )

    assert result["snapshot_count"]==4
    assert result["state_counts"]=={
        "not_ready":1,
        "ready_not_started":1,
        "running":2,
    }
    assert result["first_snapshot_at_ms"]==100
    assert result["last_snapshot_at_ms"]==400
    assert "players" not in result
