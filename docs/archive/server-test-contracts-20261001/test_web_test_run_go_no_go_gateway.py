# Historical contract retained for reference; no longer an active release test.
# See docs/archive/server-test-contracts-20261001/README.md for replacements.
from fastapi.testclient import TestClient

from app.main import app


client=TestClient(app)


def test_run_specific_go_no_go_endpoint_marks_historical_run():
    body=client.get(
        "/web-test/test-runs/old-run/go-no-go"
    ).json()

    assert body["test_run_id"]=="old-run"
    assert body["active_test_run_id"]=="web-test-beta.13"
    assert body["historical_run"] is True
    assert body["decision"] in {
        "GO","NO_GO"
    }
    assert (
        body["behavior_blocks_release"]
        is False
    )
