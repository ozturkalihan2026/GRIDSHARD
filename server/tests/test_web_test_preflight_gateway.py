from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_preflight_endpoint():
    body=client.get(
        "/web-test/preflight"
    ).json()

    assert body["version"]=="2.0.0-alpha.124"
    assert body["build"]=="web-test-alpha.124"
    assert body["test_run_id"]=="web-test-alpha.124"
    assert "preflight_ready" in body
    assert "checklist" in body
    assert "launch" in body
    assert "rc_candidate" in body
    assert "data_health" in body
    assert "test_run" in body
    assert "operational_kpis" in body
    assert body["behavior_blocks_preflight"] is False
