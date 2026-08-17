from fastapi.testclient import TestClient

from app.main import (
    app,
    telemetry_service,
)


client=TestClient(app)


def test_session_audit_records_minimal_operational_metadata():
    telemetry_service.clear()

    response=client.post(
        "/web-test/audit/session-start",
        json={
            "player_id":
                "wt-audit-123456",
            "matchmaking_started_at_ms":
                123456,
        },
    )

    assert response.status_code==200
    body=response.json()
    assert body["accepted"] is True

    events=telemetry_service.events(
        player_id=
            "wt-audit-123456",
        event_type=
            "web_test_session_started",
    )

    assert len(events)==1
    event=events[0]
    assert event["timestamp_ms"]==123456
    assert event["metadata"]["build"]=="web-test-beta.2"
    assert event["metadata"]["server_version"]=="2.0.0-beta.2"
    assert event["metadata"]["pvp_protocol_version"]==1
    assert "operation_ready" in event["metadata"]
    assert "release_ready" in event["metadata"]
    assert "retention_limit" in event["metadata"]


def test_session_audit_does_not_store_profile_or_battle_content():
    telemetry_service.clear()

    client.post(
        "/web-test/audit/session-start",
        json={
            "player_id":
                "wt-audit-654321",
            "matchmaking_started_at_ms":
                999,
        },
    )

    event=telemetry_service.events(
        player_id=
            "wt-audit-654321",
        event_type=
            "web_test_session_started",
    )[0]

    metadata=event["metadata"]

    for forbidden in (
        "display_name",
        "profile",
        "battle_pool",
        "initial_modules",
        "settings",
    ):
        assert forbidden not in metadata


def test_session_audit_is_idempotent_for_same_player_and_timestamp():
    telemetry_service.clear()

    payload={
        "player_id":
            "wt-audit-123456",
        "matchmaking_started_at_ms":
            123456,
    }

    first=client.post(
        "/web-test/audit/session-start",
        json=payload,
    ).json()

    second=client.post(
        "/web-test/audit/session-start",
        json=payload,
    ).json()

    assert first["accepted"] is True
    assert second["accepted"] is False
    assert second["duplicate"] is True
