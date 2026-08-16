import pytest

from app.game.board import get_default_board
from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState, ModuleStatus, Position


def make_engine():
    engine = BattleEngine(BattleState(battle_id="board"))
    engine.add_player("p1")
    engine.grant_module("p1", "core-1", "core")
    engine.grant_module("p1", "generator-1", "generator")
    engine.grant_module("p1", "laser-1", "laser")
    return engine


def advance_15s(engine):
    for _ in range(150):
        engine.step()


def test_board_has_21_cells_and_20_placeable_positions():
    board = get_default_board()
    assert len(board.cells) == 21
    assert len(board.placeable_positions) == 20


def test_core_is_center_and_not_placeable():
    board = get_default_board()
    assert board.core_position == Position(2, 2)
    assert board.get_cell(Position(2, 2)).placeable is False


def test_four_gates_surround_core():
    board = get_default_board()
    assert set(board.generator_gate_positions) == {
        Position(2, 1),
        Position(3, 2),
        Position(2, 3),
        Position(1, 2),
    }


def test_outer_corners_are_not_board_cells():
    board = get_default_board()
    for pos in (Position(0,0), Position(4,0), Position(0,4), Position(4,4)):
        assert board.contains(pos) is False


def test_core_only_uses_center():
    engine = make_engine()
    with pytest.raises(ValueError):
        engine.set_initial_active_module("p1", "core-1", 1, 1)
    engine.set_initial_active_module("p1", "core-1", 2, 2)


def test_generator_only_uses_gate():
    engine = make_engine()
    engine.set_initial_active_module("p1", "core-1", 2, 2)
    with pytest.raises(ValueError):
        engine.set_initial_active_module("p1", "generator-1", 1, 1)
    engine.set_initial_active_module("p1", "generator-1", 2, 3)


def test_dynamic_place_rejects_outside_board():
    engine = make_engine()
    engine.set_initial_active_module("p1", "core-1", 2, 2)
    engine.set_initial_active_module("p1", "generator-1", 2, 3)
    engine.start()
    advance_15s(engine)

    engine.enqueue_command(BattleCommand(
        player_id="p1",
        kind="place_module",
        payload={"module_id": "laser-1", "x": 0, "y": 0},
    ))
    engine.step()

    laser = engine.state.players["p1"].modules["laser-1"]
    assert laser.status == ModuleStatus.RESERVE
    assert engine.state.events[-1].type == "command_rejected"


def test_dynamic_place_accepts_valid_board_cell():
    engine = make_engine()
    engine.set_initial_active_module("p1", "core-1", 2, 2)
    engine.set_initial_active_module("p1", "generator-1", 2, 3)
    engine.start()
    advance_15s(engine)

    engine.enqueue_command(BattleCommand(
        player_id="p1",
        kind="place_module",
        payload={"module_id": "laser-1", "x": 3, "y": 3},
    ))
    engine.step()

    laser = engine.state.players["p1"].modules["laser-1"]
    assert laser.status == ModuleStatus.ACTIVE
    assert laser.position == Position(3, 3)


def test_board_space_does_not_change_10_active_module_cap():
    engine = BattleEngine(BattleState(battle_id="cap"))
    engine.state.elapsed_ms = 85_000
    engine.state.tick = 850

    assert len(engine.board.placeable_positions) == 20
    assert engine.max_active_modules() == 10
