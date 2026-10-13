"""Çekirdek parçası kaynakları ve hedefsiz parça ödüllerinin enderlik kuralı.

13 Ekim 2026 kullanıcı kararı: çekirdek parçası bütün sandıklardan (Bronz %1,
Gümüş %3, Altın %5, Elmas %10), giriş takviminin iki gününden ve Devre
Yolu'nda arena ile lig son ödüllerinden gelir. Parça ödüllerinde ölçüt kartın
destede olması değil, açık olması ve enderliğidir.
"""
from collections import Counter
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

from app.arena_canon import (
    ARENAS,
    GRIDSHARD_CHEST_REWARDS,
    LEAGUE_STAGES,
    MODULES,
    REWARD_SHARD_PERCENT_BY_RARITY,
    reward_shards_for_rarity,
    unlocked_module_ids,
)
from app.competition_cycle import competition_cycle
from app.meta_progression import (
    CHEST_DEFINITIONS,
    MODULE_UPGRADE_SHARD_CURVES,
    MetaProgressionService,
    _select_reward_module,
    unlocked_core_type_ids,
)
from app.player_profile import (
    LOGIN_PERIOD_REWARDS,
    SEASON_REWARD_TRACK,
    PlayerProfileService,
)

RARITY_ORDER = ("common", "rare", "epic", "legendary")
TOP_RATING = 8600


def test_every_chest_tier_publishes_the_agreed_core_fragment_chance():
    assert {
        definition_id: definition["core_drop_chance"]
        for definition_id, definition in CHEST_DEFINITIONS.items()
    } == {"field_3h": 0.01, "circuit_8h": 0.03, "core_24h": 0.05, "diamond_24h": 0.10}
    for definition in CHEST_DEFINITIONS.values():
        assert definition["reward_odds"]["core_shards"] == definition["core_drop_chance"]
    # Şans çıkınca verilen parça sayısı kademeyle artar.
    assert [definition["core_drop_shards"] for definition in CHEST_DEFINITIONS.values()] == [1, 2, 3, 5]


def test_gold_chests_drop_core_fragments_into_an_unlocked_core():
    now = datetime(2026, 10, 13, tzinfo=timezone.utc)
    service = MetaProgressionService(now_func=lambda: now)
    profiles = PlayerProfileService(now_func=lambda: now)
    drops = 0
    for index in range(600):
        profile = profiles.get_or_create(f"gold-core-player-{index}")
        chest_id = f"gold-core-{index}"
        profile.chest_slots = [{
            "chest_id": chest_id,
            "definition_id": "core_24h",
            "name_tr": "Altın Sandık",
            "awarded_at": now.isoformat(),
            "unlocks_at": now.isoformat(),
        }]
        rewards = service.open_chest(profile, chest_id, f"open-{index}")["rewards"]
        assert rewards["core_shards"] == (3 if rewards["core_drop"] else 0)
        assert sum(profile.core_shards_by_type.values()) == rewards["core_shards"]
        if rewards["core_drop"]:
            assert rewards["core_type_id"] in unlocked_core_type_ids(profile)
            assert profile.core_shards_by_type[rewards["core_type_id"]] == 3
        drops += int(rewards["core_drop"])

    # Yüzde 5: 600 sandıkta beklenen 30.
    assert 12 <= drops <= 55


def test_login_calendar_awards_core_fragments_on_two_sundays():
    assert {
        reward["day"]: reward["core_shards"]
        for reward in LOGIN_PERIOD_REWARDS
        if reward["core_shards"]
    } == {14: 10, 28: 15}

    cycle_start = competition_cycle(datetime(2026, 10, 13, tzinfo=timezone.utc))["starts_at"]
    now = cycle_start + timedelta(days=13, hours=2)
    service = PlayerProfileService(now_func=lambda: now)
    profile = service.get_or_create("core-login-player")
    assert profile.login_period_day == 14

    preview = next(
        item for item in profile.engagement_view()["daily_login"]["rewards"] if item["day"] == 14
    )
    receipt = service.claim_login_reward(profile.player_id, 14, "core-login-receipt")

    assert receipt["core_shards"] == preview["core_shards"] == 10
    assert receipt["core_type_id"] == preview["core_type_id"]
    assert receipt["core_type_id"] in unlocked_core_type_ids(profile)
    assert profile.core_shards_by_type[receipt["core_type_id"]] == 10


def test_arena_finish_rewards_and_league_chests_carry_core_fragments():
    for arena in ARENAS:
        carriers = [node["id"] for node in arena["nodes"] if node["rewards"].get("core_shards")]
        assert carriers == [f"arena_{arena['index']}_finish"]
        finish = next(node for node in arena["nodes"] if node["id"] == carriers[0])
        assert finish["rewards"]["core_shards"] == 3
        assert finish["description_tr"].endswith("3 Çekirdek Parçası")

    league_chests = [
        node
        for stage in LEAGUE_STAGES
        for node in stage["nodes"]
        if node.get("league_chest") and not node.get("is_final_reward")
    ]
    assert [node["rewards"]["core_shards"] for node in league_chests] == [5, 5, 6, 6, 8, 8, 10]
    assert GRIDSHARD_CHEST_REWARDS["core_shards"] == 20
    for stage in LEAGUE_STAGES:
        for node in stage["nodes"]:
            if not node.get("league_chest"):
                assert "core_shards" not in node["rewards"]

    now = datetime(2026, 10, 13, tzinfo=timezone.utc)
    meta = MetaProgressionService(now_func=lambda: now)
    profile = PlayerProfileService(now_func=lambda: now).get_or_create("core-road-player")
    profile.rating = profile.highest_rating = 300
    preview = next(
        node for node in meta.arena_path(profile)[0]["nodes"] if node["id"] == "arena_1_finish"
    )
    receipt = meta.claim_arena_reward(profile, "arena_1_finish")

    assert receipt["core_type_id"] == preview["rewards"]["core_type_id"]
    assert profile.core_shards_by_type == {receipt["core_type_id"]: 3}


def test_login_and_season_shards_ignore_the_deck_and_shrink_with_rarity():
    now = datetime(2026, 10, 13, tzinfo=timezone.utc)
    service = PlayerProfileService(now_func=lambda: now)
    profile = service.get_or_create("rarity-reward-player")
    profile.rating = profile.highest_rating = TOP_RATING
    deck = set(profile.preferred_battle_pool_ids)
    unlocked = set(unlocked_module_ids(TOP_RATING))
    assert len(deck) == 6 and len(unlocked) == 36

    view = profile.engagement_view()
    base_by_key = {
        **{("login", item["day"]): item["module_shards"] for item in LOGIN_PERIOD_REWARDS},
        **{("tier", item["tier"]): item["module_shards"] for item in SEASON_REWARD_TRACK},
    }
    seen = Counter()
    for key, item in (
        *((("login", item["day"]), item) for item in view["daily_login"]["rewards"]),
        *((("tier", item["tier"]), item) for item in view["reward_track"]),
    ):
        if not base_by_key[key]:
            continue
        module_id = item["module_definition_id"]
        rarity = MODULES[module_id]["rarity"]
        assert module_id in unlocked
        assert item["module_shards"] == reward_shards_for_rarity(base_by_key[key], rarity)
        seen[module_id] += 1

    # Ödüller desteye sıkışmaz: çoğu deste dışındaki kartlara gider.
    assert sum(count for module_id, count in seen.items() if module_id not in deck) > sum(seen.values()) // 2
    assert {MODULES[module_id]["rarity"] for module_id in seen} == set(RARITY_ORDER)


def test_claimed_login_reward_keeps_the_amount_it_was_claimed_with():
    cycle_start = competition_cycle(datetime(2026, 10, 13, tzinfo=timezone.utc))["starts_at"]
    now = cycle_start + timedelta(days=2, hours=2)
    service = PlayerProfileService(now_func=lambda: now)
    profile = service.get_or_create("claimed-amount-player")
    day = profile.login_period_day
    receipt = service.claim_login_reward(profile.player_id, day, "claimed-amount-receipt")

    # Yeni kartlar açılınca aynı tohum başka bir karta düşebilir; alınmış
    # ödülün görünümü makbuzdaki kartta ve miktarda kalır.
    profile.rating = profile.highest_rating = TOP_RATING
    shown = next(
        item for item in profile.engagement_view()["daily_login"]["rewards"] if item["day"] == day
    )
    assert shown["module_definition_id"] == receipt["module_definition_id"]
    assert shown["module_shards"] == receipt["module_shards"]


def test_reward_shard_scale_makes_rarer_cards_slower_to_max():
    percents = [REWARD_SHARD_PERCENT_BY_RARITY[rarity] for rarity in RARITY_ORDER]
    assert percents == sorted(percents, reverse=True) and len(set(percents)) == 4
    assert reward_shards_for_rarity(0, "legendary") == 0
    assert reward_shards_for_rarity(1, "legendary") == 1

    # Aynı ödül akışında bir kartı son seviyeye getirmek için gereken ödül
    # sayısı enderlikle birlikte artar (sıradan < ender < destansı < efsanevi).
    rewards_needed = [
        sum(MODULE_UPGRADE_SHARD_CURVES[rarity]) / REWARD_SHARD_PERCENT_BY_RARITY[rarity]
        for rarity in RARITY_ORDER
    ]
    assert rewards_needed == sorted(rewards_needed) and len(set(rewards_needed)) == 4


def test_untargeted_road_shards_pick_rarer_cards_less_often():
    profile = SimpleNamespace(
        rating=TOP_RATING, highest_rating=TOP_RATING, legacy_module_unlocks=(), player_id="x",
    )
    picks = Counter()
    for index in range(8000):
        module_id, rarity = _select_reward_module(profile, f"road-player-{index}:league_node:module")
        assert rarity == MODULES[module_id]["rarity"]
        picks[rarity] += 1

    cards = Counter(MODULES[module_id]["rarity"] for module_id in unlocked_module_ids(TOP_RATING))
    per_card = [picks[rarity] / cards[rarity] for rarity in RARITY_ORDER]
    assert per_card == sorted(per_card, reverse=True)
    assert picks["legendary"] > 0
