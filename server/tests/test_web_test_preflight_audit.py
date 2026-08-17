from fastapi.testclient import TestClient
from app.main import app, telemetry_service

client=TestClient(app)


def test_preflight_snapshot_audit_is_minimal():
    telemetry_service.clear()

    response=client.post(
        "/web-test/audit/preflight-snapshot"
    )

    assert response.status_code==200
    assert response.json()[
        "test_run_id"
    ]=="web-test-alpha.118"

    events=telemetry_service.events(
        event_type=
            "web_test_preflight_snapshot",
    )
    assert len(events)==1
    metadata=events[0]["metadata"]

    assert set(metadata.keys())=={
        "test_run_id",
        "preflight_ready",
        "failed_checks",
        "checklist_snapshots",
        "launch_attempts",
    }

    for forbidden in (
        "player_id",
        "profile",
        "modules",
        "battle_pool",
        "settings",
    ):
        assert forbidden not in metadata
