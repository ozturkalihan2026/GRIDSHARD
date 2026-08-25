from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_rc_candidate_endpoint_is_single_aggregate_snapshot():
    body=client.get(
        "/web-test/rc-candidate"
    ).json()

    assert body["version"]=="2.0.0-beta.33"
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
