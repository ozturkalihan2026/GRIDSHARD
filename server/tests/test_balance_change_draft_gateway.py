from fastapi.testclient import TestClient

from app.main import (
    app,
    balance_change_draft_repository,
    telemetry_service,
)

client=TestClient(app)


def test_balance_draft_gateway_is_blocked_before_review_ready():
    telemetry_service.clear()
    balance_change_draft_repository.path.unlink(
        missing_ok=True
    )
    balance_change_draft_repository.backup_path.unlink(
        missing_ok=True
    )

    response=client.get(
        "/telemetry/balance-change-draft",
        params={
            "player_id":"draft-gateway",
        },
    )
    assert response.status_code==200
    body=response.json()
    assert body["review_ready"] is False
    assert body["automatic_apply"] is False
    assert body["apply_endpoint_available"] is False

    update=client.put(
        "/telemetry/balance-change-draft",
        params={
            "player_id":"draft-gateway",
        },
        json={
            "area":"local_ai_pressure",
            "before_value":8,
            "proposed_value":9,
            "approved":True,
            "simulation_status":"pending",
            "regression_status":"pending",
        },
    )
    assert update.status_code==422

    balance_change_draft_repository.path.unlink(
        missing_ok=True
    )
    balance_change_draft_repository.backup_path.unlink(
        missing_ok=True
    )
