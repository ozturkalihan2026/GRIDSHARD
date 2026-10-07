"""Mağaza sandıklarının gösterilen olasılıkları gerçek açılışla uyuşur.

Google Play ödeme politikası, satın alınan rastgele öğelerde olasılıkların
satın almadan önce gösterilmesini ister (docs/CHILD_AUDIENCE_AUDIT.md). Mağaza
görünümü olasılık tablosunu taşır; bu testler tablonun, sandığı gerçekten açan
kodun verdiği sonuçlarla aynı olduğunu denetler.
"""

from collections import Counter
from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from app import meta_progression
from app.arena_canon import unlocked_reward_module_ids
from app.meta_progression import (
    CHEST_DEFINITIONS,
    MODULE_RARITY,
    STORE_CHEST_PRICES,
    MetaProgressionService,
)
from app.player_profile import PlayerProfileService


RARITIES = ("common", "rare", "epic", "legendary")
PURCHASES = 6000


def close_to(published: float):
    """Gösterilen olasılığın, PURCHASES alımdaki dört standart sapmalık aralığı."""
    spread = (max(published, 0.01) * (1 - published) / PURCHASES) ** 0.5
    return pytest.approx(published, abs=4 * spread)


def store_items(profile) -> dict[str, dict]:
    view = MetaProgressionService()._chest_store_view(profile, datetime(2026, 10, 6, tzinfo=timezone.utc))
    return {item["definition_id"]: item for item in view["items"]}


def test_every_purchasable_chest_publishes_its_full_odds_table():
    profile = PlayerProfileService().get_or_create("odds-view")
    items = store_items(profile)

    assert set(items) == set(STORE_CHEST_PRICES)
    for definition_id, item in items.items():
        odds = item["module_rarity_drop_odds"]
        assert set(odds) == set(item["shards_by_rarity"]) and set(odds) <= set(RARITIES)
        # Enderlik olasılıkları mutlaktır: toplamları modül parçası olasılığıdır.
        assert sum(odds.values()) == pytest.approx(item["module_drop_chance"])
        for rarity, chance in odds.items():
            assert chance == pytest.approx(item["module_drop_chance"] * item["rarity_odds"][rarity], abs=1e-4)
            low, high = item["shards_by_rarity"][rarity]
            assert 1 <= low <= high
        for currency in ("circuit_credits", "flux_shards"):
            low, high = item["reward_preview"][currency]
            assert 1 <= low <= high
        assert 0.0 <= item["core_drop_chance"] < 1.0
        assert item["core_drop_chance"] == CHEST_DEFINITIONS[definition_id].get("core_drop_chance", 0.0)


@pytest.mark.parametrize("definition_id", sorted(STORE_CHEST_PRICES))
def test_published_odds_match_what_purchased_chests_really_give(definition_id, monkeypatch):
    # Satın alınan her sandığın kimliği sıradan gelir: sonuç her koşuda aynıdır.
    counter = iter(range(10**9))
    monkeypatch.setattr(meta_progression, "uuid4", lambda: SimpleNamespace(hex=f"{next(counter):032x}"))
    profile = PlayerProfileService().get_or_create(f"odds-{definition_id}")
    # Bütün modüller açık: enderlik tablosu olduğu gibi geçerlidir.
    profile.highest_rating = 99999
    unlocked = {MODULE_RARITY.get(module_id, "common") for module_id in unlocked_reward_module_ids(0, 99999)}
    assert unlocked == set(RARITIES)
    profile.circuit_credits = profile.flux_shards = 10**9
    # Bu test içeriği ölçer; günlük alım sınırı ayrı testtedir (test_store_chest_daily_limit.py).
    monkeypatch.setattr(meta_progression, "STORE_CHEST_DAILY_LIMITS", dict.fromkeys(STORE_CHEST_PRICES, 10**9))
    item = store_items(profile)[definition_id]
    service = MetaProgressionService()

    by_rarity = Counter()
    core_drops = 0
    for index in range(PURCHASES):
        rewards = service.purchase_store_chest(profile, definition_id, f"buy-{index}")["rewards"]
        assert item["reward_preview"]["circuit_credits"][0] <= rewards["circuit_credits"] <= item["reward_preview"]["circuit_credits"][1]
        assert item["reward_preview"]["flux_shards"][0] <= rewards["flux_shards"] <= item["reward_preview"]["flux_shards"][1]
        core_drops += rewards["core_shards"]
        if rewards["module_shards"]:
            rarity = rewards["module_rarity"]
            by_rarity[rarity] += 1
            low, high = item["shards_by_rarity"][rarity]
            assert low <= rewards["module_shards"] <= high
            assert MODULE_RARITY.get(rewards["module_definition_id"], "common") == rarity

    assert sum(by_rarity.values()) / PURCHASES == close_to(item["module_drop_chance"])
    for rarity in RARITIES:
        published = item["module_rarity_drop_odds"].get(rarity, 0.0)
        if published:
            assert by_rarity[rarity] / PURCHASES == close_to(published), rarity
        else:
            # Tabloda olmayan enderlik hiç çıkmaz.
            assert by_rarity[rarity] == 0, rarity
    if item["core_drop_chance"]:
        assert core_drops / PURCHASES == close_to(item["core_drop_chance"])
    else:
        assert core_drops == 0


def test_a_new_player_only_receives_shards_for_modules_they_have_unlocked(monkeypatch):
    """Mağazadaki not: o enderlikte açılmış modül yoksa parça başka bir açık modüle verilir."""
    counter = iter(range(10**9))
    monkeypatch.setattr(meta_progression, "uuid4", lambda: SimpleNamespace(hex=f"{next(counter):032x}"))
    profile = PlayerProfileService().get_or_create("odds-newcomer")
    profile.circuit_credits = profile.flux_shards = 10**9
    monkeypatch.setattr(meta_progression, "STORE_CHEST_DAILY_LIMITS", dict.fromkeys(STORE_CHEST_PRICES, 10**9))
    unlocked = set(unlocked_reward_module_ids(profile.rating, profile.highest_rating))
    service = MetaProgressionService()

    drops = 0
    for index in range(400):
        rewards = service.purchase_store_chest(profile, "diamond_24h", f"new-{index}")["rewards"]
        if rewards["module_shards"]:
            drops += 1
            assert rewards["module_definition_id"] in unlocked
    assert drops > 0
