import json

from app.player_data_store import (
    JsonFilePlayerDataRepository,
    PlayerDataSnapshot,
)


def snapshot(
    player_id="wt-file-123456",
    *,
    rating=1000,
):
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


def test_json_repository_survives_new_repository_instance(tmp_path):
    path=tmp_path/"players.json"

    first=JsonFilePlayerDataRepository(
        path
    )
    first.save(
        snapshot(rating=1234)
    )

    restarted=JsonFilePlayerDataRepository(
        path
    )
    loaded=restarted.load(
        "wt-file-123456"
    )

    assert loaded is not None
    assert loaded.profile["rating"]==1234


def test_json_repository_preserves_multiple_players(tmp_path):
    path=tmp_path/"players.json"
    repo=JsonFilePlayerDataRepository(
        path
    )

    repo.save(
        snapshot(
            "wt-one-123456",
            rating=1010,
        )
    )
    repo.save(
        snapshot(
            "wt-two-123456",
            rating=1200,
        )
    )

    restarted=JsonFilePlayerDataRepository(
        path
    )

    assert (
        restarted.load(
            "wt-one-123456"
        ).profile["rating"]
        == 1010
    )
    assert (
        restarted.load(
            "wt-two-123456"
        ).profile["rating"]
        == 1200
    )


def test_json_repository_uses_complete_json_document(tmp_path):
    path=tmp_path/"players.json"
    repo=JsonFilePlayerDataRepository(
        path
    )

    repo.save(snapshot())

    data=json.loads(
        path.read_text(
            encoding="utf-8"
        )
    )

    assert (
        data[
            "wt-file-123456"
        ][
            "profile"
        ][
            "display_name"
        ]
        == "Oyuncu"
    )
    assert not (
        tmp_path
        / "players.json.tmp"
    ).exists()


def test_json_repository_delete_is_persistent(tmp_path):
    path=tmp_path/"players.json"
    repo=JsonFilePlayerDataRepository(
        path
    )
    repo.save(snapshot())

    assert repo.delete(
        "wt-file-123456"
    ) is True

    restarted=JsonFilePlayerDataRepository(
        path
    )
    assert restarted.load(
        "wt-file-123456"
    ) is None
