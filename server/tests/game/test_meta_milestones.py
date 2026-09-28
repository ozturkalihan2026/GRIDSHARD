from app.game.battle_pool import BATTLE_POOL_SIZE, default_battle_pool
from app.game.board import get_default_board
from app.game.catalog import (
    BASIC_MODULE_DEFINITIONS,
    PLAYER_SELECTABLE_MODULE_IDS,
)
from app.game.engine import MAX_ACTIVE_MODULES


def test_catalog_has_36_player_modules_plus_core():
    assert len(PLAYER_SELECTABLE_MODULE_IDS) == 36
    assert set(BASIC_MODULE_DEFINITIONS) == {"core", *PLAYER_SELECTABLE_MODULE_IDS}


def test_battle_deck_is_exactly_6_unique_module_definitions():
    pool = default_battle_pool()
    assert BATTLE_POOL_SIZE == 6
    assert len(pool.module_definition_ids) == 6
    assert len(set(pool.module_definition_ids)) == 6
    assert "core" not in pool.module_definition_ids


def test_board_is_15_plain_cells_around_a_fixed_core():
    board = get_default_board()
    assert len(board.cells) == 15
    assert {(cell.position.x, cell.position.y) for cell in board.cells} == {
        (x, y) for x in range(5) for y in range(3)
    }
    assert MAX_ACTIVE_MODULES == 15
    assert (board.core_position.x, board.core_position.y) == (2, 1)


def test_counter_strategy_metadata_is_broadly_configured():
    configured = [
        module
        for module in BASIC_MODULE_DEFINITIONS.values()
        if module.strong_against or module.weak_against
    ]
    assert len(configured) >= 12
