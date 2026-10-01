from uuid import UUID

import pytest

from app.display_names import default_operator_name, normalize_display_name
from app.player_data_store import (
    InMemoryPlayerDataRepository, JsonFilePlayerDataRepository,
    PlayerDataSnapshot, PlayerDataStoreService,
)
from app.player_profile import PlayerProfileService
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService


PLAYER_ID = "wt-a95877a8-b48a-4ecb-aa40-dbd4d822d848"


def store_for(repository):
    profiles = PlayerProfileService()
    return PlayerDataStoreService(
        profile_service=profiles, repository=repository,
        statistics_service=PlayerStatisticsService(),
        settings_service=PlayerSettingsService(),
    ), profiles


def test_default_names_are_short_stable_and_distinct():
    names = [default_operator_name(f"wt-{UUID(int=index)}") for index in range(256)]
    assert len(set(names)) == 256
    assert all(len(name) == 14 and name.startswith("Pilot-") for name in names)
    assert all(normalize_display_name(name) == name for name in names)
    assert default_operator_name(PLAYER_ID) == default_operator_name(PLAYER_ID)
    assert len(default_operator_name("wt-mk38qgm1-8np31o1g72")) == 14
    assert default_operator_name("alihan") == "alihan"


def test_collision_chooses_another_short_name():
    first = default_operator_name(PLAYER_ID)
    second = default_operator_name(PLAYER_ID, [("someone-else", first.lower())])
    assert second != first
    assert len(second) == 14
    assert default_operator_name(PLAYER_ID, [(PLAYER_ID, first)]) == first


@pytest.mark.parametrize("backend", ["memory", "json"])
def test_offline_name_reservation_and_restart(backend, tmp_path):
    repository = (InMemoryPlayerDataRepository() if backend == "memory"
                  else JsonFilePlayerDataRepository(tmp_path / "players.json"))
    occupied = default_operator_name(PLAYER_ID)
    repository.save(PlayerDataSnapshot("offline-owner", {
        "player_id": "offline-owner", "display_name": occupied.lower(),
    }, {}, {}))
    store, profiles = store_for(repository)
    player = profiles.get_or_create(PLAYER_ID)
    name = player.display_name
    assert len(name) == 14 and name != occupied
    assert player.player_id == PLAYER_ID
    store.save_player(PLAYER_ID)
    restarted, restarted_profiles = store_for(repository)
    restarted.load_player(PLAYER_ID)
    assert restarted_profiles.get_or_create(PLAYER_ID).display_name == name
    assert dict(repository.list_display_names())[PLAYER_ID] == name


def test_only_untouched_automatic_names_are_shortened():
    store, profiles = store_for(InMemoryPlayerDataRepository())
    profile = profiles.get_or_create(PLAYER_ID)
    profile.rating = 375
    old_snapshot = store.build_snapshot(PLAYER_ID)
    old_snapshot.profile["display_name"] = PLAYER_ID
    store.repository.save(old_snapshot)
    store.load_player(PLAYER_ID)
    profile = profiles.get_or_create(PLAYER_ID)
    assert profile.display_name == default_operator_name(PLAYER_ID)
    assert profile.player_id == PLAYER_ID and profile.rating == 375
    profiles.set_display_name(PLAYER_ID, "Özgün Devre")
    store.save_player(PLAYER_ID)
    store.load_player(PLAYER_ID)
    assert profiles.get_or_create(PLAYER_ID).display_name == "Özgün Devre"


def test_explicit_new_name_is_preserved():
    profile = PlayerProfileService().get_or_create(PLAYER_ID, display_name="Devre Ustası")
    assert profile.display_name == "Devre Ustası"
    assert profile.player_id == PLAYER_ID
