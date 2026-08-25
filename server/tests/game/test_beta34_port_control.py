from app.game.engine import BattleEngine, MODULE_INTERACTION_UNLOCK_MS
from app.game.models import BattleState, Direction, ModuleStatus, Position


def active(engine, instance_id, definition_id, x, y, direction=Direction.UP):
    module = engine.grant_module("p1", instance_id, definition_id)
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    module.direction = direction
    return module


def test_auto_orientation_remains_and_player_can_override_it_afterward():
    engine = BattleEngine(BattleState(battle_id="beta34-port-control"))
    engine.add_player("p1")
    engine.state.players["p1"].circuit_credits = 2_000
    active(engine, "core-1", "core", 2, 2)
    active(engine, "generator-1", "generator", 2, 3)
    active(engine, "splitter-1", "splitter", 2, 1, Direction.DOWN)
    laser = active(engine, "laser-1", "laser", 1, 1, Direction.RIGHT)
    engine.state.elapsed_ms = MODULE_INTERACTION_UNLOCK_MS

    engine._cmd_move_module(
        "p1",
        {"module_id": laser.instance_id, "x": 3, "y": 1},
    )

    assert laser.direction == Direction.LEFT

    engine._cmd_rotate_module(
        "p1",
        {"module_id": laser.instance_id, "clockwise": True},
    )

    assert laser.direction == Direction.UP
    assert engine.state.events[-1].type == "module_rotated"
