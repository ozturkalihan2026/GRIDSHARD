from fastapi.testclient import TestClient
from app.main import app, telemetry_service

client=TestClient(app)


def test_operation_snapshot_audit_is_minimal():
    telemetry_service.clear()

    response=client.post(
        "/web-test/audit/operation-snapshot"
    )

    assert response.status_code==200
    body=response.json()
    assert body["test_run_id"]=="web-test-beta.4.3"

    events=telemetry_service.events(
        event_type=
            "web_test_operation_snapshot",
    )

    assert len(events)==1
    metadata=events[0]["metadata"]

    assert set(metadata.keys())=={
        "test_run_id",
        "operational_state",
        "preflight_ready",
        "run_started",
        "consistency_status",
    }

    for forbidden in (
        "player_id",
        "profile",
        "battle_pool",
        "modules",
        "settings",
    ):
        assert forbidden not in metadata
