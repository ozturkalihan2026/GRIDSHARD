import pytest

from app.game.board import (
    BoardCellType,
    get_cell_effects,
    get_default_board,
    special_cell_positions,
)
from app.game.engine import BattleEngine, CommandRejected
from app.game.models import BattleState, Position


def test_exactly_four_class_restricted_special_cells_exist():
    assert len(special_cell_positions()) == 4


def test_all_four_special_cell_types_exist_once():
    board = get_default_board()
    types = [board.get_cell(pos).cell_type for pos in special_cell_positions()]

    assert set(types) == {
        BoardCellType.ATTACK,
        BoardCellType.DEFENSE,
        BoardCellType.ENERGY,
        BoardCellType.REPAIR,
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


def test_repair_cell_metadata_is_20_percent_bonus():
    effects = get_cell_effects(Position(0, 2))
    assert effects == {"repair_multiplier": 1.20}


def test_normal_cell_has_no_special_effects():
    assert get_cell_effects(Position(1, 0)) == {}


def test_special_cells_remain_placeable():
    board = get_default_board()
    assert all(board.get_cell(pos).placeable for pos in special_cell_positions())


def test_special_cells_expose_their_placement_restrictions():
    board = get_default_board()

    assert board.get_cell(Position(2, 0)).allowed_categories == ("saldırı",)
    assert board.get_cell(Position(4, 2)).allowed_categories == ("savunma",)
    assert board.get_cell(Position(2, 4)).allowed_categories == ("enerji",)
    assert board.get_cell(Position(0, 2)).allowed_definition_ids == ("repair",)


def test_engine_rejects_wrong_module_class_for_special_cell():
    engine = BattleEngine(BattleState(battle_id="special-cell-restriction"))
    engine.add_player("p1")
    laser = engine.grant_module("p1", "laser-1", "laser")
    shield = engine.grant_module("p1", "shield-1", "shield")
    battery = engine.grant_module("p1", "battery-1", "battery")
    repair = engine.grant_module("p1", "repair-1", "repair")

    engine._ensure_module_allowed_in_cell(laser, Position(2, 0))
    engine._ensure_module_allowed_in_cell(shield, Position(4, 2))
    engine._ensure_module_allowed_in_cell(battery, Position(2, 4))
    engine._ensure_module_allowed_in_cell(repair, Position(0, 2))

    with pytest.raises(CommandRejected):
        engine._ensure_module_allowed_in_cell(shield, Position(2, 0))
    with pytest.raises(CommandRejected):
        engine._ensure_module_allowed_in_cell(laser, Position(0, 2))


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
