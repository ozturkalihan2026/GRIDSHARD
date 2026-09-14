import pytest

from app.game.energy import (
    BATTERY_CAPACITY,
    CAPACITOR_CAPACITY,
    process_energy_tick,
)
from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
    ModuleStatus,
    Position,
)


def make_engine():
    engine = BattleEngine(BattleState(battle_id="energy-flow"))
    engine.add_player("p1")
    return engine


def add(
    engine,
    instance_id,
    definition_id,
    x,
    y,
):
    module = engine.grant_module(
        "p1",
        instance_id,
        definition_id,
    )
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    return module


def basic_engine():
    engine = make_engine()
    add(engine, "core-1", "core", 2, 2)
    add(engine, "generator-1", "generator", 2, 3)
    return engine, engine.state.players["p1"]


def test_generator_produces_energy():
    _, player = basic_engine()

    result = process_energy_tick(
        player,
        Position(2, 2),
    )

    assert round(result.generated, 6) == 1.4


def test_embedded_bus_powers_a_remote_consumer():
    engine, player = basic_engine()
    laser = add(
        engine,
        "laser-1",
        "laser",
        4,
        3,
    )

    result = process_energy_tick(
        player,
        Position(2, 2),
    )

    assert laser.is_powered is True
    assert "laser-1" in result.powered_module_ids


def test_connected_consumer_is_powered():
    engine, player = basic_engine()
    laser = add(
        engine,
        "laser-1",
        "laser",
        2,
        1,
    )

    process_energy_tick(
        player,
        Position(2, 2),
    )

    assert laser.is_powered is True


def test_splitter_branches_energy():
    engine, player = basic_engine()

    add(
        engine,
        "splitter-1",
        "splitter",
        2,
        1,
    )
    laser = add(
        engine,
        "laser-1",
        "laser",
        1,
        1,
    )
    shield = add(
        engine,
        "shield-1",
        "shield",
        3,
        1,
    )

    result = process_energy_tick(
        player,
        Position(2, 2),
    )

    assert laser.is_powered is True
    assert shield.is_powered is True
    assert round(result.distributed, 6) == round(
        result.generated * 0.98,
        6,
    )


def test_connected_battery_charges():
    engine, player = basic_engine()
    battery = add(
        engine,
        "battery-1",
        "battery",
        2,
        1,
    )

    process_energy_tick(
        player,
        Position(2, 2),
    )

    assert 0 < battery.stored_energy <= BATTERY_CAPACITY


def test_embedded_bus_charges_a_remote_battery():
    engine, player = basic_engine()
    battery = add(
        engine,
        "battery-1",
        "battery",
        4,
        3,
    )

    process_energy_tick(
        player,
        Position(2, 2),
    )

    assert battery.stored_energy > 0


def test_battery_discharges_on_real_shortfall():
    engine, player = basic_engine()

    add(
        engine,
        "splitter-1",
        "splitter",
        2,
        1,
    )
    battery = add(
        engine,
        "battery-1",
        "battery",
        1,
        1,
    )
    # Battery's second port continues the line to pulse cannon.
    add(
        engine,
        "pulse-1",
        "pulse_cannon",
        0,
        1,
    )
    add(
        engine,
        "railgun-1",
        "railgun",
        3,
        1,
    )
    add(
        engine,
        "railgun-2",
        "railgun",
        4,
        1,
    )
    add(
        engine,
        "railgun-3",
        "railgun",
        4,
        2,
    )

    battery.stored_energy = 10.0
    player.energy_stock = 0.0

    result = process_energy_tick(
        player,
        Position(2, 2),
    )

    assert result.discharged > 0
    assert battery.stored_energy < 10.0


def test_capacitor_has_smaller_capacity():
    engine, player = basic_engine()
    capacitor = add(
        engine,
        "capacitor-1",
        "capacitor",
        2,
        1,
    )

    for _ in range(50):
        process_energy_tick(
            player,
            Position(2, 2),
        )

    assert capacitor.stored_energy <= CAPACITOR_CAPACITY * capacitor.definition.effect_multiplier
    assert CAPACITOR_CAPACITY < BATTERY_CAPACITY


def test_core_level_and_battery_raise_continuous_supply():
    engine, player = basic_engine()
    low = process_energy_tick(player, Position(2, 2)).generated

    player.core_level = 8
    high = process_energy_tick(player, Position(2, 2)).generated
    assert high > low

    battery = add(engine, "battery-supply", "battery", 4, 3)
    with_battery = process_energy_tick(player, Position(2, 2)).generated
    assert battery.definition.energy_generation > 0
    assert with_battery > high


def test_battery_materially_reduces_shortfall_without_powering_heavy_attack_stack():
    engine, player = basic_engine()
    for index, definition_id in enumerate(
        ("railgun", "pulse_cannon", "laser", "shield", "repair")
    ):
        add(engine, f"load-{index}", definition_id, index, 0)

    player.energy_stock = 0.0
    without_battery = process_energy_tick(player, Position(2, 2))
    load_without_battery = player.energy_load_ratio
    battery = add(engine, "battery-support", "battery", 0, 1)
    player.energy_stock = 0.0
    with_battery = process_energy_tick(player, Position(2, 2))
    load_with_battery = player.energy_load_ratio

    assert with_battery.generated - without_battery.generated == pytest.approx(0.6)
    assert len(with_battery.powered_module_ids) > len(without_battery.powered_module_ids)
    assert battery.is_powered is True
    assert load_with_battery < load_without_battery
    assert with_battery.unpowered_module_ids == ()


def test_energy_and_circuit_credit_are_separate():
    engine, player = basic_engine()
    add(
        engine,
        "laser-1",
        "laser",
        2,
        1,
    )
    credits_before = player.circuit_credits

    process_energy_tick(
        player,
        Position(2, 2),
    )

    assert player.circuit_credits == credits_before
    assert player.energy_generated_total > 0


def test_engine_event_data_contains_embedded_power_state():
    engine, player = basic_engine()
    laser = add(
        engine,
        "laser-1",
        "laser",
        2,
        1,
    )

    engine._process_energy_flow()
    data = engine._module_event_data("p1", laser)

    assert data["is_powered"] is True
    assert "ports" not in data
