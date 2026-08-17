from app.web_test_run_consistency import (
    build_run_started_consistency,
)


def test_unstarted_run_is_not_error():
    result=build_run_started_consistency(
        active_test_run_id="r",
        run_status={
            "started":False,
            "test_run_id":"r",
        },
        preflight={
            "test_run_id":"r",
        },
    )

    assert result["status"]=="not_started"
    assert result["consistent"] is True


def test_started_run_requires_matching_preflight_run():
    result=build_run_started_consistency(
        active_test_run_id="r",
        run_status={
            "started":True,
            "test_run_id":"r",
        },
        preflight={
            "test_run_id":"other",
        },
    )

    assert result["status"]=="mismatch"
    assert result["consistent"] is False
    assert "preflight_run_match" in result["failed_checks"]
