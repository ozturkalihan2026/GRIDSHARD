# Historical contract retained for reference; no longer an active release test.
# See docs/archive/server-test-contracts-20261001/README.md for replacements.
from fastapi.testclient import TestClient

from app.main import app


client=TestClient(app)


def test_run_catalog_endpoint():
    body=client.get(
        "/web-test/test-runs"
    ).json()

    assert body["active_test_run_id"]=="web-test-beta.13"
    assert body["run_count"]>=1
    assert any(
        item["active"]
        and item["test_run_id"]
        == "web-test-beta.13"
        for item in body["runs"]
    )
