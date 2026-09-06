from app.game.ai import build_ai_action_plan, build_threat_profile, choose_deploy_definition
from app.game.battle_pool import default_battle_pool
from app.game.engine import BattleEngine
from app.game.models import BattleState, ModuleStatus, Position


def make_engine():
    engine = BattleEngine(BattleState(battle_id="adaptive-ai"))
    ai = engine.add_player("ai")
    opponent = engine.add_player("opponent")
    ai.battle_pool = default_battle_pool()
    ai.circuit_credits = 2_000
    return engine, ai, opponent


def activate(engine, player_id, instance_id, definition_id, x, y):
    module = engine.grant_module(player_id, instance_id, definition_id)
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    return module


def test_threat_profile_counts_categories():
    engine, _, opponent = make_engine()
    activate(engine, "opponent", "shield", "shield", 1, 1)
    activate(engine, "opponent", "laser", "laser", 3, 1)
    profile = build_threat_profile(opponent)
    assert profile.attack_count == 1
    assert profile.defense_count == 1


def test_ai_can_choose_an_active_definition_again():
    engine, ai, opponent = make_engine()
    activate(engine, "ai", "laser-active", "laser", 1, 1)
    selected = choose_deploy_definition(ai, opponent)
    assert selected in ai.battle_pool.module_definition_ids


def test_ai_action_is_immediate_and_contains_no_booster_command():
    engine, _, _ = make_engine()
    first = build_ai_action_plan(engine, "ai", "opponent", archetype_id="balanced")
    second = build_ai_action_plan(engine, "ai", "opponent", archetype_id="balanced")
    assert first == second
    assert first and first.commands[0].kind == "deploy_module"
    assert all("booster" not in command.kind for command in first.commands)
