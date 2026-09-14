from __future__ import annotations

from .catalog import BASIC_MODULE_DEFINITIONS
from .energy import (
    BATTERY_CAPACITY,
    BATTERY_CHARGE_RATE_PER_SECOND,
    BATTERY_DISCHARGE_RATE_PER_SECOND,
    CAPACITOR_CAPACITY,
    CAPACITOR_CHARGE_RATE_PER_SECOND,
    CAPACITOR_DISCHARGE_RATE_PER_SECOND,
    BASE_DISTRIBUTION_EFFICIENCY,
    SPLITTER_DISTRIBUTION_EFFICIENCY,
)
from .support import (
    BASE_REPAIR_AMOUNT,
    AMPLIFIER_DAMAGE_MULTIPLIER,
    TARGETING_COOLDOWN_MULTIPLIER,
    OVERCLOCK_DAMAGE_MULTIPLIER,
    OVERCLOCK_COOLDOWN_MULTIPLIER,
    OVERCLOCK_HEAT_PER_TICK,
    COOLER_HEAT_REDUCTION_PER_TICK,
    COOLER_DEBUFF_REDUCTION_MS_PER_TICK,
)
from .sabotage import (
    EMP_DURATION_MS,
    JAMMER_DURATION_MS,
    VIRUS_DURATION_MS,
    VIRUS_TICK_DAMAGE,
    VIRUS_TICK_INTERVAL_MS,
    ENERGY_LEECH_DURATION_MS,
    ENERGY_LEECH_GENERATION_MULTIPLIER,
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
    "generator": ("Primary energy source", "Continuously supplies energy and can move between the four Core gates."),
    "battery": ("Energy feed and reserve", "Supplies 3 energy per second and adds 30 reserve capacity."),
    "splitter": ("Energy distribution", "Improves the embedded grid's energy efficiency."),
    "capacitor": ("Expanded energy storage", "Adds 25 energy capacity and consumes 1 energy per second."),
    "current_balancer": ("Circuit efficiency", "Reduces module energy consumption by 8%; repeated copies have diminishing returns, capped at 35%."),
    "laser": ("Sustained single-target damage", "Deals steady damage to one target."),
    "pulse_cannon": ("High burst damage", "Fires slower, powerful pulses."),
    "railgun": ("High piercing damage", "Deals piercing damage against armored targets."),
    "missile_launcher": ("Delayed area pressure", "Trades preparation time for heavy area pressure."),
    "drone_bay": ("Distributed sustained pressure", "Wears down defenses with multiple small attacks."),
    "arc_cannon": ("Chained multi-target damage", "Produces energy attacks that can jump between nearby targets."),
    "shield": ("Active damage absorption", "Consumes energy to absorb part of incoming damage."),
    "armor": ("Durability", "Reduces incoming damage while contributing to the circuit's energy demand."),
    "reflector": ("Energy-attack reflection", "Redirects part of incoming energy-based damage."),
    "barrier": ("Connection-line protection", "Protects critical connection points."),
    "repair": ("Health repair", "Repairs damaged modules."),
    "cooler": ("Heat control", "Reduces heat on nearby modules."),
    "amplifier": ("Attack-line amplification", "Increases the output of a nearby attack module."),
    "targeting_computer": ("Targeting support", "Improves target selection and attack efficiency."),
    "overclock_unit": ("Performance at a heat cost", "Accelerates a connected module while increasing heat and energy load."),
    "emp": ("Temporary system disruption", "Temporarily disrupts energy and support lines."),
    "jammer": ("Support-line disruption", "Weakens targeting and support modules."),
    "virus": ("Escalating system debuff", "Applies a weakening effect that grows across support and control lines."),
    "energy_leech": ("Energy-economy pressure", "Weakens the opponent's energy generation and storage line."),
    "disruptor": ("Temporary connection cut", "Temporarily disables a selected connection line."),
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


def _effect_lines(definition_id: str) -> list[str]:
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

    if definition_id == "generator":
        return [
            (
                f"Saniyede {definition.energy_generation:g} enerji üretir. "
                "Bir Çekirdek kapısında başlar ve savaş sırasında dört kapı arasında taşınabilir."
            ),
            (
                "Enerji Sömürücü etkisinde üretim temel olarak "
                f"%{_percent(ENERGY_LEECH_GENERATION_MULTIPLIER)} seviyesine düşer."
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

    if definition_id == "splitter":
        return [
            (
                "Gömülü devre ağını güçlendirir ve devrede en az bir Dağıtıcı varsa "
                f"dağıtım verimliliğini %{_percent(SPLITTER_DISTRIBUTION_EFFICIENCY)} yapar "
                f"(normal %{_percent(BASE_DISTRIBUTION_EFFICIENCY)})."
            ),
        ]

    if definition_id == "shield":
        return [
            "Enerjiliyken kendisine gelen hasarı %35 azaltır; %65 hasar geçirir.",
            f"Saniyede {definition.energy_consumption:g} enerji tüketir.",
        ]

    if definition_id == "armor":
        return [
            "Pasif savunmadır; kendisine gelen hasarı %25 azaltır.",
            "Enerji tüketmeden çalışır.",
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
                f"Her 0,1 sn motor adımında hedef ısıyı "
                f"{COOLER_HEAT_REDUCTION_PER_TICK:g} azaltır."
            ),
            (
                "Azaltılabilir debuff sürelerinden motor adımı başına "
                f"{COOLER_DEBUFF_REDUCTION_MS_PER_TICK} ms düşürür."
            ),
        ]

    if definition_id == "amplifier":
        return [
            (
                "Yakındaki saldırı modüllerinin hasarını "
                f"%{_percent(AMPLIFIER_DAMAGE_MULTIPLIER)} seviyesine çıkarır "
                f"(+%{_percent(AMPLIFIER_DAMAGE_MULTIPLIER)-100})."
            ),
        ]

    if definition_id == "targeting_computer":
        return [
            (
                "Desteklediği saldırı modülünün bekleme süresini "
                f"%{_percent(TARGETING_COOLDOWN_MULTIPLIER)} seviyesine indirir "
                f"(yaklaşık %{100-_percent(TARGETING_COOLDOWN_MULTIPLIER)} daha hızlı)."
            ),
        ]

    if definition_id == "overclock_unit":
        return [
            (
                f"Hasarı %{_percent(OVERCLOCK_DAMAGE_MULTIPLIER)} seviyesine çıkarır "
                f"ve bekleme süresini %{_percent(OVERCLOCK_COOLDOWN_MULTIPLIER)} seviyesine indirir."
            ),
            (
                "Karşılığında motor adımı başına "
                f"{OVERCLOCK_HEAT_PER_TICK:g} ısı ekler."
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
                f"her {VIRUS_TICK_INTERVAL_MS / 1000:g} sn'de {VIRUS_TICK_DAMAGE} hasar verir."
            ),
            (
                f"Direnç uygulanmazsa teorik temel toplamı "
                f"{total_ticks * VIRUS_TICK_DAMAGE} hasardır."
            ),
        ]

    if definition_id == "energy_leech":
        return [
            (
                f"{ENERGY_LEECH_DURATION_MS / 1000:g} sn boyunca hedef enerji üretimini "
                f"temel olarak %{_percent(ENERGY_LEECH_GENERATION_MULTIPLIER)} seviyesine düşürür "
                f"(-%{100-_percent(ENERGY_LEECH_GENERATION_MULTIPLIER)})."
            ),
        ]

    if definition_id == "disruptor":
        return [
            (
                f"Hedef bağlantı hattını {DISRUPTOR_DURATION_MS / 1000:g} sn keser; "
                "bu hat üzerinden beslenen modüller enerjisiz kalabilir."
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


def _effect_lines_en(definition_id: str) -> list[str]:
    definition = BASIC_MODULE_DEFINITIONS[definition_id]
    if definition_id in {"battery", "capacitor", "current_balancer"}:
        return [MODULE_COPY_EN[definition_id][1]]
    definition_id = definition.mechanic_id
    if definition.category == "saldırı":
        return [
            f"Base damage per shot is {definition.base_damage:g}; base attack interval is {definition.cooldown_ms / 1000:g} sec.",
            "Damage multiplier is 125% against strong targets and 80% against weak targets.",
        ]
    if definition_id == "generator":
        return [
            f"Generates {definition.energy_generation:g} energy per second and can move between all four Core gates.",
            f"Energy Leech reduces base generation to {_percent(ENERGY_LEECH_GENERATION_MULTIPLIER)}%.",
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
    if definition_id == "splitter":
        return [
            f"Raises the embedded grid's distribution efficiency to {_percent(SPLITTER_DISTRIBUTION_EFFICIENCY)}% instead of {_percent(BASE_DISTRIBUTION_EFFICIENCY)}%.",
        ]
    if definition_id == "shield":
        return ["Reduces incoming damage by 35% while powered.", f"Consumes {definition.energy_consumption:g} energy per second."]
    if definition_id == "armor":
        return ["Reduces incoming damage by 25%.", f"Energy demand: {definition.energy_consumption:g}/sec."]
    if definition_id == "reflector":
        return ["Reduces incoming damage by 25% while powered.", "Reflects 20% of the last incoming damage to the attacker."]
    if definition_id == "barrier":
        return ["Reduces incoming damage by 20% while powered.", "Takes target priority and can shorten sabotage duration by 25%."]
    if definition_id == "repair":
        return [f"Restores {BASE_REPAIR_AMOUNT} HP to one lowest-health-ratio living module with a base cooldown of {definition.cooldown_ms / 1000:g} sec.", "A target can be repaired only once per support step.", "Can cleanse selected sabotage effects."]
    if definition_id == "cooler":
        return [f"Reduces target heat by {COOLER_HEAT_REDUCTION_PER_TICK:g} every 0.1 sec.", f"Removes {COOLER_DEBUFF_REDUCTION_MS_PER_TICK} ms from reducible debuffs per engine step."]
    if definition_id == "amplifier":
        return [f"Raises nearby attack-module damage to {_percent(AMPLIFIER_DAMAGE_MULTIPLIER)}% (+{_percent(AMPLIFIER_DAMAGE_MULTIPLIER)-100}%)."]
    if definition_id == "targeting_computer":
        return [f"Reduces the supported attack module's cooldown to {_percent(TARGETING_COOLDOWN_MULTIPLIER)}%."]
    if definition_id == "overclock_unit":
        return [f"Raises damage to {_percent(OVERCLOCK_DAMAGE_MULTIPLIER)}% and reduces cooldown to {_percent(OVERCLOCK_COOLDOWN_MULTIPLIER)}%.", f"Adds {OVERCLOCK_HEAT_PER_TICK:g} heat per engine step."]
    sabotage = {
        "emp": [f"Disables the target system for {EMP_DURATION_MS / 1000:g} sec.", f"Base sabotage cooldown is {definition.cooldown_ms / 1000:g} sec."],
        "jammer": [f"Disrupts a target support or control module for {JAMMER_DURATION_MS / 1000:g} sec.", f"Base sabotage cooldown is {definition.cooldown_ms / 1000:g} sec."],
        "virus": [f"Lasts {VIRUS_DURATION_MS / 1000:g} sec and deals {VIRUS_TICK_DAMAGE} damage every {VIRUS_TICK_INTERVAL_MS / 1000:g} sec.", "Damage continues over time unless cleansed or resisted."],
        "energy_leech": [f"Reduces target energy generation to {_percent(ENERGY_LEECH_GENERATION_MULTIPLIER)}% for {ENERGY_LEECH_DURATION_MS / 1000:g} sec."],
        "disruptor": [f"Disables the target for {DISRUPTOR_DURATION_MS / 1000:g} sec; other cells keep receiving energy."],
    }
    return sabotage.get(definition_id, ["No additional numeric effect is published for this module."])


def build_module_catalog_view() -> dict:
    modules = []

    for definition_id,definition in (
        BASIC_MODULE_DEFINITIONS.items()
    ):
        if definition_id in {"core", "generator", "splitter", "energy_leech"}:
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
            "circuit_credit_cost":
                definition.current_cost,
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
            "movable":definition.movable,
            "removable":definition.removable,
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
