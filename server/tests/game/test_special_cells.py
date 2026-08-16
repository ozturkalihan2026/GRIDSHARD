from app.game.board import (
    BoardCellType,
    get_cell_effects,
    get_default_board,
    special_cell_positions,
)
from app.game.engine import BattleEngine
from app.game.models import BattleState, Position


def test_exactly_six_special_cells_exist():
    assert len(special_cell_positions()) == 6


def test_all_six_special_cell_types_exist_once():
    board = get_default_board()
    types = [board.get_cell(pos).cell_type for pos in special_cell_positions()]

    assert set(types) == {
        BoardCellType.ATTACK,
        BoardCellType.DEFENSE,
        BoardCellType.ENERGY,
        BoardCellType.COOLING,
        BoardCellType.REPAIR,
        BoardCellType.SIGNAL,
    }


def test_attack_cell_metadata_is_15_percent_bonus():
    effects = get_cell_effects(Position(2, 0))
    assert effects == {"attack_multiplier": 1.15}


def test_defense_cell_metadata_is_15_percent_bonus():
    effects = get_cell_effects(Position(4, 2))
    assert effects == {"defense_multiplier": 1.15}


def test_energy_cell_metadata_is_15_percent_bonus():
    effects = get_cell_effects(Position(2, 4))
    assert effects == {"energy_multiplier": 1.15}


def test_cooling_cell_metadata_reduces_heat_factor():
    effects = get_cell_effects(Position(0, 2))
    assert effects == {"heat_multiplier": 0.80}


def test_repair_cell_metadata_is_20_percent_bonus():
    effects = get_cell_effects(Position(1, 1))
    assert effects == {"repair_multiplier": 1.20}


def test_signal_cell_metadata_reduces_cooldown_factor():
    effects = get_cell_effects(Position(3, 3))
    assert effects == {"cooldown_multiplier": 0.85}


def test_normal_cell_has_no_special_effects():
    assert get_cell_effects(Position(1, 0)) == {}


def test_special_cells_remain_placeable():
    board = get_default_board()
    assert all(board.get_cell(pos).placeable for pos in special_cell_positions())


def test_engine_exposes_current_cell_effects_for_active_module():
    engine = BattleEngine(BattleState(battle_id="special-cell"))
    engine.add_player("p1")
    engine.grant_module("p1", "laser-1", "laser")

    module = engine.state.players["p1"].modules["laser-1"]
    module.position = Position(2, 0)

    assert engine.cell_effects_for_module("p1", "laser-1") == {
        "attack_multiplier": 1.15
    }


def test_module_event_data_contains_cell_effect_metadata():
    engine = BattleEngine(BattleState(battle_id="special-cell"))
    engine.add_player("p1")
    module = engine.grant_module("p1", "laser-1", "laser")
    module.position = Position(2, 0)

    data = engine._module_event_data("p1", module)

    assert data["cell_effects"] == {"attack_multiplier": 1.15}
