from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_preflight_endpoint():
    body=client.get(
        "/web-test/preflight"
    ).json()

    assert body["version"]=="2.0.0-beta.23"
    assert body["build"]=="web-test-beta.13"
    assert body["test_run_id"]=="web-test-beta.13"
    assert "preflight_ready" in body
    assert "checklist" in body
    assert "launch" in body
    assert "rc_candidate" in body
    assert "data_health" in body
    assert "test_run" in body
    assert "operational_kpis" in body
    assert body["behavior_blocks_preflight"] is False
