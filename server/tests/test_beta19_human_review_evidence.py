from fastapi.testclient import TestClient
from app.main import app

client=TestClient(app)


def test_human_review_evidence_is_safe_without_review_ready_data():
    response=client.get(
        "/telemetry/balance-human-review-evidence",
        params={
            "player_id":
                "beta19-empty-review"
        },
    )
    assert response.status_code==200
    body=response.json()
    assert body["candidate_count"]==0
    assert body["evidence"]==[]
    assert body["human_decision_required"] is True
    assert body["automatic_apply"] is False
    assert body["apply_endpoint_available"] is False
    assert body["numeric_balance_changed"] is False
