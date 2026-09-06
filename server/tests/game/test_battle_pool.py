import pytest

from app.game.battle_pool import (
    BATTLE_POOL_SIZE,
    BattlePoolValidationError,
    default_battle_pool,
    migrate_battle_pool,
    validate_battle_pool,
)
from app.game.catalog import PLAYER_SELECTABLE_MODULE_IDS
from app.game.engine import BattleEngine
from app.game.models import BattleState


def test_battle_pool_is_a_six_card_deck():
    pool = default_battle_pool()
    assert BATTLE_POOL_SIZE == 6
    assert len(pool.module_definition_ids) == 6
    assert len(pool.as_set()) == 6
    assert not {"core", "generator"} & pool.as_set()


@pytest.mark.parametrize("size", [5, 7])
def test_pool_rejects_wrong_size(size):
    valid = list(default_battle_pool().module_definition_ids)
    candidate = valid[:size]
    if size > len(candidate):
        candidate.append("armor")
    with pytest.raises(BattlePoolValidationError):
        validate_battle_pool(candidate)


def test_pool_rejects_duplicate_and_fixed_modules():
    valid = list(default_battle_pool().module_definition_ids)
    with pytest.raises(BattlePoolValidationError):
        validate_battle_pool(valid[:-1] + [valid[0]])
    with pytest.raises(BattlePoolValidationError):
        validate_battle_pool(valid[:-1] + ["core"])
    with pytest.raises(BattlePoolValidationError):
        validate_battle_pool(valid[:-1] + ["generator"])


def test_pool_rejects_unknown_module():
    valid = list(default_battle_pool().module_definition_ids)
    with pytest.raises(BattlePoolValidationError):
        validate_battle_pool(valid[:-1] + ["unknown-module"])


def test_legacy_pool_migrates_without_fixed_modules():
    legacy = list(PLAYER_SELECTABLE_MODULE_IDS[:18])
    pool = migrate_battle_pool(legacy)
    assert len(pool.module_definition_ids) == 6
    assert "generator" not in pool.module_definition_ids


def test_engine_accepts_deck_and_fixed_start_modules_only_outside_it():
    engine = BattleEngine(BattleState(battle_id="pool"))
    engine.add_player("p1")
    deck = default_battle_pool().module_definition_ids
    engine.set_battle_pool("p1", deck)
    assert engine.grant_module("p1", "core-1", "core").definition.id == "core"
    assert engine.grant_module("p1", "gen-1", "generator").definition.id == "generator"
    assert engine.grant_module("p1", "inside-1", deck[0]).definition.id == deck[0]
    outside = next(
        module_id
        for module_id in PLAYER_SELECTABLE_MODULE_IDS
        if module_id not in deck and module_id != "generator"
    )
    with pytest.raises(ValueError):
        engine.grant_module("p1", "outside-1", outside)


def test_engine_rejects_deck_change_after_start():
    engine = BattleEngine(BattleState(battle_id="pool"))
    engine.add_player("p1")
    deck = default_battle_pool().module_definition_ids
    engine.set_battle_pool("p1", deck)
    engine.start()
    with pytest.raises(ValueError):
        engine.set_battle_pool("p1", deck)
