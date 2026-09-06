from app.game.battle_pool import BATTLE_POOL_SIZE, default_battle_pool
from app.game.board import (
    BoardCellType,
    get_default_board,
    special_cell_positions,
)
from app.game.catalog import (
    BASIC_MODULE_DEFINITIONS,
    PLAYER_SELECTABLE_MODULE_IDS,
)
from app.game.engine import max_active_modules_for_elapsed_ms


def test_meta_has_approximately_24_modules():
    assert len(BASIC_MODULE_DEFINITIONS) == 25
    assert len(PLAYER_SELECTABLE_MODULE_IDS) >= 23


def test_battle_deck_is_exactly_6_unique_module_definitions():
    pool = default_battle_pool()
    assert BATTLE_POOL_SIZE == 6
    assert len(pool.module_definition_ids) == 6
    assert len(set(pool.module_definition_ids)) == 6
    assert "core" not in pool.module_definition_ids
    assert "generator" not in pool.module_definition_ids


def test_all_ten_slots_are_available_without_a_countdown():
    for elapsed_ms in (0, 14_999, 15_000, 90_000, 200_000):
        assert max_active_modules_for_elapsed_ms(elapsed_ms) == 10


def test_board_has_four_class_restricted_special_cell_types():
    board = get_default_board()
    positions = special_cell_positions()
    assert len(positions) == 4
    types = {
        board.get_cell(position).cell_type
        for position in positions
    }
    assert {
        BoardCellType.ATTACK,
        BoardCellType.DEFENSE,
        BoardCellType.ENERGY,
        BoardCellType.REPAIR,
    } == types


def test_counter_strategy_metadata_is_broadly_configured():
    configured = [
        module
        for module in BASIC_MODULE_DEFINITIONS.values()
        if module.strong_against or module.weak_against
    ]
    assert len(configured) >= 12
