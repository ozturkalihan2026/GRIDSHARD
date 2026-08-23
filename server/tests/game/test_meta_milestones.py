from app.game.battle_pool import BATTLE_POOL_SIZE, default_battle_pool
from app.game.board import (
    BoardCellType,
    get_default_board,
    special_cell_positions,
)
from app.game.booster_schedule import (
    BOOSTER_FIRST_OFFER_MS,
    BOOSTER_OFFER_INTERVAL_MS,
    BOOSTER_OPTIONS_PER_OFFER,
    booster_offer_due_at_ms,
)
from app.game.catalog import (
    BASIC_MODULE_DEFINITIONS,
    PLAYER_SELECTABLE_MODULE_IDS,
)
from app.game.engine import max_active_modules_for_elapsed_ms


def test_meta_has_approximately_24_modules():
    assert len(BASIC_MODULE_DEFINITIONS) == 25
    assert len(PLAYER_SELECTABLE_MODULE_IDS) >= 23


def test_battle_pool_is_exactly_18_unique_modules():
    pool = default_battle_pool()
    assert BATTLE_POOL_SIZE == 18
    assert len(pool.module_definition_ids) == 18
    assert len(set(pool.module_definition_ids)) == 18


def test_capacity_schedule_reaches_10():
    assert max_active_modules_for_elapsed_ms(14_999) is None
    assert max_active_modules_for_elapsed_ms(15_000) == 5
    assert max_active_modules_for_elapsed_ms(25_000) == 6
    assert max_active_modules_for_elapsed_ms(35_000) == 7
    assert max_active_modules_for_elapsed_ms(45_000) == 8
    assert max_active_modules_for_elapsed_ms(55_000) == 9
    assert max_active_modules_for_elapsed_ms(65_000) == 10
    assert max_active_modules_for_elapsed_ms(75_000) == 10
    assert max_active_modules_for_elapsed_ms(200_000) == 10


def test_board_has_all_six_special_cell_types():
    board = get_default_board()
    positions = special_cell_positions()
    assert len(positions) == 6
    types = {
        board.get_cell(position).cell_type
        for position in positions
    }
    assert {
        BoardCellType.ATTACK,
        BoardCellType.DEFENSE,
        BoardCellType.ENERGY,
        BoardCellType.COOLING,
        BoardCellType.REPAIR,
        BoardCellType.SIGNAL,
    } == types


def test_booster_loop_starts_ten_seconds_after_final_slot():
    assert BOOSTER_FIRST_OFFER_MS == 75_000
    assert BOOSTER_OFFER_INTERVAL_MS == 10_000
    assert BOOSTER_OPTIONS_PER_OFFER == 3
    assert [
        booster_offer_due_at_ms(index)
        for index in range(4)
    ] == [75_000, 85_000, 95_000, 105_000]


def test_counter_strategy_metadata_is_broadly_configured():
    configured = [
        module
        for module in BASIC_MODULE_DEFINITIONS.values()
        if module.strong_against or module.weak_against
    ]
    assert len(configured) >= 12
