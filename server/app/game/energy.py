from dataclasses import dataclass

from .board import get_cell_effects
from .models import ModuleStatus, PlayerBattleState, Position
from .topology import build_energy_topology

EMP_DEBUFF_ID = "emp_disabled"
ENERGY_LEECH_DEBUFF_ID = "energy_leech"
ENERGY_LEECH_GENERATION_MULTIPLIER = 0.70


TICK_SECONDS = 0.1

BATTERY_CAPACITY = 30.0
CAPACITOR_CAPACITY = 12.0

BATTERY_CHARGE_RATE_PER_SECOND = 8.0
BATTERY_DISCHARGE_RATE_PER_SECOND = 8.0
CAPACITOR_CHARGE_RATE_PER_SECOND = 12.0
CAPACITOR_DISCHARGE_RATE_PER_SECOND = 12.0

BASE_DISTRIBUTION_EFFICIENCY = 0.90
SPLITTER_DISTRIBUTION_EFFICIENCY = 0.98


@dataclass(slots=True, frozen=True)
class EnergyTickResult:
    generated: float
    distributed: float
    consumed: float
    stored: float
    discharged: float
    wasted: float
    powered_module_ids: tuple[str, ...]
    unpowered_module_ids: tuple[str, ...]


def _active_modules(player: PlayerBattleState):
    return [
        module
        for module in player.modules.values()
        if module.status == ModuleStatus.ACTIVE
    ]


def _energy_multiplier(module) -> float:
    if module.position is None:
        return 1.0
    return float(
        get_cell_effects(module.position).get("energy_multiplier", 1.0)
    )


def _storage_capacity(module) -> float:
    if module.definition.id == "battery":
        return BATTERY_CAPACITY
    if module.definition.id == "capacitor":
        return CAPACITOR_CAPACITY
    return 0.0


def _charge_rate_per_tick(module) -> float:
    if module.definition.id == "battery":
        return BATTERY_CHARGE_RATE_PER_SECOND * TICK_SECONDS
    if module.definition.id == "capacitor":
        return CAPACITOR_CHARGE_RATE_PER_SECOND * TICK_SECONDS
    return 0.0


def _discharge_rate_per_tick(module) -> float:
    if module.definition.id == "battery":
        return BATTERY_DISCHARGE_RATE_PER_SECOND * TICK_SECONDS
    if module.definition.id == "capacitor":
        return CAPACITOR_DISCHARGE_RATE_PER_SECOND * TICK_SECONDS
    return 0.0


def process_energy_tick(
    player: PlayerBattleState,
    core_position: Position = Position(2, 2),
) -> EnergyTickResult:
    active = _active_modules(player)
    topology = build_energy_topology(player, core_position)
    reachable_ids = set(topology.reachable_from_generator)

    generators = [
        module
        for module in active
        if module.definition.energy_generation > 0
        and module.instance_id in reachable_ids
    ]
    splitters = [
        module
        for module in active
        if module.definition.id == "splitter"
        and module.instance_id in reachable_ids
        and EMP_DEBUFF_ID not in module.debuffs
    ]
    capacitors = [
        module
        for module in active
        if module.definition.id == "capacitor"
        and module.instance_id in reachable_ids
        and EMP_DEBUFF_ID not in module.debuffs
    ]
    batteries = [
        module
        for module in active
        if module.definition.id == "battery"
        and module.instance_id in reachable_ids
        and EMP_DEBUFF_ID not in module.debuffs
    ]

    # Kapasitör kısa süreli destek olarak Batarya'dan önce kullanılır.
    storages = capacitors + batteries

    generated = 0.0
    for module in generators:
        leech_effect = module.debuffs.get(
            ENERGY_LEECH_DEBUFF_ID
        )
        generation_multiplier = 1.0
        if leech_effect is not None:
            base_penalty = (
                1.0
                - ENERGY_LEECH_GENERATION_MULTIPLIER
            )
            strength = float(
                leech_effect.data.get(
                    "effect_strength_multiplier",
                    1.0,
                )
            )
            generation_multiplier = (
                1.0 - (base_penalty * strength)
            )

        amount = (
            module.definition.energy_generation
            * TICK_SECONDS
            * _energy_multiplier(module)
            * generation_multiplier
        )
        generated += amount
        module.is_powered = True
        module.energy_required_last_tick = 0.0
        module.energy_received_last_tick = amount

    distribution_efficiency = (
        SPLITTER_DISTRIBUTION_EFFICIENCY
        if splitters
        else BASE_DISTRIBUTION_EFFICIENCY
    )
    distributed = generated * distribution_efficiency

    for module in splitters + storages:
        module.is_powered = True
        module.energy_required_last_tick = 0.0
        module.energy_received_last_tick = 0.0

    emp_disabled = [
        module
        for module in active
        if EMP_DEBUFF_ID in module.debuffs
    ]
    for module in emp_disabled:
        module.is_powered = False
        module.energy_received_last_tick = 0.0

    consumers = [
        module
        for module in active
        if module.definition.energy_consumption > 0
        and module.definition.id
        not in {"battery", "capacitor", "splitter"}
        and EMP_DEBUFF_ID not in module.debuffs
    ]

    disconnected_consumers = [
        module
        for module in consumers
        if module.instance_id not in reachable_ids
    ]
    consumers = [
        module
        for module in consumers
        if module.instance_id in reachable_ids
    ]

    for module in disconnected_consumers:
        module.energy_required_last_tick = (
            module.definition.energy_consumption
            * TICK_SECONDS
            / _energy_multiplier(module)
        )
        module.energy_received_last_tick = 0.0
        module.is_powered = False

    for module in consumers:
        module.energy_required_last_tick = (
            module.definition.energy_consumption
            * TICK_SECONDS
            / _energy_multiplier(module)
        )
        module.energy_received_last_tick = 0.0
        module.is_powered = False

    available = distributed

    total_demand = sum(
        module.energy_required_last_tick
        for module in consumers
    )
    shortfall = max(0.0, total_demand - available)

    discharged = 0.0
    for module in storages:
        if shortfall <= 1e-12:
            break

        give = min(
            module.stored_energy,
            _discharge_rate_per_tick(module),
            shortfall,
        )
        module.stored_energy -= give
        available += give
        discharged += give
        shortfall -= give

    consumed = 0.0
    powered: list[str] = []
    unpowered: list[str] = sorted(
        module.instance_id
        for module in disconnected_consumers
    )

    # Deterministik enerji önceliği.
    category_priority = {
        "saldırı": 0,
        "savunma": 1,
        "destek": 2,
        "sabotaj": 3,
        "enerji": 4,
    }

    def _consumer_priority(current):
        position = current.position
        return (
            category_priority.get(current.definition.category, 9),
            current.energy_required_last_tick,
            position.y if position is not None else 99,
            position.x if position is not None else 99,
            current.definition.id,
            current.instance_id,
        )

    for module in sorted(
        consumers,
        key=_consumer_priority,
    ):
        need = module.energy_required_last_tick

        if available + 1e-12 >= need:
            available -= need
            consumed += need
            module.energy_received_last_tick = need
            module.is_powered = True
            powered.append(module.instance_id)
        else:
            module.energy_received_last_tick = 0.0
            module.is_powered = False
            unpowered.append(module.instance_id)

    stored = 0.0
    for module in storages:
        if available <= 1e-12:
            break

        capacity = _storage_capacity(module)
        room = max(0.0, capacity - module.stored_energy)

        charge = min(
            room,
            _charge_rate_per_tick(module),
            available,
        )
        module.stored_energy += charge
        available -= charge
        stored += charge

    wasted = max(0.0, available)

    player.energy_generated_total += generated
    player.energy_consumed_total += consumed
    player.energy_wasted_total += wasted

    return EnergyTickResult(
        generated=generated,
        distributed=distributed,
        consumed=consumed,
        stored=stored,
        discharged=discharged,
        wasted=wasted,
        powered_module_ids=tuple(powered),
        unpowered_module_ids=tuple(unpowered),
    )
