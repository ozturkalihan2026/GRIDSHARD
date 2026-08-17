from app.web_test_go_no_go import build_go_no_go


def operation(ready=True):
    return {
        "ready":ready,
        "checks":{
            "release_ready":ready,
        },
        "warnings":[],
    }


def test_technical_readiness_is_the_only_release_blocker():
    result=build_go_no_go(
        operation_readiness=
            operation(True),
        kpis={
            "audit_session_starts":0,
            "audit_to_session_rate":0,
            "started_matches":0,
            "match_completion_rate":0,
            "players_with_completed_match":0,
            "second_match_transition_rate":0,
        },
    )

    assert result["decision"]=="GO"
    assert result["behavior_blocks_release"] is False
    assert (
        result["behavior_signals"][
            "audit_to_session"
        ]["status"]
        == "insufficient_data"
    )


def test_failed_technical_readiness_is_no_go():
    result=build_go_no_go(
        operation_readiness=
            operation(False),
        kpis={},
    )

    assert result["decision"]=="NO_GO"
    assert result["technical_ready"] is False


def test_behavior_signal_becomes_observed_at_minimum_sample():
    result=build_go_no_go(
        operation_readiness=
            operation(True),
        min_sample=10,
        kpis={
            "audit_session_starts":10,
            "audit_to_session_rate":0.8,
            "started_matches":12,
            "match_completion_rate":0.75,
            "players_with_completed_match":11,
            "second_match_transition_rate":0.4,
        },
    )

    assert (
        result["behavior_signals"][
            "audit_to_session"
        ]["status"]
        == "observed"
    )
    assert (
        result["behavior_signals"][
            "match_completion"
        ]["value"]
        == 0.75
    )
