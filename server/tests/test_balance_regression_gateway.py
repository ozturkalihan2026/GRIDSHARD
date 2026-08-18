from fastapi.testclient import TestClient

from app.main import (
    app,
    balance_change_draft_repository,
    telemetry_service,
)
from app.telemetry import TelemetryEvent


client=TestClient(app)


def battle_event(index:int, won:bool)->TelemetryEvent:
    return TelemetryEvent(
        event_id=f"beta16-battle-{index}",
        event_type="local_battle_completed",
        timestamp_ms=1000+index,
        player_id="beta16-regression-player",
        metadata={
            "won":won,
            "duration_ms":90_000,
            "credits_spent":10,
            "generator_moves":1,
            "damage_dealt":260,
            "damage_received":120,
            "shield_mitigated":15,
            "module_changes":3,
        },
    )


def test_review_ready_credit_draft_runs_simulation_then_real_engine_regression():
    player="beta16-regression-player"
    telemetry_service.clear()
    balance_change_draft_repository.path.unlink(
        missing_ok=True
    )
    balance_change_draft_repository.backup_path.unlink(
        missing_ok=True
    )

    for index,won in enumerate(
        (True,False,True),
        start=1,
    ):
        assert telemetry_service.record(
            battle_event(index,won)
        ) is True

    draft=client.put(
        "/telemetry/balance-change-draft",
        params={"player_id":player},
        json={
            "area":"circuit_credit",
            "before_value":10,
            "proposed_value":20,
            "approved":True,
            "simulation_status":"pending",
            "regression_status":"pending",
        },
    )
    assert draft.status_code==200

    simulated=client.post(
        "/telemetry/balance-change-simulate",
        params={"player_id":player},
        json={"area":"circuit_credit"},
    )
    assert simulated.status_code==200
    assert simulated.json()["ok"] is True
    assert (
        simulated.json()["draft"]["items"][0]["simulation_status"]
        == "passed"
    )

    regressed=client.post(
        "/telemetry/balance-change-regression",
        params={"player_id":player},
        json={"area":"circuit_credit"},
    )
    assert regressed.status_code==200
    body=regressed.json()
    assert body["ok"] is True
    assert body["regression"]["status"]=="passed"
    assert body["canonical_values_changed"] is False
    assert body["automatic_apply"] is False
    assert body["apply_endpoint_available"] is False

    balance_change_draft_repository.path.unlink(
        missing_ok=True
    )
    balance_change_draft_repository.backup_path.unlink(
        missing_ok=True
    )
    telemetry_service.clear()
