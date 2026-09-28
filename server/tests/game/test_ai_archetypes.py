from app.game.ai_archetypes import (
    AI_ARCHETYPE_IDS,
    get_ai_archetype,
    select_ai_archetype_for_key,
)


def test_ai_archetypes_have_distinct_six_card_decks():
    assert len(AI_ARCHETYPE_IDS) >= 10
    pools = []
    for archetype_id in AI_ARCHETYPE_IDS[:5]:
        archetype = get_ai_archetype(archetype_id)
        assert len(archetype.battle_pool_ids) == 6
        assert len(set(archetype.battle_pool_ids)) == 6
        assert "core" not in archetype.battle_pool_ids
        pools.append(archetype.battle_pool_ids)
    # Türetilmiş bot arketipleri temel destelerden birini sınıf eğilimiyle kullanır.
    assert len(set(pools)) == 5


def test_matchmaking_ai_archetype_selection_is_deterministic():
    first = select_ai_archetype_for_key("match-123").id
    second = select_ai_archetype_for_key("match-123").id
    assert first == second
    assert first in AI_ARCHETYPE_IDS
