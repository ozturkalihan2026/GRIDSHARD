from fastapi.testclient import TestClient

from app.main import app


client=TestClient(app)


def test_run_catalog_endpoint():
    body=client.get(
        "/web-test/test-runs"
    ).json()

    assert body["active_test_run_id"]=="web-test-alpha.116"
    assert body["run_count"]>=1
    assert any(
        item["active"]
        and item["test_run_id"]
        == "web-test-alpha.116"
        for item in body["runs"]
    )
