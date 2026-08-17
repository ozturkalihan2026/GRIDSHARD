from fastapi.testclient import TestClient
from app.main import app, telemetry_service

client=TestClient(app)


def test_checklist_snapshot_audit_is_minimal():
    telemetry_service.clear()

    response=client.post(
        "/web-test/audit/checklist-snapshot"
    )

    assert response.status_code==200
    body=response.json()
    assert body["test_run_id"]=="web-test-beta.3"

    events=telemetry_service.events(
        event_type=
            "web_test_checklist_snapshot",
    )

    assert len(events)==1
    metadata=events[0]["metadata"]
    assert set(metadata.keys())=={
        "test_run_id",
        "checklist_ready",
        "failed_checks",
        "note_count",
    }
    assert "player_id" not in metadata
    assert "profile" not in metadata
    assert "modules" not in metadata
