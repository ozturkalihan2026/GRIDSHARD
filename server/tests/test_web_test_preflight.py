from app.web_test_preflight import build_preflight_report


def test_preflight_ready_requires_all_technical_snapshots():
    result=build_preflight_report(
        version="2.0.0-beta.14",
        build="web-test-beta.13",
        test_run_id="run",
        checklist={
            "ready":True,
            "test_run_id":"run",
        },
        launch={
            "launch_ready":True,
            "test_run_id":"run",
        },
        rc_candidate={
            "rc_candidate":True,
            "test_run_id":"run",
        },
        data_health={
            "ready":True,
        },
        run_summary={
            "run_started":True,
            "run_started_at_ms":1234,
            "lifecycle_state":"empty",
        },
        kpis={},
    )

    assert result["preflight_ready"] is True
    assert result["failed_checks"]==[]
    assert result["test_run"]["run_started"] is True
    assert result["test_run"]["run_started_at_ms"]==1234
    assert result["behavior_blocks_preflight"] is False


def test_preflight_detects_test_run_mismatch():
    result=build_preflight_report(
        version="x",
        build="x",
        test_run_id="run",
        checklist={
            "ready":True,
            "test_run_id":"run",
        },
        launch={
            "launch_ready":True,
            "test_run_id":"other",
        },
        rc_candidate={
            "rc_candidate":True,
            "test_run_id":"run",
        },
        data_health={
            "ready":True,
        },
        run_summary={},
        kpis={},
    )

    assert result["preflight_ready"] is False
    assert "test_run_match" in result["failed_checks"]
