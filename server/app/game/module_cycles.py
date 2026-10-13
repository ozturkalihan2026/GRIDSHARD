"""Modül çevrimleri (D13'ün tamamı, 13 Ekim 2026).

Her modül kendi çevrimiyle çalışır ve çevrim seviyeyle kısalır; modüle özgü
değerler (blok, yansıtma, onarım, soğutma …) seviyeyle büyür. Saldırı, onarım
ve sabotaj modüllerinin çevrimi kendi eylem aralığıdır (catalog.py); buradaki
süreler eskiden sürekli çalışan modüllerin çevrimidir.

Bu dosya veri ve saf hesaptır; başka oyun modülünü içe aktarmaz. Motor
(combat.py, support.py, sabotage.py, energy.py, engine.py) ve bilgi ekranı
(module_sheet.py) aynı sayıları buradan okur.
"""
from __future__ import annotations

# Çevrim süresi (ms); 0 çevrimi olmayan, sürekli çalışan modüldür.
CYCLE_COOLDOWN_MS: dict[str, int] = {
    # Savunma
    "shield": 1200,
    "prism_shield": 1300,
    "reflector": 1000,
    "guardian_dome": 1500,
    "phase_armor": 6000,
    "armor": 3000,
    "barrier": 4000,
    # Destek
    "cooler": 1000,
    "targeting_computer": 2000,
    "overclock_unit": 2500,
    "chrono_relay": 6500,
    "precision_matrix": 1500,
    # Sistem: çevrim, deponun boşken tam dolma süresidir.
    "battery": 4000,
    "capacitor": 1000,
    "current_balancer": 0,
}

# Çevrimin dolduğu an (mechanic_state); olay akışını kalabalıklaştırmamak için
# bekleme sözlüğünde değil modülün kendi durumunda tutulur.
CYCLE_READY_KEY = "cycle_ready_at_ms"

# Savunma yükleri: çevrim dolunca yük hazır olur, yükü harcayan olaydan sonra
# çevrim yeniden başlar. Yeni yerleşen modül yüklü başlar.
BLOCK_CHARGE_KEY = "block_charged"            # Kalkan, Prizma Kalkanı
MIRROR_CHARGE_KEY = "mirror_charged"          # Yansıtıcı
DOME_CHARGE_KEY = "dome_charged"              # Koruyucu Kubbe
SABOTAGE_GUARD_KEY = "sabotage_guard_charged"  # Bariyer
DEFENSE_CHARGE_KEYS: dict[str, str] = {
    "shield": BLOCK_CHARGE_KEY,
    "prism_shield": BLOCK_CHARGE_KEY,
    "reflector": MIRROR_CHARGE_KEY,
    "guardian_dome": DOME_CHARGE_KEY,
    "barrier": SABOTAGE_GUARD_KEY,
}

# Destek yükleri saldırı modülünün üstünde durur ve sıradaki atışta harcanır.
TARGETING_LOCK_KEY = "targeting_locked"
OVERCLOCK_CHARGE_KEY = "overclock_charged"
OMEGA_CHARGE_KEY = "omega_charged"

# Yüklü Kalkan'ın karşıladığı tek saldırıda engellediği hasar payı.
BLOCK_BASE_RATIO = {"shield": 0.60, "prism_shield": 0.55}
BLOCK_RATIO_CAP = 0.85
# Yansıtıcı'nın üzerine çektiği saldırıdan saldırana geri dönen pay.
MIRROR_REFLECT_BASE = 0.30
MIRROR_REFLECT_CAP = 0.50
# Kubbe darbesinin başka bir modüle gelen saldırıda engellediği pay.
DOME_GUARD_BASE = 0.30
DOME_GUARD_CAP = 0.50
# Bariyer yükünün devreye uygulanan bir sabotajın süresinden kestiği pay.
SABOTAGE_GUARD_BASE = 0.35
SABOTAGE_GUARD_CAP = 0.60
# Prizma Kalkanı'nın engellediği hasardan enerjiye çevirdiği pay.
PRISM_CONVERSION_BASE = 0.25
PRISM_CONVERSION_CAP = 0.45
# Zırh'ın her çevrimde kendine yaptığı plaka onarımı.
ARMOR_REGEN_BASE = 5
# Faz Zırhı her çevrimin ilk bu kadar süresinde saldırıları boşa çıkarır.
PHASE_WINDOW_MS = 1000

# Sürekli (yük beklemeyen) hasar azaltımı; etki çarpanıyla büyür.
PASSIVE_REDUCTION_BASE = {
    "armor": 0.25,
    "barrier": 0.20,
    "reflector": 0.25,
    "guardian_dome": 0.32,
    "phase_armor": 0.18,
}
PASSIVE_REDUCTION_CAP = 0.65

# Yüksek tabanlı oranlar seviyeyle doğrusal değil, azalan hızla büyür: %60'lık
# blok seviye 15'te %80'e çıkar, tavana dayanıp gelişimi durmaz.
GROWTH_EXPONENT = 0.6


def cycle_ms(definition, default: int = 0) -> int:
    """Modülün seviye ve yeteneklerle kısalmış çevrim süresi."""
    return max(100, int(definition.cooldown_ms)) if int(definition.cooldown_ms or 0) > 0 else int(default)


def grown(base: float, effect: float, cap: float, efficiency: float = 1.0) -> float:
    """Seviyeyle (etki çarpanı) azalan hızla büyüyen oran.

    `efficiency` modülün ısı altındaki verimidir ve oranı doğrudan düşürür:
    ısı kuralı bütün sürekli sistemlerde aynı orandadır (heat.py).
    """
    return min(cap, base * max(0.0, float(effect)) ** GROWTH_EXPONENT) * max(0.0, float(efficiency))


def passive_reduction(definition_id: str, effect: float, efficiency: float = 1.0) -> float:
    base = PASSIVE_REDUCTION_BASE.get(definition_id, 0.0)
    return min(PASSIVE_REDUCTION_CAP, base * max(0.0, float(effect)) * max(0.0, float(efficiency)))


def block_ratio(definition_id: str, effect: float, efficiency: float = 1.0) -> float:
    return grown(BLOCK_BASE_RATIO.get(definition_id, 0.0), effect, BLOCK_RATIO_CAP, efficiency)


def mirror_reflect_ratio(effect: float, efficiency: float = 1.0) -> float:
    return grown(MIRROR_REFLECT_BASE, effect, MIRROR_REFLECT_CAP, efficiency)


def dome_guard_ratio(effect: float, efficiency: float = 1.0) -> float:
    return grown(DOME_GUARD_BASE, effect, DOME_GUARD_CAP, efficiency)


def sabotage_guard_ratio(effect: float, efficiency: float = 1.0) -> float:
    return grown(SABOTAGE_GUARD_BASE, effect, SABOTAGE_GUARD_CAP, efficiency)


def prism_conversion_ratio(effect: float, efficiency: float = 1.0) -> float:
    return grown(PRISM_CONVERSION_BASE, effect, PRISM_CONVERSION_CAP, efficiency)


def armor_regen_amount(effect: float, efficiency: float = 1.0) -> int:
    return max(1, int(round(ARMOR_REGEN_BASE * max(0.0, float(effect)) * max(0.0, float(efficiency)))))


def charged(module, key: str) -> bool:
    """Yük hazır mı? Yeni yerleşen modül yüklü başlar."""
    return bool(module.mechanic_state.get(key, True))
