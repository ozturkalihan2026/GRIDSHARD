import pytest

from app.game.engine import BattleEngine, CommandRejected, MODULE_INTERACTION_UNLOCK_MS
from app.game.models import BattleState, Direction, ModuleStatus, Position
from app.game.topology import build_energy_topology


def active(engine, instance_id, definition_id, x, y, direction=Direction.UP):
    module = engine.grant_module("p1", instance_id, definition_id)
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    module.direction = direction
    return module


def swap_engine():
    engine = BattleEngine(BattleState(battle_id="beta31-module-swap"))
    engine.add_player("p1")
    player = engine.state.players["p1"]
    player.circuit_credits = 1_000
    active(engine, "core-1", "core", 2, 2)
    active(engine, "generator-1", "generator", 2, 3)
    first = active(engine, "laser-1", "laser", 3, 3, Direction.LEFT)
    second = active(engine, "shield-1", "shield", 4, 3, Direction.LEFT)
    engine.state.elapsed_ms = MODULE_INTERACTION_UNLOCK_MS
    return engine, first, second


def test_active_modules_swap_atomically_and_auto_orient_to_generator():
    engine, first, second = swap_engine()
    credits_before = engine.circuit_credits("p1")

    engine._cmd_swap_modules(
        "p1",
        {"module_id": first.instance_id, "target_module_id": second.instance_id},
    )

    assert first.position == Position(4, 3)
    assert second.position == Position(3, 3)
    topology = build_energy_topology(
        engine.state.players["p1"],
        engine.board.core_position,
    )
    assert {first.instance_id, second.instance_id}.issubset(
        topology.reachable_from_generator
    )
    assert engine.circuit_credits("p1") == (
        credits_before - engine.circuit_credit_config.move_cost
    )
    assert engine.state.events[-1].type == "modules_swapped"
    assert engine.state.events[-1].data["first"]["x"] == 4
    assert engine.state.events[-1].data["second"]["x"] == 3


def test_impossible_swap_is_rejected_without_partial_position_or_credit_change():
    engine, first, second = swap_engine()
    first.position = Position(1, 0)
    second.position = Position(3, 4)
    first_before = (first.position, first.direction)
    second_before = (second.position, second.direction)
    credits_before = engine.circuit_credits("p1")

    with pytest.raises(CommandRejected, match="Jeneratör hattına"):
        engine._cmd_swap_modules(
            "p1",
            {"module_id": first.instance_id, "target_module_id": second.instance_id},
        )

    assert (first.position, first.direction) == first_before
    assert (second.position, second.direction) == second_before
    assert engine.circuit_credits("p1") == credits_before


def test_generator_cannot_enter_normal_module_swap():
    engine, first, _ = swap_engine()

    with pytest.raises(CommandRejected, match="Jeneratör"):
        engine._cmd_swap_modules(
            "p1",
            {"module_id": first.instance_id, "target_module_id": "generator-1"},
        )
