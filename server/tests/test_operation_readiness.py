from app.web_test_operation_readiness import (
    build_operation_readiness,
)


def base_manifest():
    return {
        "server_version":
            "2.0.0-beta.15",
        "web_test_build":
            "web-test-beta.13",
        "pvp_protocol_version": 1,
        "release_ready": True,
        "test_run_id":
            "web-test-beta.13",
    }


def base_health():
    return {
        "ready": True,
        "player_data": {
            "ready": True,
            "player_count": 0,
            "backup_ready": False,
        },
        "telemetry": {
            "ready": True,
            "event_count": 0,
            "retention_limit": 50000,
            "backup_ready": False,
        },
    }


def base_rc():
    return {
        "ready": True,
        "critical_failures": [],
    }


def test_operation_readiness_true_when_all_critical_checks_pass():
    result=build_operation_readiness(
        manifest=base_manifest(),
        data_health=base_health(),
        rc_report=base_rc(),
    )

    assert result["ready"] is True
    assert all(
        result["checks"].values()
    )
    assert result["warnings"]==[]


def test_missing_telemetry_health_blocks_operation_readiness():
    health=base_health()
    health["telemetry"]["ready"]=False

    result=build_operation_readiness(
        manifest=base_manifest(),
        data_health=health,
        rc_report=base_rc(),
    )

    assert result["ready"] is False
    assert result["checks"]["telemetry_ready"] is False


def test_existing_data_without_backup_is_warning_not_blocker():
    health=base_health()
    health["player_data"]["player_count"]=2
    health["telemetry"]["event_count"]=4

    result=build_operation_readiness(
        manifest=base_manifest(),
        data_health=health,
        rc_report=base_rc(),
    )

    assert result["ready"] is True
    assert len(result["warnings"])==2
