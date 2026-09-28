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
    assert "core" not in pool.as_set()


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


def test_pool_rejects_unknown_module():
    valid = list(default_battle_pool().module_definition_ids)
    with pytest.raises(BattlePoolValidationError):
        validate_battle_pool(valid[:-1] + ["unknown-module"])


def test_stored_deck_is_normalized_without_removed_cards():
    stored = ["generator", "splitter", "energy_leech", *PLAYER_SELECTABLE_MODULE_IDS[:3]]
    pool = migrate_battle_pool(stored)
    assert len(pool.module_definition_ids) == 6
    assert pool.module_definition_ids[:3] == PLAYER_SELECTABLE_MODULE_IDS[:3]
    assert not {"generator", "splitter", "energy_leech"} & pool.as_set()


def test_engine_accepts_core_and_deck_cards_only():
    engine = BattleEngine(BattleState(battle_id="pool"))
    engine.add_player("p1")
    deck = default_battle_pool().module_definition_ids
    engine.set_battle_pool("p1", deck)
    assert engine.grant_module("p1", "core-1", "core").definition.id == "core"
    assert engine.grant_module("p1", "inside-1", deck[0]).definition.id == deck[0]
    outside = next(
        module_id
        for module_id in PLAYER_SELECTABLE_MODULE_IDS
        if module_id not in deck
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


def test_pool_requires_at_least_one_attack_card():
    # Sabotaj Çekirdeği hedefleyemez; saldırısız iki deste maçı hiç bitiremezdi.
    with pytest.raises(BattlePoolValidationError):
        validate_battle_pool(["shield", "armor", "repair", "cooler", "battery", "emp"])


def test_stored_deck_without_attack_is_normalized_with_an_attack_card():
    pool = migrate_battle_pool(["shield", "armor", "repair", "cooler", "battery", "emp"])
    assert len(pool.module_definition_ids) == 6
    assert "laser" in pool.module_definition_ids
