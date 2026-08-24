from fastapi.testclient import TestClient
from app.main import app, telemetry_service

client=TestClient(app)


def test_run_report_endpoint_is_available():
    telemetry_service.clear()

    body=client.get(
        "/web-test/test-run/report"
    ).json()

    assert body["version"]=="2.0.0-beta.28"
    assert body["build"]=="web-test-beta.13"
    assert body["test_run_id"]=="web-test-beta.13"
    assert body["status"]=="not_started"
    assert "monitoring" in body
    assert "operation_history" in body
    assert "stability_history" in body
