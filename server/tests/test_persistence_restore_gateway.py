from fastapi.testclient import TestClient

from app.main import (
    app,
    player_data_repository,
)
from app.player_data_store import (
    PlayerDataSnapshot,
)


client=TestClient(app)


def snapshot(rating):
    player_id="wt-restore-123456"
    return PlayerDataSnapshot(
        player_id=player_id,
        profile={
            "player_id": player_id,
            "display_name": "Oyuncu",
            "level": 1,
            "experience": 0,
            "experience_into_level": 0,
            "experience_to_next_level": 1000,
            "rating": rating,
            "league_name_tr": "Gümüş",
            "preferred_battle_pool_ids": [],
        },
        statistics={
            "player_id": player_id,
            "total_matches": 0,
            "wins": 0,
            "losses": 0,
            "draws": 0,
            "win_rate": 0,
            "average_match_duration_ms": 0,
            "total_damage_dealt": 0,
            "module_replacements": 0,
            "boosters_used": 0,
            "most_used_modules": [],
        },
        settings={
            "player_id": player_id,
            "sound_volume": 100,
            "music_volume": 70,
            "vibration_enabled": True,
            "graphics_quality": "yuksek",
            "language": "tr",
        },
    )


def prepare_corrupt_main_with_backup(
    tmp_path,
    monkeypatch,
):
    path=tmp_path/"players.json"
    monkeypatch.setattr(
        player_data_repository,
        "path",
        path,
    )

    player_data_repository.save(
        snapshot(1000)
    )
    player_data_repository.save(
        snapshot(1200)
    )

    path.write_text(
        "{broken",
        encoding="utf-8",
    )
    return path


def test_restore_requires_admin_token_configuration(
    tmp_path,
    monkeypatch,
):
    prepare_corrupt_main_with_backup(
        tmp_path,
        monkeypatch,
    )
    monkeypatch.delenv(
        "RELAY_WEB_TEST_ADMIN_TOKEN",
        raising=False,
    )

    response=client.post(
        "/web-test/persistence/restore-backup"
    )

    assert response.status_code==503


def test_restore_rejects_wrong_admin_token(
    tmp_path,
    monkeypatch,
):
    prepare_corrupt_main_with_backup(
        tmp_path,
        monkeypatch,
    )
    monkeypatch.setenv(
        "RELAY_WEB_TEST_ADMIN_TOKEN",
        "correct-secret",
    )

    response=client.post(
        "/web-test/persistence/restore-backup",
        headers={
            "x-relay-admin-token":
                "wrong-secret",
        },
    )

    assert response.status_code==403


def test_restore_only_runs_when_main_is_unhealthy(
    tmp_path,
    monkeypatch,
):
    path=tmp_path/"players.json"
    monkeypatch.setattr(
        player_data_repository,
        "path",
        path,
    )
    player_data_repository.save(
        snapshot(1000)
    )
    monkeypatch.setenv(
        "RELAY_WEB_TEST_ADMIN_TOKEN",
        "secret",
    )

    response=client.post(
        "/web-test/persistence/restore-backup",
        headers={
            "x-relay-admin-token":"secret",
        },
    )

    assert response.status_code==409


def test_controlled_restore_recovers_backup_and_health(
    tmp_path,
    monkeypatch,
):
    path=prepare_corrupt_main_with_backup(
        tmp_path,
        monkeypatch,
    )
    monkeypatch.setenv(
        "RELAY_WEB_TEST_ADMIN_TOKEN",
        "secret",
    )

    response=client.post(
        "/web-test/persistence/restore-backup",
        headers={
            "x-relay-admin-token":"secret",
        },
    )

    assert response.status_code==200
    body=response.json()
    assert body["restored"] is True
    assert body["before"]["ready"] is False
    assert body["before"]["backup"]["ready"] is True
    assert body["after"]["ready"] is True

    loaded=player_data_repository.load(
        "wt-restore-123456"
    )

    assert loaded.profile["rating"]==1000
    assert path.exists()
