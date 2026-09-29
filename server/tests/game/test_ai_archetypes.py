from app.game.ai_archetypes import (
    AI_ARCHETYPE_IDS,
    BOT_ARCHETYPE_IDS,
    get_ai_archetype,
    normalize_ai_archetype_id,
    select_ai_archetype_for_key,
)
from app.game.catalog import get_module_definition


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


def test_sabotage_and_economy_archetypes_are_replaced_by_balanced_variants():
    # Beta.72 tur 13: güçlü sınıf eğilimli arketipler hiç kazanamıyordu.
    assert "sabotage" not in AI_ARCHETYPE_IDS
    assert "economy" not in AI_ARCHETYPE_IDS
    assert normalize_ai_archetype_id("sabotage") == "balanced_control"
    assert normalize_ai_archetype_id("ECONOMY") == "balanced_economy"
    assert BOT_ARCHETYPE_IDS["Kontrol"] == "balanced_control"
    assert BOT_ARCHETYPE_IDS["Akım Ekonomisi"] == "balanced_economy"


def test_balanced_variants_play_balanced_but_carry_their_theme():
    control = get_ai_archetype("balanced_control")
    economy = get_ai_archetype("balanced_economy")
    for archetype in (control, economy):
        assert archetype.category_bias == ()
        categories = [get_module_definition(module).category for module in archetype.battle_pool_ids]
        assert categories.count("saldırı") >= 2
        # Tema kartı genişleme listesinde öne alınmaz; küçük bir öncelik bile
        # simülasyonda AI'yi saldırı kurmadan kilitliyordu.
        assert all(
            get_module_definition(module).category not in {"sabotaj", "enerji"}
            for module in archetype.expansion_module_ids
        )
    assert control.sabotage_floor == 1
    assert economy.energy_floor == 1
    assert sum(get_module_definition(m).category == "sabotaj" for m in control.battle_pool_ids) >= 2
    assert "battery" in control.battle_pool_ids
    assert {"battery", "current_balancer"} <= set(economy.battle_pool_ids)
    assert any(get_module_definition(m).category == "sabotaj" for m in economy.battle_pool_ids)


def test_defensive_family_carries_a_second_attack_card():
    # Beta.72 tur 14: enerji bollaşınca tek saldırı kartlı Savunmacı destesi
    # yalnız enerjisi tükenen rakibi yenebiliyordu.
    for archetype_id in ("defensive", "sustain"):
        archetype = get_ai_archetype(archetype_id)
        attacks = [
            module for module in archetype.battle_pool_ids
            if get_module_definition(module).category == "saldırı"
        ]
        assert len(attacks) >= 2
        assert {"shield", "barrier", "repair"} <= set(archetype.battle_pool_ids)
        assert archetype.defense_floor == 2
