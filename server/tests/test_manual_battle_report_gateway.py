from fastapi.testclient import TestClient

from app.main import (
    app,
    telemetry_service,
)

client=TestClient(app)


def test_manual_battle_report_endpoint_starts_empty():
    telemetry_service.clear()

    response=client.get(
        "/telemetry/manual-battle-report",
        params={
            "player_id":"p1",
        },
    )

    assert response.status_code==200
    body=response.json()

    assert body["status"]=="insufficient_manual_battles"
    assert body["battle_count"]==0
    assert body["battles_remaining"]==3
    assert body["numeric_balance_changed"] is False
    assert "generator_route" in body
    assert "review_candidates" in body
