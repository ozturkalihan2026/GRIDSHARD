import pytest

from app.arena_canon import MODULES
from app.game.combat import is_attack_module, select_target
from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
    ModuleStatus,
    Position,
    TimedModuleEffect,
)
from app.game.operations import module_is_operational


def add(engine, player_id, instance_id, definition_id, x, y):
    module = engine.grant_module(player_id, instance_id, definition_id)
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    return module


@pytest.mark.parametrize(
    "effect_id",
    (
        "emp_disabled",
        "support_jammed",
        "virus",
        "energy_leech",
        "line_disrupted",
    ),
)
def test_every_sabotage_family_suspends_the_affected_module(effect_id):
    engine = BattleEngine(BattleState(battle_id=f"beta55-{effect_id}"))
    player = engine.add_player("p1")
    add(engine, "p1", "core", "core", 2, 1)
    module = add(engine, "p1", "laser", "laser", 0, 0)
    module.debuffs[effect_id] = TimedModuleEffect(
        id=effect_id,
        name_tr="Sabotaj",
        expires_at_ms=5000,
    )

    engine._process_energy_flow()

    assert module.is_powered is False
    assert module.energy_required_last_tick == 0
    assert module_is_operational(module) is False
    assert is_attack_module(module) is False
    assert player.energy_load_ratio == 0


@pytest.mark.parametrize("definition_id", tuple(sorted(MODULES)))
def test_suspension_rule_covers_every_catalog_module(definition_id):
    engine = BattleEngine(BattleState(battle_id=f"beta55-all-{definition_id}"))
    engine.add_player("p1")
    add(engine, "p1", "core", "core", 2, 1)
    module = add(engine, "p1", definition_id, definition_id, 0, 0)
    module.debuffs["emp_disabled"] = TimedModuleEffect(
        id="emp_disabled",
        name_tr="EMP",
        expires_at_ms=5000,
    )

    engine._process_energy_flow()

    assert module.is_powered is False
    assert module_is_operational(module) is False
    assert module.energy_required_last_tick == 0


def test_sabotaged_shield_does_not_attract_an_attack():
    engine = BattleEngine(BattleState(battle_id="beta55-targeting"))
    player = engine.add_player("p2")
    add(engine, "p2", "core", "core", 2, 1)
    shield = add(engine, "p2", "shield", "shield", 0, 0)
    armor = add(engine, "p2", "armor", "armor", 1, 0)
    shield.debuffs["emp_disabled"] = TimedModuleEffect(
        id="emp_disabled",
        name_tr="EMP",
        expires_at_ms=5000,
    )
    engine._process_energy_flow()

    assert select_target(player).instance_id == armor.instance_id


def test_current_costs_follow_the_benefit_tiers_and_shield_costs_two():
    assert MODULES["shield"]["current_cost"] == 2
    assert {
        module["current_cost"]
        for module in MODULES.values()
        if module["rarity"] == "common"
    } == {2}
    assert all(
        2 <= module["current_cost"] <= 4
        for module in MODULES.values()
        if module["rarity"] == "rare"
    )
    assert {
        module["current_cost"]
        for module in MODULES.values()
        if module["rarity"] == "epic"
    } == {4}
    assert {
        module["current_cost"]
        for module in MODULES.values()
        if module["rarity"] == "legendary"
    } == {5}
