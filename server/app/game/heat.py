from dataclasses import dataclass

from .models import BattleModule, ModuleStatus, PlayerBattleState

# Beta.72 tur 12 — ısı yüzde ölçeğindedir (0–100) ve Çekirdek ile Soğutucu
# dışındaki bütün modüller için geçerlidir. Isı %40'ın üzerinde her tam %5
# arttığında modül %5 yavaşlar: saldırı, onarım ve sabotaj modüllerinin eylem
# aralığı uzar (%45'te ×1,05, %70'te ×1,30, %95'te ×1,55); sürekli çalışan
# sistemlerin (savunma, destek, Batarya, Akım Dengeleyici) etkisi aynı oranda
# düşer. %100'de modül susar ve ısısı %70'in altına inene kadar çalışmaz.
MAX_HEAT = 100.0
HEAT_SLOWDOWN_START = 40.0
HEAT_SLOWDOWN_STEP = 5.0
HEAT_SLOWDOWN_PER_STEP = 0.05
HIGH_HEAT_THRESHOLD = 70.0
CRITICAL_HEAT_THRESHOLD = 100.0
OVERHEAT_DEBUFF_ID = "overheated"
# Aşırı ısınan modül sabit bir süre değil, ısısı bu eşiğin altına inene kadar
# susar. Susarken hava alır ve üç kat hızlı soğur (~8 sn; Soğutucuyla ~2,5 sn).
OVERHEAT_RECOVERY_THRESHOLD = HIGH_HEAT_THRESHOLD
OVERHEAT_VENT_COOLING_MULTIPLIER = 3.0
OVERHEAT_SELF_DAMAGE = 5
# Değerler AI–AI denge simülasyonuyla seçildi (tur 12): maçlar ~1 dakika,
# saldırı modülünün ömrü medyan ~9 sn, ortalama ~22 sn; ısı bu sürede
# hissedilmeli. Pasif soğuma saniyede %1,2. Sürekli ateş eden, soğutulmayan
# modülde %45 eşiği: Kuantum Topu ~5 sn, Darbe Topu ~7,5 sn, Ray Topu ~10 sn,
# Lazer ~16 sn; susma: Kuantum Topu ~14 sn, Darbe/Ray Topu ~25 sn, Lazer ~47 sn.
PASSIVE_COOLING_PER_TICK = 0.12
# Bir eylemin ısısı: ateş temposu (temel bekleme süresi başına) ve harcanan
# aksiyon enerjisi. Hızlandırılmış modül daha sık çalıştığı için daha hızlı
# ısınır; enerji yoğun kartlar belirgin biçimde daha sıcak çalışır.
HEAT_PER_FIRING_SECOND = 1.2
HEAT_PER_ACTION_ENERGY = 2.2
# Sürekli sistemler aldıkları bakım enerjisiyle ısınır. Tek başına pasif
# soğumayı ancak aşar; asıl yük işten gelir: savunma engellediği hasarla,
# Batarya ve Kapasitör depodan verdikleri enerjiyle ısınır.
HEAT_PER_UPKEEP_ENERGY = 1.5
HEAT_PER_BLOCKED_DAMAGE = 0.25
HEAT_PER_DISCHARGED_ENERGY = 1.2
# Çekirdek enerji kaynağıdır; Soğutucu kendi ısısını atar.
HEAT_EXEMPT_MODULE_IDS = frozenset({"core", "cooler"})


@dataclass(slots=True, frozen=True)
class HeatPerformance:
    damage_multiplier: float = 1.0
    cooldown_multiplier: float = 1.0
    high_heat: bool = False
    critical_heat: bool = False
    overheated: bool = False
    slowdown_steps: int = 0


def generates_heat(module: BattleModule) -> bool:
    return module.definition.id not in HEAT_EXEMPT_MODULE_IDS


def heat_slowdown_steps(heat: float) -> int:
    """%40'ın üzerindeki tam %5 adım sayısı (%45 → 1, %70 → 6, %95 → 11)."""
    level = min(MAX_HEAT, max(0.0, float(heat)))
    if level < HEAT_SLOWDOWN_START + HEAT_SLOWDOWN_STEP - 1e-9:
        return 0
    return int((level - HEAT_SLOWDOWN_START + 1e-9) // HEAT_SLOWDOWN_STEP)


def heat_tempo_multiplier(module: BattleModule) -> float:
    """Eylem aralığı çarpanı: her adım aralığı %5 uzatır."""
    return 1.0 + HEAT_SLOWDOWN_PER_STEP * heat_slowdown_steps(module.heat)


def heat_efficiency(module: BattleModule) -> float:
    """Sürekli sistemin ısı altındaki etkisi; aralık uzamasıyla aynı oran."""
    if is_overheated(module):
        return 0.0
    return 1.0 / heat_tempo_multiplier(module)


def heat_penalty_percent(module: BattleModule) -> int:
    """Arayüz için: eylem aralığının yüzde kaç uzadığı (0, 5, 10 … 60)."""
    return int(round(HEAT_SLOWDOWN_PER_STEP * heat_slowdown_steps(module.heat) * 100))


def add_module_heat(module: BattleModule, amount: float) -> float:
    """Isıyı 0–100 aralığında ekler ve gerçekten eklenen miktarı döndürür."""
    if amount <= 0 or not generates_heat(module):
        return 0.0
    before = module.heat
    module.heat = min(MAX_HEAT, before + float(amount))
    return module.heat - before


def action_heat_gain(module: BattleModule, energy_cost: float | None = None) -> float:
    """Saldırı, onarım ve sabotaj eyleminin ürettiği ısı."""
    cost = module.definition.action_energy_cost if energy_cost is None else energy_cost
    base = (
        HEAT_PER_FIRING_SECOND * (module.definition.cooldown_ms / 1000.0)
        + HEAT_PER_ACTION_ENERGY * max(0.0, float(cost))
    )
    return max(0.0, base)


def attack_heat_gain(module: BattleModule) -> float:
    return action_heat_gain(module)


def is_overheated(module: BattleModule) -> bool:
    return OVERHEAT_DEBUFF_ID in module.debuffs


def heat_performance(module: BattleModule, elapsed_ms: int) -> HeatPerformance:
    del elapsed_ms  # Aşırı ısınma süreyle değil ısıyla biter.
    if is_overheated(module):
        return HeatPerformance(0.0, 1.0, True, True, True, heat_slowdown_steps(module.heat))
    steps = heat_slowdown_steps(module.heat)
    return HeatPerformance(
        1.0,
        1.0 + HEAT_SLOWDOWN_PER_STEP * steps,
        module.heat >= HIGH_HEAT_THRESHOLD,
        module.heat >= CRITICAL_HEAT_THRESHOLD,
        False,
        steps,
    )


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
