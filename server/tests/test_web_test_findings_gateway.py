from fastapi.testclient import TestClient

from app.main import app, telemetry_service

client=TestClient(app)


def test_findings_endpoint_starts_as_insufficient_data():
    telemetry_service.clear()

    body=client.get(
        "/web-test/findings"
    ).json()

    assert body["test_run_id"]=="web-test-beta.5"
    assert body["status"]=="insufficient_data"
    assert body["feedback_count"]==0
    assert body["concerns"]==[]
    assert body["automatic_balance_change"] is False
    assert body["human_review_required"] is True
