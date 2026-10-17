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
from .module_cycles import (
    ARMOR_REGEN_BASE,
    BLOCK_BASE_RATIO,
    MIRROR_REFLECT_BASE,
    PASSIVE_REDUCTION_BASE,
    SABOTAGE_GUARD_BASE,
)
from .support import (
    BASE_REPAIR_AMOUNT,
    OVERCLOCK_DAMAGE_MULTIPLIER,
    OVERCLOCK_COOLDOWN_MULTIPLIER,
    OVERCLOCK_HEAT_PER_PULSE,
    COOLER_HEAT_REDUCTION_PER_PULSE,
    COOLER_DEBUFF_REDUCTION_MS_PER_PULSE,
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
    "battery": ("Energy feed and reserve", "At the starting level it supplies 4.5 energy per second and stores 20 energy for sudden loads. An empty store refills in 4 sec; leveling up raises output and storage and shortens the refill."),
    "capacitor": ("Burst energy reserve", "Generates no energy; at the starting level a 10-energy reserve that refills in 1 sec and discharges before the Battery. Leveling up grows the reserve and shortens the refill."),
    "current_balancer": ("Circuit efficiency", "Reduces action and upkeep energy costs by 8%; repeated copies are capped at 24%."),
    "laser": ("Sustained single-target damage", "Deals steady damage to one target."),
    "pulse_cannon": ("High burst damage", "Fires slower, powerful pulses."),
    "railgun": ("High piercing damage", "Deals piercing damage against armored targets."),
    "missile_launcher": ("Delayed area pressure", "Trades preparation time for heavy area pressure."),
    "drone_bay": ("Distributed sustained pressure", "Wears down defenses with multiple small attacks."),
    "arc_cannon": ("Chained multi-target damage", "Produces chained energy attacks that jump onto the next target."),
    "shield": ("Periodic attack block", "At the starting level, every 1.2 sec it meets one incoming attack and blocks 60% of its damage. Leveling up shortens the block interval and raises the blocked share."),
    "armor": ("Constant durability", "At the starting level it always reduces incoming damage by 25%; every 3 sec it repairs its damping mechanism and regains 5 HP. Leveling up raises the reduction and the repair and shortens the interval."),
    "reflector": ("Draw and reflect", "At the starting level, every 1 sec it draws one attack aimed at the circuit onto itself and reflects 30% of its damage back to the attacker; it also reduces incoming damage by 25%. Leveling up raises the reflection and shortens the interval."),
    "barrier": ("Defense-line protection", "Draws attacks onto itself. At the starting level it reduces damage by 20% and every 4 sec shortens one sabotage applied to the circuit by 35%. Leveling up raises the sabotage resistance and shortens the interval."),
    "repair": ("Health repair", "Repairs damaged modules."),
    "cooler": ("Heat control", "At the starting level, every 1 sec it cools the three hottest modules in the circuit by 4.5%, overheated ones first, and quickly brings a silenced module back. Leveling up raises the cooling and shortens the interval."),
    "amplifier": ("Attack-line amplification", "At the starting level, every 2 sec it charges the attack modules in the circuit; a charged module's next shot deals more damage. A 36% budget is shared among attacks, at most 18% each. Leveling up shortens the charge interval."),
    "targeting_computer": ("Targeting support", "At the starting level, every 2 sec it locks the attack modules in the circuit; the cooldown after a locked module's next shot is shorter. A 36% budget is shared among attacks, at most 18% each. Leveling up shortens the lock interval."),
    "overclock_unit": ("Performance at a heat cost", "At the starting level, every 2.5 sec it overcharges the heaviest attack module: its next shot deals 20% more damage and its cooldown is 20% shorter; that module heats up with every charge. Leveling up shortens the charge interval."),
    "emp": ("Temporary system disruption", "Temporarily disrupts energy and support lines."),
    "jammer": ("Support-line disruption", "Weakens targeting and support modules."),
    "virus": ("Escalating system debuff", "Applies a weakening effect that grows across support and control lines."),
    "disruptor": ("Temporary system cut", "Temporarily cuts a target system and echoes a shorter cut onto a second system."),
    "guardian_dome": ("Circuit protection", "At the starting level it reduces its own incoming damage by 32% and every 1.5 sec reduces one attack on another module in the circuit by 30%. Leveling up raises the protection and shortens the interval."),
    "prism_shield": ("Prismatic conversion", "At the starting level, every 1.3 sec it meets one incoming attack and blocks 55% of its damage; a quarter of the blocked damage becomes Core reserve energy. Leveling up raises the block and the conversion and shortens the interval."),
    "phase_armor": ("Periodic phase", "At the starting level it voids every attack during the first second of each 6-second cycle; otherwise it reduces damage by 18%. Leveling up shortens the cycle, so the phase comes more often."),
    "nano_medic": ("Distributed repair", "Repairs the two most damaged modules at once, each for 62% of a base repair."),
    "phoenix_repair": ("Return to service", "Every 30 seconds, within class limits, brings a destroyed module back at 30% HP (10 energy); each module can return only once per match. Without a candidate it performs a strong single repair."),
    "quantum_repeater": ("Quantum repeat", "On the fourth consecutive hit on the same target, echoes 65% of the last damage."),
    "plasma_mortar": ("Delayed plasma field", "Locks onto a target for 1.2 sec before firing; 35% area damage splashes onto the next target."),
    "ion_spear": ("Ionic pierce", "Ignores 60% of defensive reduction; 55% damage carries onto the target behind."),
    "swarm_fabricator": ("Swarm build-up", "Stores a drone on every shot; the fourth shot releases a swarm onto three targets."),
    "quantum_cannon": ("Quantum charge", "Collects the circuit's wasted energy as charge; a full charge adds up to 80% damage to the next shot."),
    "chrono_relay": ("Time debt", "Speeds up every attack for 4 sec, then a time debt (2.5 sec at the starting level) slows them down. Leveling up shortens the time debt."),
    "precision_matrix": ("Focus stacks", "At the starting level, every 1.5 sec it gives one focus stack to attack modules that kept their target; each stack adds damage and speed (up to 4 stacks). Changing target resets the focus. Leveling up builds focus faster."),
    "omega_amplifier": ("Adaptive resonance", "At the starting level, every 2 sec it charges the attack modules in the circuit with resonance; each distinct class in the circuit grows the shared damage support of a charged shot. Leveling up shortens the charge interval."),
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


def _seconds_tr(milliseconds: float) -> str:
    return f"{float(milliseconds) / 1000:g}".replace(".", ",")


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
            (
                f"Başlangıç seviyesinde her {_seconds_tr(definition.cooldown_ms)} saniyede bir blok hazırlar; enerjiliyken kendisine gelen "
                f"sıradaki saldırıyı karşılar ve hasarının %{_percent(BLOCK_BASE_RATIO['shield'])} kadarını engeller."
            ),
            "Blok tek saldırıda harcanır; sıradaki blok hazır olana kadar gelen saldırılar tam hasar verir.",
            "Seviye yükseldikçe blok aralığı kısalır, engellenen pay ve CAN artar.",
            f"Saniyede {definition.energy_consumption:g} enerji tüketir.",
        ]

    if definition_id == "armor":
        return [
            f"Başlangıç seviyesinde kendisine gelen hasarı sürekli %{_percent(PASSIVE_REDUCTION_BASE['armor'])} azaltır.",
            (
                f"Başlangıç seviyesinde her {_seconds_tr(definition.cooldown_ms)} saniyede bir sönümleme mekanizmasını onarır: "
                f"kendine {ARMOR_REGEN_BASE} CAN geri kazandırır. Hasarsızken onarım hazır bekler."
            ),
            "Seviye yükseldikçe azaltma, onarım ve CAN artar; onarım aralığı kısalır.",
            f"Saniyede {definition.energy_consumption:g} bakım enerjisi harcar.",
        ]

    if definition_id == "reflector":
        return [
            f"Enerjiliyken kendisine gelen hasarı sürekli azaltır (başlangıç seviyesinde %{_percent(PASSIVE_REDUCTION_BASE['reflector'])}).",
            (
                f"Başlangıç seviyesinde her {_seconds_tr(definition.cooldown_ms)} saniyede bir ayna hazırlar: devredeki başka bir modüle "
                "ateşlenen sıradaki saldırıyı üzerine çeker ve o saldırının hasarının "
                f"%{_percent(MIRROR_REFLECT_BASE)} kadarını saldıran modüle yansıtır."
            ),
            "Ayna tek saldırıda harcanır; sıradaki ayna hazır olana kadar saldırı çekmez ve yansıtmaz.",
            "Seviye yükseldikçe yansıtma ve CAN artar, ayna aralığı kısalır.",
        ]

    if definition_id == "barrier":
        return [
            f"Enerjiliyken kendisine gelen hasarı sürekli azaltır (başlangıç seviyesinde %{_percent(PASSIVE_REDUCTION_BASE['barrier'])}).",
            "Aktif normal hedefler varken saldırılarda öncelikli hedef olur.",
            (
                f"Başlangıç seviyesinde her {_seconds_tr(definition.cooldown_ms)} saniyede bir sabotaj direnci hazırlar: devreye uygulanan "
                f"sıradaki sabotajın süresini %{_percent(SABOTAGE_GUARD_BASE)} kısaltır."
            ),
            "Seviye yükseldikçe sabotaj direnci ve CAN artar, direnç aralığı kısalır.",
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
                f"Başlangıç seviyesinde her {_seconds_tr(definition.cooldown_ms)} saniyede bir soğutma darbesi verir: önce aşırı ısınıp "
                f"susmuş modülleri, sonra devredeki en sıcak {COOLER_MAX_TARGETS} modülü seçer ve her birinin "
                f"ısısını %{COOLER_HEAT_REDUCTION_PER_PULSE:g} azaltır."
            ),
            (
                f"Susmuş modülde soğutma {COOLER_OVERHEAT_MULTIPLIER:g} katına çıkar; modül ısısı "
                f"%{OVERHEAT_RECOVERY_THRESHOLD:g}'in altına inince yeniden çalışır. "
                "Soğutucu bunu birkaç saniyeye indirir."
            ),
            (
                f"Aynı darbe EMP ve hat kesintisi yaşayan en fazla {COOLER_MAX_TARGETS} modülün "
                f"kalan süresini {COOLER_DEBUFF_REDUCTION_MS_PER_PULSE / 1000:g} sn kısaltır."
            ),
            "Seviye yükseldikçe soğutma artar, darbe aralığı kısalır.",
        ]

    if definition_id == "amplifier":
        return [
            (
                f"Başlangıç seviyesinde her {_seconds_tr(definition.cooldown_ms)} saniyede bir, yerleşimden bağımsız olarak devredeki "
                "bütün saldırı modüllerini yükler; yüklü modülün sıradaki atışı daha çok hasar verir: "
                f"toplam %{_percent(AMPLIFIER_TOTAL_BUDGET)} pay saldırı modülü sayısına bölünür, "
                f"tek saldırıya en fazla %{_percent(AMPLIFIER_PER_ATTACK_CAP)}."
            ),
            "Yük atışla harcanır ve sıradaki yüklemeyi bekler; yükleme aralığından sık ateş eden silah her atışında yük bulamaz.",
            "Seviye yükseldikçe yükleme aralığı kısalır.",
            "Örnek: 1–2 saldırıda her biri %18, 3 saldırıda %12, 4 saldırıda %9, 6 saldırıda %6.",
        ]

    if definition_id == "targeting_computer":
        return [
            (
                f"Başlangıç seviyesinde her {_seconds_tr(definition.cooldown_ms)} saniyede bir, yerleşimden bağımsız olarak devredeki "
                "bütün saldırı modüllerine kilit verir; kilitli modülün sıradaki atışından sonraki beklemesi kısalır: "
                f"toplam %{_percent(TARGETING_TOTAL_BUDGET)} pay saldırı modülü sayısına bölünür, "
                f"tek saldırıya en fazla %{_percent(TARGETING_PER_ATTACK_CAP)}."
            ),
            "Kilit atışla harcanır ve sıradaki kilidi bekler; kilit aralığından sık ateş eden silah her atışında kilit bulamaz.",
            "Seviye yükseldikçe kilit aralığı kısalır.",
        ]

    if definition_id == "overclock_unit":
        return [
            (
                f"Başlangıç seviyesinde her {_seconds_tr(definition.cooldown_ms)} saniyede bir devredeki en ağır saldırı modülüne aşırı yük "
                f"verir: sıradaki atışının hasarı %{_percent(OVERCLOCK_DAMAGE_MULTIPLIER)} seviyesine çıkar "
                f"ve o atıştan sonraki beklemesi %{_percent(OVERCLOCK_COOLDOWN_MULTIPLIER)} seviyesine iner."
            ),
            (
                f"Karşılığında hedef her yüklemede %{OVERCLOCK_HEAT_PER_PULSE:g} ek ısı alır ve daha sık "
                "ateşlediği için hızlı ısınır. Hedef aşırı ısınırsa sıradaki ağır saldırı modülüne geçer."
            ),
            "Seviye yükseldikçe yükleme aralığı kısalır.",
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
        return [
            f"At the starting level, every {definition.cooldown_ms / 1000:g} sec it readies a block; while powered it meets the next attack on itself and blocks {_percent(BLOCK_BASE_RATIO['shield'])}% of its damage.",
            "The block is spent by one attack; attacks that arrive before the next block is ready deal full damage.",
            "Leveling up shortens the block interval and raises the blocked share and HP.",
            f"Consumes {definition.energy_consumption:g} energy per second.",
        ]
    if definition_id == "armor":
        return [
            f"At the starting level it always reduces incoming damage by {_percent(PASSIVE_REDUCTION_BASE['armor'])}%.",
            f"At the starting level, every {definition.cooldown_ms / 1000:g} sec it repairs its damping mechanism and regains {ARMOR_REGEN_BASE} HP; the repair waits ready while it is undamaged.",
            "Leveling up raises the reduction, the repair and HP, and shortens the repair interval.",
            f"Upkeep: {definition.energy_consumption:g} energy/sec.",
        ]
    if definition_id == "reflector":
        return [
            f"Always reduces incoming damage while powered ({_percent(PASSIVE_REDUCTION_BASE['reflector'])}% at the starting level).",
            f"At the starting level, every {definition.cooldown_ms / 1000:g} sec it readies a mirror: it draws the next attack fired at another module in the circuit onto itself and reflects {_percent(MIRROR_REFLECT_BASE)}% of that attack's damage to the attacking module.",
            "The mirror is spent by one attack; until the next one is ready it neither draws nor reflects.",
            "Leveling up raises the reflection and HP and shortens the mirror interval.",
        ]
    if definition_id == "barrier":
        return [
            f"Always reduces incoming damage while powered ({_percent(PASSIVE_REDUCTION_BASE['barrier'])}% at the starting level) and takes target priority.",
            f"At the starting level, every {definition.cooldown_ms / 1000:g} sec it readies sabotage resistance: the next sabotage applied to the circuit is {_percent(SABOTAGE_GUARD_BASE)}% shorter.",
            "Leveling up raises the sabotage resistance and HP and shortens the interval.",
        ]
    if definition_id == "repair":
        return [f"Restores {BASE_REPAIR_AMOUNT} HP to one lowest-health-ratio living module with a base cooldown of {definition.cooldown_ms / 1000:g} sec.", "A target can be repaired only once per support step.", "Can cleanse selected sabotage effects."]
    if definition_id == "cooler":
        return [f"At the starting level, every {definition.cooldown_ms / 1000:g} sec it sends a cooling pulse: it picks overheated modules first, then the {COOLER_MAX_TARGETS} hottest modules in the circuit, and cools each by {COOLER_HEAT_REDUCTION_PER_PULSE:g}% heat.", f"Cooling is {COOLER_OVERHEAT_MULTIPLIER:g}x on a silenced module; it works again once its heat drops below {OVERHEAT_RECOVERY_THRESHOLD:g}%, which the Cooler cuts to a few seconds.", f"The same pulse shortens EMP and line-cut effects on up to {COOLER_MAX_TARGETS} modules by {COOLER_DEBUFF_REDUCTION_MS_PER_PULSE / 1000:g} sec.", "Leveling up raises the cooling and shortens the pulse interval."]
    if definition_id == "amplifier":
        return [f"At the starting level, every {definition.cooldown_ms / 1000:g} sec it charges every attack module in the circuit regardless of placement; a charged module's next shot deals more damage: a {_percent(AMPLIFIER_TOTAL_BUDGET)}% damage budget is shared across attack modules, at most {_percent(AMPLIFIER_PER_ATTACK_CAP)}% each.", "The charge is spent by the shot and waits for the next pulse; weapons that fire faster than the pulse do not find a charge on every shot.", "The pulse interval shortens as the module levels up."]
    if definition_id == "targeting_computer":
        return [f"At the starting level, every {definition.cooldown_ms / 1000:g} sec it locks every attack module in the circuit regardless of placement; the cooldown after a locked module's next shot is shorter: a {_percent(TARGETING_TOTAL_BUDGET)}% budget is shared across attack modules, at most {_percent(TARGETING_PER_ATTACK_CAP)}% each.", "The lock is spent by the shot and waits for the next pulse; weapons that fire faster than the pulse do not find a lock on every shot.", "The lock interval shortens as the module levels up."]
    if definition_id == "overclock_unit":
        return [f"At the starting level, every {definition.cooldown_ms / 1000:g} sec it overcharges the heaviest attack module: its next shot's damage rises to {_percent(OVERCLOCK_DAMAGE_MULTIPLIER)}% and the cooldown after it drops to {_percent(OVERCLOCK_COOLDOWN_MULTIPLIER)}%.", f"The target gains {OVERCLOCK_HEAT_PER_PULSE:g}% extra heat with every charge and heats faster; an overheated target is swapped for the next heaviest attack.", "The charge interval shortens as the module levels up."]
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
