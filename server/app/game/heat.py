from dataclasses import dataclass

from .models import BattleModule, ModuleStatus, PlayerBattleState

HIGH_HEAT_THRESHOLD = 70.0
CRITICAL_HEAT_THRESHOLD = 100.0
MAX_HEAT = 120.0
# Sürekli ateş eden her saldırı modülü pasif soğumayı aşar: hafif silahlar
# ~60 sn, enerji yoğun silahlar ~25 sn sonra Yüksek Isı'ya çıkar. Soğutucu bu
# yüzden yalnız Aşırı Hızlandırıcı'nın eşlikçisi değil, gerçek bir deste
# kararıdır.
PASSIVE_COOLING_PER_TICK = 0.13
HIGH_HEAT_DAMAGE_MULTIPLIER = 0.85
HIGH_HEAT_COOLDOWN_MULTIPLIER = 1.20
OVERHEAT_DEBUFF_ID = "overheated"
# Aşırı ısınan modül sabit bir süre değil, ısısı bu eşiğin altına inene kadar
# susar. Susarken hava alır ve iki kat hızlı soğur.
OVERHEAT_RECOVERY_THRESHOLD = HIGH_HEAT_THRESHOLD
OVERHEAT_VENT_COOLING_MULTIPLIER = 2.0
OVERHEAT_SELF_DAMAGE = 5
# Bir atışın ısısı: ateş temposu (temel bekleme süresi başına) ve harcanan
# aksiyon enerjisi. Hızlandırılmış modül daha sık ateşlediği için daha hızlı
# ısınır.
HEAT_PER_FIRING_SECOND = 1.4
HEAT_PER_ACTION_ENERGY = 0.9


@dataclass(slots=True, frozen=True)
class HeatPerformance:
    damage_multiplier: float = 1.0
    cooldown_multiplier: float = 1.0
    high_heat: bool = False
    critical_heat: bool = False
    overheated: bool = False


def attack_heat_gain(module: BattleModule) -> float:
    base = (
        HEAT_PER_FIRING_SECOND * (module.definition.cooldown_ms / 1000.0)
        + HEAT_PER_ACTION_ENERGY * module.definition.action_energy_cost
    )
    return max(0.0, base)


def is_overheated(module: BattleModule) -> bool:
    return OVERHEAT_DEBUFF_ID in module.debuffs


def heat_performance(module: BattleModule, elapsed_ms: int) -> HeatPerformance:
    del elapsed_ms  # Aşırı ısınma artık süreyle değil ısıyla biter.
    if is_overheated(module):
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
        if is_overheated(module):
            cooling *= OVERHEAT_VENT_COOLING_MULTIPLIER
        module.heat = max(0.0, module.heat - cooling)
