# Historical contract retained for reference; no longer an active release test.
# See docs/archive/server-test-contracts-20261001/README.md for replacements.
from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_rc_candidate_endpoint_is_single_aggregate_snapshot():
    body=client.get(
        "/web-test/rc-candidate"
    ).json()

    assert body["version"]=="2.0.0-beta.38.1"
    assert body["build"]=="web-test-beta.13"
    assert body["test_run_id"]=="web-test-beta.13"
    assert body["decision"] in {
        "GO","NO_GO"
    }
    assert "technical" in body
    assert "data_health" in body
    assert "test_run" in body
    assert "behavior" in body
    assert (
        body["behavior"][
            "blocks_release"
        ]
        is False
    )
