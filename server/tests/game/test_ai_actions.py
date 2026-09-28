from app.game.ai import build_ai_action_plan, choose_deploy_definition, enqueue_ai_actions
from app.game.ai_archetypes import get_ai_archetype
from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState


def setup_engine(archetype_id="balanced") -> BattleEngine:
    engine = BattleEngine(BattleState(battle_id="ai-actions"))
    for player_id in ("ai", "opponent"):
        engine.add_player(player_id)
        deck = (
            get_ai_archetype(archetype_id).battle_pool_ids
            if player_id == "ai"
            else get_ai_archetype("balanced").battle_pool_ids
        )
        engine.set_battle_pool(player_id, deck)
        engine.grant_module(player_id, f"{player_id}-core", "core")
        engine.set_initial_active_module(
            player_id, f"{player_id}-core", 2, 1
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
    assert len(active) == 2
    assert any(module.definition.id != "core" for module in active)


def test_ai_waits_when_no_card_is_affordable():
    engine = setup_engine()
    engine.state.players["ai"].circuit_credits = 0
    assert build_ai_action_plan(engine, "ai", "opponent") is None


ROTATION_DECK = ("laser", "drone_bay", "missile_launcher", "pulse_cannon", "amplifier", "overclock_unit")


def rotation_engine() -> BattleEngine:
    engine = BattleEngine(BattleState(battle_id="ai-rotation"))
    for player_id in ("ai", "opponent"):
        engine.add_player(player_id)
        engine.set_battle_pool(player_id, ROTATION_DECK)
        engine.grant_module(player_id, f"{player_id}-core", "core")
        engine.set_initial_active_module(player_id, f"{player_id}-core", 2, 1)
    engine.start()
    return engine


def test_ai_rotates_deck_cards_even_after_they_die():
    engine = rotation_engine()
    ai = engine.state.players["ai"]
    picks = []
    for _ in range(6):
        ai.circuit_credits = 12
        pick = choose_deploy_definition(ai, engine.state.players["opponent"])
        picks.append(pick)
        engine.enqueue_command(BattleCommand("ai", "deploy_module", {"definition_id": pick}))
        engine.step()
        placed = [m for m in ai.modules.values() if m.definition.id == pick][-1]
        engine.apply_damage("ai", placed.instance_id, placed.hp)

    # Ölen kart da geçmişte sayılır: aynı kart art arda basılmaz, deste döner.
    assert all(first != second for first, second in zip(picks, picks[1:]))
    assert len(set(picks)) >= 3


def test_ai_waits_briefly_for_a_better_card_only_when_an_attack_is_live():
    engine = rotation_engine()
    ai = engine.state.players["ai"]
    ai.circuit_credits = 3
    # Sahada saldırı yokken beklemez; ucuz saldırıyı hemen basar.
    assert choose_deploy_definition(ai, engine.state.players["opponent"]) is not None

    ai.circuit_credits = 12
    engine.enqueue_command(BattleCommand("ai", "deploy_module", {"definition_id": "laser"}))
    engine.step()
    ai.circuit_credits = 3
    assert choose_deploy_definition(ai, engine.state.players["opponent"]) is None
    ai.circuit_credits = 4
    assert choose_deploy_definition(ai, engine.state.players["opponent"]) == "pulse_cannon"
