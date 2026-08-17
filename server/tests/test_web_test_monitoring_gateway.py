from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_monitoring_endpoint():
    body=client.get(
        "/web-test/monitoring"
    ).json()

    assert body["version"]=="2.0.0-alpha.132"
    assert body["build"]=="web-test-alpha.132"
    assert body["test_run_id"]=="web-test-alpha.132"
    assert "operation" in body
    assert "stability" in body
    assert "funnel" in body
    assert "operational_kpis" in body
    assert body["observational_only"] is True
