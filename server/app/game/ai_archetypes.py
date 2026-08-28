from __future__ import annotations

from dataclasses import dataclass
import hashlib

from .catalog import PLAYER_SELECTABLE_MODULE_IDS


@dataclass(slots=True, frozen=True)
class AIArchetype:
    id: str
    name_tr: str
    name_en: str
    description_tr: str
    description_en: str
    battle_pool_ids: tuple[str, ...]
    initial_module_ids: tuple[str, str]
    expansion_module_ids: tuple[str, ...] = ()
    category_bias: tuple[tuple[str, int], ...] = ()
    attack_foundation_target: int = 2
    energy_floor: int = 0
    defense_floor: int = 0
    sabotage_floor: int = 0
    booster_priority: tuple[str, ...] = (
        "emergency_repair",
        "overcharge_chip",
        "dual_port_adapter",
    )

    def bias_for(self, category: str) -> int:
        return dict(self.category_bias).get(category, 0)


BALANCED_AI = AIArchetype(
    id="balanced",
    name_tr="Dengeli",
    name_en="Balanced",
    description_tr="Rakibin devresine göre karşı modül seçer; saldırı ve savunmayı dengeler.",
    description_en="Counters the opponent while balancing offense and defense.",
    battle_pool_ids=(
        "generator", "battery", "splitter", "capacitor",
        "laser", "pulse_cannon", "railgun", "missile_launcher",
        "shield", "armor", "reflector", "barrier",
        "repair", "cooler", "amplifier", "targeting_computer",
        "emp", "jammer",
    ),
    initial_module_ids=("shield", "laser"),
    expansion_module_ids=("pulse_cannon", "repair", "armor", "targeting_computer"),
)

AGGRESSIVE_AI = AIArchetype(
    id="aggressive",
    name_tr="Saldırgan",
    name_en="Aggressive",
    description_tr="Erken hasar temposu kurar; saldırı modüllerini ve Aşırı Yük'ü öne alır.",
    description_en="Builds early damage pressure and prioritizes attack modules and Overcharge.",
    battle_pool_ids=(
        "generator", "battery", "splitter", "capacitor",
        "laser", "pulse_cannon", "railgun", "missile_launcher", "drone_bay", "arc_cannon",
        "shield", "armor",
        "repair", "cooler", "amplifier", "targeting_computer", "overclock_unit",
        "emp",
    ),
    initial_module_ids=("shield", "laser"),
    expansion_module_ids=("drone_bay", "amplifier", "overclock_unit", "pulse_cannon"),
    category_bias=(("saldırı", 7), ("destek", 2), ("savunma", -1), ("enerji", -1)),
    attack_foundation_target=3,
    booster_priority=("overcharge_chip", "emergency_repair", "dual_port_adapter"),
)

DEFENSIVE_AI = AIArchetype(
    id="defensive",
    name_tr="Savunmacı",
    name_en="Defensive",
    description_tr="Çekirdeği ayakta tutar; savunma ve onarım katmanını saldırı baskısına göre büyütür.",
    description_en="Protects the core by layering defense and repair against incoming pressure.",
    battle_pool_ids=(
        "generator", "battery", "splitter", "capacitor",
        "laser", "pulse_cannon", "drone_bay",
        "shield", "armor", "reflector", "barrier",
        "repair", "cooler", "amplifier", "targeting_computer", "overclock_unit",
        "emp", "jammer",
    ),
    initial_module_ids=("shield", "laser"),
    expansion_module_ids=("barrier", "repair", "armor", "cooler"),
    category_bias=(("savunma", 7), ("destek", 4), ("enerji", 1), ("saldırı", -1)),
    attack_foundation_target=1,
    defense_floor=2,
    booster_priority=("emergency_repair", "dual_port_adapter", "overcharge_chip"),
)

SABOTAGE_AI = AIArchetype(
    id="sabotage",
    name_tr="Sabotaj Odaklı",
    name_en="Sabotage",
    description_tr="Enerji ve destek hattını bozar; EMP, Kesici ve bozucu etkilerle tempo kırar.",
    description_en="Disrupts energy and support lines with EMP, Disruptor and control effects.",
    battle_pool_ids=(
        "generator", "battery", "splitter", "capacitor",
        "laser", "pulse_cannon", "drone_bay", "arc_cannon",
        "shield", "armor",
        "repair", "cooler", "targeting_computer",
        "emp", "jammer", "virus", "energy_leech", "disruptor",
    ),
    initial_module_ids=("shield", "laser"),
    expansion_module_ids=("jammer", "emp", "disruptor", "virus"),
    category_bias=(("sabotaj", 8), ("saldırı", 2), ("destek", 1), ("savunma", -1)),
    attack_foundation_target=2,
    sabotage_floor=2,
    booster_priority=("dual_port_adapter", "emergency_repair", "overcharge_chip"),
)

ECONOMY_AI = AIArchetype(
    id="economy",
    name_tr="Ekonomi Odaklı",
    name_en="Economy",
    description_tr="Önce enerji rezervi ve dağıtımı kurar; sonra yüksek maliyetli saldırılara geçer.",
    description_en="Builds energy reserve and distribution first, then transitions into expensive attacks.",
    battle_pool_ids=(
        "generator", "battery", "splitter", "capacitor",
        "laser", "pulse_cannon", "railgun", "drone_bay",
        "shield", "armor", "barrier",
        "repair", "cooler", "amplifier", "targeting_computer", "overclock_unit",
        "energy_leech", "emp",
    ),
    initial_module_ids=("shield", "laser"),
    expansion_module_ids=("battery", "splitter", "capacitor", "targeting_computer"),
    category_bias=(("enerji", 8), ("saldırı", 2), ("destek", 2), ("savunma", 1)),
    attack_foundation_target=2,
    energy_floor=2,
    booster_priority=("dual_port_adapter", "emergency_repair", "overcharge_chip"),
)


AI_ARCHETYPES: dict[str, AIArchetype] = {
    item.id: item
    for item in (
        AGGRESSIVE_AI,
        DEFENSIVE_AI,
        BALANCED_AI,
        SABOTAGE_AI,
        ECONOMY_AI,
    )
}

AI_ARCHETYPE_IDS: tuple[str, ...] = tuple(AI_ARCHETYPES)


def normalize_ai_archetype_id(value: str | None) -> str:
    candidate = str(value or "").strip().lower()
    return candidate if candidate in AI_ARCHETYPES else "balanced"


def get_ai_archetype(value: str | None) -> AIArchetype:
    return AI_ARCHETYPES[normalize_ai_archetype_id(value)]


def select_ai_archetype_for_key(key: str) -> AIArchetype:
    """Deterministic variety for matchmaking AI fallback sessions."""
    digest = hashlib.sha256(str(key).encode("utf-8")).digest()
    return AI_ARCHETYPES[AI_ARCHETYPE_IDS[digest[0] % len(AI_ARCHETYPE_IDS)]]


def validate_ai_archetype_catalog() -> None:
    selectable = set(PLAYER_SELECTABLE_MODULE_IDS)
    for archetype in AI_ARCHETYPES.values():
        if len(archetype.battle_pool_ids) != 18:
            raise ValueError(f"{archetype.id} AI havuzu 18 modül içermelidir.")
        if len(set(archetype.battle_pool_ids)) != 18:
            raise ValueError(f"{archetype.id} AI havuzunda tekrar eden modül var.")
        if "generator" not in archetype.battle_pool_ids:
            raise ValueError(f"{archetype.id} AI havuzunda Jeneratör zorunludur.")
        unknown = set(archetype.battle_pool_ids) - selectable
        if unknown:
            raise ValueError(f"{archetype.id} AI havuzunda bilinmeyen modül var: {sorted(unknown)}")
        if any(module_id not in archetype.battle_pool_ids for module_id in archetype.initial_module_ids):
            raise ValueError(f"{archetype.id} AI başlangıç modülleri kendi havuzunda bulunmalıdır.")
        if len(archetype.expansion_module_ids) < 2:
            raise ValueError(f"{archetype.id} AI için 5. ve 6. hak planı tanımlanmalıdır.")
        if any(module_id not in archetype.battle_pool_ids for module_id in archetype.expansion_module_ids):
            raise ValueError(f"{archetype.id} AI genişleme planı kendi havuzunda bulunmalıdır.")


validate_ai_archetype_catalog()
