"""Bilgi ekranının modüle özgü değerleri.

Her modülün kendi çevrimi ve seviyeyle gelişen kendi sayıları vardır; "etki
çarpanı" gibi soyut bir değer yerine oyuncuya o modülün savaşta gerçekten
yaptığı iş gösterilir (blok %60, yansıtma %30, onarım 15 CAN …). Sayılar motorun
kullandığı sabit ve işlevlerden hesaplanır; ayrı bir tablo tutulmaz.
"""
from __future__ import annotations

from .combat import (
    ATTACK_WINDUP_MS,
    PIERCE_KEPT_REDUCTION,
    QUANTUM_CHARGE_DAMAGE_BONUS,
    QUANTUM_REPEAT_ECHO_RATIO,
    SECONDARY_HIT_RATIOS,
    SWARM_RELEASE_RATIO_PER_TARGET,
    SWARM_RELEASE_TARGETS,
)
from .energy import (
    BATTERY_CAPACITY,
    CAPACITOR_CAPACITY,
    COST_REDUCTION_PER_BALANCER,
    MAX_COST_REDUCTION,
)
from .module_cycles import (
    BLOCK_BASE_RATIO,
    PHASE_WINDOW_MS,
    armor_regen_amount,
    block_ratio,
    dome_guard_ratio,
    mirror_reflect_ratio,
    passive_reduction,
    prism_conversion_ratio,
    sabotage_guard_ratio,
)
from .sabotage import (
    DISRUPTOR_DURATION_MS,
    EMP_DURATION_MS,
    JAMMER_DURATION_MS,
    SABOTAGE_ECHO_RATIOS,
    SINGULARITY_DURATION_MS,
    VIRUS_DURATION_MS,
    VIRUS_TICK_DAMAGE,
    VIRUS_TICK_ESCALATION,
    VIRUS_TICK_INTERVAL_MS,
)
from .support import (
    AMPLIFIER_PER_ATTACK_CAP,
    BASE_REPAIR_AMOUNT,
    CHRONO_BOOST_COOLDOWN,
    CHRONO_BOOST_MS,
    CHRONO_MIN_DEBT_MS,
    COOLER_HEAT_REDUCTION_PER_PULSE,
    COOLER_MAX_TARGETS,
    NANO_MEDIC_REPAIR_RATIO,
    NANO_MEDIC_TARGETS,
    OMEGA_BUDGET_PER_CATEGORY,
    OMEGA_PER_ATTACK_CAP,
    OVERCLOCK_COOLDOWN_MULTIPLIER,
    OVERCLOCK_DAMAGE_MULTIPLIER,
    OVERCLOCK_HEAT_PER_PULSE,
    PHOENIX_COOLDOWN_MS,
    PHOENIX_REPAIR_RATIO,
    PHOENIX_REVIVE_HP_RATIO,
    PRECISION_COOLDOWN_PER_STACK,
    PRECISION_DAMAGE_PER_STACK,
    PRECISION_MAX_STACKS,
    TARGETING_PER_ATTACK_CAP,
)

# Bir destek tek saldırının beklemesini en çok bu orana indirebilir (support.py).
_SPEED_FLOOR = 0.65


def _special(key: str, label_tr: str, label_en: str, value: float, unit: str, **extra) -> dict:
    return {"key": key, "label_tr": label_tr, "label_en": label_en,
            "value": round(float(value), 2), "unit": unit, **extra}


def _percent(key: str, label_tr: str, label_en: str, ratio: float, **extra) -> dict:
    return _special(key, label_tr, label_en, ratio * 100, "percent", **extra)


def _seconds(key: str, label_tr: str, label_en: str, milliseconds: float, **extra) -> dict:
    return _special(key, label_tr, label_en, milliseconds / 1000, "seconds", **extra)


def module_specials(definition, stats: dict) -> list[dict]:
    """Modülün seviye ve yetenek dahil kendi değerleri (bilgi ekranı karoları)."""
    module_id = definition.id
    mechanic_id = definition.mechanic_id
    effect = float(stats["effect_multiplier"])
    cooldown_ms = int(stats["cooldown_ms"])
    specials: list[dict] = []

    if definition.category == "saldırı":
        if cooldown_ms > 0:
            specials.append(_special(
                "dps", "SANİYE HASARI", "DAMAGE / SEC",
                float(stats["base_damage"]) * 1000 / cooldown_ms, "per_second",
            ))
        if module_id in PIERCE_KEPT_REDUCTION:
            specials.append(_percent("pierce", "DELME", "PIERCE", 1 - PIERCE_KEPT_REDUCTION[module_id]))
        if module_id in ATTACK_WINDUP_MS:
            specials.append(_seconds("lock", "KİLİT", "LOCK", ATTACK_WINDUP_MS[module_id]))
        if module_id in SECONDARY_HIT_RATIOS:
            label_tr, label_en = {
                "arc_cannon": ("ZİNCİR", "CHAIN"),
                "ion_spear": ("TAŞMA", "CARRY"),
                "plasma_mortar": ("ALAN", "SPLASH"),
            }.get(module_id, ("SIÇRAMA", "SPLASH"))
            specials.append(_percent("secondary", label_tr, label_en, SECONDARY_HIT_RATIOS[module_id]))
        if module_id == "quantum_repeater":
            specials.append(_percent("echo", "YANKI", "ECHO", QUANTUM_REPEAT_ECHO_RATIO))
        if module_id == "swarm_fabricator":
            specials.append(_percent(
                "swarm", "SÜRÜ", "SWARM", SWARM_RELEASE_RATIO_PER_TARGET, times=SWARM_RELEASE_TARGETS,
            ))
        if module_id == "quantum_cannon":
            specials.append(_percent("charge_bonus", "YÜK BONUSU", "CHARGE BONUS", QUANTUM_CHARGE_DAMAGE_BONUS))
        return specials

    if definition.category == "savunma":
        if module_id in BLOCK_BASE_RATIO:
            specials.append(_percent("block", "BLOK", "BLOCK", block_ratio(module_id, effect)))
        if module_id == "prism_shield":
            specials.append(_percent("conversion", "DÖNÜŞÜM", "CONVERT", prism_conversion_ratio(effect)))
        # Modülün asıl işi önce gelir (bilgi ekranının baştaki kutusu onu gösterir).
        if module_id == "reflector":
            specials.append(_percent("reflect", "YANSITMA", "REFLECT", mirror_reflect_ratio(effect)))
        elif module_id == "guardian_dome":
            specials.append(_percent("dome_guard", "KUBBE", "DOME GUARD", dome_guard_ratio(effect)))
        reduction_id = module_id if module_id in {"guardian_dome", "phase_armor"} else mechanic_id
        reduction = passive_reduction(reduction_id, effect)
        if reduction > 0 and module_id not in BLOCK_BASE_RATIO:
            specials.append(_percent("reduction", "KORUMA", "ARMOR", reduction))
        if module_id == "armor":
            specials.append(_special("regen", "PLAKA ONARIMI", "PLATE REPAIR", armor_regen_amount(effect), "hp"))
        elif module_id == "barrier":
            specials.append(_percent("sabotage_guard", "SABOTAJ DİRENCİ", "SABOTAGE RESIST", sabotage_guard_ratio(effect)))
        elif module_id == "phase_armor":
            specials.append(_seconds("phase", "FAZ SÜRESİ", "PHASE TIME", PHASE_WINDOW_MS))
        return specials

    if definition.category == "destek":
        if mechanic_id == "repair":
            repair = max(1, round(BASE_REPAIR_AMOUNT * effect))
            if module_id == "nano_medic":
                specials.append(_special(
                    "repair", "ONARIM", "REPAIR", max(1, round(repair * NANO_MEDIC_REPAIR_RATIO)), "hp",
                    times=NANO_MEDIC_TARGETS,
                ))
            elif module_id == "phoenix_repair":
                specials.append(_special("repair", "ONARIM", "REPAIR", max(1, round(repair * PHOENIX_REPAIR_RATIO)), "hp"))
                specials.append(_percent("revive_hp", "DİRİLİŞ CANI", "REVIVE HP", PHOENIX_REVIVE_HP_RATIO))
                specials.append(_seconds("revive", "DİRİLTME", "REVIVE EVERY", PHOENIX_COOLDOWN_MS))
            else:
                specials.append(_special("repair", "ONARIM", "REPAIR", repair, "hp"))
        elif module_id == "cooler":
            specials.append(_special(
                "cooling", "SOĞUTMA", "COOLING", COOLER_HEAT_REDUCTION_PER_PULSE * effect, "heat",
                times=COOLER_MAX_TARGETS,
            ))
        elif module_id == "amplifier":
            specials.append(_percent("damage_boost", "HASAR DESTEĞİ", "DAMAGE BOOST", AMPLIFIER_PER_ATTACK_CAP * effect))
        elif module_id == "targeting_computer":
            specials.append(_percent(
                "speed_boost", "HIZ DESTEĞİ", "SPEED BOOST",
                min(1 - _SPEED_FLOOR, TARGETING_PER_ATTACK_CAP * effect),
            ))
        elif module_id == "overclock_unit":
            specials.append(_percent("damage_boost", "HASAR DESTEĞİ", "DAMAGE BOOST", (OVERCLOCK_DAMAGE_MULTIPLIER - 1) * effect))
            specials.append(_percent(
                "speed_boost", "HIZ DESTEĞİ", "SPEED BOOST",
                min(1 - _SPEED_FLOOR, (1 - OVERCLOCK_COOLDOWN_MULTIPLIER) * effect),
            ))
            specials.append(_special("heat", "YÜKLEME ISISI", "CHARGE HEAT", OVERCLOCK_HEAT_PER_PULSE, "heat"))
        elif module_id == "chrono_relay":
            specials.append(_percent(
                "speed_boost", "HIZLANMA", "SPEED-UP",
                min(1 - _SPEED_FLOOR, (1 - CHRONO_BOOST_COOLDOWN) * effect),
            ))
            specials.append(_seconds("boost", "HIZLANMA SÜRESİ", "SPEED-UP TIME", CHRONO_BOOST_MS))
            specials.append(_seconds(
                "debt", "ZAMAN BORCU", "TIME DEBT", max(CHRONO_MIN_DEBT_MS, cooldown_ms - CHRONO_BOOST_MS),
            ))
        elif module_id == "precision_matrix":
            specials.append(_percent(
                "damage_boost", "KADEME HASARI", "DAMAGE PER STACK", PRECISION_DAMAGE_PER_STACK * effect,
                times=PRECISION_MAX_STACKS,
            ))
            specials.append(_percent(
                "speed_boost", "KADEME HIZI", "SPEED PER STACK", PRECISION_COOLDOWN_PER_STACK * effect,
                times=PRECISION_MAX_STACKS,
            ))
        elif module_id == "omega_amplifier":
            specials.append(_percent("resonance", "SINIF BAŞINA PAY", "SHARE PER CLASS", OMEGA_BUDGET_PER_CATEGORY * effect))
            specials.append(_percent("damage_boost", "EN ÇOK DESTEK", "MAX BOOST", OMEGA_PER_ATTACK_CAP * effect))
        return specials

    if definition.category == "sabotaj":
        duration_ms = {
            "emp": EMP_DURATION_MS,
            "jammer": JAMMER_DURATION_MS,
            "virus": VIRUS_DURATION_MS,
            "disruptor": DISRUPTOR_DURATION_MS,
        }.get(mechanic_id, 0)
        if module_id == "singularity_projector":
            duration_ms = SINGULARITY_DURATION_MS
        duration_ms = max(500, round(duration_ms * effect))
        specials.append(_seconds("duration", "ETKİ SÜRESİ", "EFFECT TIME", duration_ms))
        if mechanic_id == "virus":
            ticks = max(1, -(-duration_ms // VIRUS_TICK_INTERVAL_MS))
            specials.append(_special(
                "virus_damage", "TOPLAM HASAR", "TOTAL DAMAGE",
                sum(VIRUS_TICK_DAMAGE + VIRUS_TICK_ESCALATION * index for index in range(ticks)), "damage",
            ))
        if module_id in SABOTAGE_ECHO_RATIOS:
            specials.append(_percent("echo", "YANKI SÜRESİ", "ECHO TIME", SABOTAGE_ECHO_RATIOS[module_id]))
        return specials

    # Sistem modülleri.
    if module_id == "battery":
        specials.append(_special("storage", "DEPO", "STORAGE", BATTERY_CAPACITY * effect, "energy"))
    elif module_id == "capacitor":
        specials.append(_special("storage", "DEPO", "STORAGE", CAPACITOR_CAPACITY * effect, "energy"))
    elif module_id == "current_balancer":
        specials.append(_percent(
            "saving", "ENERJİ TASARRUFU", "ENERGY SAVING",
            min(MAX_COST_REDUCTION, COST_REDUCTION_PER_BALANCER * effect),
        ))
    return specials


# Çevrimin bilgi ekranındaki adı; saldırı, onarım ve sabotajda eylem aralığıdır.
CYCLE_LABELS: dict[str, tuple[str, str]] = {
    "shield": ("BLOK ARALIĞI", "BLOCK INTERVAL"),
    "prism_shield": ("BLOK ARALIĞI", "BLOCK INTERVAL"),
    "reflector": ("AYNA ARALIĞI", "MIRROR INTERVAL"),
    "guardian_dome": ("KUBBE ARALIĞI", "DOME INTERVAL"),
    "phase_armor": ("FAZ ÇEVRİMİ", "PHASE CYCLE"),
    "armor": ("ONARIM ARALIĞI", "REPAIR INTERVAL"),
    "barrier": ("DİRENÇ ARALIĞI", "RESIST INTERVAL"),
    "cooler": ("SOĞUTMA ARALIĞI", "COOLING INTERVAL"),
    "amplifier": ("YÜKLEME ARALIĞI", "CHARGE INTERVAL"),
    "omega_amplifier": ("YÜKLEME ARALIĞI", "CHARGE INTERVAL"),
    "targeting_computer": ("KİLİT ARALIĞI", "LOCK INTERVAL"),
    "overclock_unit": ("YÜKLEME ARALIĞI", "CHARGE INTERVAL"),
    "chrono_relay": ("ZAMAN ÇEVRİMİ", "TIME CYCLE"),
    "precision_matrix": ("ODAK ARALIĞI", "FOCUS INTERVAL"),
    "battery": ("DEPO DOLUMU", "STORAGE REFILL"),
    "capacitor": ("DEPO DOLUMU", "STORAGE REFILL"),
}
CATEGORY_CYCLE_LABELS: dict[str, tuple[str, str]] = {
    "saldırı": ("SALDIRI ARALIĞI", "ATTACK INTERVAL"),
    "sabotaj": ("SABOTAJ ARALIĞI", "SABOTAGE INTERVAL"),
    "destek": ("ONARIM ARALIĞI", "REPAIR INTERVAL"),
}


def cycle_label(definition) -> tuple[str, str]:
    """Çevrim karosunun başlığı; çevrimi olmayan modülde boş."""
    if int(definition.cooldown_ms or 0) <= 0:
        return ("", "")
    return CYCLE_LABELS.get(definition.id) or CATEGORY_CYCLE_LABELS.get(definition.category, ("BEKLEME", "COOLDOWN"))
