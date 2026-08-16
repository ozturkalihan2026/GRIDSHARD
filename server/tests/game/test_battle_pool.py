import pytest

from app.game.battle_pool import (
    BATTLE_POOL_SIZE,
    BattlePoolValidationError,
    default_battle_pool,
    validate_battle_pool,
)
from app.game.catalog import PLAYER_SELECTABLE_MODULE_IDS
from app.game.engine import BattleEngine
from app.game.models import BattleState


def test_battle_pool_size_is_18():
    assert BATTLE_POOL_SIZE == 18


def test_valid_pool_accepts_exactly_18_unique_modules():
    pool = validate_battle_pool(PLAYER_SELECTABLE_MODULE_IDS[:18])
    assert len(pool.module_definition_ids) == 18
    assert len(pool.as_set()) == 18


@pytest.mark.parametrize("size", [17, 19])
def test_pool_rejects_wrong_size(size):
    with pytest.raises(BattlePoolValidationError):
        validate_battle_pool(PLAYER_SELECTABLE_MODULE_IDS[:size])


def test_pool_rejects_duplicate_modules():
    ids = list(PLAYER_SELECTABLE_MODULE_IDS[:17])
    ids.append(ids[0])
    with pytest.raises(BattlePoolValidationError):
        validate_battle_pool(ids)


def test_pool_rejects_core():
    ids = list(PLAYER_SELECTABLE_MODULE_IDS[:17])
    ids.append("core")
    with pytest.raises(BattlePoolValidationError):
        validate_battle_pool(ids)


def test_pool_rejects_unknown_module():
    ids = list(PLAYER_SELECTABLE_MODULE_IDS[:17])
    ids.append("unknown-module")
    with pytest.raises(BattlePoolValidationError):
        validate_battle_pool(ids)


def test_default_pool_is_valid():
    pool = default_battle_pool()
    assert len(pool.module_definition_ids) == 18
    assert set(pool.module_definition_ids) <= set(PLAYER_SELECTABLE_MODULE_IDS)


def test_engine_assigns_pool_before_match():
    engine = BattleEngine(BattleState(battle_id="pool"))
    engine.add_player("p1")
    engine.set_battle_pool("p1", PLAYER_SELECTABLE_MODULE_IDS[:18])
    assert len(engine.state.players["p1"].battle_pool.module_definition_ids) == 18


def test_engine_rejects_pool_change_after_start():
    engine = BattleEngine(BattleState(battle_id="pool"))
    engine.add_player("p1")
    engine.set_battle_pool("p1", PLAYER_SELECTABLE_MODULE_IDS[:18])
    engine.start()
    with pytest.raises(ValueError):
        engine.set_battle_pool("p1", PLAYER_SELECTABLE_MODULE_IDS[6:24])


def test_grant_rejects_module_outside_selected_pool():
    engine = BattleEngine(BattleState(battle_id="pool"))
    engine.add_player("p1")
    selected = PLAYER_SELECTABLE_MODULE_IDS[:18]
    engine.set_battle_pool("p1", selected)
    outside = next(mid for mid in PLAYER_SELECTABLE_MODULE_IDS if mid not in selected)
    with pytest.raises(ValueError):
        engine.grant_module("p1", "outside-1", outside)


def test_grant_allows_module_inside_selected_pool():
    engine = BattleEngine(BattleState(battle_id="pool"))
    engine.add_player("p1")
    selected = PLAYER_SELECTABLE_MODULE_IDS[:18]
    engine.set_battle_pool("p1", selected)
    module = engine.grant_module("p1", "inside-1", selected[0])
    assert module.definition.id == selected[0]


def test_core_remains_outside_pool_but_can_be_granted():
    engine = BattleEngine(BattleState(battle_id="pool"))
    engine.add_player("p1")
    engine.set_battle_pool("p1", PLAYER_SELECTABLE_MODULE_IDS[:18])
    core = engine.grant_module("p1", "core-1", "core")
    assert core.definition.id == "core"
