from dataclasses import replace

import pytest

from app.game.catalog import BASIC_MODULE_DEFINITIONS
from app.game.core_stats import core_max_hp
from app.game.engine import BattleEngine
from app.game.energy import QUANTUM_CHARGE_MAX
from app.game.models import BattleState


def battle(level=15):
    engine = BattleEngine(BattleState(battle_id="production-level-balance"))
    for owner in ("a", "b"):
        engine.add_player(owner).core_level = level
        engine.state.player_upgrade_levels[owner] = {key: level-1 for key in BASIC_MODULE_DEFINITIONS}
        engine.grant_module(owner, f"{owner}-core", "core")
        engine.set_initial_active_module(owner, f"{owner}-core", 2, 1)
    return engine


def test_core_durability_uses_selected_core_level_for_both_players():
    engine = battle()
    for player in engine.state.players.values():
        core = next(iter(player.modules.values()))
        assert core.hp == core.definition.max_hp == core_max_hp(15)
        assert core.hp > 800


def test_ai_core_refreshes_after_its_level_is_matched_without_repeat_healing():
    engine = battle(level=1)
    engine.state.players["b"].core_level = 15
    engine.start()
    core = engine.state.players["b"].modules["b-core"]
    assert core.hp == core.definition.max_hp == core_max_hp(15)
    core.hp -= 50
    engine.start()
    assert core.hp == core_max_hp(15)-50


@pytest.mark.parametrize("module_id", ("quantum_cannon", "ion_spear"))
def test_max_level_core_survives_two_heavy_opening_shots(module_id):
    engine = battle()
    gun = engine.grant_module("a", "gun", module_id)
    engine.set_initial_active_module("a", "gun", 1, 1)
    engine.start()
    for _ in range(150):
        if module_id == "quantum_cannon":
            gun.mechanic_state["quantum_charge"] = QUANTUM_CHARGE_MAX
        engine.step()
        shots = [event for event in engine.state.events if event.type == "attack_performed"]
        if len(shots) >= 2:
            break
    assert len(shots) >= 2
    assert engine.state.players["b"].modules["b-core"].hp > 0
    assert engine.state.status.value == "running"
    assert gun.definition.current_cost == 4


@pytest.mark.parametrize("module_id", ("quantum_cannon", "ion_spear"))
def test_heavy_weapon_fights_for_thirty_seconds_without_mandatory_cooler(module_id):
    engine = battle()
    gun = engine.grant_module("a", "gun", module_id)
    engine.set_initial_active_module("a", "gun", 1, 1)
    target = engine.state.players["b"].modules["b-core"]
    target.definition = replace(target.definition, max_hp=1_000_000)
    target.hp = target.definition.max_hp
    engine.start()
    for _ in range(300):
        engine.step()
    assert len([event for event in engine.state.events if event.type == "attack_performed"]) >= 8
    assert not [event for event in engine.state.events if event.type == "module_overheated"]
    assert gun.heat > 45  # Cooling still offers sustained-fire value.
