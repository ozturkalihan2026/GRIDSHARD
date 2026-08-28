from app.game.ai import choose_fill_module, prepare_ai_reserve_modules
from app.game.ai_archetypes import AI_ARCHETYPE_IDS, get_ai_archetype
from app.game.battle_pool import validate_battle_pool
from app.game.engine import BattleEngine
from app.game.models import BattleState, Direction, ModuleStatus


def _engine_for(archetype_id: str):
    archetype = get_ai_archetype(archetype_id)
    engine = BattleEngine(BattleState(battle_id=f"v6-{archetype_id}"))
    ai = engine.add_player("ai")
    opponent = engine.add_player("opponent")
    ai.battle_pool = validate_battle_pool(archetype.battle_pool_ids)
    ai.circuit_credits = 2000

    for player_id in ("ai", "opponent"):
        engine.grant_module(player_id, f"{player_id}-core", "core")
        engine.grant_module(player_id, f"{player_id}-generator", "generator")
        engine.set_initial_active_module(player_id, f"{player_id}-core", 2, 2)
        engine.set_initial_active_module(player_id, f"{player_id}-generator", 2, 3)

    engine.grant_module("ai", "ai-shield", "shield")
    engine.grant_module("ai", "ai-laser", "laser")
    engine.set_initial_active_module("ai", "ai-shield", 1, 3, Direction.RIGHT)
    engine.set_initial_active_module("ai", "ai-laser", 3, 3, Direction.LEFT)

    prepare_ai_reserve_modules(engine, "ai")
    return engine


def test_all_ai_archetypes_open_with_shield_and_laser_and_have_slot_5_6_plan():
    for archetype_id in AI_ARCHETYPE_IDS:
        archetype = get_ai_archetype(archetype_id)
        assert archetype.initial_module_ids == ("shield", "laser")
        assert len(archetype.expansion_module_ids) >= 2
        assert all(
            module_id in archetype.battle_pool_ids
            for module_id in archetype.expansion_module_ids
        )


def test_slot_5_and_slot_6_follow_archetype_expansion_identity():
    for archetype_id in AI_ARCHETYPE_IDS:
        engine = _engine_for(archetype_id)
        ai = engine.state.players["ai"]
        opponent = engine.state.players["opponent"]
        archetype = get_ai_archetype(archetype_id)

        fifth = choose_fill_module(ai, opponent, archetype_id)
        assert fifth is not None
        assert fifth.definition.id == archetype.expansion_module_ids[0]

        fifth.status = ModuleStatus.ACTIVE
        sixth = choose_fill_module(ai, opponent, archetype_id)
        assert sixth is not None
        assert sixth.definition.id == archetype.expansion_module_ids[1]
