from app.game.energy import (
    BATTERY_CAPACITY,
    CAPACITOR_CAPACITY,
    process_energy_tick,
)
from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
    Direction,
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
    direction=Direction.UP,
):
    module = engine.grant_module(
        "p1",
        instance_id,
        definition_id,
    )
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    module.direction = direction
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

    assert round(result.generated, 6) == 0.8


def test_disconnected_consumer_is_unpowered():
    engine, player = basic_engine()
    laser = add(
        engine,
        "laser-1",
        "laser",
        4,
        3,
        Direction.UP,
    )

    result = process_energy_tick(
        player,
        Position(2, 2),
    )

    assert laser.is_powered is False
    assert "laser-1" in result.unpowered_module_ids


def test_connected_consumer_is_powered():
    engine, player = basic_engine()
    laser = add(
        engine,
        "laser-1",
        "laser",
        2,
        1,
        Direction.DOWN,
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
        Direction.DOWN,
    )
    laser = add(
        engine,
        "laser-1",
        "laser",
        1,
        1,
        Direction.RIGHT,
    )
    shield = add(
        engine,
        "shield-1",
        "shield",
        3,
        1,
        Direction.LEFT,
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
        Direction.UP,
    )

    process_energy_tick(
        player,
        Position(2, 2),
    )

    assert 0 < battery.stored_energy <= BATTERY_CAPACITY


def test_disconnected_battery_does_not_charge():
    engine, player = basic_engine()
    battery = add(
        engine,
        "battery-1",
        "battery",
        4,
        3,
        Direction.UP,
    )

    process_energy_tick(
        player,
        Position(2, 2),
    )

    assert battery.stored_energy == 0


def test_battery_discharges_on_real_shortfall():
    engine, player = basic_engine()

    add(
        engine,
        "splitter-1",
        "splitter",
        2,
        1,
        Direction.DOWN,
    )
    battery = add(
        engine,
        "battery-1",
        "battery",
        1,
        1,
        Direction.RIGHT,
    )
    # Battery's second port continues the line to pulse cannon.
    add(
        engine,
        "pulse-1",
        "pulse_cannon",
        0,
        1,
        Direction.RIGHT,
    )
    add(
        engine,
        "railgun-1",
        "railgun",
        3,
        1,
        Direction.LEFT,
    )

    battery.stored_energy = 10.0

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
        Direction.UP,
    )

    for _ in range(50):
        process_energy_tick(
            player,
            Position(2, 2),
        )

    assert capacitor.stored_energy <= CAPACITOR_CAPACITY
    assert CAPACITOR_CAPACITY < BATTERY_CAPACITY


def test_energy_and_circuit_credit_are_separate():
    engine, player = basic_engine()
    add(
        engine,
        "laser-1",
        "laser",
        2,
        1,
        Direction.DOWN,
    )
    credits_before = player.circuit_credits

    process_energy_tick(
        player,
        Position(2, 2),
    )

    assert player.circuit_credits == credits_before
    assert player.energy_generated_total > 0


def test_engine_event_data_contains_ports():
    engine, player = basic_engine()
    laser = add(
        engine,
        "laser-1",
        "laser",
        2,
        1,
        Direction.DOWN,
    )

    engine._process_energy_flow()
    data = engine._module_event_data("p1", laser)

    assert data["is_powered"] is True
    assert data["ports"] == ["down"]
