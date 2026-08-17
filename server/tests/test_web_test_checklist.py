from app.web_test_checklist import build_first_run_checklist


def test_checklist_ready_when_all_technical_checks_pass():
    result=build_first_run_checklist(
        version="2.0.0-alpha.108",
        build="web-test-alpha.108",
        test_run_id="run-a",
        launch_readiness={
            "launch_ready":True,
            "test_run_id":"run-a",
        },
        data_health={
            "player_data":{
                "ready":True,
                "backup_available":False,
                "backup_ready":False,
                "player_count":0,
            },
            "telemetry":{
                "ready":True,
                "backup_available":False,
                "backup_ready":False,
                "event_count":0,
                "retention_limit":50000,
                "retention_active":False,
            },
        },
        rc_candidate={
            "rc_candidate":True,
            "test_run_id":"run-a",
            "behavior":{
                "insufficient_signal_count":3,
                "insufficient_signals":["x"],
            },
        },
        run_summary={
            "launch_attempts":0,
            "audit_session_starts":0,
            "audit_session_bounds":0,
            "audit_session_finishes":0,
        },
    )

    assert result["ready"] is True
    assert result["failed_checks"]==[]
    assert result["behavior"]["blocks_launch"] is False
    assert result["behavior"]["insufficient_signal_count"]==3


def test_checklist_notes_missing_backups_without_blocking_empty_store():
    result=build_first_run_checklist(
        version="x",
        build="x",
        test_run_id="run",
        launch_readiness={
            "launch_ready":True,
            "test_run_id":"run",
        },
        data_health={
            "player_data":{
                "ready":True,
                "player_count":2,
                "backup_ready":False,
            },
            "telemetry":{
                "ready":True,
                "event_count":10,
                "backup_ready":False,
                "retention_limit":100,
            },
        },
        rc_candidate={
            "rc_candidate":True,
            "test_run_id":"run",
            "behavior":{},
        },
        run_summary={},
    )

    assert result["ready"] is True
    assert len(result["notes"])==2
