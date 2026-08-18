from fastapi.testclient import TestClient
from app.main import app, telemetry_service

client=TestClient(app)


def test_web_test_run_start_requires_active_run_id():
    response=client.post(
        "/web-test/test-run/start",
        json={
            "test_run_id":
                "wrong-run",
        },
    )

    assert response.status_code==409


def test_web_test_run_start_is_idempotent_when_preflight_ready():
    telemetry_service.clear()

    payload={
        "test_run_id":
            "web-test-beta.13",
    }

    first=client.post(
        "/web-test/test-run/start",
        json=payload,
    )

    assert first.status_code==200
    assert first.json()["started"] is True
    assert first.json()["accepted"] is True

    second=client.post(
        "/web-test/test-run/start",
        json=payload,
    )

    assert second.status_code==200
    assert second.json()["duplicate"] is True

    events=telemetry_service.events(
        event_type=
            "web_test_run_started",
    )

    assert len(events)==1
    assert events[0]["metadata"]=={
        "test_run_id":
            "web-test-beta.13",
        "preflight_ready":
            True,
        "build":
            "web-test-beta.13",
    }
