from app.telemetry import InMemoryTelemetryService, TelemetryEvent
from app.web_test_run import build_operation_transition_summary


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


def test_operation_transition_summary_counts_only_aggregate_changes():
    telemetry=InMemoryTelemetryService()
    telemetry.record(snap("a","not_ready",100))
    telemetry.record(snap("b","ready_not_started",200))
    telemetry.record(snap("c","running",300))
    telemetry.record(snap("d","running",400))
    telemetry.record(snap("e","not_ready",500))

    result=build_operation_transition_summary(
        telemetry_service=telemetry,
        test_run_id="r",
    )

    assert result["snapshot_count"]==5
    assert result["transition_count"]==3
    assert result["transitions"]=={
        "not_ready_to_ready_not_started":1,
        "ready_not_started_to_running":1,
        "running_to_other":1,
    }
    assert "players" not in result
