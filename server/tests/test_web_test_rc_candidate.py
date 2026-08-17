from app.web_test_rc_candidate import (
    build_rc_candidate_summary,
)


def test_rc_candidate_uses_technical_readiness_as_release_decision():
    result=build_rc_candidate_summary(
        version="2.0.0-alpha.126",
        build="web-test-alpha.126",
        test_run_id="run-a",
        operation_readiness={
            "ready":True,
            "checks":{
                "release_ready":True,
            },
            "warnings":[],
        },
        go_no_go={
            "behavior_signals":{
                "audit_to_finish":{
                    "status":
                        "insufficient_data",
                    "sample":2,
                    "value":0.5,
                },
            },
        },
        data_health={
            "ready":True,
            "player_data":{
                "ready":True,
            },
            "telemetry":{
                "ready":True,
            },
        },
        run_summary={
            "lifecycle_state":"active",
            "audit_session_starts":2,
            "audit_session_bounds":1,
            "audit_session_finishes":1,
            "audit_to_session_rate":0.5,
            "audit_to_finish_rate":0.5,
            "bound_to_finish_rate":1.0,
            "first_event_at_ms":100,
            "last_event_at_ms":500,
            "measured_duration_ms":400,
        },
    )

    assert result["rc_candidate"] is True
    assert result["decision"]=="GO"
    assert result["behavior"]["blocks_release"] is False
    assert result["behavior"]["insufficient_signal_count"]==1
    assert result["test_run"]["measured_duration_ms"]==400


def test_rc_candidate_false_when_operation_not_ready():
    result=build_rc_candidate_summary(
        version="x",
        build="x",
        test_run_id="run",
        operation_readiness={
            "ready":False,
            "checks":{
                "telemetry_ready":False,
            },
            "warnings":[],
        },
        go_no_go={
            "behavior_signals":{},
        },
        data_health={
            "ready":False,
            "player_data":{
                "ready":True,
            },
            "telemetry":{
                "ready":False,
            },
        },
        run_summary={},
    )

    assert result["rc_candidate"] is False
    assert result["decision"]=="NO_GO"
    assert result["data_health"]["telemetry_ready"] is False
