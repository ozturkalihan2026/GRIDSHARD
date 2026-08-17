from app.web_test_launch import (
    build_launch_snapshot,
)


def base():
    version="2.0.0-alpha.115"
    build="web-test-alpha.115"
    run="run-100"
    return version,build,run


def test_launch_ready_requires_all_technical_checks():
    version,build,run=base()

    result=build_launch_snapshot(
        version=version,
        build=build,
        test_run_id=run,
        manifest={
            "server_version":version,
            "web_test_build":build,
            "test_run_id":run,
        },
        operation_readiness={
            "ready":True,
        },
        rc_candidate={
            "rc_candidate":True,
            "test_run_id":run,
            "behavior":{
                "insufficient_signal_count":4,
            },
        },
        data_health={
            "ready":True,
        },
    )

    assert result["launch_ready"] is True
    assert result["failed_checks"]==[]
    assert result["behavior_blocks_launch"] is False
    assert result["behavior_insufficient_signal_count"]==4


def test_launch_not_ready_when_test_run_mismatches():
    version,build,run=base()

    result=build_launch_snapshot(
        version=version,
        build=build,
        test_run_id=run,
        manifest={
            "server_version":version,
            "web_test_build":build,
            "test_run_id":"other",
        },
        operation_readiness={
            "ready":True,
        },
        rc_candidate={
            "rc_candidate":True,
            "test_run_id":run,
        },
        data_health={
            "ready":True,
        },
    )

    assert result["launch_ready"] is False
    assert "test_run_match" in result["failed_checks"]
