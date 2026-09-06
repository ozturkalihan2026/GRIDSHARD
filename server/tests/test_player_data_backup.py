from concurrent.futures import ThreadPoolExecutor

from app.player_data_store import (
    JsonFilePlayerDataRepository,
    PlayerDataSnapshot,
)


def snap(rating):
    player_id="wt-backup-123456"
    return PlayerDataSnapshot(
        player_id=player_id,
        profile={
            "player_id":player_id,
            "rating":rating,
        },
        statistics={
            "player_id":player_id,
        },
        settings={
            "player_id":player_id,
        },
    )


def test_second_successful_write_preserves_previous_file_as_backup(tmp_path):
    path=tmp_path/"players.json"
    repo=JsonFilePlayerDataRepository(
        path
    )

    repo.save(snap(1000))
    repo.save(snap(1200))

    assert repo.backup_path.exists()

    backup=JsonFilePlayerDataRepository(
        repo.backup_path
    ).load(
        "wt-backup-123456"
    )

    assert backup.profile["rating"]==1000
    assert repo.load(
        "wt-backup-123456"
    ).profile["rating"]==1200


def test_health_reports_valid_backup_when_main_file_corrupt(tmp_path):
    path=tmp_path/"players.json"
    repo=JsonFilePlayerDataRepository(
        path
    )

    repo.save(snap(1000))
    repo.save(snap(1200))
    path.write_text(
        "{broken",
        encoding="utf-8",
    )

    health=repo.health()

    assert health["ready"] is False
    assert health["state"]=="corrupt"
    assert health["backup"]["available"] is True
    assert health["backup"]["ready"] is True
    assert health["backup"]["player_count"]==1


def test_restore_backup_is_explicit_and_restores_last_good_snapshot(tmp_path):
    path=tmp_path/"players.json"
    repo=JsonFilePlayerDataRepository(
        path
    )

    repo.save(snap(1000))
    repo.save(snap(1200))
    path.write_text(
        "{broken",
        encoding="utf-8",
    )

    assert repo.restore_backup() is True

    restored=repo.load(
        "wt-backup-123456"
    )

    assert restored.profile["rating"]==1000
    assert repo.health()["ready"] is True


def test_restore_backup_returns_false_without_valid_backup(tmp_path):
    repo=JsonFilePlayerDataRepository(
        tmp_path/"players.json"
    )

    assert repo.restore_backup() is False


def test_health_reads_are_serialized_with_profile_writes(tmp_path):
    path = tmp_path / "players.json"
    repo = JsonFilePlayerDataRepository(path)
    repo.save(snap(1000))
    repo.save(snap(1200))

    with ThreadPoolExecutor(max_workers=1) as executor:
        with repo._lock:
            backup_pending = executor.submit(repo.backup_health)
            assert backup_pending.done() is False

        assert backup_pending.result(timeout=1)["ready"] is True

        with repo._lock:
            health_pending = executor.submit(repo.health)
            assert health_pending.done() is False

        assert health_pending.result(timeout=1)["ready"] is True
