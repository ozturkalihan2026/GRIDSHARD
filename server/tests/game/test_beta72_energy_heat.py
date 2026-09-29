import pytest

from app.game.catalog import BASIC_MODULE_DEFINITIONS
from app.game.energy import (
    BASE_CORE_GENERATION_PER_SECOND,
    CORE_RESERVE_BASE_CAPACITY,
    action_energy_per_second,
    core_reserve_capacity,
    spend_action_energy,
)
from app.game.engine import BattleEngine
from app.game.heat import (
    HIGH_HEAT_THRESHOLD,
    OVERHEAT_DEBUFF_ID,
    OVERHEAT_RECOVERY_THRESHOLD,
    OVERHEAT_VENT_COOLING_MULTIPLIER,
    PASSIVE_COOLING_PER_TICK,
    attack_heat_gain,
    heat_performance,
)
from app.game.models import BattleState, ModuleStatus, Position
from app.game.support import (
    COOLER_MAX_TARGETS,
    attack_support_modifiers,
    cooler_targets,
    overclock_assignments,
)


def add(engine, player_id, instance_id, definition_id, x, y):
    module = engine.grant_module(player_id, instance_id, definition_id)
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    return module


def duel():
    engine = BattleEngine(BattleState(battle_id="beta72-energy-heat"))
    engine.add_player("p1")
    engine.add_player("p2")
    add(engine, "p1", "p1-core", "core", 2, 1)
    add(engine, "p2", "p2-core", "core", 2, 1)
    add(engine, "p2", "p2-armor", "armor", 0, 0)
    return engine


def test_every_attack_outheats_passive_cooling_when_firing_continuously():
    cooling_per_second = PASSIVE_COOLING_PER_TICK * 10
    for module_id, definition in BASIC_MODULE_DEFINITIONS.items():
        if definition.category != "saldırı" or definition.action_energy_cost <= 0:
            continue
        engine = duel()
        module = add(engine, "p1", module_id, module_id, 1, 0)
        heat_per_second = attack_heat_gain(module) / (definition.cooldown_ms / 1000)
        assert heat_per_second > cooling_per_second, module_id


def test_overheat_lasts_until_heat_recovers_not_a_fixed_time():
    engine = duel()
    laser = add(engine, "p1", "laser", "laser", 1, 0)
    engine._process_energy_flow()
    laser.heat = 99.5
    engine._process_combat_actions()
    assert OVERHEAT_DEBUFF_ID in laser.debuffs
    assert laser.debuffs[OVERHEAT_DEBUFF_ID].expires_at_ms is None

    engine.state.elapsed_ms += 60_000
    engine._expire_timed_module_state()
    assert heat_performance(laser, engine.state.elapsed_ms).overheated is True

    laser.heat = OVERHEAT_RECOVERY_THRESHOLD + 0.1
    engine._process_passive_heat()
    assert OVERHEAT_DEBUFF_ID not in laser.debuffs
    assert any(event.type == "module_heat_recovered" for event in engine.state.events)


def test_overheated_module_vents_faster_than_a_hot_one():
    engine = duel()
    hot = add(engine, "p1", "hot", "laser", 1, 0)
    vented = add(engine, "p1", "vented", "laser", 3, 0)
    hot.heat = vented.heat = 90.0
    engine.add_debuff("p1", "vented", OVERHEAT_DEBUFF_ID, "Aşırı Isınma", None)
    engine._process_passive_heat()
    assert OVERHEAT_VENT_COOLING_MULTIPLIER > 1
    assert (90.0 - vented.heat) == pytest.approx(
        OVERHEAT_VENT_COOLING_MULTIPLIER * (90.0 - hot.heat)
    )


def test_cooler_picks_the_hottest_modules_wherever_they_are_placed():
    engine = duel()
    cooler = add(engine, "p1", "cooler", "cooler", 0, 0)
    far = add(engine, "p1", "far", "railgun", 4, 2)
    near = add(engine, "p1", "near", "laser", 1, 0)
    warm = add(engine, "p1", "warm", "pulse_cannon", 3, 2)
    cold = add(engine, "p1", "cold", "missile_launcher", 0, 2)
    far.heat, near.heat, warm.heat, cold.heat = 95.0, 5.0, 60.0, 1.0
    engine._process_energy_flow()

    targets = cooler_targets(engine.state.players["p1"], cooler, engine.board.core_position)
    assert COOLER_MAX_TARGETS == 3
    assert [module.instance_id for module in targets] == ["far", "warm", "near"]


def test_cooler_emits_thermal_stabilized_when_it_ends_high_heat():
    engine = duel()
    add(engine, "p1", "cooler", "cooler", 0, 0)
    rail = add(engine, "p1", "rail", "railgun", 4, 2)
    rail.heat = HIGH_HEAT_THRESHOLD + 0.1
    engine._process_energy_flow()
    engine._process_support_actions()
    assert rail.heat < HIGH_HEAT_THRESHOLD
    assert any(event.type == "thermal_stabilized" for event in engine.state.events)


def test_each_overclock_takes_a_distinct_heaviest_attack_and_only_it_is_boosted():
    engine = duel()
    add(engine, "p1", "oc-a", "overclock_unit", 0, 2)
    add(engine, "p1", "oc-b", "overclock_unit", 4, 0)
    laser = add(engine, "p1", "laser", "laser", 1, 0)
    rail = add(engine, "p1", "rail", "railgun", 3, 0)
    add(engine, "p1", "pulse", "pulse_cannon", 1, 2)
    engine._process_energy_flow()
    player = engine.state.players["p1"]

    assignments = overclock_assignments(player)
    assert set(assignments) == {"rail", "pulse"}
    assert len({source.instance_id for source in assignments.values()}) == 2
    assert attack_support_modifiers(player, rail, engine.board.core_position).overclock_active
    assert not attack_support_modifiers(player, laser, engine.board.core_position).overclock_active

    engine.add_debuff("p1", "rail", OVERHEAT_DEBUFF_ID, "Aşırı Isınma", None)
    assert "rail" not in overclock_assignments(player)
    assert "laser" in overclock_assignments(player)


def test_attack_waits_for_energy_and_emits_one_waiting_event():
    engine = duel()
    rail = add(engine, "p1", "rail", "railgun", 1, 0)
    player = engine.state.players["p1"]
    player.energy_stock = 1.0
    engine._process_combat_actions()
    engine._process_combat_actions()

    waits = [
        event for event in engine.state.events
        if event.type == "action_energy_waiting" and event.data["module_id"] == "rail"
    ]
    assert len(waits) == 1
    assert rail.energy_waiting is True
    assert not any(event.type == "attack_performed" for event in engine.state.events)

    player.energy_stock = 20.0
    engine._process_combat_actions()
    assert rail.energy_waiting is False
    assert any(event.type == "action_energy_resumed" for event in engine.state.events)
    assert any(event.type == "attack_performed" for event in engine.state.events)


def test_current_balancer_reduces_action_cost():
    engine = duel()
    add(engine, "p1", "balancer", "current_balancer", 0, 2)
    rail = add(engine, "p1", "rail", "railgun", 1, 0)
    player = engine.state.players["p1"]
    engine._process_energy_flow()
    player.energy_stock = 20.0
    result = spend_action_energy(player, rail)
    assert result.success is True
    assert result.effective_cost < rail.definition.action_energy_cost
    assert result.saved > 0


def test_mixed_circuit_runs_while_heavy_attack_stack_overloads_the_core():
    engine = duel()
    player = engine.state.players["p1"]
    production = BASE_CORE_GENERATION_PER_SECOND * 0.9
    mixed = sum(
        action_energy_per_second(BASIC_MODULE_DEFINITIONS[module_id])
        + BASIC_MODULE_DEFINITIONS[module_id].energy_consumption
        for module_id in ("laser", "shield", "repair", "cooler")
    )
    heavy = sum(
        action_energy_per_second(BASIC_MODULE_DEFINITIONS[module_id])
        for module_id in ("quantum_cannon",) * 4
    )
    assert mixed < production < heavy
    assert core_reserve_capacity(player) == CORE_RESERVE_BASE_CAPACITY
