from app.web_test_operation_status import (
    build_operation_status,
)


def test_operation_status_running_when_started_and_consistent():
    result=build_operation_status(
        version="v",
        build="b",
        test_run_id="r",
        preflight={
            "preflight_ready":True,
        },
        run_status={
            "started":True,
        },
        consistency={
            "status":"consistent",
            "consistent":True,
        },
    )

    assert result["operational_state"]=="running"
    assert result["run_started"] is True


def test_operation_status_ready_not_started():
    result=build_operation_status(
        version="v",
        build="b",
        test_run_id="r",
        preflight={
            "preflight_ready":True,
        },
        run_status={
            "started":False,
        },
        consistency={
            "status":"not_started",
            "consistent":True,
        },
    )

    assert result["operational_state"]=="ready_not_started"
