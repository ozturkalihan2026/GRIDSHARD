from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
    Direction,
    ModuleStatus,
    Position,
)


def activate(engine, player_id, iid, did, pos, direction=Direction.UP):
    module = engine.grant_module(player_id, iid, did)
    module.status = ModuleStatus.ACTIVE
    module.position = pos
    module.direction = direction
    return module


def test_step_runs_energy_then_combat_without_pause():
    engine = BattleEngine(BattleState(battle_id="combat-step"))
    engine.add_player("a")
    engine.add_player("b")

    for player_id in ("a", "b"):
        activate(engine, player_id, f"{player_id}-core", "core", Position(2, 2))
        activate(engine, player_id, f"{player_id}-gen", "generator", Position(2, 3))
        activate(
            engine,
            player_id,
            f"{player_id}-laser",
            "laser",
            Position(2, 1),
            Direction.DOWN,
        )

    engine.start()

    a_laser = engine.state.players["a"].modules["a-laser"]
    b_laser = engine.state.players["b"].modules["b-laser"]

    a_before = a_laser.hp
    b_before = b_laser.hp

    engine.step()

    assert a_laser.hp == a_before - 12
    assert b_laser.hp == b_before - 12
    assert engine.state.elapsed_ms == 100
    assert engine.state.status.value == "running"
