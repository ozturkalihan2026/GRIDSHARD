from app.web_test_run import (
    build_test_run_go_no_go,
)


def test_active_run_go_no_go_uses_technical_readiness():
    result=build_test_run_go_no_go(
        test_run_id="run-a",
        active_test_run_id="run-a",
        operation_readiness={
            "ready":True,
        },
        run_summary={
            "audit_session_starts":12,
            "audit_session_bounds":9,
            "audit_to_session_rate":0.75,
            "audit_to_finish_rate":0.5,
            "bound_to_finish_rate":0.666667,
        },
        min_sample=10,
    )

    assert result["decision"]=="GO"
    assert result["historical_run"] is False
    assert (
        result["behavior_signals"][
            "audit_to_finish"
        ]["status"]
        == "observed"
    )
    assert (
        result["behavior_signals"][
            "bound_to_finish"
        ]["status"]
        == "insufficient_data"
    )


def test_historical_run_does_not_change_current_technical_decision():
    result=build_test_run_go_no_go(
        test_run_id="old-run",
        active_test_run_id="active-run",
        operation_readiness={
            "ready":False,
        },
        run_summary={},
    )

    assert result["historical_run"] is True
    assert result["decision"]=="NO_GO"
    assert result["behavior_blocks_release"] is False
