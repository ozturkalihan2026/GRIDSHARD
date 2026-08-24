import pytest

from app.game.engine import BattleEngine, CommandRejected
from app.game.energy import process_energy_tick
from app.game.models import BattleState, Direction, ModuleStatus, Position
from app.game.topology import build_energy_topology


def active(engine, instance_id, definition_id, x, y, direction=Direction.UP):
    module = engine.grant_module("p1", instance_id, definition_id)
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    module.direction = direction
    return module


def connected_engine():
    engine = BattleEngine(BattleState(battle_id="beta28-energy-placement"))
    engine.add_player("p1")
    engine.state.players["p1"].circuit_credits = 2_000
    active(engine, "core-1", "core", 2, 2)
    active(engine, "generator-1", "generator", 2, 3)
    splitter = active(engine, "splitter-1", "splitter", 2, 1, Direction.DOWN)
    laser = active(engine, "laser-1", "laser", 1, 1, Direction.RIGHT)
    engine.state.elapsed_ms = engine.module_interaction_unlock_ms
    return engine, splitter, laser


def test_move_reorients_module_to_a_real_generator_reachable_port():
    engine, _, laser = connected_engine()

    engine._cmd_move_module(
        "p1",
        {"module_id": laser.instance_id, "x": 3, "y": 1},
    )

    assert laser.position == Position(3, 1)
    assert laser.direction == Direction.LEFT
    topology = build_energy_topology(
        engine.state.players["p1"],
        engine.board.core_position,
    )
    assert laser.instance_id in topology.reachable_from_generator

    process_energy_tick(
        engine.state.players["p1"],
        engine.board.core_position,
    )
    assert laser.is_powered is True
    assert laser.energy_received_last_tick > 0


def test_move_cannot_use_its_old_downstream_island_as_a_ghost_bridge():
    engine, splitter, laser = connected_engine()

    with pytest.raises(CommandRejected, match="Jeneratöre"):
        engine._cmd_move_module(
            "p1",
            {"module_id": splitter.instance_id, "x": 0, "y": 1},
        )

    assert splitter.position == Position(2, 1)
    assert laser.position == Position(1, 1)

