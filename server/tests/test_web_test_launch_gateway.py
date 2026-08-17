from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_launch_readiness_endpoint():
    body=client.get(
        "/web-test/launch-readiness"
    ).json()

    assert body["version"]=="2.0.0-alpha.111"
    assert body["build"]=="web-test-alpha.111"
    assert body["test_run_id"]=="web-test-alpha.111"
    assert "launch_ready" in body
    assert "checks" in body
    assert "failed_checks" in body
    assert body["behavior_blocks_launch"] is False
