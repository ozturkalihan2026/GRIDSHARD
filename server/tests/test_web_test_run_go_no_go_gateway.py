from fastapi.testclient import TestClient

from app.main import app


client=TestClient(app)


def test_run_specific_go_no_go_endpoint_marks_historical_run():
    body=client.get(
        "/web-test/test-runs/old-run/go-no-go"
    ).json()

    assert body["test_run_id"]=="old-run"
    assert body["active_test_run_id"]=="web-test-alpha.102"
    assert body["historical_run"] is True
    assert body["decision"] in {
        "GO","NO_GO"
    }
    assert (
        body["behavior_blocks_release"]
        is False
    )
