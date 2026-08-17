from fastapi.testclient import TestClient

from app.main import (
    app,
    telemetry_service,
)


client=TestClient(app)


def start_audit():
    telemetry_service.clear()

    return client.post(
        "/web-test/audit/session-start",
        json={
            "player_id":
                "wt-bind-123456",
            "matchmaking_started_at_ms":
                555,
        },
    ).json()


def test_bind_links_audit_event_to_real_session():
    audit=start_audit()

    response=client.post(
        "/web-test/audit/session-bind",
        json={
            "audit_event_id":
                audit[
                    "audit_event_id"
                ],
            "session_id":
                "match-abc",
        },
    )

    assert response.status_code==200
    body=response.json()
    assert body["accepted"] is True
    assert body["session_id"]=="match-abc"

    events=telemetry_service.events(
        player_id="wt-bind-123456",
        event_type=
            "web_test_session_bound",
    )

    assert len(events)==1
    assert events[0]["session_id"]=="match-abc"
    assert (
        events[0]["metadata"][
            "audit_event_id"
        ]
        == audit["audit_event_id"]
    )


def test_bind_rejects_unknown_audit_event():
    telemetry_service.clear()

    response=client.post(
        "/web-test/audit/session-bind",
        json={
            "audit_event_id":
                "missing-audit",
            "session_id":"match-x",
        },
    )

    assert response.status_code==404


def test_bind_is_idempotent_for_same_audit_and_session():
    audit=start_audit()
    payload={
        "audit_event_id":
            audit["audit_event_id"],
        "session_id":"match-abc",
    }

    first=client.post(
        "/web-test/audit/session-bind",
        json=payload,
    ).json()
    second=client.post(
        "/web-test/audit/session-bind",
        json=payload,
    ).json()

    assert first["accepted"] is True
    assert second["accepted"] is False
    assert second["duplicate"] is True


def test_bound_audit_contains_no_profile_or_battle_content():
    audit=start_audit()
    client.post(
        "/web-test/audit/session-bind",
        json={
            "audit_event_id":
                audit["audit_event_id"],
            "session_id":"match-abc",
        },
    )

    event=telemetry_service.events(
        event_type=
            "web_test_session_bound",
    )[0]

    assert set(
        event["metadata"].keys()
    )=={"audit_event_id"}
