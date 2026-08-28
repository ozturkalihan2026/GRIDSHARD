from app.game.ai_archetypes import (
    AI_ARCHETYPE_IDS,
    get_ai_archetype,
    select_ai_archetype_for_key,
)


def test_five_productized_ai_archetypes_have_valid_distinct_profiles():
    assert AI_ARCHETYPE_IDS == (
        "aggressive",
        "defensive",
        "balanced",
        "sabotage",
        "economy",
    )

    pools = []
    for archetype_id in AI_ARCHETYPE_IDS:
        archetype = get_ai_archetype(archetype_id)
        assert len(archetype.battle_pool_ids) == 18
        assert len(set(archetype.battle_pool_ids)) == 18
        assert "generator" in archetype.battle_pool_ids
        assert len(archetype.initial_module_ids) == 2
        assert all(
            module_id in archetype.battle_pool_ids
            for module_id in archetype.initial_module_ids
        )
        pools.append(archetype.battle_pool_ids)

    assert len(set(pools)) == len(AI_ARCHETYPE_IDS)


def test_matchmaking_ai_archetype_selection_is_deterministic():
    first = select_ai_archetype_for_key("match-123").id
    second = select_ai_archetype_for_key("match-123").id

    assert first == second
    assert first in AI_ARCHETYPE_IDS
