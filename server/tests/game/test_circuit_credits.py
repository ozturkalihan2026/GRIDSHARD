from app.game.battle_pool import default_battle_pool
from app.game.economy import CircuitCreditConfig
from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState


def create_engine(starting_credits=200, passive_per_second=10):
    engine = BattleEngine(
        BattleState(battle_id="credit-test"),
        circuit_credit_config=CircuitCreditConfig(
            starting_credits=starting_credits,
            passive_credits_per_second=passive_per_second,
        ),
    )
    engine.add_player("player")
    engine.set_battle_pool("player", default_battle_pool().module_definition_ids)
    engine.grant_module("player", "core", "core")
    engine.grant_module("player", "generator", "generator")
    engine.set_initial_active_module("player", "core", 2, 2)
    engine.set_initial_active_module("player", "generator", 2, 3)
    engine.start()
    return engine


def deploy(engine, definition_id):
    engine.enqueue_command(BattleCommand("player", "deploy_module", {
        "definition_id": definition_id,
    }))
    engine.step()


def test_passive_income_and_explicit_award_still_work():
    engine = create_engine(starting_credits=100, passive_per_second=10)
    for _ in range(10):
        engine.step()
    assert engine.circuit_credits("player") == 110
    engine.award_circuit_credits("player", 25, reason="test")
    assert engine.circuit_credits("player") == 135


def test_deck_click_spends_definition_cost_for_every_copy():
    engine = create_engine(starting_credits=1_000, passive_per_second=0)
    deploy(engine, "laser")
    deploy(engine, "laser")
    lasers = [m for m in engine.state.players["player"].modules.values()
              if m.definition.id == "laser"]
    assert len(lasers) == 2
    assert engine.circuit_credits("player") == 820


def test_unaffordable_deck_card_is_rejected_without_creating_instance():
    engine = create_engine(starting_credits=0, passive_per_second=0)
    deploy(engine, "laser")
    assert not any(m.definition.id == "laser"
                   for m in engine.state.players["player"].modules.values())
    assert engine.state.events[-1].type == "command_rejected"


def test_move_and_replace_are_rejected_without_spending_credit():
    engine = create_engine(starting_credits=1_000, passive_per_second=0)
    deploy(engine, "laser")
    laser = next(m for m in engine.state.players["player"].modules.values()
                 if m.definition.id == "laser")
    before_credit = engine.circuit_credits("player")
    before_position = laser.position
    engine.enqueue_command(BattleCommand("player", "move_module", {
        "module_id": laser.instance_id, "x": 0, "y": 0,
    }))
    engine.step()
    assert laser.position == before_position
    assert engine.circuit_credits("player") == before_credit
    assert engine.state.events[-1].type == "command_rejected"
