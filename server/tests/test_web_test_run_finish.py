from fastapi.testclient import TestClient
from app.main import app, telemetry_service

client=TestClient(app)


def test_finish_requires_started_run():
    telemetry_service.clear()

    response=client.post(
        "/web-test/test-run/finish",
        json={
            "test_run_id":
                "web-test-beta.13",
        },
    )

    assert response.status_code==409


def test_finish_is_idempotent_and_status_becomes_finished():
    telemetry_service.clear()

    start=client.post(
        "/web-test/test-run/start",
        json={
            "test_run_id":
                "web-test-beta.13",
        },
    )
    assert start.status_code==200

    first=client.post(
        "/web-test/test-run/finish",
        json={
            "test_run_id":
                "web-test-beta.13",
        },
    )
    assert first.status_code==200
    assert first.json()["finished"] is True
    assert first.json()["accepted"] is True

    second=client.post(
        "/web-test/test-run/finish",
        json={
            "test_run_id":
                "web-test-beta.13",
        },
    )
    assert second.status_code==200
    assert second.json()["duplicate"] is True

    status=client.get(
        "/web-test/test-run/status"
    ).json()

    assert status["started"] is True
    assert status["finished"] is True
