from fastapi.testclient import TestClient

from app.main import (
    app,
    telemetry_service,
)


client=TestClient(app)


def prepare_bound():
    telemetry_service.clear()

    audit=client.post(
        "/web-test/audit/session-start",
        json={
            "player_id":
                "wt-finish-123456",
            "matchmaking_started_at_ms":
                100,
        },
    ).json()

    client.post(
        "/web-test/audit/session-bind",
        json={
            "audit_event_id":
                audit["audit_event_id"],
            "session_id":"s-finish",
        },
    )

    return audit["audit_event_id"]


def test_finish_records_minimal_completed_audit():
    audit_event_id=prepare_bound()

    response=client.post(
        "/web-test/audit/session-finish",
        json={
            "audit_event_id":
                audit_event_id,
            "session_id":"s-finish",
        },
    )

    assert response.status_code==200
    body=response.json()
    assert body["accepted"] is True

    events=telemetry_service.events(
        event_type=
            "web_test_session_finished",
    )
    assert len(events)==1
    event=events[0]
    assert event["session_id"]=="s-finish"
    assert event["metadata"]=={
        "audit_event_id":
            audit_event_id,
        "technical_completed":
            True,
        "test_run_id":
            "web-test-alpha.99",
    }


def test_finish_requires_existing_audit_session_binding():
    telemetry_service.clear()

    response=client.post(
        "/web-test/audit/session-finish",
        json={
            "audit_event_id":"missing",
            "session_id":"s-x",
        },
    )

    assert response.status_code==404


def test_finish_is_idempotent():
    audit_event_id=prepare_bound()
    payload={
        "audit_event_id":
            audit_event_id,
        "session_id":"s-finish",
    }

    first=client.post(
        "/web-test/audit/session-finish",
        json=payload,
    ).json()
    second=client.post(
        "/web-test/audit/session-finish",
        json=payload,
    ).json()

    assert first["accepted"] is True
    assert second["duplicate"] is True
