from fastapi.testclient import TestClient
from app.main import app, telemetry_service

client=TestClient(app)


def test_launch_attempt_audit_records_minimal_gate_snapshot():
    telemetry_service.clear()

    response=client.post(
        "/web-test/audit/launch-attempt",
        json={
            "player_id":
                "wt-launch-123456",
            "attempted_at_ms":
                123456,
        },
    )

    assert response.status_code==200
    body=response.json()
    assert body["test_run_id"]=="web-test-beta.5"

    events=telemetry_service.events(
        player_id=
            "wt-launch-123456",
        event_type=
            "web_test_launch_attempted",
    )

    assert len(events)==1
    metadata=events[0]["metadata"]
    assert metadata["test_run_id"]=="web-test-beta.5"
    assert "launch_ready" in metadata
    assert "failed_checks" in metadata

    for forbidden in (
        "display_name",
        "profile",
        "battle_pool",
        "modules",
        "settings",
    ):
        assert forbidden not in metadata


def test_launch_attempt_same_timestamp_is_idempotent():
    telemetry_service.clear()
    payload={
        "player_id":
            "wt-launch-123456",
        "attempted_at_ms":
            1000,
    }

    first=client.post(
        "/web-test/audit/launch-attempt",
        json=payload,
    ).json()
    second=client.post(
        "/web-test/audit/launch-attempt",
        json=payload,
    ).json()

    assert first["accepted"] is True
    assert second["duplicate"] is True
