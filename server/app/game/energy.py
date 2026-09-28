from dataclasses import dataclass

from .models import BattleModule, ModuleDefinition, ModuleStatus, PlayerBattleState, Position
from .operations import has_disabling_sabotage, module_is_operational

EMP_DEBUFF_ID = "emp_disabled"


TICK_SECONDS = 0.1

# GRIDSHARD 2.1 enerji ekonomisi: saldırı, onarım ve sabotaj enerjiyi işi
# yaptıkları anda harcar; yetmezse yalnız o modül görünür biçimde bekler.
# Sürekli çalışan kalkan/destek sistemleri küçük bir bakım enerjisi öder.
# Karışık bir devre rahat çalışır; ağır saldırı yığını beklemeye düşer.
BASE_CORE_GENERATION_PER_SECOND = 12.0
CORE_LEVEL_GENERATION_MULTIPLIER = 1.03
CORE_RESERVE_BASE_CAPACITY = 24.0
CORE_RESERVE_PER_LEVEL = 1.0
# models.PlayerBattleState.energy_stock varsayılanı bu değerle aynı tutulur.
CORE_STARTING_ENERGY = 16.0

BATTERY_SUPPLY_PER_SECOND = 3.0
BATTERY_CAPACITY = 20.0
BATTERY_CHARGE_RATE_PER_SECOND = 5.0
BATTERY_DISCHARGE_RATE_PER_SECOND = 7.0
BATTERY_ACTION_DISCHARGE_LIMIT = 4.0

CAPACITOR_CAPACITY = 10.0
CAPACITOR_CHARGE_RATE_PER_SECOND = 10.0
CAPACITOR_DISCHARGE_RATE_PER_SECOND = 18.0
CAPACITOR_ACTION_DISCHARGE_LIMIT = 10.0

# Üretilen enerjinin devreye ulaşan payı.
BASE_DISTRIBUTION_EFFICIENCY = 0.90

COST_REDUCTION_PER_BALANCER = 0.08
MAX_COST_REDUCTION = 0.24

# Sürekli sistemler bakım enerjisinin yarısını bile alamazsa kapanır.
CONTINUOUS_POWER_CUTOFF = 0.5

# Kuantum Topu yalnız gerçekten boşa gidecek enerjiyi yük olarak toplar;
# Çekirdek rezervi ve depolar dolmadan yük birikmez.
QUANTUM_CHARGE_MAX = 30.0
QUANTUM_HARVEST_PER_TICK = 0.35


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


@dataclass(slots=True, frozen=True)
class ActionEnergySpend:
    success: bool
    effective_cost: float
    shortfall: float
    saved: float
    balancer_module_ids: tuple[str, ...]


def core_reserve_capacity(player: PlayerBattleState) -> float:
    level = max(1, min(15, int(player.core_level)))
    return CORE_RESERVE_BASE_CAPACITY + CORE_RESERVE_PER_LEVEL * (level - 1)


def action_energy_per_second(definition: ModuleDefinition) -> float:
    """Sürekli ateş eden/çalışan bir modülün saniyelik aksiyon enerjisi talebi."""
    cost = max(0.0, float(definition.action_energy_cost))
    if cost <= 0:
        return 0.0
    return cost * 1000.0 / max(500, int(definition.cooldown_ms or 1000))


def _storage_capacity(module: BattleModule) -> float:
    if module.definition.id == "battery":
        return BATTERY_CAPACITY * module.definition.effect_multiplier
    if module.definition.id == "capacitor":
        return CAPACITOR_CAPACITY * module.definition.effect_multiplier
    return 0.0


def _charge_rate_per_tick(module: BattleModule) -> float:
    if module.definition.id == "battery":
        return BATTERY_CHARGE_RATE_PER_SECOND * TICK_SECONDS
    if module.definition.id == "capacitor":
        return CAPACITOR_CHARGE_RATE_PER_SECOND * TICK_SECONDS
    return 0.0


def _discharge_rate_per_tick(module: BattleModule) -> float:
    if module.definition.id == "battery":
        return BATTERY_DISCHARGE_RATE_PER_SECOND * TICK_SECONDS
    if module.definition.id == "capacitor":
        return CAPACITOR_DISCHARGE_RATE_PER_SECOND * TICK_SECONDS
    return 0.0


def _action_discharge_limit(module: BattleModule) -> float:
    if module.definition.id == "battery":
        return BATTERY_ACTION_DISCHARGE_LIMIT
    if module.definition.id == "capacitor":
        return CAPACITOR_ACTION_DISCHARGE_LIMIT
    return 0.0


def _operational_storage(player: PlayerBattleState) -> list[BattleModule]:
    # Kapasitör ani açıkları Bataryadan önce karşılar.
    order = {"capacitor": 0, "battery": 1}
    return sorted(
        (
            module
            for module in player.modules.values()
            if module.definition.id in order and module_is_operational(module)
        ),
        key=lambda module: (order[module.definition.id], module.instance_id),
    )


def cost_reduction(player: PlayerBattleState) -> tuple[float, tuple[BattleModule, ...]]:
    balancers = tuple(sorted(
        (
            module
            for module in player.modules.values()
            if module.definition.id == "current_balancer"
            and module_is_operational(module)
        ),
        key=lambda module: module.instance_id,
    ))
    strength = sum(module.definition.effect_multiplier for module in balancers)
    return min(MAX_COST_REDUCTION, COST_REDUCTION_PER_BALANCER * strength), balancers


def available_action_energy(player: PlayerBattleState) -> float:
    total = max(0.0, float(player.energy_stock))
    for storage in _operational_storage(player):
        total += min(max(0.0, storage.stored_energy), _action_discharge_limit(storage))
    return total


def spend_action_energy(
    player: PlayerBattleState,
    module: BattleModule,
    explicit_cost: float | None = None,
) -> ActionEnergySpend:
    """Bir aksiyonun enerjisini Çekirdek rezervi, Kapasitör ve Batarya sırasıyla öder.

    Enerji yetmezse hiçbir şey harcanmaz; modül bekleme durumuna geçer ve
    beklemesi başlamadığı için bir sonraki adımda yeniden dener.
    """
    requested = max(
        0.0,
        float(module.definition.action_energy_cost if explicit_cost is None else explicit_cost),
    )
    reduction, balancers = cost_reduction(player)
    effective = requested * (1.0 - reduction)
    balancer_ids = tuple(item.instance_id for item in balancers)
    if effective <= 0:
        module.energy_waiting = False
        return ActionEnergySpend(True, 0.0, 0.0, 0.0, balancer_ids)

    available = available_action_energy(player)
    if available + 1e-9 < effective:
        module.energy_waiting = True
        return ActionEnergySpend(False, effective, effective - available, 0.0, balancer_ids)

    remaining = effective
    from_core = min(max(0.0, player.energy_stock), remaining)
    player.energy_stock -= from_core
    remaining -= from_core
    for storage in _operational_storage(player):
        if remaining <= 1e-9:
            break
        amount = min(max(0.0, storage.stored_energy), _action_discharge_limit(storage), remaining)
        if amount <= 0:
            continue
        storage.stored_energy -= amount
        remaining -= amount
        player.module_energy_discharged[storage.definition.id] = (
            player.module_energy_discharged.get(storage.definition.id, 0.0) + amount
        )

    module.energy_waiting = False
    module.last_action_energy_cost = effective
    player.energy_consumed_total += effective
    player.module_energy_consumed[module.definition.id] = (
        player.module_energy_consumed.get(module.definition.id, 0.0) + effective
    )
    return ActionEnergySpend(True, effective, 0.0, requested - effective, balancer_ids)


def process_energy_tick(player: PlayerBattleState, core_position: Position = Position(2, 1)) -> EnergyTickResult:
    del core_position  # The GRIDSHARD 2.1 board has an embedded energy bus.
    active = [m for m in player.modules.values() if m.status == ModuleStatus.ACTIVE and m.hp > 0]
    for module in active:
        module.is_powered = not has_disabling_sabotage(module)
    operational = [module for module in active if module_is_operational(module)]
    core = next((m for m in operational if m.definition.id == "core"), None)
    level = max(1, min(15, player.core_level))
    core_generation = (
        BASE_CORE_GENERATION_PER_SECOND
        * CORE_LEVEL_GENERATION_MULTIPLIER ** (level - 1)
        if core
        else 0.0
    )
    core_generation *= 1 + .03 * sum(s.endswith("_energy") for s in player.core_skills)
    battery_generation_by_module = {
        module.instance_id: (
            (module.definition.energy_generation or BATTERY_SUPPLY_PER_SECOND)
            * module.definition.effect_multiplier
        )
        for module in operational
        if module.definition.id == "battery"
    }
    production = core_generation + sum(battery_generation_by_module.values())

    reduction, balancers = cost_reduction(player)
    upkeep_by_module = {
        module.instance_id: max(0.0, float(module.definition.energy_consumption)) * (1.0 - reduction)
        for module in operational
        if module is not core
        and module.definition.id not in {"battery", "capacitor"}
        and module.definition.energy_consumption > 0
    }
    raw_upkeep = sum(
        max(0.0, float(module.definition.energy_consumption))
        for module in operational
        if module.instance_id in upkeep_by_module
    )
    upkeep = sum(upkeep_by_module.values())
    projected_actions = sum(
        action_energy_per_second(module.definition)
        for module in operational
        if module is not core
    ) * (1.0 - reduction)
    player.energy_load_ratio = (
        (upkeep + projected_actions) / production
        if production > 0
        else (2.0 if upkeep + projected_actions else 0.0)
    )

    generated = production * TICK_SECONDS
    distributed = generated * BASE_DISTRIBUTION_EFFICIENCY
    required = upkeep * TICK_SECONDS
    available = distributed
    reserve_draw = min(max(0.0, player.energy_stock), max(0.0, required - available))
    player.energy_stock -= reserve_draw
    available += reserve_draw

    discharged = 0.0
    discharged_by_module: dict[str, float] = {}
    for storage in _operational_storage(player):
        if required <= available:
            break
        amount = min(
            max(0.0, storage.stored_energy),
            _discharge_rate_per_tick(storage),
            required - available,
        )
        if amount <= 0:
            continue
        storage.stored_energy -= amount
        available += amount
        discharged += amount
        discharged_by_module[storage.instance_id] = amount
        player.module_energy_discharged[storage.definition.id] = (
            player.module_energy_discharged.get(storage.definition.id, 0.0) + amount
        )

    consumed = min(required, available)
    delivery_ratio = min(1.0, consumed / required) if required > 0 else 1.0
    for module in active:
        demand_tick = upkeep_by_module.get(module.instance_id, 0.0) * TICK_SECONDS
        if demand_tick > 0 and delivery_ratio < CONTINUOUS_POWER_CUTOFF:
            module.is_powered = False
        received_upkeep = demand_tick * delivery_ratio if module.is_powered else 0.0
        # Aksiyon enerjisi harcama anında sayılır; burada yalnız istemcinin enerji
        # akışını çizebilmesi için beklenen saniyelik akış yayınlanır.
        action_tick = (
            action_energy_per_second(module.definition) * TICK_SECONDS
            if module is not core and module.is_powered and module_is_operational(module)
            else 0.0
        )
        module.energy_required_last_tick = demand_tick + action_tick
        module.energy_received_last_tick = received_upkeep + (
            action_tick if module.is_powered and not module.energy_waiting else 0.0
        )
        if module is core:
            module.energy_received_last_tick = generated
        elif received_upkeep > 0:
            player.module_energy_consumed[module.definition.id] = (
                player.module_energy_consumed.get(module.definition.id, 0.0)
                + received_upkeep
            )

    # Enerji darlığı bekleyen aksiyonlar ve kapanan sürekli sistemlerle görünür.
    player.energy_support_multiplier = max(CONTINUOUS_POWER_CUTOFF, delivery_ratio)

    surplus = max(0.0, available - consumed)
    stored = 0.0
    for storage in _operational_storage(player):
        amount = min(
            surplus,
            _charge_rate_per_tick(storage),
            max(0.0, _storage_capacity(storage) - storage.stored_energy),
        )
        if amount <= 0:
            continue
        storage.stored_energy += amount
        surplus -= amount
        stored += amount
    reserve_charge = min(surplus, max(0.0, core_reserve_capacity(player) - player.energy_stock))
    player.energy_stock += reserve_charge
    surplus -= reserve_charge

    for cannon in sorted(
        (module for module in operational if module.definition.id == "quantum_cannon"),
        key=lambda module: module.instance_id,
    ):
        if surplus <= 0:
            break
        charge = float(cannon.mechanic_state.get("quantum_charge", 0.0))
        amount = min(surplus, QUANTUM_HARVEST_PER_TICK, max(0.0, QUANTUM_CHARGE_MAX - charge))
        if amount <= 0:
            continue
        cannon.mechanic_state["quantum_charge"] = charge + amount
        surplus -= amount

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
        for module_id, generation_per_second in battery_generation_by_module.items()
    ]
    for module_id, amount in discharged_by_module.items():
        module_contributions.append(
            {"module_id": module_id, "contribution_kind": "energy_supplied", "value": amount}
        )
    upkeep_saved = max(0.0, raw_upkeep - upkeep) * TICK_SECONDS
    if upkeep_saved > 0 and balancers:
        strength = sum(module.definition.effect_multiplier for module in balancers)
        for module in balancers:
            module_contributions.append(
                {
                    "module_id": module.instance_id,
                    "contribution_kind": "energy_saved",
                    "value": upkeep_saved * module.definition.effect_multiplier / strength,
                }
            )
    return EnergyTickResult(
        generated,
        distributed,
        consumed,
        stored,
        discharged,
        wasted,
        tuple(m.instance_id for m in active if m.is_powered),
        tuple(m.instance_id for m in active if not m.is_powered),
        tuple(module_contributions),
    )
