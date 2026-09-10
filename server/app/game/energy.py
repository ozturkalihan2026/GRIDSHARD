from dataclasses import dataclass

from .board import get_cell_effects
from .models import ModuleStatus, PlayerBattleState, Position
from .topology import build_energy_topology, DISRUPTOR_DEBUFF_ID

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


def process_energy_tick(player: PlayerBattleState, core_position: Position = Position(2, 1)) -> EnergyTickResult:
    active = [m for m in _active_modules(player) if m.hp > 0]
    core = next((m for m in active if m.definition.id == "core"), None)
    level = max(1, min(15, player.core_level))
    production = 10.0 * 1.04 ** (level - 1) if core else 0.0
    production *= 1 + .03 * sum(s.endswith("_energy") for s in player.core_skills)
    capacity = 100.0 + 3 * (level - 1)
    capacity += sum((25 if m.definition.id == "capacitor" else 30 if m.definition.id == "battery" else 0) * m.definition.effect_multiplier for m in active)
    regulators = sum(m.definition.effect_multiplier for m in active if m.definition.id == "current_balancer" and EMP_DEBUFF_ID not in m.debuffs)
    reduction = max(.65, .92 ** regulators)
    demand = sum(m.definition.energy_consumption * reduction for m in active if m != core)
    generated = production * TICK_SECONDS
    required = demand * TICK_SECONDS
    before = player.energy_stock
    player.energy_stock = max(0.0, min(capacity, before + generated - required))
    player.energy_load_ratio = demand / production if production else (2.0 if demand else 0.0)
    load = player.energy_load_ratio if player.energy_stock <= 0 else min(1.0, player.energy_load_ratio)
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
        module.is_powered = EMP_DEBUFF_ID not in module.debuffs and DISRUPTOR_DEBUFF_ID not in module.debuffs
        module.energy_required_last_tick = module.definition.energy_consumption * reduction * TICK_SECONDS
        module.energy_received_last_tick = module.energy_required_last_tick if module.is_powered else 0.0
        if module == core:
            module.energy_received_last_tick = generated
    consumed = min(required, before + generated)
    wasted = max(0.0, before + generated - required - capacity)
    player.energy_generated_total += generated
    player.energy_consumed_total += consumed
    player.energy_wasted_total += wasted
    return EnergyTickResult(generated, generated, consumed, player.energy_stock, max(0., before - player.energy_stock),
                            wasted, tuple(m.instance_id for m in active if m.is_powered),
                            tuple(m.instance_id for m in active if not m.is_powered))
