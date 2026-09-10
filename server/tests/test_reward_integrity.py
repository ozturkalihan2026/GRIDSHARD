from datetime import datetime, timezone

from app.arena_canon import (
    ARENAS,
    MODULES,
    TARGETED_MODULE_REWARD_CONTRACTS,
    unlocked_module_ids,
    unlocked_reward_module_ids,
)
from app.meta_progression import MetaProgressionService
from app.game.catalog_view import build_module_catalog_view
from app.player_profile import PlayerProfileService, SEASON_REWARD_TRACK


def test_every_targeted_road_reward_is_real_and_unlocked_at_its_node():
    contracts = TARGETED_MODULE_REWARD_CONTRACTS

    assert contracts
    for contract in contracts:
        module_id = contract["module_definition_id"]
        module = MODULES[module_id]
        assert module_id in unlocked_module_ids(contract["arena_minimum_rating"])
        assert int(module["unlock_arena"]) <= contract["arena_index"]


def test_every_arena_opens_all_of_its_modules_at_entry_before_piece_nodes():
    for arena in ARENAS:
        arena_index = int(arena["index"])
        arena_minimum = int(arena["minimum_rating"])
        arena_module_ids = {
            module_id
            for module_id, module in MODULES.items()
            if int(module["unlock_arena"]) == arena_index
        }
        targeted_ids = {
            node["rewards"]["module_shard_target"]
            for node in arena["nodes"]
            if node.get("rewards", {}).get("module_shard_target")
        }

        assert arena_module_ids
        assert targeted_ids
        assert targeted_ids <= arena_module_ids
        assert arena_module_ids <= set(unlocked_module_ids(arena_minimum))
        assert all(
            int(MODULES[module_id]["unlock_trophies"]) == arena_minimum
            for module_id in arena_module_ids
        )
        if arena_index > 1:
            assert arena_module_ids.isdisjoint(
                unlocked_module_ids(arena_minimum - 1)
            )


def test_corrupted_preferred_deck_cannot_escape_the_peak_unlock_pool():
    eligible = unlocked_reward_module_ids(
        0,
        0,
        ("quantum_cannon", "removed_module", "laser"),
    )
    fallback = unlocked_reward_module_ids(
        0,
        0,
        ("quantum_cannon", "removed_module"),
    )

    assert eligible == ("laser",)
    assert set(fallback) == set(unlocked_module_ids(0))


def test_daily_and_season_receipts_use_unlocked_named_reward_targets():
    now = datetime(2026, 9, 10, tzinfo=timezone.utc)
    service = PlayerProfileService(now_func=lambda: now)
    profile = service.get_or_create("corrupted-engagement-deck")
    profile.preferred_battle_pool_ids = ("quantum_cannon", "removed_module")

    daily = service.claim_monthly_login(profile.player_id, 10, "daily-receipt")
    assert daily["module_definition_id"] in unlocked_module_ids(0)
    assert profile.engagement_claim_receipts["daily-receipt"] == daily

    profile.season_xp = SEASON_REWARD_TRACK[9]["required_xp"]
    service.claim_season_tier(profile.player_id, 10, "season-receipt")
    season = profile.engagement_claim_receipts["season-receipt"]

    assert season["module_definition_id"] in unlocked_module_ids(0)
    assert season["core_type_id"] == "core_resonance"
    assert profile.core_shards_by_type["core_resonance"] == season["core_shards"]

    view = profile.engagement_view()
    daily_view = next(item for item in view["daily_login"]["rewards"] if item["day"] == 10)
    season_view = next(item for item in view["reward_track"] if item["tier"] == 10)
    assert daily_view["module_definition_id"] == daily["module_definition_id"]
    assert season_view["module_definition_id"] == season["module_definition_id"]
    assert season_view["core_type_id"] == season["core_type_id"]


def test_arena_chest_and_shop_receipts_carry_actual_module_and_core_ids():
    now = datetime(2026, 9, 10, 12, tzinfo=timezone.utc)
    meta = MetaProgressionService(now_func=lambda: now)
    profiles = PlayerProfileService(now_func=lambda: now)

    arena_profile = profiles.get_or_create("arena-receipt-player")
    arena_profile.rating = 1800
    arena_profile.highest_rating = 1800
    arena = meta.claim_arena_reward(arena_profile, "arena_6_finish")
    assert arena["core_type_id"]
    assert arena["rewards"]["core_type_id"] == arena["core_type_id"]

    league_profile = profiles.get_or_create("league-receipt-player")
    league_profile.rating = 3700
    league_profile.highest_rating = 3700
    league = meta.claim_arena_reward(league_profile, "league_1_3700")
    assert league["module_definition_id"] in unlocked_module_ids(3700)
    assert league["rewards"]["module_definition_id"] == league["module_definition_id"]

    chest_profile = profiles.get_or_create("chest-receipt-player")
    chest_profile.preferred_battle_pool_ids = ("quantum_cannon", "removed_module")
    chest_profile.chest_slots = [{
        "chest_id": "reward-integrity-chest",
        "definition_id": "circuit_8h",
        "name_tr": "Gümüş Sandık",
        "unlocks_at": now.isoformat(),
    }]
    chest = meta.open_chest(chest_profile, "reward-integrity-chest", "chest-receipt")
    assert chest["rewards"]["module_definition_id"] in unlocked_module_ids(0)
    assert chest["rewards"]["core_type_id"] == "core_resonance"

    shop_profile = profiles.get_or_create("shop-receipt-player")
    shop_profile.preferred_battle_pool_ids = ("quantum_cannon", "removed_module")
    shop_profile.circuit_credits = 2000
    shop = meta.purchase_daily_offer(shop_profile, "gold_daily", "shop-receipt")
    assert shop["rewards"]["module_definition_id"] in unlocked_module_ids(0)
    assert shop["rewards"]["core_type_id"] == "core_resonance"


def test_collection_exposes_real_engine_effect_lines_for_every_module():
    catalog = {
        item["id"]: item["effect_lines"]
        for item in build_module_catalog_view()["modules"]
    }
    profile = PlayerProfileService().get_or_create("effect-line-player")
    collection = MetaProgressionService().view(profile)["module_collection"]

    assert len(collection) == 36
    assert {item["definition_id"] for item in collection} == set(catalog)
    assert all(
        item["effect_lines"] == catalog[item["definition_id"]]
        and item["effect_lines"]
        for item in collection
    )
