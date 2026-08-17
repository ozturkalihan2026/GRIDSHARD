from pathlib import Path

from app.player_data_store import (
    JsonFilePlayerDataRepository,
    PlayerDataSnapshot,
)


def snapshot():
    player_id="wt-health-123456"
    return PlayerDataSnapshot(
        player_id=player_id,
        profile={
            "player_id": player_id,
        },
        statistics={
            "player_id": player_id,
        },
        settings={
            "player_id": player_id,
        },
    )


def test_missing_file_is_healthy_when_parent_tree_writable(tmp_path):
    repo=JsonFilePlayerDataRepository(
        tmp_path/"nested"/"players.json"
    )

    health=repo.health()

    assert health["ready"] is True
    assert health["state"]=="empty"
    assert health["player_count"]==0


def test_valid_file_health_reports_player_count(tmp_path):
    repo=JsonFilePlayerDataRepository(
        tmp_path/"players.json"
    )
    repo.save(snapshot())

    health=repo.health()

    assert health["ready"] is True
    assert health["state"]=="ready"
    assert health["player_count"]==1


def test_corrupt_file_is_unhealthy_and_not_overwritten(tmp_path):
    path=tmp_path/"players.json"
    original="{broken-json"
    path.write_text(
        original,
        encoding="utf-8",
    )

    repo=JsonFilePlayerDataRepository(
        path
    )

    health=repo.health()

    assert health["ready"] is False
    assert health["state"]=="corrupt"
    assert (
        path.read_text(
            encoding="utf-8"
        )
        == original
    )
