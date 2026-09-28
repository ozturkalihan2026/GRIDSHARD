import pytest

from app.game.battle_pool import default_battle_pool
from app.game.board import BOARD_HEIGHT, BOARD_WIDTH, get_default_board
from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState, ModuleStatus, Position


def make_engine():
    engine = BattleEngine(BattleState(battle_id="board"))
    engine.add_player("p1")
    engine.set_battle_pool("p1", default_battle_pool().module_definition_ids)
    engine.grant_module("p1", "core-1", "core")
    engine.grant_module("p1", "laser-1", "laser")
    return engine


def test_board_has_15_cells_and_14_placeable_positions():
    board = get_default_board()
    assert (BOARD_WIDTH, BOARD_HEIGHT) == (5, 3)
    assert len(board.cells) == 15
    assert len(board.placeable_positions) == 14


def test_core_is_center_and_not_placeable():
    board = get_default_board()
    assert board.core_position == Position(2, 1)
    assert board.get_cell(Position(2, 1)).placeable is False


def test_every_non_core_cell_is_a_plain_placeable_cell():
    board = get_default_board()
    for cell in board.cells:
        if cell.position != board.core_position:
            assert cell.placeable is True
            assert cell.cell_type.value == "normal"


def test_core_only_uses_center():
    engine = make_engine()
    with pytest.raises(ValueError):
        engine.set_initial_active_module("p1", "core-1", 1, 1)
    engine.set_initial_active_module("p1", "core-1", 2, 1)


def test_manual_cell_placement_command_does_not_exist():
    engine = make_engine()
    engine.set_initial_active_module("p1", "core-1", 2, 1)
    engine.start()

    engine.enqueue_command(BattleCommand(
        player_id="p1",
        kind="place_module",
        payload={"module_id": "laser-1", "x": 0, "y": 0},
    ))
    engine.step()

    laser = engine.state.players["p1"].modules["laser-1"]
    assert laser.status == ModuleStatus.RESERVE
    assert engine.state.events[-1].type == "command_rejected"


def test_deck_deploy_selects_a_random_valid_board_cell():
    engine = make_engine()
    engine.set_initial_active_module("p1", "core-1", 2, 1)
    engine.start()

    engine.enqueue_command(BattleCommand(
        player_id="p1",
        kind="deploy_module",
        payload={"definition_id": "laser"},
    ))
    engine.step()

    laser = next(
        module for module in engine.state.players["p1"].modules.values()
        if module.definition.id == "laser" and module.status == ModuleStatus.ACTIVE
    )
    assert laser.position in engine.board.placeable_positions


def test_active_module_cap_matches_the_board():
    engine = BattleEngine(BattleState(battle_id="cap"))
    assert len(engine.board.placeable_positions) == 14
    assert engine.max_active_modules() == 15
