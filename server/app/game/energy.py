from dataclasses import dataclass

from .models import ModuleStatus, PlayerBattleState, Position
from .operations import has_disabling_sabotage, module_is_operational
from .topology import DISRUPTOR_DEBUFF_ID

EMP_DEBUFF_ID = "emp_disabled"
ENERGY_LEECH_DEBUFF_ID = "energy_leech"
ENERGY_LEECH_GENERATION_MULTIPLIER = 0.70


TICK_SECONDS = 0.1

BATTERY_CAPACITY = 30.0
CAPACITOR_CAPACITY = 12.0

# The Core is the always-on source.  Its production now grows visibly with
# its user-facing level, while a Battery contributes a smaller continuous
# feed in addition to its burst reserve.  This keeps mixed decks online
# without making an all-attack deck energy-neutral.
BASE_CORE_GENERATION_PER_SECOND = 14.0
CORE_LEVEL_GENERATION_MULTIPLIER = 1.06
CORE_RESERVE_DISCHARGE_PER_SECOND = 4.5
BATTERY_SUPPLY_PER_SECOND = 6.0

BATTERY_CHARGE_RATE_PER_SECOND = 8.0
BATTERY_DISCHARGE_RATE_PER_SECOND = 8.0
CAPACITOR_CHARGE_RATE_PER_SECOND = 12.0
CAPACITOR_DISCHARGE_RATE_PER_SECOND = 12.0

BASE_DISTRIBUTION_EFFICIENCY = 0.90
SPLITTER_DISTRIBUTION_EFFICIENCY = 0.98

# Zero-cost armour used to be effectively free.  A full defence deck could
# therefore keep every card online forever.  Give passive armour a small bus
# upkeep so it competes with attacks, support and sabotage for the same tick
# budget without changing the published costs of existing active modules.
PASSIVE_DEFENCE_UPKEEP_PER_SECOND = 1.8


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
    module_contributions: tuple[dict, ...]


def _active_modules(player: PlayerBattleState):
    return [
        module
        for module in player.modules.values()
        if module.status == ModuleStatus.ACTIVE
    ]


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


def _module_demand_per_second(module) -> float:
    demand = float(module.definition.energy_consumption)
    if module.definition.category == "savunma" and demand <= 0:
        return PASSIVE_DEFENCE_UPKEEP_PER_SECOND
    return max(0.0, demand)


def _energy_leech_multiplier(module) -> float:
    effect = module.debuffs.get(ENERGY_LEECH_DEBUFF_ID)
    if effect is None:
        return 1.0
    strength = max(0.0, float(effect.data.get("effect_strength_multiplier", 1.0)))
    return max(0.35, 1.0 - ((1.0 - ENERGY_LEECH_GENERATION_MULTIPLIER) * strength))


def process_energy_tick(player: PlayerBattleState, core_position: Position = Position(2, 1)) -> EnergyTickResult:
    del core_position  # The GRIDSHARD 2.1 board has an embedded energy bus.
    active = [m for m in _active_modules(player) if m.hp > 0]
    for module in active:
        module.is_powered = not has_disabling_sabotage(module)
    operational = [module for module in active if module_is_operational(module)]
    core = next((m for m in operational if m.definition.id == "core"), None)
    level = max(1, min(15, player.core_level))
    compatibility_generators = [
        m for m in operational if m.definition.id == "generator"
    ]
    compatibility_generation = max(
        (
            m.definition.energy_generation * _energy_leech_multiplier(m)
            for m in compatibility_generators
        ),
        default=0.0,
    )
    core_generation = (
        max(BASE_CORE_GENERATION_PER_SECOND, compatibility_generation)
        * CORE_LEVEL_GENERATION_MULTIPLIER ** (level - 1)
        if core
        else 0.0
    )
    core_generation *= 1 + .03 * sum(s.endswith("_energy") for s in player.core_skills)
    batteries = [
        module
        for module in operational
        if module.definition.id == "battery"
    ]
    battery_generation_by_module = {
        module.instance_id: (
            (module.definition.energy_generation or BATTERY_SUPPLY_PER_SECOND)
            * module.definition.effect_multiplier
            * _energy_leech_multiplier(module)
        )
        for module in batteries
    }
    battery_generation = sum(battery_generation_by_module.values())
    production = core_generation + battery_generation
    capacity = 100.0 + 3 * (level - 1)
    capacity += sum(
        _storage_capacity(m) * m.definition.effect_multiplier
        for m in operational
    )
    regulator_modules = [
        module
        for module in operational
        if module.definition.id == "current_balancer"
    ]
    regulators = sum(
        module.definition.effect_multiplier
        for module in regulator_modules
    )
    reduction = max(.65, .92 ** regulators)
    consumers = [
        m
        for m in operational
        if m is not core and m.definition.id != "generator"
    ]
    raw_demand_by_module = {
        module.instance_id: _module_demand_per_second(module)
        for module in consumers
    }
    demand_by_module = {
        module.instance_id: raw_demand_by_module[module.instance_id] * reduction
        for module in consumers
    }
    demand = sum(demand_by_module.values())
    generated = production * TICK_SECONDS
    required = demand * TICK_SECONDS
    before = player.energy_stock
    player.energy_load_ratio = demand / production if production else (2.0 if demand else 0.0)
    # The embedded Core bus has a finite per-tick throughput.  Long-term stock
    # is not allowed to make an overloaded board fire every module at once;
    # batteries/capacitors are the explicit burst reserve instead.
    distribution_efficiency = (
        SPLITTER_DISTRIBUTION_EFFICIENCY
        if any(m.definition.id == "splitter" for m in operational)
        else BASE_DISTRIBUTION_EFFICIENCY
    )
    available = generated * distribution_efficiency
    # A small, rate-limited draw from the Core reserve prevents rapid
    # on/off flicker when demand briefly crosses production.  It is not large
    # enough to sustain an overloaded attack stack by itself.
    reserve_draw = min(
        max(0.0, before),
        CORE_RESERVE_DISCHARGE_PER_SECOND * TICK_SECONDS,
        max(0.0, required - available),
    )
    available += reserve_draw
    discharged = 0.0
    discharged_by_type = {"battery": 0.0, "capacitor": 0.0}
    discharged_by_module: dict[str, float] = {}
    if required > available:
        for module in sorted(
            (
                item
                for item in operational
                if item.definition.id in {"battery", "capacitor"}
            ),
            key=lambda item: item.instance_id,
        ):
            amount = min(
                max(0.0, module.stored_energy),
                _discharge_rate_per_tick(module),
                max(0.0, required - available),
            )
            if amount <= 0:
                continue
            module.stored_energy -= amount
            available += amount
            discharged += amount
            discharged_by_type[module.definition.id] += amount
            discharged_by_module[module.instance_id] = (
                discharged_by_module.get(module.instance_id, 0.0)
                + amount
            )

    # GRIDSHARD 2.1 overload is a circuit-wide efficiency pressure, not a
    # lottery that switches individual modules off.  Share a shortfall across
    # every connected consumer; the load multipliers below then slow/weaken
    # the whole circuit progressively.  Only explicit EMP/disruptor effects
    # may mark a module as unpowered.
    consumed = min(required, available)
    delivery_ratio = min(1.0, consumed / required) if required > 0 else 1.0
    player.energy_stock = max(0.0, min(capacity, before - reserve_draw))
    load = player.energy_load_ratio if delivery_ratio < 1.0 else min(1.0, player.energy_load_ratio)
    speed, damage, support = (1., 1., 1.)
    # Severe overload must not restore full damage after the 1.4 threshold.
    # Attack-heavy boards were bypassing the intended energy trade-off by
    # crossing into this branch, where only speed/support used to be reduced.
    if load > 1.6: speed, damage, support = .6, .75, .75
    elif load > 1.4: speed, damage = .7, .9
    elif load > 1.2: speed, support = .8, .9
    elif load > 1: speed = .9
    player.energy_speed_multiplier, player.energy_damage_multiplier, player.energy_support_multiplier = speed, damage, support
    for module in active:
        module.energy_required_last_tick = demand_by_module.get(module.instance_id, 0.0) * TICK_SECONDS
        module.energy_received_last_tick = (
            module.energy_required_last_tick * delivery_ratio
            if module.is_powered
            else 0.0
        )
        if module is core:
            module.energy_received_last_tick = generated
        if module.is_powered and module.instance_id in demand_by_module:
            player.module_energy_consumed[module.definition.id] = (
                player.module_energy_consumed.get(module.definition.id, 0.0)
                + module.energy_received_last_tick
            )
    # Any headroom after powering the board fills explicit storage modules;
    # this keeps battery contribution visible and creates a burst reserve.
    stored = 0.0
    surplus = max(0.0, available - consumed)
    for module in sorted(
        (
            item
            for item in operational
            if item.definition.id in {"battery", "capacitor"}
        ),
        key=lambda item: item.instance_id,
    ):
        if not module.is_powered:
            continue
        amount = min(
            surplus,
            _charge_rate_per_tick(module),
            max(0.0, _storage_capacity(module) * module.definition.effect_multiplier - module.stored_energy),
        )
        if amount <= 0:
            continue
        module.stored_energy = min(
            _storage_capacity(module) * module.definition.effect_multiplier,
            module.stored_energy + amount,
        )
        surplus -= amount
        stored += amount
    # Once explicit burst storage is full, remaining generation recharges the
    # Core reserve.  This keeps the visible stock meaningful and eliminates
    # the old state where it showed energy that the distributor could not use.
    reserve_space = max(0.0, capacity - player.energy_stock)
    reserve_charge = min(surplus, reserve_space)
    player.energy_stock += reserve_charge
    surplus -= reserve_charge
    if battery_generation > 0:
        player.module_energy_discharged["battery"] = (
            player.module_energy_discharged.get("battery", 0.0)
            + battery_generation * TICK_SECONDS
        )
    for definition_id, amount in discharged_by_type.items():
        if amount:
            player.module_energy_discharged[definition_id] = (
                player.module_energy_discharged.get(definition_id, 0.0) + amount
            )
    wasted = max(0.0, surplus)
    player.energy_generated_total += generated
    player.energy_consumed_total += consumed
    player.energy_wasted_total += wasted
    module_contributions = [
        {
            "module_id": module_id,
            "contribution_kind": "energy_supplied",
            "value": generation_per_second * TICK_SECONDS,
        }
        for module_id, generation_per_second
        in battery_generation_by_module.items()
    ]
    for module_id, amount in discharged_by_module.items():
        module_contributions.append(
            {
                "module_id": module_id,
                "contribution_kind": "energy_supplied",
                "value": amount,
            }
        )
    raw_required = sum(raw_demand_by_module.values()) * TICK_SECONDS
    saved = max(0.0, raw_required - required)
    if saved > 0 and regulators > 0:
        for module in regulator_modules:
            module_contributions.append(
                {
                    "module_id": module.instance_id,
                    "contribution_kind": "energy_saved",
                    "value": saved * module.definition.effect_multiplier / regulators,
                }
            )
    return EnergyTickResult(
        generated,
        available,
        consumed,
        stored,
        discharged,
        wasted,
        tuple(m.instance_id for m in active if m.is_powered),
        tuple(m.instance_id for m in active if not m.is_powered),
        tuple(module_contributions),
    )
