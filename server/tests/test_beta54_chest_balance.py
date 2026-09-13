from collections import Counter
from datetime import datetime, timezone

from app.meta_progression import (
    ARENAS,
    BATTLE_CHEST_DROP_THRESHOLDS,
    CHEST_DEFINITIONS,
    DAILY_SHOP_OFFERS,
    MetaProgressionService,
    _hash_unit,
)
from app.player_profile import PlayerProfileService


def test_battle_chest_distribution_keeps_bronze_common_and_higher_tiers_visible():
    counts = Counter()
    for index in range(10_000):
        roll = _hash_unit(f"battle-{index}:player:chest")
        chest_id = next(
            definition_id
            for upper_bound, definition_id in BATTLE_CHEST_DROP_THRESHOLDS
            if roll < upper_bound
        )
        counts[chest_id] += 1

    assert counts["field_3h"] > counts["circuit_8h"] > counts["core_24h"] > counts["diamond_24h"]
    assert 6_200 <= counts["field_3h"] <= 6_800
    assert counts["diamond_24h"] > 200


def test_module_piece_ranges_shrink_as_module_rarity_rises():
    gold = CHEST_DEFINITIONS["core_24h"]["shards_by_rarity"]
    diamond = CHEST_DEFINITIONS["diamond_24h"]["shards_by_rarity"]

    assert gold["common"][1] > gold["rare"][1] > gold["epic"][1]
    assert diamond["common"][1] > diamond["rare"][1] > diamond["epic"][1] > diamond["legendary"][1]
    assert [CHEST_DEFINITIONS[chest_id]["coins"][1] for chest_id in (
        "field_3h", "circuit_8h", "core_24h", "diamond_24h"
    )] == [75, 145, 280, 480]

    offers = {offer["tier"]: offer for offer in DAILY_SHOP_OFFERS}
    assert offers["silver"]["shards_by_rarity"]["common"][1] > offers["silver"]["shards_by_rarity"]["rare"][1]
    assert offers["gold"]["shards_by_rarity"]["common"][1] > offers["gold"]["shards_by_rarity"]["rare"][1] > offers["gold"]["shards_by_rarity"]["epic"][1]


def test_only_diamond_chests_can_award_core_pieces_and_only_occasionally():
    assert [
        definition_id
        for definition_id, definition in CHEST_DEFINITIONS.items()
        if definition["core_drop_chance"] > 0
    ] == ["diamond_24h"]

    now = datetime(2026, 9, 13, tzinfo=timezone.utc)
    service = MetaProgressionService(now_func=lambda: now)
    profiles = PlayerProfileService(now_func=lambda: now)
    core_drop_count = 0
    for index in range(300):
        profile = profiles.get_or_create(f"diamond-player-{index}")
        chest_id = f"diamond-balance-{index}"
        profile.chest_slots = [{
            "chest_id": chest_id,
            "definition_id": "diamond_24h",
            "name_tr": "Elmas Sandık",
            "awarded_at": now.isoformat(),
            "unlocks_at": now.isoformat(),
        }]
        receipt = service.open_chest(profile, chest_id, f"open-{index}")
        core_drop_count += int(receipt["rewards"]["core_drop"])
        assert receipt["rewards"]["core_shards"] in (0, 1)

    assert 5 <= core_drop_count <= 35


def test_arena_road_uses_canonical_chest_names_only():
    names_by_id = {
        "field_3h": "Bronz Sandık",
        "circuit_8h": "Gümüş Sandık",
        "core_24h": "Altın Sandık",
        "diamond_24h": "Elmas Sandık",
    }
    chest_nodes = [
        node
        for arena in ARENAS
        for node in arena["nodes"]
        if node.get("rewards", {}).get("chest_id")
    ]

    assert chest_nodes
    assert all(
        node["description_tr"] == names_by_id[node["rewards"]["chest_id"]]
        for node in chest_nodes
    )
    assert all("Saatlik" not in node["description_tr"] for node in chest_nodes)
