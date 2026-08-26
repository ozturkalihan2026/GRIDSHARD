from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app, player_profile_service


client = TestClient(app)


def test_laboratory_api_purchase_replay_and_reset_flow():
    player_id = f"beta36-api-{uuid4()}"
    profile = player_profile_service.get_or_create(player_id)
    profile.flux_shards = 100

    initial = client.get(f"/profile/{player_id}/laboratory")
    assert initial.status_code == 200
    assert len(initial.json()["modules"]) == 24

    payload = {"request_id": "api-upgrade-1"}
    upgraded = client.post(
        f"/profile/{player_id}/laboratory/laser/upgrade",
        json=payload,
    )
    replayed = client.post(
        f"/profile/{player_id}/laboratory/laser/upgrade",
        json=payload,
    )
    assert upgraded.status_code == 200
    assert upgraded.json()["receipt"]["cost"] == 25
    assert replayed.json()["receipt"]["replayed"] is True
    assert replayed.json()["laboratory"]["flux_shards"] == 75

    reset = client.post(
        f"/profile/{player_id}/laboratory/reset",
        json={"request_id": "api-reset-1"},
    )
    assert reset.status_code == 200
    assert reset.json()["receipt"]["refund"] == 25
    assert reset.json()["laboratory"]["flux_shards"] == 100
    assert reset.json()["laboratory"]["calibrated_module_count"] == 0


def test_laboratory_api_rejects_unknown_module_without_spending_flux():
    player_id = f"beta36-api-{uuid4()}"
    profile = player_profile_service.get_or_create(player_id)
    profile.flux_shards = 100

    response = client.post(
        f"/profile/{player_id}/laboratory/core/upgrade",
        json={"request_id": "invalid-core"},
    )

    assert response.status_code == 422
    assert profile.flux_shards == 100
    assert profile.laboratory_transactions == []
