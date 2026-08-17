from fastapi.testclient import TestClient

from app.main import (
    app,
    telemetry_service,
)


client=TestClient(app)


def test_current_test_run_is_non_personal_server_identifier():
    body=client.get(
        "/web-test/test-run"
    ).json()

    assert body["test_run_id"]=="web-test-alpha.107"
    assert body["build"]=="web-test-alpha.107"


def test_audit_chain_carries_same_test_run_id():
    telemetry_service.clear()

    started=client.post(
        "/web-test/audit/session-start",
        json={
            "player_id":"wt-run-123456",
            "matchmaking_started_at_ms":100,
        },
    ).json()

    assert started["test_run_id"]=="web-test-alpha.107"

    client.post(
        "/web-test/audit/session-bind",
        json={
            "audit_event_id":
                started["audit_event_id"],
            "session_id":"s1",
        },
    )
    client.post(
        "/web-test/audit/session-finish",
        json={
            "audit_event_id":
                started["audit_event_id"],
            "session_id":"s1",
        },
    )

    events=telemetry_service.events(
        player_id="wt-run-123456"
    )

    assert {
        event["metadata"].get(
            "test_run_id"
        )
        for event in events
        if event["event_type"].startswith(
            "web_test_session_"
        )
    }=={"web-test-alpha.107"}

    summary=client.get(
        "/web-test/test-runs/web-test-alpha.107/summary"
    ).json()

    assert summary["audit_session_starts"]==1
    assert summary["audit_session_bounds"]==1
    assert summary["audit_session_finishes"]==1
