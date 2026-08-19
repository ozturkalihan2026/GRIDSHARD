from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_first_run_checklist_endpoint():
    body=client.get(
        "/web-test/first-run-checklist"
    ).json()

    assert body["version"]=="2.0.0-beta.22"
    assert body["build"]=="web-test-beta.13"
    assert body["test_run_id"]=="web-test-beta.13"
    assert "ready" in body
    assert "persistence" in body
    assert "audit_chain" in body
    assert "behavior" in body
    assert body["behavior"]["blocks_launch"] is False
