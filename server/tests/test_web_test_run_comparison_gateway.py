from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_run_comparison_endpoint():
    body=client.get(
        "/web-test/test-runs/compare",
        params={
            "baseline_test_run_id":"old",
            "candidate_test_run_id":"web-test-beta.4.1",
        },
    ).json()

    assert body["baseline_test_run_id"]=="old"
    assert body["candidate_test_run_id"]=="web-test-beta.4.1"
    assert "metrics" in body
