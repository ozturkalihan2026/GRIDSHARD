from fastapi.testclient import TestClient
from app.main import app, telemetry_service

client=TestClient(app)


def test_run_status_false_before_start():
    telemetry_service.clear()

    body=client.get(
        "/web-test/test-run/status"
    ).json()

    assert body["test_run_id"]=="web-test-alpha.115"
    assert body["started"] is False


def test_run_status_true_after_start():
    telemetry_service.clear()

    response=client.post(
        "/web-test/test-run/start",
        json={
            "test_run_id":
                "web-test-alpha.115",
        },
    )
    assert response.status_code==200

    body=client.get(
        "/web-test/test-run/status"
    ).json()

    assert body["started"] is True
