from app.telemetry import InMemoryTelemetryService, TelemetryEvent
from app.web_test_run import compare_test_runs


def add_starts(telemetry, run_id, count):
    for i in range(count):
        telemetry.record(TelemetryEvent(
            event_id=f"{run_id}-{i}",
            event_type="web_test_session_started",
            timestamp_ms=i,
            player_id=f"p-{i}",
            metadata={"test_run_id":run_id},
        ))


def test_comparison_marks_insufficient_data_when_one_run_small():
    telemetry=InMemoryTelemetryService()
    add_starts(telemetry,"a",10)
    add_starts(telemetry,"b",4)

    result=compare_test_runs(
        telemetry_service=telemetry,
        baseline_test_run_id="a",
        candidate_test_run_id="b",
        minimum_sample=10,
    )

    assert result["comparison_status"]=="insufficient_data"
    assert result["baseline_sample"]==10
    assert result["candidate_sample"]==4
    assert result["statistical_significance_claimed"] is False


def test_comparison_marks_comparable_when_both_meet_threshold():
    telemetry=InMemoryTelemetryService()
    add_starts(telemetry,"a",10)
    add_starts(telemetry,"b",12)

    result=compare_test_runs(
        telemetry_service=telemetry,
        baseline_test_run_id="a",
        candidate_test_run_id="b",
        minimum_sample=10,
    )

    assert result["comparison_status"]=="comparable"
    assert result["minimum_sample"]==10
