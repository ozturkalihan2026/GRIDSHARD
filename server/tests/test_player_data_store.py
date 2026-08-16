from fastapi.testclient import TestClient

from app.main import (
    app,
    player_data_repository,
    player_data_store_service,
    player_profile_service,
    player_settings_service,
    player_statistics_service,
)
from app.player_data_store import (
    InMemoryPlayerDataRepository,
    PlayerDataStoreError,
    PlayerDataStoreService,
)
from app.player_profile import (
    PlayerProfileService,
)
from app.player_settings import (
    PlayerSettingsService,
)
from app.player_statistics import (
    PlayerStatisticsService,
)


client=TestClient(app)


def build_store():
    profiles=PlayerProfileService()
    statistics=PlayerStatisticsService()
    settings=PlayerSettingsService()
    repository=InMemoryPlayerDataRepository()

    return (
        PlayerDataStoreService(
            profile_service=profiles,
            statistics_service=statistics,
            settings_service=settings,
            repository=repository,
        ),
        profiles,
        statistics,
        settings,
        repository,
    )


def test_snapshot_contains_profile_statistics_and_settings():
    store,profiles,stats,settings,repo=build_store()

    profiles.set_display_name(
        "a",
        "Alihan",
    )
    profiles.set_rating(
        "a",
        1220,
    )
    settings.update(
        "a",
        sound_volume=35,
        language="tr",
    )

    snapshot=store.save_player(
        "a"
    ).to_dict()

    assert snapshot["profile"]["display_name"]=="Alihan"
    assert snapshot["profile"]["rating"]==1220
    assert snapshot["statistics"]["total_matches"]==0
    assert snapshot["settings"]["sound_volume"]==35


def test_repository_returns_copy_not_same_mutable_dict():
    store,profiles,stats,settings,repo=build_store()
    store.save_player("a")

    first=repo.load("a")
    second=repo.load("a")

    assert first is not second
    assert first.profile is not second.profile


def test_load_restores_profile_and_settings():
    store,profiles,stats,settings,repo=build_store()

    profiles.set_display_name(
        "a",
        "Alihan",
    )
    profiles.set_rating(
        "a",
        1400,
    )
    settings.update(
        "a",
        music_volume=15,
        graphics_quality="orta",
    )

    store.save_player("a")

    profiles._profiles.clear()
    settings._settings.clear()

    store.load_player("a")

    assert profiles.get("a").display_name=="Alihan"
    assert profiles.get("a").rating==1400
    assert settings.get_or_create("a").music_volume==15
    assert settings.get_or_create("a").graphics_quality=="orta"


def test_missing_snapshot_raises():
    store,profiles,stats,settings,repo=build_store()

    try:
        store.load_player(
            "missing"
        )
    except PlayerDataStoreError:
        pass
    else:
        raise AssertionError(
            "Eksik kayıt hata üretmeliydi."
        )


def reset_gateway():
    player_data_repository._snapshots.clear()
    player_profile_service._profiles.clear()
    player_statistics_service._statistics.clear()
    player_settings_service._settings.clear()


def test_gateway_save_and_load_roundtrip():
    reset_gateway()

    player_profile_service.set_display_name(
        "a",
        "Oyuncu A",
    )
    player_settings_service.update(
        "a",
        sound_volume=20,
    )

    saved=client.post(
        "/player-data/a/save"
    )
    assert saved.status_code==200

    player_profile_service._profiles.clear()
    player_settings_service._settings.clear()

    loaded=client.post(
        "/player-data/a/load"
    )

    assert loaded.status_code==200
    assert (
        client.get(
            "/profile/a"
        ).json()["display_name"]
        == "Oyuncu A"
    )
    assert (
        client.get(
            "/settings/a"
        ).json()["sound_volume"]
        == 20
    )


def test_gateway_missing_load_is_404():
    reset_gateway()

    response=client.post(
        "/player-data/missing/load"
    )

    assert response.status_code==404
