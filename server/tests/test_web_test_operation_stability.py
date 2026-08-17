from app.web_test_stability import build_operation_stability


def test_stability_not_running_when_current_state_not_running():
    result=build_operation_stability(
        operation_status={
            "operational_state":
                "ready_not_started",
        },
        run_summary={
            "operation_running_rate":1.0,
        },
        transition_summary={
            "transitions":{
                "running_to_other":0,
            },
        },
    )

    assert result["stability"]=="not_running"
    assert result["blocks_launch"] is False


def test_stability_degraded_on_regression():
    result=build_operation_stability(
        operation_status={
            "operational_state":"running",
        },
        run_summary={
            "operation_running_rate":0.8,
        },
        transition_summary={
            "transitions":{
                "running_to_other":1,
            },
        },
    )

    assert result["stability"]=="degraded"


def test_stability_stable_when_running_without_regression():
    result=build_operation_stability(
        operation_status={
            "operational_state":"running",
        },
        run_summary={
            "operation_running_rate":0.75,
        },
        transition_summary={
            "transitions":{
                "running_to_other":0,
            },
        },
    )

    assert result["stability"]=="stable"
