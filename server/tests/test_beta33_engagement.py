from fastapi.testclient import TestClient

from app.main import app
from app.player_data_store import (
    InMemoryPlayerDataRepository,
    PlayerDataStoreService,
)
from app.player_profile import (
    PlayerProfileService,
)
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService


client = TestClient(app)


def build_store():
    profiles = PlayerProfileService()
    store = PlayerDataStoreService(
        profile_service=profiles,
        statistics_service=PlayerStatisticsService(),
        settings_service=PlayerSettingsService(),
        repository=InMemoryPlayerDataRepository(),
    )
    return store, profiles


def test_battle_progresses_daily_missions_and_season_xp():
    service = PlayerProfileService()
    profile = service.record_battle_engagement(
        "a",
        season_xp_awarded=120,
        damage_dealt=740,
        circuit_actions=2,
        day_key="2026-08-25",
    )

    assert profile.season_xp == 120
    assert profile.daily_mission_progress == {
        "complete_battles": 1,
        "deal_damage": 740,
        "circuit_actions": 2,
        "win_battles": 0,
        "destroy_modules": 0,
        "core_power": 0,
    }
