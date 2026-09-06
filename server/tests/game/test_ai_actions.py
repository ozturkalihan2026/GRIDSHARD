from app.game.ai import build_ai_action_plan, enqueue_ai_actions
from app.game.ai_archetypes import get_ai_archetype
from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState, Direction


def setup_engine(archetype_id="balanced") -> BattleEngine:
    engine = BattleEngine(BattleState(battle_id="ai-actions"))
    for player_id, gate_y, direction in (
        ("ai", 3, Direction.UP),
        ("opponent", 1, Direction.DOWN),
    ):
        engine.add_player(player_id)
        deck = (
            get_ai_archetype(archetype_id).battle_pool_ids
            if player_id == "ai"
            else get_ai_archetype("balanced").battle_pool_ids
        )
        engine.set_battle_pool(player_id, deck)
        engine.grant_module(player_id, f"{player_id}-core", "core")
        engine.set_initial_active_module(
            player_id, f"{player_id}-core", 2, 2, Direction.UP
        )
        engine.grant_module(player_id, f"{player_id}-gen", "generator")
        engine.set_initial_active_module(
            player_id, f"{player_id}-gen", 2, gate_y, direction
        )
    engine.start()
    return engine


def test_ai_can_choose_a_deck_card_from_first_tick():
    engine = setup_engine()
    plan = build_ai_action_plan(engine, "ai", "opponent")
    assert plan is not None
    assert plan.kind == "deploy"
    assert plan.commands[0].kind == "deploy_module"
    assert plan.commands[0].payload["definition_id"] in (
        engine.state.players["ai"].battle_pool.module_definition_ids
    )


def test_ai_deploy_command_is_processed_by_real_engine():
    engine = setup_engine()
    plan = enqueue_ai_actions(engine, "ai", "opponent")
    assert plan is not None
    engine.step()
    active = [
        module
        for module in engine.state.players["ai"].modules.values()
        if module.status.value == "active"
    ]
    assert len(active) == 3
    assert any(module.definition.id not in {"core", "generator"} for module in active)


def test_ai_waits_when_no_card_is_affordable():
    engine = setup_engine()
    engine.state.players["ai"].circuit_credits = 0
    assert build_ai_action_plan(engine, "ai", "opponent") is None


def test_ai_does_not_use_boosters_when_feature_is_disabled():
    engine = setup_engine()
    engine.enqueue_command(BattleCommand(
        "ai",
        "use_booster",
        {"offer_id": "x", "booster_id": "x", "target_module_id": "ai-core"},
    ))
    engine.step()
    assert engine.state.events[-1].type == "command_rejected"
    assert "kapalı" in engine.state.events[-1].data["reason"]
