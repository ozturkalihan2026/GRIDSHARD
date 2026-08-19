from app.build_manifest import build_manifest
from app.release_check import build_release_check
from app.telemetry import InMemoryTelemetryService
from app.web_test_operation_readiness import (
    build_operation_readiness,
)


def test_manifest_publishes_test_run_id():
    telemetry=InMemoryTelemetryService()

    manifest=build_manifest(
        version="2.0.0-beta.21",
        telemetry_service=telemetry,
        test_run_id="run-90",
    )

    assert manifest["test_run_id"]=="run-90"
    assert manifest["release_ready"] is True


def test_blank_test_run_id_fails_release_check():
    telemetry=InMemoryTelemetryService()

    release=build_release_check(
        version="2.0.0-beta.21",
        telemetry_service=telemetry,
        test_run_id_ready=False,
    )

    assert release.ready is False
    assert release.checks["test_run_id"] is False


def test_operation_readiness_requires_manifest_test_run_id():
    result=build_operation_readiness(
        manifest={
            "server_version":"x",
            "web_test_build":"x",
            "pvp_protocol_version":1,
            "release_ready":True,
            "test_run_id":"",
        },
        data_health={
            "player_data":{"ready":True},
            "telemetry":{
                "ready":True,
                "retention_limit":100,
            },
        },
        rc_report={
            "ready":True,
            "critical_failures":[],
        },
    )

    assert result["ready"] is False
    assert result["checks"]["test_run_id"] is False
