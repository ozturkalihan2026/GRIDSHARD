from __future__ import annotations

from .catalog import BASIC_MODULE_DEFINITIONS, CARD_COPY
from .combat import (
    ATTACK_WINDUP_MS,
    PIERCE_KEPT_REDUCTION,
    SECONDARY_HIT_RATIOS,
)
from .energy import (
    BATTERY_CAPACITY,
    BATTERY_CHARGE_RATE_PER_SECOND,
    BATTERY_DISCHARGE_RATE_PER_SECOND,
    CAPACITOR_CAPACITY,
    CAPACITOR_CHARGE_RATE_PER_SECOND,
    CAPACITOR_DISCHARGE_RATE_PER_SECOND,
)
from .support import (
    BASE_REPAIR_AMOUNT,
    OVERCLOCK_DAMAGE_MULTIPLIER,
    OVERCLOCK_COOLDOWN_MULTIPLIER,
    OVERCLOCK_HEAT_PER_TICK,
    COOLER_HEAT_REDUCTION_PER_TICK,
    COOLER_DEBUFF_REDUCTION_MS_PER_TICK,
    COOLER_MAX_TARGETS,
    COOLER_OVERHEAT_MULTIPLIER,
    AMPLIFIER_PER_ATTACK_CAP,
    AMPLIFIER_TOTAL_BUDGET,
    TARGETING_PER_ATTACK_CAP,
    TARGETING_TOTAL_BUDGET,
)
from .heat import (
    CRITICAL_HEAT_THRESHOLD,
    HEAT_EXEMPT_MODULE_IDS,
    HEAT_PER_ACTION_ENERGY,
    HEAT_PER_BLOCKED_DAMAGE,
    HEAT_PER_DISCHARGED_ENERGY,
    HEAT_PER_FIRING_SECOND,
    HEAT_SLOWDOWN_PER_STEP,
    HEAT_SLOWDOWN_START,
    HEAT_SLOWDOWN_STEP,
    HIGH_HEAT_THRESHOLD,
    OVERHEAT_RECOVERY_THRESHOLD,
)
from .sabotage import (
    EMP_DURATION_MS,
    JAMMER_DURATION_MS,
    VIRUS_DURATION_MS,
    VIRUS_TICK_DAMAGE,
    VIRUS_TICK_ESCALATION,
    VIRUS_TICK_INTERVAL_MS,
    SABOTAGE_ECHO_RATIOS,
    DISRUPTOR_DURATION_MS,
)


CATEGORY_ORDER = (
    "enerji",
    "saldırı",
    "savunma",
    "destek",
    "sabotaj",
)

CATEGORY_LABELS = {
    "enerji":"Sistem",
    "saldırı":"Saldırı",
    "savunma":"Savunma",
    "destek":"Destek",
    "sabotaj":"Sabotaj",
    "çekirdek":"Çekirdek",
}

CATEGORY_LABELS_EN = {
    "enerji": "System",
    "saldırı": "Attack",
    "savunma": "Defense",
    "destek": "Support",
    "sabotaj": "Sabotage",
    "çekirdek": "Core",
}

MODULE_COPY_EN: dict[str, tuple[str, str]] = {
    "battery": ("Energy feed and reserve", "Supplies 4.5 energy per second and stores 20 energy for sudden loads."),
    "capacitor": ("Burst energy reserve", "Generates no energy; a 10-energy reserve that charges and discharges very fast, before the Battery."),
    "current_balancer": ("Circuit efficiency", "Reduces action and upkeep energy costs by 8%; repeated copies are capped at 24%."),
    "laser": ("Sustained single-target damage", "Deals steady damage to one target."),
    "pulse_cannon": ("High burst damage", "Fires slower, powerful pulses."),
    "railgun": ("High piercing damage", "Deals piercing damage against armored targets."),
    "missile_launcher": ("Delayed area pressure", "Trades preparation time for heavy area pressure."),
    "drone_bay": ("Distributed sustained pressure", "Wears down defenses with multiple small attacks."),
    "arc_cannon": ("Chained multi-target damage", "Produces chained energy attacks that jump onto the next target."),
    "shield": ("Active damage absorption", "Consumes energy to absorb part of incoming damage."),
    "armor": ("Durability", "Reduces incoming damage while contributing to the circuit's energy demand."),
    "reflector": ("Energy-attack reflection", "Redirects part of incoming energy-based damage."),
    "barrier": ("Defense-line protection", "Draws attacks onto itself and protects critical circuit cells."),
    "repair": ("Health repair", "Repairs damaged modules."),
    "cooler": ("Heat control", "Cools the three hottest modules in the circuit, overheated ones first, and quickly brings a silenced module back."),
    "amplifier": ("Attack-line amplification", "Increases the damage of attack modules in the circuit; a 30% budget is shared among attacks, at most 15% each."),
    "targeting_computer": ("Targeting support", "Shortens the cooldown of attack modules in the circuit; a 30% budget is shared among attacks, at most 15% each."),
    "overclock_unit": ("Performance at a heat cost", "Accelerates and strengthens the heaviest attack module; that module heats up faster."),
    "emp": ("Temporary system disruption", "Temporarily disrupts energy and support lines."),
    "jammer": ("Support-line disruption", "Weakens targeting and support modules."),
    "virus": ("Escalating system debuff", "Applies a weakening effect that grows across support and control lines."),
    "disruptor": ("Temporary system cut", "Temporarily cuts a target system and echoes a shorter cut onto a second system."),
    "guardian_dome": ("Circuit protection", "Reduces its own incoming damage by 32%; while alive, other modules in the circuit take 12% less damage."),
    "prism_shield": ("Prismatic conversion", "Reduces its own incoming damage by 30% and converts a quarter of the prevented damage into Core reserve energy."),
    "phase_armor": ("Periodic phase", "Voids every attack during the first second of each 6-second cycle; otherwise reduces damage by 18%."),
    "nano_medic": ("Distributed repair", "Repairs the two most damaged modules at once, each for 62% of a base repair."),
    "phoenix_repair": ("Return to service", "Every 30 seconds, within class limits, brings a destroyed module back at 30% HP (10 energy); each module can return only once per match. Without a candidate it performs a strong single repair."),
    "quantum_repeater": ("Quantum repeat", "On the fourth consecutive hit on the same target, echoes 65% of the last damage."),
    "plasma_mortar": ("Delayed plasma field", "Locks onto a target for 1.2 sec before firing; 35% area damage splashes onto the next target."),
    "ion_spear": ("Ionic pierce", "Ignores 60% of defensive reduction; 55% damage carries onto the target behind."),
    "swarm_fabricator": ("Swarm build-up", "Stores a drone on every shot; the fourth shot releases a swarm onto three targets."),
    "quantum_cannon": ("Quantum charge", "Collects the circuit's wasted energy as charge; a full charge adds up to 80% damage to the next shot."),
    "chrono_relay": ("Time debt", "Speeds up every attack for 4 sec, then a 2.5-sec time debt slows them down."),
    "precision_matrix": ("Focus stacks", "Attacks that keep hitting the same target gain damage and speed for up to 4 stacks."),
    "omega_amplifier": ("Adaptive resonance", "Each distinct class in the circuit grows its shared damage support."),
    "singularity_projector": ("Singularity field", "Cuts the target system for 4.5 sec and echoes a 65%-duration cut onto a second system."),
}


def _name(definition_id: str) -> str:
    definition = BASIC_MODULE_DEFINITIONS.get(
        definition_id
    )
    return (
        definition.name_tr
        if definition is not None
        else definition_id
    )


def _percent(multiplier: float) -> int:
    return int(
        round(
            multiplier * 100
        )
    )


def _action_energy_line(definition_id: str) -> list[str]:
    definition = BASIC_MODULE_DEFINITIONS[definition_id]
    cost = definition.action_energy_cost
    if cost <= 0:
        return []
    action = {"saldırı": "atış", "sabotaj": "sabotaj", "destek": "onarım"}.get(
        definition.category, "eylem"
    )
    return [
        f"Her {action} {cost:g} enerji harcar; enerji yetmezse modül bekler "
        "ve bekleme süresi boşa gitmez."
    ]


def _action_energy_line_en(definition_id: str) -> list[str]:
    cost = BASIC_MODULE_DEFINITIONS[definition_id].action_energy_cost
    if cost <= 0:
        return []
    return [
        f"Each action spends {cost:g} energy; without enough energy the module "
        "waits and its cooldown is not wasted."
    ]


# Beta.72 tur 12 — her kart kendi ısınma biçimini ve ısı kurallarını gösterir.
def _heat_weakening(heat: float) -> int:
    steps = int((heat - HEAT_SLOWDOWN_START) // HEAT_SLOWDOWN_STEP)
    return _percent(1 - 1 / (1 + HEAT_SLOWDOWN_PER_STEP * steps))


def _heat_kind(definition_id: str) -> str:
    definition = BASIC_MODULE_DEFINITIONS[definition_id]
    if definition_id in HEAT_EXEMPT_MODULE_IDS:
        return "exempt"
    if definition.action_energy_cost > 0:
        return "attack" if definition.category == "saldırı" else "action"
    if definition.category == "savunma":
        return "defense"
    if definition_id in {"battery", "capacitor"}:
        return definition_id
    return "continuous"


def _action_heat(definition_id: str) -> float:
    definition = BASIC_MODULE_DEFINITIONS[definition_id]
    return round(
        HEAT_PER_FIRING_SECOND * definition.cooldown_ms / 1000
        + HEAT_PER_ACTION_ENERGY * definition.action_energy_cost,
        1,
    )


def _heat_lines(definition_id: str) -> list[str]:
    kind = _heat_kind(definition_id)
    if kind == "exempt":
        return ["Kendisi ısınmaz."]
    stop = (
        f"%{CRITICAL_HEAT_THRESHOLD:g}'de susar ve ısısı %{OVERHEAT_RECOVERY_THRESHOLD:g}'in "
        "altına inene kadar çalışmaz."
    )
    weakening = (
        f"ısı %{HEAT_SLOWDOWN_START:g}'ı aştıkça kademeli azalır "
        f"(%{HIGH_HEAT_THRESHOLD:g}'te %{_heat_weakening(HIGH_HEAT_THRESHOLD)}, "
        f"%95'te %{_heat_weakening(95)})"
    )
    if kind in {"attack", "action"}:
        noun = "atış" if kind == "attack" else "eylem"
        return [
            f"Her {noun} %{_action_heat(definition_id):g} ısı üretir. Isı %{HEAT_SLOWDOWN_START:g}'ı "
            f"aştıkça her %{HEAT_SLOWDOWN_STEP:g}'te {noun} aralığı %{_percent(HEAT_SLOWDOWN_PER_STEP)} uzar; "
            + stop
        ]
    if kind == "defense":
        return [
            f"Engellediği her 10 hasar %{HEAT_PER_BLOCKED_DAMAGE * 10:g} ısı üretir; "
            f"koruması {weakening}; " + stop
        ]
    if kind in {"battery", "capacitor"}:
        output = "üretimi ve boşaltması" if kind == "battery" else "boşaltması"
        return [
            f"Depodan verdiği her 10 enerji %{HEAT_PER_DISCHARGED_ENERGY * 10:g} ısı üretir; "
            f"{output} {weakening}; " + stop
        ]
    return [f"Bakım enerjisiyle ısınır; etkisi {weakening}; " + stop]


def _heat_lines_en(definition_id: str) -> list[str]:
    kind = _heat_kind(definition_id)
    if kind == "exempt":
        return ["Does not heat up itself."]
    stop = (
        f"at {CRITICAL_HEAT_THRESHOLD:g}% it shuts down until its heat drops below "
        f"{OVERHEAT_RECOVERY_THRESHOLD:g}%."
    )
    weakening = (
        f"step by step above {HEAT_SLOWDOWN_START:g}% heat "
        f"({_heat_weakening(HIGH_HEAT_THRESHOLD)}% at {HIGH_HEAT_THRESHOLD:g}%, "
        f"{_heat_weakening(95)}% at 95%)"
    )
    if kind in {"attack", "action"}:
        noun = "shot" if kind == "attack" else "action"
        interval = "attack" if kind == "attack" else "action"
        return [
            f"Each {noun} adds {_action_heat(definition_id):g}% heat. Above {HEAT_SLOWDOWN_START:g}% heat, "
            f"every {HEAT_SLOWDOWN_STEP:g}% lengthens the {interval} interval by "
            f"{_percent(HEAT_SLOWDOWN_PER_STEP)}%; " + stop
        ]
    if kind == "defense":
        return [
            f"Every 10 blocked damage adds {HEAT_PER_BLOCKED_DAMAGE * 10:g}% heat; "
            f"its protection weakens {weakening}; " + stop
        ]
    if kind in {"battery", "capacitor"}:
        output = (
            "its output and discharge weaken" if kind == "battery" else "its discharge weakens"
        )
        return [
            f"Every 10 energy drawn from storage adds {HEAT_PER_DISCHARGED_ENERGY * 10:g}% heat; "
            f"{output} {weakening}; " + stop
        ]
    return [f"Heats up from its upkeep energy; its effect weakens {weakening}; " + stop]


def _signature_effect_lines(definition_id: str) -> list[str]:
    lines = []
    if definition_id in ATTACK_WINDUP_MS:
        lines.append(
            f"Ateşlemeden önce hedefe {ATTACK_WINDUP_MS[definition_id] / 1000:g} sn kilitlenir; "
            "hazırlık süresi saldırı aralığının içindedir, hedef değişirse kilit baştan başlar."
        )
    if definition_id in PIERCE_KEPT_REDUCTION:
        lines.append(
            f"Hedefin savunma azaltımının %{round((1 - PIERCE_KEPT_REDUCTION[definition_id]) * 100)}'ını yok sayar."
        )
    if definition_id in SECONDARY_HIT_RATIOS:
        lines.append(
            f"Her atışta sıradaki hedefe %{round(SECONDARY_HIT_RATIOS[definition_id] * 100)} hasar sıçrar; "
            "sıçrama da o hedefin savunmasından geçer."
        )
    return lines


def _signature_effect_lines_en(definition_id: str) -> list[str]:
    lines = []
    if definition_id in ATTACK_WINDUP_MS:
        lines.append(
            f"Locks onto the target for {ATTACK_WINDUP_MS[definition_id] / 1000:g} sec before firing; "
            "the lock is part of the attack interval and restarts if the target changes."
        )
    if definition_id in PIERCE_KEPT_REDUCTION:
        lines.append(
            f"Ignores {round((1 - PIERCE_KEPT_REDUCTION[definition_id]) * 100)}% of the target's defensive reduction."
        )
    if definition_id in SECONDARY_HIT_RATIOS:
        lines.append(
            f"Each shot splashes {round(SECONDARY_HIT_RATIOS[definition_id] * 100)}% damage onto the next target, "
            "through that target's defenses."
        )
    return lines


def _effect_lines(definition_id: str) -> list[str]:
    definition = BASIC_MODULE_DEFINITIONS[definition_id]
    if definition_id in CARD_COPY and definition.category != "saldırı":
        # Türetilmiş kartın kendi imzası aile değerlerinin yerini alır.
        lines = [definition.description_tr]
    else:
        signature = _signature_effect_lines(definition_id)
        lines = _mechanic_effect_lines(definition_id) + signature
        if definition_id in CARD_COPY and not signature:
            lines.append(definition.description_tr)
    return lines + _action_energy_line(definition_id) + _heat_lines(definition_id)


def _effect_lines_en(definition_id: str) -> list[str]:
    definition = BASIC_MODULE_DEFINITIONS[definition_id]
    copy_en = MODULE_COPY_EN.get(definition_id)
    if definition_id in CARD_COPY and definition.category != "saldırı" and copy_en:
        lines = [copy_en[1]]
    else:
        signature = _signature_effect_lines_en(definition_id)
        lines = _mechanic_effect_lines_en(definition_id) + signature
        if definition_id in CARD_COPY and copy_en and not signature:
            lines.append(copy_en[1])
    return lines + _action_energy_line_en(definition_id) + _heat_lines_en(definition_id)


def _mechanic_effect_lines(definition_id: str) -> list[str]:
    definition = BASIC_MODULE_DEFINITIONS[
        definition_id
    ]
    if definition_id in {"battery", "capacitor", "current_balancer"}:
        return [definition.description_tr]
    definition_id = definition.mechanic_id

    if definition.category == "saldırı":
        return [
            (
                f"Her atışın temel hasarı {definition.base_damage:g}. "
                f"Temel saldırı aralığı {definition.cooldown_ms / 1000:g} sn."
            ),
            (
                "Güçlü hedeflerde hasar çarpanı %125, "
                "zayıf olduğu hedeflerde %80 uygulanır."
            ),
        ]

    if definition_id == "battery":
        return [
            (
                f"Saniyede {definition.energy_generation:g} enerji sağlar ve {BATTERY_CAPACITY:g} enerji depolar; "
                f"saniyede {BATTERY_CHARGE_RATE_PER_SECOND:g} şarj / "
                f"{BATTERY_DISCHARGE_RATE_PER_SECOND:g} deşarj yapabilir."
            ),
            "Sürekli beslemesi ve ani yük rezervi enerji darboğazını azaltır.",
        ]

    if definition_id == "capacitor":
        return [
            (
                f"{CAPACITOR_CAPACITY:g} enerji depolar; "
                f"saniyede {CAPACITOR_CHARGE_RATE_PER_SECOND:g} şarj / "
                f"{CAPACITOR_DISCHARGE_RATE_PER_SECOND:g} deşarj yapabilir."
            ),
            "Enerji açığında Batarya'dan önce boşalır.",
        ]

    if definition_id == "shield":
        return [
            "Enerjiliyken kendisine gelen hasarı %35 azaltır; %65 hasar geçirir.",
            f"Saniyede {definition.energy_consumption:g} enerji tüketir.",
        ]

    if definition_id == "armor":
        return [
            "Pasif savunmadır; kendisine gelen hasarı %25 azaltır.",
            f"Saniyede {definition.energy_consumption:g} bakım enerjisi harcar.",
        ]

    if definition_id == "reflector":
        return [
            "Enerjiliyken kendisine gelen hasarı %25 azaltır.",
            "Aldığı son hasarın %20'sini saldırana geri yansıtır.",
        ]

    if definition_id == "barrier":
        return [
            "Enerjiliyken kendisine gelen hasarı %20 azaltır.",
            "Aktif normal hedefler varken saldırılarda öncelikli hedef olur.",
            "Enerjili Bariyer sabotaj sürelerini ayrıca %25 kısaltabilir.",
        ]

    if definition_id == "repair":
        return [
            (
                f"Temel onarım eyleminde {BASE_REPAIR_AMOUNT} HP geri kazandırır; "
                f"temel bekleme süresi {definition.cooldown_ms / 1000:g} sn."
            ),
            "Her aktivasyonda en düşük CAN oranındaki tek yaşayan modülü hedefler.",
            "Aynı destek adımında bir hedef yalnız bir kez onarılabilir.",
            "Belirli sabotaj etkilerini temizleyebilir.",
        ]

    if definition_id == "cooler":
        return [
            (
                "Önce aşırı ısınıp susmuş modülleri, sonra devredeki en sıcak "
                f"{COOLER_MAX_TARGETS} modülü seçer; her birinin ısısını saniyede "
                f"%{COOLER_HEAT_REDUCTION_PER_TICK * 10:g} azaltır."
            ),
            (
                f"Susmuş modülde soğutma {COOLER_OVERHEAT_MULTIPLIER:g} katına çıkar; modül ısısı "
                f"%{OVERHEAT_RECOVERY_THRESHOLD:g}'in altına inince yeniden çalışır. "
                "Soğutucu bunu birkaç saniyeye indirir."
            ),
            (
                f"EMP ve hat kesintisi yaşayan en fazla {COOLER_MAX_TARGETS} modülün "
                f"kalan süresini saniyede {COOLER_DEBUFF_REDUCTION_MS_PER_TICK * 10 / 1000:g} sn kısaltır."
            ),
        ]

    if definition_id == "amplifier":
        return [
            (
                "Yerleşimden bağımsız olarak devredeki her saldırı modülünün hasarını artırır: "
                f"toplam %{_percent(AMPLIFIER_TOTAL_BUDGET)} pay saldırı modülü sayısına bölünür, "
                f"tek saldırıya en fazla %{_percent(AMPLIFIER_PER_ATTACK_CAP)}."
            ),
            "Örnek: 1–2 saldırıda her biri %15, 3 saldırıda %10, 4 saldırıda %7,5, 6 saldırıda %5.",
        ]

    if definition_id == "targeting_computer":
        return [
            (
                "Yerleşimden bağımsız olarak devredeki her saldırı modülünün bekleme süresini kısaltır: "
                f"toplam %{_percent(TARGETING_TOTAL_BUDGET)} pay saldırı modülü sayısına bölünür, "
                f"tek saldırıya en fazla %{_percent(TARGETING_PER_ATTACK_CAP)}."
            ),
        ]

    if definition_id == "overclock_unit":
        return [
            (
                "Devredeki en ağır saldırı modülünü seçer; hasarını "
                f"%{_percent(OVERCLOCK_DAMAGE_MULTIPLIER)} seviyesine çıkarır "
                f"ve bekleme süresini %{_percent(OVERCLOCK_COOLDOWN_MULTIPLIER)} seviyesine indirir."
            ),
            (
                "Karşılığında hedef daha sık ateşlediği için hızlı ısınır ve saniyede "
                f"%{OVERCLOCK_HEAT_PER_TICK * 10:g} ek ısı alır. Hedef aşırı ısınırsa "
                "sıradaki ağır saldırı modülüne geçer."
            ),
        ]

    if definition_id == "emp":
        return [
            f"Hedef sistemi {EMP_DURATION_MS / 1000:g} sn devre dışı bırakır.",
            f"Temel sabotaj bekleme süresi {definition.cooldown_ms / 1000:g} sn.",
        ]

    if definition_id == "jammer":
        return [
            f"Hedef destek/kontrol modülünü {JAMMER_DURATION_MS / 1000:g} sn bozar.",
            f"Temel sabotaj bekleme süresi {definition.cooldown_ms / 1000:g} sn.",
        ]

    if definition_id == "virus":
        total_ticks = int(
            VIRUS_DURATION_MS
            / VIRUS_TICK_INTERVAL_MS
        )
        return [
            (
                f"{VIRUS_DURATION_MS / 1000:g} sn sürer; "
                f"her {VIRUS_TICK_INTERVAL_MS / 1000:g} sn'de {VIRUS_TICK_DAMAGE} hasarla başlar "
                f"ve her tikte {VIRUS_TICK_ESCALATION} artar."
            ),
            (
                f"Direnç uygulanmazsa teorik temel toplamı "
                f"{sum(VIRUS_TICK_DAMAGE + VIRUS_TICK_ESCALATION * index for index in range(total_ticks))} hasardır."
            ),
        ]

    if definition_id == "disruptor":
        return [
            (
                f"Hedef sistemi {DISRUPTOR_DURATION_MS / 1000:g} sn keser; "
                "diğer modüller enerji almaya devam eder."
            ),
            (
                "Ek olarak ikinci bir sisteme "
                f"%{_percent(SABOTAGE_ECHO_RATIOS['disruptor'])} süreli yankı kesintisi uygular."
            ),
        ]

    if definition.energy_consumption > 0:
        return [
            (
                f"Saniyede {definition.energy_consumption:g} enerji tüketir. "
                "Bu modül için ek sayısal etki motor katalog tanımında yayınlanmıyor."
            )
        ]

    return [
        "Bu modül için ek sayısal etki motor katalog tanımında yayınlanmıyor."
    ]


def _mechanic_effect_lines_en(definition_id: str) -> list[str]:
    definition = BASIC_MODULE_DEFINITIONS[definition_id]
    if definition_id in {"battery", "capacitor", "current_balancer"}:
        return [MODULE_COPY_EN[definition_id][1]]
    definition_id = definition.mechanic_id
    if definition.category == "saldırı":
        return [
            f"Base damage per shot is {definition.base_damage:g}; base attack interval is {definition.cooldown_ms / 1000:g} sec.",
            "Damage multiplier is 125% against strong targets and 80% against weak targets.",
        ]
    if definition_id == "battery":
        return [
            f"Supplies {definition.energy_generation:g} energy/sec and stores {BATTERY_CAPACITY:g}; charges at {BATTERY_CHARGE_RATE_PER_SECOND:g}/sec and discharges at {BATTERY_DISCHARGE_RATE_PER_SECOND:g}/sec.",
            "Its steady feed and burst reserve reduce temporary energy shortages.",
        ]
    if definition_id == "capacitor":
        return [
            f"Stores {CAPACITOR_CAPACITY:g} energy; charges at {CAPACITOR_CHARGE_RATE_PER_SECOND:g}/sec and discharges at {CAPACITOR_DISCHARGE_RATE_PER_SECOND:g}/sec.",
            "Discharges before the Battery when the circuit lacks energy.",
        ]
    if definition_id == "shield":
        return ["Reduces incoming damage by 35% while powered.", f"Consumes {definition.energy_consumption:g} energy per second."]
    if definition_id == "armor":
        return ["Reduces incoming damage by 25%.", f"Upkeep: {definition.energy_consumption:g} energy/sec."]
    if definition_id == "reflector":
        return ["Reduces incoming damage by 25% while powered.", "Reflects 20% of the last incoming damage to the attacker."]
    if definition_id == "barrier":
        return ["Reduces incoming damage by 20% while powered.", "Takes target priority and can shorten sabotage duration by 25%."]
    if definition_id == "repair":
        return [f"Restores {BASE_REPAIR_AMOUNT} HP to one lowest-health-ratio living module with a base cooldown of {definition.cooldown_ms / 1000:g} sec.", "A target can be repaired only once per support step.", "Can cleanse selected sabotage effects."]
    if definition_id == "cooler":
        return [f"Picks overheated modules first, then the {COOLER_MAX_TARGETS} hottest modules in the circuit, and cools each by {COOLER_HEAT_REDUCTION_PER_TICK * 10:g}% heat per second.", f"Cooling is {COOLER_OVERHEAT_MULTIPLIER:g}x on a silenced module; it works again once its heat drops below {OVERHEAT_RECOVERY_THRESHOLD:g}%, which the Cooler cuts to a few seconds.", f"Shortens EMP and line-cut effects on up to {COOLER_MAX_TARGETS} modules."]
    if definition_id == "amplifier":
        return [f"Boosts every attack module in the circuit regardless of placement: a {_percent(AMPLIFIER_TOTAL_BUDGET)}% damage budget is shared across attack modules, at most {_percent(AMPLIFIER_PER_ATTACK_CAP)}% each."]
    if definition_id == "targeting_computer":
        return [f"Shortens every attack module's cooldown regardless of placement: a {_percent(TARGETING_TOTAL_BUDGET)}% budget is shared across attack modules, at most {_percent(TARGETING_PER_ATTACK_CAP)}% each."]
    if definition_id == "overclock_unit":
        return [f"Picks the heaviest attack module; raises its damage to {_percent(OVERCLOCK_DAMAGE_MULTIPLIER)}% and reduces its cooldown to {_percent(OVERCLOCK_COOLDOWN_MULTIPLIER)}%.", f"The target heats faster and gains {OVERCLOCK_HEAT_PER_TICK * 10:g}% extra heat per second; an overheated target is swapped for the next heaviest attack."]
    sabotage = {
        "emp": [f"Disables the target system for {EMP_DURATION_MS / 1000:g} sec.", f"Base sabotage cooldown is {definition.cooldown_ms / 1000:g} sec."],
        "jammer": [f"Disrupts a target support or control module for {JAMMER_DURATION_MS / 1000:g} sec.", f"Base sabotage cooldown is {definition.cooldown_ms / 1000:g} sec."],
        "virus": [f"Lasts {VIRUS_DURATION_MS / 1000:g} sec; starts at {VIRUS_TICK_DAMAGE} damage every {VIRUS_TICK_INTERVAL_MS / 1000:g} sec and grows by {VIRUS_TICK_ESCALATION} each tick.", "Damage continues over time unless cleansed or resisted."],
        "disruptor": [f"Disables the target for {DISRUPTOR_DURATION_MS / 1000:g} sec; other cells keep receiving energy.", f"Also echoes a {_percent(SABOTAGE_ECHO_RATIOS['disruptor'])}%-duration cut onto a second system."],
    }
    return sabotage.get(definition_id, ["No additional numeric effect is published for this module."])


def build_module_catalog_view() -> dict:
    modules = []

    for definition_id,definition in (
        BASIC_MODULE_DEFINITIONS.items()
    ):
        if definition_id == "core":
            continue

        modules.append({
            "id":definition.id,
            "name_tr":definition.name_tr,
            "category":definition.category,
            "category_label":
                CATEGORY_LABELS.get(
                    definition.category,
                    definition.category,
                ),
            "category_label_en": CATEGORY_LABELS_EN.get(
                definition.category,
                definition.category,
            ),
            "max_hp":definition.max_hp,
            "current_cost": definition.current_cost,
            "strategic_role":
                definition.strategic_role,
            "strategic_role_en": MODULE_COPY_EN.get(definition.id, MODULE_COPY_EN.get(definition.mechanic_id, (definition.strategic_role, definition.description_tr)))[0],
            "description_tr":
                definition.description_tr,
            "description_en": MODULE_COPY_EN.get(definition.id, MODULE_COPY_EN.get(definition.mechanic_id, (definition.strategic_role, definition.description_tr)))[1],
            "energy_generation":
                definition.energy_generation,
            "energy_consumption":
                definition.energy_consumption,
            "action_energy_cost":
                definition.action_energy_cost,
            "base_damage":
                definition.base_damage,
            "cooldown_ms":
                definition.cooldown_ms,
            "strong_against":[
                _name(item)
                for item in definition.strong_against
            ],
            "weak_against":[
                _name(item)
                for item in definition.weak_against
            ],
            "synergy_with":[
                _name(item)
                for item in definition.synergy_with
            ],
            "effect_lines":
                _effect_lines(
                    definition.id
                ),
            "effect_lines_en": _effect_lines_en(definition.id),
            "rarity": definition.rarity,
            "signature_mechanic": definition.signature_mechanic,
            "telegraph_tr": definition.telegraph_tr,
            "counterplay_tr": definition.counterplay_tr,
        })

    modules.sort(
        key=lambda item:(
            CATEGORY_ORDER.index(
                item["category"]
            )
            if item["category"]
            in CATEGORY_ORDER
            else 99,
            item["name_tr"],
        )
    )

    return {
        "category_order":
            list(CATEGORY_ORDER),
        "category_labels":
            CATEGORY_LABELS,
        "category_labels_en": CATEGORY_LABELS_EN,
        "modules":
            modules,
    }
