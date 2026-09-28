from dataclasses import replace

import pytest

from app.arena_canon import RARITY_STAT_PROFILES, module_stats
from app.game.engine import BattleEngine
from app.game.models import (
    BattleEvent,
    BattleState,
    ModuleDefinition,
    ModuleStatus,
    Position,
)
from app.game.result import damage_by_module_from_events


def test_rarity_gives_no_hidden_stat_advantage_at_the_same_level():
    # GRIDSHARD 2.1 enderlik kanunu: aynı seviyede her enderlik aynı değerleri alır.
    base = ModuleDefinition(
        id="rarity-probe",
        name_tr="Nadirlik Probu",
        category="destek",
        max_hp=100,
        base_damage=20,
        cooldown_ms=2000,
        energy_consumption=5,
    )
    stats = [
        module_stats(replace(base, rarity=rarity), 4)
        for rarity in ("common", "rare", "epic", "legendary")
    ]

    for key in ("max_hp", "base_damage", "effect_multiplier", "cooldown_ms", "energy_consumption"):
        assert len({item[key] for item in stats}) == 1, key
    assert all("rarity_bonuses" not in item for item in stats)


def test_rarity_profiles_are_neutral():
    for profile in RARITY_STAT_PROFILES.values():
        assert set(profile.values()) == {1.0}


def _add(engine, player_id, instance_id, definition_id, x, y):
    module = engine.grant_module(player_id, instance_id, definition_id)
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    return module


def test_system_energy_contribution_is_aggregated_into_one_second_event():
    engine = BattleEngine(BattleState(battle_id="beta52-energy-feedback"))
    engine.add_player("p1")
    _add(engine, "p1", "core", "core", 2, 1)
    _add(engine, "p1", "battery", "battery", 0, 0)
    engine.state.tick = 9

    engine._process_energy_flow()

    contribution = next(
        event.data
        for event in engine.state.events
        if event.type == "module_contribution"
        and event.data.get("source_module_id") == "battery"
    )
    assert contribution["category"] == "enerji"
    assert contribution["contribution_kind"] == "energy_supplied"
    assert contribution["unit"] == "energy"
    assert contribution["value"] > 0


def test_attack_support_publishes_real_source_and_percentage():
    engine = BattleEngine(BattleState(battle_id="beta52-support-feedback"))
    engine.add_player("p1")
    engine.add_player("p2")
    _add(engine, "p1", "core-p1", "core", 2, 1)
    _add(engine, "p1", "amplifier", "amplifier", 1, 0)
    _add(engine, "p1", "laser", "laser", 0, 0)
    _add(engine, "p2", "core-p2", "core", 2, 1)
    _add(engine, "p2", "armor", "armor", 0, 0)
    engine._process_energy_flow()

    engine._process_combat_actions()

    contribution = next(
        event.data
        for event in engine.state.events
        if event.type == "module_contribution"
        and event.data.get("source_module_id") == "amplifier"
    )
    assert contribution["target_module_id"] == "laser"
    assert contribution["category"] == "destek"
    assert contribution["contribution_kind"] == "attack_boost"
    assert contribution["unit"] == "percent"
    # Tek saldırı modülünde Güçlendirici tam payını (%15) verir.
    assert contribution["value"] == pytest.approx(15)


def test_defense_publishes_the_real_prevented_damage_value():
    engine = BattleEngine(BattleState(battle_id="beta52-defense-feedback"))
    engine.add_player("p1")
    engine.add_player("p2")
    _add(engine, "p1", "core-p1", "core", 2, 1)
    _add(engine, "p1", "laser", "laser", 0, 0)
    _add(engine, "p2", "core-p2", "core", 2, 1)
    _add(engine, "p2", "shield", "shield", 0, 0)
    engine._process_energy_flow()

    engine._process_combat_actions()

    contribution = next(
        event.data
        for event in engine.state.events
        if event.type == "module_contribution"
        and event.data.get("category") == "savunma"
    )
    attack = next(
        event.data
        for event in engine.state.events
        if event.type == "attack_performed"
    )
    assert contribution["source_module_id"] == "shield"
    assert contribution["contribution_kind"] == "damage_prevented"
    assert contribution["value"] == attack["reduced_damage"]


def test_sabotage_publishes_its_effective_control_duration():
    engine = BattleEngine(BattleState(battle_id="beta52-sabotage-feedback"))
    engine.add_player("p1")
    engine.add_player("p2")
    _add(engine, "p1", "core-p1", "core", 2, 1)
    _add(engine, "p1", "emp", "emp", 0, 0)
    _add(engine, "p2", "core-p2", "core", 2, 1)
    _add(engine, "p2", "shield", "shield", 0, 0)
    engine._process_energy_flow()

    engine._process_sabotage_actions()

    applied = next(
        event.data
        for event in engine.state.events
        if event.type == "sabotage_applied"
    )
    contribution = next(
        event.data
        for event in engine.state.events
        if event.type == "module_contribution"
        and event.data.get("category") == "sabotaj"
    )
    assert contribution["source_module_id"] == "emp"
    assert contribution["target_module_id"] == applied["target_module_id"]
    assert contribution["contribution_kind"] == "control_duration"
    assert contribution["value"] == pytest.approx(
        applied["duration_ms"] / 1000,
        abs=.01,
    )


def test_result_rows_keep_system_and_support_contribution_values():
    engine = BattleEngine(BattleState(battle_id="beta52-result-contributions"))
    player = engine.add_player("p1")
    _add(engine, "p1", "balancer", "current_balancer", 0, 0)
    _add(engine, "p1", "amplifier", "amplifier", 1, 0)
    events = [
        BattleEvent("module_contribution", 1000, {
            "player_id": "p1",
            "source_player_id": "p1",
            "source_module_id": "balancer",
            "category": "enerji",
            "contribution_kind": "energy_saved",
            "value": 4.5,
        }),
        BattleEvent("module_contribution", 1000, {
            "player_id": "p1",
            "source_player_id": "p1",
            "source_module_id": "amplifier",
            "category": "destek",
            "contribution_kind": "attack_boost",
            "value": 16.65,
        }),
    ]

    rows = {
        row["definition_id"]: row
        for row in damage_by_module_from_events(player, events)
    }

    assert rows["current_balancer"]["energy_saved"] == pytest.approx(4.5)
    assert rows["amplifier"]["support_value"] == pytest.approx(16.65)
    assert rows["amplifier"]["support_actions"] == 1
