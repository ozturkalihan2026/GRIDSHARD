from app.telemetry import (
    InMemoryTelemetryService,
    TelemetryEvent,
)
from app.web_test_run import compare_test_runs


def add_run(
    telemetry,
    run_id,
    *,
    starts,
    bounds,
    finishes,
):
    for index in range(starts):
        audit=f"{run_id}-a-{index}"
        telemetry.record(TelemetryEvent(
            event_id=audit,
            event_type="web_test_session_started",
            timestamp_ms=index+1,
            player_id=f"p-{index}",
            metadata={"test_run_id":run_id},
        ))

        if index < bounds:
            telemetry.record(TelemetryEvent(
                event_id=f"{audit}-b",
                event_type="web_test_session_bound",
                timestamp_ms=100+index,
                player_id=f"p-{index}",
                session_id=f"s-{index}",
                metadata={
                    "test_run_id":run_id,
                    "audit_event_id":audit,
                },
            ))

        if index < finishes:
            telemetry.record(TelemetryEvent(
                event_id=f"{audit}-f",
                event_type="web_test_session_finished",
                timestamp_ms=200+index,
                player_id=f"p-{index}",
                session_id=f"s-{index}",
                metadata={
                    "test_run_id":run_id,
                    "audit_event_id":audit,
                    "technical_completed":True,
                },
            ))


def test_run_comparison_reports_aggregate_rate_deltas():
    telemetry=InMemoryTelemetryService()
    add_run(
        telemetry,
        "base",
        starts=10,
        bounds=5,
        finishes=4,
    )
    add_run(
        telemetry,
        "candidate",
        starts=10,
        bounds=8,
        finishes=6,
    )

    result=compare_test_runs(
        telemetry_service=telemetry,
        baseline_test_run_id="base",
        candidate_test_run_id="candidate",
    )

    assert (
        result["metrics"][
            "audit_to_session_rate"
        ]["delta_percentage_points"]
        == 30.0
    )
    assert (
        result["metrics"][
            "audit_to_finish_rate"
        ]["delta_percentage_points"]
        == 20.0
    )
    assert "players" not in result
    assert "player_id" not in result
