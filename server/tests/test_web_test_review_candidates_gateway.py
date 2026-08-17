from fastapi.testclient import TestClient
from app.main import app, telemetry_service

client=TestClient(app)


def test_review_candidates_endpoint_waits_without_feedback():
    telemetry_service.clear()
    body=client.get("/web-test/review-candidates").json()

    assert body["test_run_id"]=="web-test-beta.4.3"
    assert body["status"]=="waiting_for_real_data"
    assert body["candidate_count"]==0
    assert body["human_approval_required"] is True
