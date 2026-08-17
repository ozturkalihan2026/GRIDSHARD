from app.telemetry import (
    InMemoryTelemetryService,
    TelemetryEvent,
)
from app.web_test_findings import (
    build_beta_findings,
)


def event(
    event_id,
    event_type,
    timestamp_ms,
    *,
    session_id=None,
    metadata=None,
):
    return TelemetryEvent(
        event_id=event_id,
        event_type=event_type,
        timestamp_ms=timestamp_ms,
        session_id=session_id,
        metadata=metadata or {},
    )


def test_findings_reports_insufficient_data_without_inventing_concerns():
    telemetry=InMemoryTelemetryService()

    result=build_beta_findings(
        telemetry_service=telemetry,
        test_run_id="r",
        feedback_summary={
            "feedback_count":1,
            "average_ratings":{
                "battle_balance":2.0,
            },
            "low_score_counts":{
                "battle_balance":1,
            },
        },
        minimum_feedback=3,
    )

    assert result["status"]=="insufficient_data"
    assert result["concerns"]==[]
    assert result["automatic_balance_change"] is False
    assert result["human_review_required"] is True


def test_findings_correlates_feedback_with_gameplay_window():
    telemetry=InMemoryTelemetryService()

    for item in [
        event(
            "run-start",
            "web_test_run_started",
            100,
            metadata={
                "test_run_id":"r",
            },
        ),
        event(
            "m1",
            "match_completed",
            200,
            session_id="s1",
        ),
        event(
            "m2",
            "match_completed",
            201,
            session_id="s1",
        ),
        event(
            "change",
            "module_changed",
            220,
            session_id="s1",
        ),
        event(
            "boost",
            "booster_used",
            230,
            session_id="s1",
        ),
        event(
            "credit",
            "circuit_credit_spent",
            240,
            session_id="s1",
            metadata={
                "amount":90,
            },
        ),
        event(
            "run-finish",
            "web_test_run_finished",
            300,
            metadata={
                "test_run_id":"r",
            },
        ),
        event(
            "after",
            "module_changed",
            400,
            session_id="s2",
        ),
    ]:
        telemetry.record(item)

    result=build_beta_findings(
        telemetry_service=telemetry,
        test_run_id="r",
        feedback_summary={
            "feedback_count":3,
            "average_ratings":{
                "usability":4.0,
                "connection":4.0,
                "battle_balance":2.5,
                "module_booster_balance":2.0,
            },
            "low_score_counts":{
                "usability":0,
                "connection":0,
                "battle_balance":1,
                "module_booster_balance":2,
            },
            "note_count":1,
        },
        minimum_feedback=3,
    )

    assert result["status"]=="sufficient"
    assert result["gameplay_signals"]["completed_matches"]==1
    assert result["gameplay_signals"]["module_changes"]==1
    assert result["gameplay_signals"]["boosters_used"]==1
    assert result["gameplay_signals"]["total_circuit_credits_spent"]==90
    assert len(result["concerns"])==2
    assert result["module_booster_context"]["feedback_average"]==2.0
