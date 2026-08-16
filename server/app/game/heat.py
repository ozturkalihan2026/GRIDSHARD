from dataclasses import dataclass
from .board import get_cell_effects
from .models import BattleModule, ModuleStatus, PlayerBattleState

HIGH_HEAT_THRESHOLD = 70.0
CRITICAL_HEAT_THRESHOLD = 100.0
MAX_HEAT = 120.0
PASSIVE_COOLING_PER_TICK = 0.35
HIGH_HEAT_DAMAGE_MULTIPLIER = 0.85
HIGH_HEAT_COOLDOWN_MULTIPLIER = 1.20
OVERHEAT_DEBUFF_ID = "overheated"
OVERHEAT_DURATION_MS = 2500
OVERHEAT_SELF_DAMAGE = 5
BASE_ATTACK_HEAT = 3.0

@dataclass(slots=True, frozen=True)
class HeatPerformance:
    damage_multiplier: float = 1.0
    cooldown_multiplier: float = 1.0
    high_heat: bool = False
    critical_heat: bool = False
    overheated: bool = False

def heat_generation_multiplier(module: BattleModule) -> float:
    if module.position is None:
        return 1.0
    return float(get_cell_effects(module.position).get("heat_multiplier", 1.0))

def attack_heat_gain(module: BattleModule) -> float:
    base = BASE_ATTACK_HEAT + (module.definition.base_damage / 20.0)
    return max(0.0, base * heat_generation_multiplier(module))

def heat_performance(module: BattleModule, elapsed_ms: int) -> HeatPerformance:
    effect = module.debuffs.get(OVERHEAT_DEBUFF_ID)
    overheated = effect is not None and elapsed_ms < effect.expires_at_ms
    if overheated:
        return HeatPerformance(0.0, 1.0, True, True, True)
    if module.heat >= HIGH_HEAT_THRESHOLD:
        return HeatPerformance(
            HIGH_HEAT_DAMAGE_MULTIPLIER,
            HIGH_HEAT_COOLDOWN_MULTIPLIER,
            True,
            module.heat >= CRITICAL_HEAT_THRESHOLD,
            False,
        )
    return HeatPerformance()

def apply_passive_cooling(player: PlayerBattleState) -> None:
    for module in player.modules.values():
        if module.status != ModuleStatus.ACTIVE:
            continue
        if not module.is_powered:
            continue
        if module.heat <= 0:
            continue
        cooling = PASSIVE_COOLING_PER_TICK
        if module.position is not None:
            multiplier = float(get_cell_effects(module.position).get("heat_multiplier", 1.0))
            if multiplier < 1.0:
                cooling += 1.0 - multiplier
        module.heat = max(0.0, module.heat - cooling)
