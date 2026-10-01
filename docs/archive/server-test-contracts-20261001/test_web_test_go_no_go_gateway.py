# Historical contract retained for reference; no longer an active release test.
# See docs/archive/server-test-contracts-20261001/README.md for replacements.
from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_go_no_go_endpoint():
    body=client.get(
        "/web-test/go-no-go"
    ).json()

    assert body["decision"] in {
        "GO","NO_GO"
    }
    assert "technical_checks" in body
    assert "behavior_signals" in body
    assert (
        body["behavior_blocks_release"]
        is False
    )
