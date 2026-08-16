from app.game.energy import (
    BATTERY_CAPACITY,
    CAPACITOR_CAPACITY,
    process_energy_tick,
)
from app.game.engine import BattleEngine
from app.game.models import BattleState, ModuleStatus, Position


POSITIONS = [
    Position(1, 1),
    Position(3, 1),
    Position(4, 1),
    Position(1, 3),
    Position(3, 3),
    Position(4, 3),
]


def setup_player(*definition_ids):
    engine = BattleEngine(BattleState(battle_id="energy-test"))
    player = engine.add_player("p1")

    for index, definition_id in enumerate(definition_ids):
        module = engine.grant_module(
            "p1",
            f"{definition_id}-{index}",
            definition_id,
        )
        module.status = ModuleStatus.ACTIVE
        module.position = POSITIONS[index]

    return engine, player


def module_by_definition(player, definition_id):
    return next(
        module
        for module in player.modules.values()
        if module.definition.id == definition_id
    )


def test_generator_produces_energy_deterministically():
    _, player = setup_player("generator")

    result = process_energy_tick(player)

    assert round(result.generated, 6) == 0.8


def test_splitter_reduces_distribution_loss():
    _, player_without = setup_player("generator")
    _, player_with = setup_player("generator", "splitter")

    without_splitter = process_energy_tick(player_without)
    with_splitter = process_energy_tick(player_with)

    assert with_splitter.distributed > without_splitter.distributed


def test_consumer_is_powered_when_supply_is_sufficient():
    _, player = setup_player("generator", "laser")

    process_energy_tick(player)

    laser = module_by_definition(player, "laser")
    assert laser.is_powered is True
    assert laser.energy_received_last_tick > 0


def test_energy_shortage_does_not_stop_battle():
    engine, player = setup_player(
        "generator",
        "railgun",
        "pulse_cannon",
        "missile_launcher",
    )
    engine.state.status = type(engine.state.status).RUNNING

    result = process_energy_tick(player)

    assert result.unpowered_module_ids
    assert engine.state.status.value == "running"


def test_battery_charges_from_surplus():
    _, player = setup_player("generator", "battery")
    battery = module_by_definition(player, "battery")

    process_energy_tick(player)

    assert 0 < battery.stored_energy <= BATTERY_CAPACITY


def test_battery_discharges_during_shortfall():
    _, player = setup_player(
        "generator",
        "battery",
        "railgun",
        "pulse_cannon",
    )
    battery = module_by_definition(player, "battery")
    battery.stored_energy = 10.0

    result = process_energy_tick(player)

    assert result.discharged > 0
    assert battery.stored_energy < 10.0


def test_capacitor_has_smaller_capacity_than_battery():
    _, player = setup_player("generator", "capacitor")
    capacitor = module_by_definition(player, "capacitor")

    for _ in range(50):
        process_energy_tick(player)

    assert capacitor.stored_energy <= CAPACITOR_CAPACITY
    assert CAPACITOR_CAPACITY < BATTERY_CAPACITY


def test_capacitor_discharge_precedes_battery():
    _, player = setup_player(
        "generator",
        "capacitor",
        "battery",
        "railgun",
        "pulse_cannon",
    )
    capacitor = module_by_definition(player, "capacitor")
    battery = module_by_definition(player, "battery")

    capacitor.stored_energy = 5.0
    battery.stored_energy = 5.0

    process_energy_tick(player)

    assert capacitor.stored_energy < 5.0


def test_energy_cell_improves_energy_efficiency():
    _, player = setup_player("generator", "laser")
    laser = module_by_definition(player, "laser")

    laser.position = Position(2, 4)
    process_energy_tick(player)
    special_cell_need = laser.energy_required_last_tick

    laser.position = Position(1, 1)
    process_energy_tick(player)
    normal_cell_need = laser.energy_required_last_tick

    assert special_cell_need < normal_cell_need


def test_energy_is_separate_from_circuit_credits():
    _, player = setup_player("generator", "laser")
    credits_before = player.circuit_credits

    process_energy_tick(player)

    assert player.circuit_credits == credits_before
    assert player.energy_generated_total > 0


def test_module_event_data_contains_energy_state():
    engine, player = setup_player("generator", "laser")
    engine._process_energy_flow()

    laser = module_by_definition(player, "laser")
    data = engine._module_event_data("p1", laser)

    assert "is_powered" in data
    assert "energy_received_last_tick" in data
    assert "energy_required_last_tick" in data
