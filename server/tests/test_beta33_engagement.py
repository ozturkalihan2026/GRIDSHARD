from fastapi.testclient import TestClient

from app.main import app, player_profile_service
from app.player_data_store import (
    InMemoryPlayerDataRepository,
    PlayerDataStoreService,
)
from app.player_profile import (
    DAILY_MISSIONS,
    PlayerProfileError,
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


def test_beta33_profile_exposes_free_season_and_three_daily_missions():
    service = PlayerProfileService()
    view = service.get_or_create("a").to_view()

    assert "Sezon" in view["profile_sections"]
    assert view["engagement"]["season_id"] == "core_awakening_s0"
    assert view["engagement"]["max_tier"] == 10
    assert len(view["engagement"]["daily_missions"]) == 3
    assert len(view["engagement"]["reward_track"]) == 10


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
    }


def test_daily_mission_claim_is_server_validated_and_idempotent():
    service = PlayerProfileService()
    target = next(
        mission["target"]
        for mission in DAILY_MISSIONS
        if mission["id"] == "deal_damage"
    )
    service.record_battle_engagement(
        "a",
        season_xp_awarded=70,
        damage_dealt=target,
        circuit_actions=0,
        day_key="2026-08-25",
    )

    profile = service.claim_daily_mission(
        "a",
        "deal_damage",
        day_key="2026-08-25",
    )
    assert profile.season_xp == 170
    assert profile.flux_shards == 15

    try:
        service.claim_daily_mission(
            "a",
            "deal_damage",
            day_key="2026-08-25",
        )
    except PlayerProfileError:
        pass
    else:
        raise AssertionError("Aynı görev ödülü iki kez alınmamalıydı.")


def test_season_tier_claim_unlocks_and_equips_title_once():
    service = PlayerProfileService()
    service.record_battle_engagement(
        "a",
        season_xp_awarded=250,
        damage_dealt=0,
        circuit_actions=0,
    )

    profile = service.claim_season_tier("a", 2)

    assert profile.season_xp == 280
    assert profile.flux_shards == 30
    assert profile.equipped_title == "Devre Öncüsü"
    assert "Devre Öncüsü" in profile.unlocked_titles

    try:
        service.claim_season_tier("a", 2)
    except PlayerProfileError:
        pass
    else:
        raise AssertionError("Aynı kademe ödülü iki kez alınmamalıydı.")


def test_engagement_roundtrip_preserves_claims_and_currency():
    store, profiles = build_store()
    profiles.record_battle_engagement(
        "a",
        season_xp_awarded=250,
        damage_dealt=1000,
        circuit_actions=3,
    )
    profiles.claim_daily_mission("a", "deal_damage")
    profiles.claim_season_tier("a", 2)
    store.save_player("a")

    profiles._profiles.clear()
    store.load_player("a")
    restored = profiles.get("a")

    assert restored.season_xp == 380
    assert restored.flux_shards == 45
    assert restored.claimed_season_tiers == (2,)
    assert restored.claimed_daily_missions == ("deal_damage",)
    assert restored.equipped_title == "Devre Öncüsü"


def test_reward_track_exposes_and_awards_controlled_season_xp():
    service = PlayerProfileService()
    before = service.record_battle_engagement(
        "season-xp-reward",
        season_xp_awarded=100,
        damage_dealt=0,
        circuit_actions=0,
    )
    tier_one = before.to_view()["engagement"]["reward_track"][0]

    assert tier_one["season_xp_reward"] == 25
    assert tier_one["claimable"] is True

    after = service.claim_season_tier("season-xp-reward", 1)

    assert after.season_xp == 125
    assert after.claimed_season_tiers == (1,)
    assert after.to_view()["engagement"]["current_tier"] == 1


def test_engagement_claim_gateway_returns_and_persists_authoritative_profile():
    player_profile_service._profiles.clear()
    player_profile_service.record_battle_engagement(
        "beta33-gateway",
        season_xp_awarded=70,
        damage_dealt=1000,
        circuit_actions=0,
    )

    response = client.post(
        "/profile/beta33-gateway/engagement/missions/deal_damage/claim"
    )

    assert response.status_code == 200
    engagement = response.json()["engagement"]
    assert engagement["season_xp"] == 170
    assert engagement["flux_shards"] == 15
    assert next(
        item
        for item in engagement["daily_missions"]
        if item["id"] == "deal_damage"
    )["claimed"] is True
