from fastapi.testclient import TestClient

from app.main import (
    app,
    balance_change_draft_repository,
    telemetry_service,
)


client=TestClient(app)


def _battle(
    player:str,
    index:int,
)->None:
    assert telemetry_service.record_now(
        event_id=f"{player}:battle:{index}",
        event_type="local_battle_completed",
        player_id=player,
        metadata={
            "won":
                index % 2 == 1,
            "duration_ms":90_000,
            "credits_spent":100,
            "generator_moves":1,
            "damage_dealt":200,
            "damage_received":100,
            "shield_mitigated":10,
            "module_changes":3,
        },
    ) is True


def _move(
    player:str,
    index:int,
)->None:
    assert telemetry_service.record_now(
        event_id=f"{player}:move:{index}",
        event_type="generator_gate_moved",
        player_id=player,
        metadata={
            "from_gate":"south",
            "to_gate":"west",
            "connected_module_count":3,
            "powered_special_cell_count":0,
        },
    ) is True


def test_structural_generator_review_runs_without_numeric_proposal_and_enters_human_queue():
    player="beta17-structural-player"
    telemetry_service.clear()
    balance_change_draft_repository.path.unlink(
        missing_ok=True
    )
    balance_change_draft_repository.backup_path.unlink(
        missing_ok=True
    )

    for index in range(1,4):
        _battle(player,index)
        _move(player,index)

    report=client.get(
        "/telemetry/manual-battle-report",
        params={"player_id":player},
    )
    assert report.status_code==200
    assert report.json()["status"]=="review_ready"
    assert "generator_route" in {
        item["area"]
        for item
        in report.json()["review_candidates"]
    }

    regression=client.post(
        "/telemetry/balance-change-regression",
        params={"player_id":player},
        json={"area":"generator_route"},
    )
    assert regression.status_code==200
    body=regression.json()
    assert body["ok"] is True
    assert body["structural_review"] is True
    assert body["regression"]["status"]=="passed"
    assert body["canonical_values_changed"] is False

    queue=client.get(
        "/telemetry/balance-human-review",
        params={"player_id":player},
    )
    assert queue.status_code==200
    structural={
        item["area"]
        for item
        in queue.json()["structural_candidates"]
    }
    assert "generator_route" in structural
    assert queue.json()["automatic_apply"] is False

    telemetry_service.clear()
    balance_change_draft_repository.path.unlink(
        missing_ok=True
    )
    balance_change_draft_repository.backup_path.unlink(
        missing_ok=True
    )
