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
    "enerji":"Enerji",
    "saldırı":"Saldırı",
    "savunma":"Savunma",
    "destek":"Destek",
    "sabotaj":"Sabotaj",
    "çekirdek":"Çekirdek",
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
                f"{BATTERY_CAPACITY:g} enerji depolar; "
                f"saniyede {BATTERY_CHARGE_RATE_PER_SECOND:g} şarj / "
                f"{BATTERY_DISCHARGE_RATE_PER_SECOND:g} deşarj yapabilir."
            ),
            "Ani enerji açığında tüketici modülleri beslemeye yardım eder.",
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
                "Enerji hattını dallandırır ve devrede en az bir Dağıtıcı varsa "
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
                "Bağlı saldırı hattının hasarını "
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
            "max_hp":definition.max_hp,
            "circuit_credit_cost":
                definition.circuit_credit_cost,
            "strategic_role":
                definition.strategic_role,
            "description_tr":
                definition.description_tr,
            "energy_generation":
                definition.energy_generation,
            "energy_consumption":
                definition.energy_consumption,
            "base_damage":
                definition.base_damage,
            "cooldown_ms":
                definition.cooldown_ms,
            "port_count":
                definition.port_count,
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
                    definition_id
                ),
            "movable":definition.movable,
            "removable":definition.removable,
            "rotatable":definition.rotatable,
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
        "modules":
            modules,
    }
