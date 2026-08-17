from fastapi.testclient import TestClient

from app.main import app


client=TestClient(app)


def test_operation_readiness_endpoint():
    body=client.get(
        "/web-test/operation-readiness"
    ).json()

    assert body["server_version"]=="2.0.0-alpha.84"
    assert body["web_test_build"]=="web-test-alpha.84"
    assert body["pvp_protocol_version"]==1
    assert "checks" in body
    assert "warnings" in body
    assert "telemetry_retention_limit" in body
