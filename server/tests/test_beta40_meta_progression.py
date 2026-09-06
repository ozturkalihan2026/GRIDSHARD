from datetime import datetime, timedelta, timezone

from app.meta_progression import (
    MetaProgressionService,
    RANK_STAGES,
    archive_and_soft_reset_season,
    arena_floor_for_rating,
    rank_stage_for_rating,
    trophy_delta,
)
from app.player_profile import PlayerProfileService
from app.player_data_store import InMemoryPlayerDataRepository, PlayerDataStoreService
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService


def test_rank_model_contains_all_planned_stages_and_arena_floor():
    assert len([item for item in RANK_STAGES if item["kind"] == "arena"]) == 12
    assert len([item for item in RANK_STAGES if item["kind"] == "league"]) == 5
    assert len([item for item in RANK_STAGES if item["kind"] == "champions_league"]) == 5
    assert len([item for item in RANK_STAGES if item["kind"] == "legendary_league"]) == 1
    assert rank_stage_for_rating(5600)["id"] == "legendary"
    assert arena_floor_for_rating(3700) == 3300


def test_trophy_delta_uses_opponent_strength_and_respects_direction():
    upset_win = trophy_delta(1000, 1400, 1.0)
    expected_win = trophy_delta(1400, 1000, 1.0)
    assert upset_win > expected_win > 0
    assert trophy_delta(1000, 1400, 0.0) < 0


def test_module_upgrade_is_separate_from_flux_and_idempotent():
    profile = PlayerProfileService().get_or_create("player")
    profile.module_shards["laser"] = 100
    flux_before = profile.flux_shards
    service = MetaProgressionService()

    first = service.upgrade_module(profile, "laser", "upgrade-1")
    coins_after_first = profile.coins
    shards_after_first = profile.module_shards["laser"]
    replay = service.upgrade_module(profile, "laser", "upgrade-1")

    assert first == replay
    assert profile.module_upgrade_levels["laser"] == 1
    assert profile.coins == coins_after_first
    assert profile.module_shards["laser"] == shards_after_first
    assert profile.flux_shards == flux_before
    assert first["ranked_normalized"] is True


def test_server_timed_chest_has_public_odds_and_replay_safe_receipt():
    now = datetime(2026, 9, 2, tzinfo=timezone.utc)
    clock = {"now": now}
    service = MetaProgressionService(now_func=lambda: clock["now"])
    profile = PlayerProfileService().get_or_create("player")
    chest = service.award_battle_chest(profile, "ranked-win", True)
    assert chest is not None
    assert service.view(profile)["chests"]["definitions"][0]["rarity_odds"]

    clock["now"] = now + timedelta(hours=25)
    first = service.open_chest(profile, chest["chest_id"], "open-1")
    coins_after_first = profile.coins
    replay = service.open_chest(profile, chest["chest_id"], "open-1")

    assert first == replay
    assert profile.coins == coins_after_first
    assert profile.chest_slots == []


def test_daily_gift_chest_can_be_claimed_once_and_starts_server_timer():
    now = datetime(2026, 9, 3, tzinfo=timezone.utc)
    service = MetaProgressionService(now_func=lambda: now)
    profile = PlayerProfileService().get_or_create("gift-player")

    first = service.claim_gift_chest(profile, "field_3h", "gift-1")
    replay = service.claim_gift_chest(profile, "field_3h", "gift-2")
    view = service.view(profile)

    assert first == replay
    assert len(profile.chest_slots) == 1
    assert profile.chest_slots[0]["unlocks_at"] == "2026-09-03T03:00:00Z"
    assert next(
        item for item in view["chests"]["definitions"] if item["id"] == "field_3h"
    )["claim_available"] is False


def test_daily_shop_offer_spends_one_currency_and_awards_all_reward_families():
    now = datetime(2026, 9, 2, tzinfo=timezone.utc)
    service = MetaProgressionService(now_func=lambda: now)
    profile = PlayerProfileService().get_or_create("shop-player")
    credits_before = profile.circuit_credits

    first = service.purchase_daily_offer(profile, "bronze_daily", "shop-1")
    after_first = service.view(profile)
    replay = service.purchase_daily_offer(profile, "bronze_daily", "shop-1")

    assert first == replay
    assert first["rewards"]["module_shards"] > 0
    assert "core_shards" in first["rewards"]
    assert after_first["shop"]["offers"][0]["purchased"] is True
    assert profile.circuit_credits >= credits_before - 120


def test_core_tree_is_normalized_and_season_result_is_archived_before_soft_reset():
    profile = PlayerProfileService().get_or_create("player")
    profile.rating = 5600
    profile.core_skill_points = 3
    service = MetaProgressionService()
    service.select_core(profile, "core_quantum")
    receipt = service.unlock_core_skill(
        profile,
        "core_quantum",
        "phase_seed",
        "skill-1",
    )
    view = service.view(profile)

    assert receipt["ranked_normalized"] is True
    assert view["cores"]["competitive_power_enabled"] is False
    assert view["cores"]["selected_core_type"] == "core_quantum"

    archive = archive_and_soft_reset_season(
        profile,
        "core_awakening_s1",
        archived_at="2026-10-01T00:00:00Z",
    )
    assert archive["final_rating"] == 5600
    assert profile.rating == 3300
    assert profile.active_meta_season_id == "core_awakening_s1"
    assert len(profile.season_archives) == 1


def test_meta_progression_roundtrips_through_player_data_store():
    profiles = PlayerProfileService()
    repository = InMemoryPlayerDataRepository()
    store = PlayerDataStoreService(
        profile_service=profiles,
        statistics_service=PlayerStatisticsService(),
        settings_service=PlayerSettingsService(),
        repository=repository,
    )
    profile = profiles.get_or_create("player")
    profile.coins = 321
    profile.circuit_credits = 777
    profile.core_shards = 9
    profile.module_shards["laser"] = 77
    profile.module_upgrade_levels["laser"] = 2
    profile.selected_core_type = "core_resonance"
    profile.core_skills["core_resonance"] = ("stable_frequency",)
    profile.gift_chest_claim_receipts["gift-1"] = {
        "request_id": "gift-1",
        "definition_id": "field_3h",
        "claim_day": "2026-09-03",
    }
    store.save_player("player")

    profiles._profiles.clear()
    store.load_player("player")
    restored = profiles.get("player")

    assert restored.coins == 321
    assert restored.circuit_credits == 777
    assert restored.core_shards == 9
    assert restored.module_shards["laser"] == 77
    assert restored.module_upgrade_levels["laser"] == 2
    assert restored.core_skills["core_resonance"] == ("stable_frequency",)
    assert restored.gift_chest_claim_receipts["gift-1"]["definition_id"] == "field_3h"
