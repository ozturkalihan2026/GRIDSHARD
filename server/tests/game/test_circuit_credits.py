from app.game.battle_pool import default_battle_pool
from app.game.economy import CircuitCreditConfig
from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState


def create_engine(starting_credits=6, regen_interval_ms=2500):
    engine = BattleEngine(
        BattleState(battle_id="credit-test"),
        circuit_credit_config=CircuitCreditConfig(
            starting_credits=starting_credits,
            current_regen_interval_ms=regen_interval_ms,
        ),
    )
    engine.add_player("player")
    engine.set_battle_pool("player", default_battle_pool().module_definition_ids)
    engine.grant_module("player", "core", "core")
    engine.set_initial_active_module("player", "core", 2, 1)
    engine.start()
    return engine


def deploy(engine, definition_id):
    engine.enqueue_command(BattleCommand("player", "deploy_module", {
        "definition_id": definition_id,
    }))
    engine.step()


def test_akim_regenerates_on_interval_and_award_respects_cap():
    engine = create_engine(starting_credits=6, regen_interval_ms=2500)
    for _ in range(25):
        engine.step()
    assert engine.circuit_credits("player") == 7
    engine.award_circuit_credits("player", 25, reason="test")
    assert engine.circuit_credits("player") == 12
    for _ in range(50):
        engine.step()
    assert engine.circuit_credits("player") == 12


def test_deck_click_spends_definition_cost_for_every_copy():
    engine = create_engine(starting_credits=12)
    deploy(engine, "laser")
    deploy(engine, "laser")
    lasers = [m for m in engine.state.players["player"].modules.values()
              if m.definition.id == "laser"]
    assert len(lasers) == 2
    assert engine.circuit_credits("player") == 12 - 2 * lasers[0].definition.current_cost


def test_unaffordable_deck_card_is_rejected_without_creating_instance():
    engine = create_engine(starting_credits=0)
    deploy(engine, "laser")
    assert not any(m.definition.id == "laser"
                   for m in engine.state.players["player"].modules.values())
    assert engine.state.events[-1].type == "command_rejected"


def test_move_is_rejected_without_spending_credit():
    engine = create_engine(starting_credits=12)
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
