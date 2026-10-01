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
    expansion_module_ids: tuple[str, ...] = ()
    category_bias: tuple[tuple[str, int], ...] = ()
    attack_foundation_target: int = 2
    energy_floor: int = 0
    defense_floor: int = 0
    sabotage_floor: int = 0

    def bias_for(self, category: str) -> int:
        return dict(self.category_bias).get(category, 0)


BALANCED_AI = AIArchetype(
    id="balanced",
    name_tr="Dengeli",
    name_en="Balanced",
    description_tr="Rakibin devresine göre karşı modül seçer; saldırı ve savunmayı dengeler.",
    description_en="Counters the opponent while balancing offense and defense.",
    # Beta.72 tur 12: Çekirdek üretimi 5,5'e inince Bataryasız bu deste
    # aksiyonlarının ~%65'inde enerji bekliyor, maçlar kilitleniyordu; Kalkan
    # yerine Batarya (denge simülasyonunda kazanma oranı aynı kaldı). Tur 14'te
    # üretim 9'a çıktı; Batarya büyüyen tahtada yine işe yaradığı için kaldı.
    battle_pool_ids=(
        "laser", "pulse_cannon", "battery", "armor", "repair", "targeting_computer",
    ),
    expansion_module_ids=("pulse_cannon", "repair", "armor", "targeting_computer"),
)

AGGRESSIVE_AI = AIArchetype(
    id="aggressive",
    name_tr="Saldırgan",
    name_en="Aggressive",
    description_tr="Erken hasar temposu kurar; saldırı modüllerini ve Aşırı Hızlandırıcı'yı öne alır.",
    description_en="Builds early damage pressure and prioritizes attack modules and Overclock Unit.",
    # Beta.72 tur 12: Aşırı Hızlandırıcı ve iki ağır saldırı Soğutucusuz
    # susuyordu; Güçlendirici yerine Soğutucu (kazanma oranı aynı kaldı).
    battle_pool_ids=(
        "laser", "pulse_cannon", "drone_bay", "missile_launcher", "cooler", "overclock_unit",
    ),
    expansion_module_ids=("cooler", "overclock_unit", "pulse_cannon", "drone_bay"),
    category_bias=(("saldırı", 7), ("destek", 2), ("savunma", -1), ("enerji", -1)),
    attack_foundation_target=3,
)

DEFENSIVE_AI = AIArchetype(
    id="defensive",
    name_tr="Savunmacı",
    name_en="Defensive",
    description_tr="Çekirdeği ayakta tutar; savunma ve onarım katmanını saldırı baskısına göre büyütür.",
    description_en="Protects the core by layering defense and repair against incoming pressure.",
    # Beta.72 tur 12'de Bataryasız deste enerji bekliyordu; Zırh yerine Batarya
    # gelmişti. Tur 14: enerji bollaşınca tek saldırı kartlı deste yalnız enerjisi
    # tükenen rakibi yenebildiği ortaya çıktı (oyuncu vekillerine %50 → %1);
    # Batarya yerine Darbe Topu (yine %50). Davranış ayarları değişmedi.
    battle_pool_ids=(
        "laser", "pulse_cannon", "shield", "barrier", "repair", "cooler",
    ),
    expansion_module_ids=("barrier", "repair", "cooler"),
    category_bias=(("savunma", 7), ("destek", 4), ("enerji", 1), ("saldırı", -1)),
    attack_foundation_target=1,
    defense_floor=2,
)

# Beta.72 tur 13: "Sabotaj Odaklı" ve "Ekonomi Odaklı" kaldırıldı. Güçlü sınıf
# eğilimleri (+8) AI'yi saldırı kurmadan sabotaj/enerji kartı basmaya itiyordu;
# denge simülasyonunda oyuncu vekillerine karşı hiç kazanamıyorlardı. Yerlerine
# Dengeli davranışla oynayan (sınıf eğilimi yok) ama destesinde sabotaj ve
# ekonomi kartı taşıyan iki arketip geldi. Tema kartına verilen küçük bir öncelik
# bile (+2 eğilim ya da genişleme listesinde ikinci sıra) kazanma oranını ~%50'den
# ~%0'a düşürdüğü için tema yalnız "en az bir kopya" tabanıyla korunur.
BALANCED_CONTROL_AI = AIArchetype(
    id="balanced_control",
    name_tr="Dengeli Kontrol",
    name_en="Balanced Control",
    description_tr="Dengeli oynar; rakibin kilit sistemini EMP ve Sinyal Bozucu ile susturur, Batarya ve Soğutucuyla temposunu korur.",
    description_en="Plays balanced; silences a key enemy system with EMP and Jammer and keeps its tempo with Battery and Cooler.",
    battle_pool_ids=(
        "laser", "pulse_cannon", "battery", "cooler", "emp", "jammer",
    ),
    expansion_module_ids=("pulse_cannon", "cooler"),
    attack_foundation_target=2,
    sabotage_floor=1,
)

BALANCED_ECONOMY_AI = AIArchetype(
    id="balanced_economy",
    name_tr="Dengeli Ekonomi",
    name_en="Balanced Economy",
    description_tr="Dengeli oynar; Batarya ve Akım Dengeleyiciyle enerjisini sağlam tutar, Sinyal Bozucu ile rakibin destek hattını keser.",
    description_en="Plays balanced; keeps its energy steady with Battery and Current Balancer and cuts the enemy support line with Jammer.",
    battle_pool_ids=(
        "laser", "pulse_cannon", "battery", "current_balancer", "shield", "jammer",
    ),
    expansion_module_ids=("pulse_cannon", "shield"),
    attack_foundation_target=2,
    energy_floor=1,
)


AI_ARCHETYPES: dict[str, AIArchetype] = {
    item.id: item
    for item in (
        AGGRESSIVE_AI,
        DEFENSIVE_AI,
        BALANCED_AI,
        BALANCED_CONTROL_AI,
        BALANCED_ECONOMY_AI,
    )
}

from dataclasses import replace
BOT_ARCHETYPE_IDS = {
    "Dengeli": "balanced", "Hızlı Baskı": "fast_pressure", "Ağır Hasar": "heavy_damage",
    "Savunma": "defensive", "Sürdürülebilirlik": "sustain", "Kontrol": "balanced_control",
    "Destek Zinciri": "support_chain", "Akım Ekonomisi": "balanced_economy", "Alan Hasarı": "area_damage", "Karşı Meta": "counter_meta",
}
for _id, _base, _name, _bias in (
    ("fast_pressure", AGGRESSIVE_AI, "Hızlı Baskı", (("saldırı", 8), ("destek", 1))),
    ("heavy_damage", AGGRESSIVE_AI, "Ağır Hasar", (("saldırı", 9), ("enerji", 3))),
    ("sustain", DEFENSIVE_AI, "Sürdürülebilirlik", (("destek", 8), ("savunma", 3))),
    ("support_chain", BALANCED_AI, "Destek Zinciri", (("destek", 9), ("saldırı", 3))),
    ("area_damage", AGGRESSIVE_AI, "Alan Hasarı", (("saldırı", 7), ("sabotaj", 3))),
    ("counter_meta", BALANCED_AI, "Karşı Meta", (("sabotaj", 4), ("savunma", 2))),
):
    AI_ARCHETYPES[_id] = replace(_base, id=_id, name_tr=_name, category_bias=_bias)

AI_ARCHETYPE_IDS: tuple[str, ...] = tuple(AI_ARCHETYPES)

# Eski istemcilerin ya da kayıtların gönderdiği kaldırılmış arketip kimlikleri.
LEGACY_ARCHETYPE_ALIASES = {
    "sabotage": "balanced_control",
    "economy": "balanced_economy",
}


def normalize_ai_archetype_id(value: str | None) -> str:
    candidate = str(value or "").strip().lower()
    candidate = LEGACY_ARCHETYPE_ALIASES.get(candidate, candidate)
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
        if len(archetype.battle_pool_ids) != 6:
            raise ValueError(f"{archetype.id} AI destesi 6 modül içermelidir.")
        if len(set(archetype.battle_pool_ids)) != 6:
            raise ValueError(f"{archetype.id} AI havuzunda tekrar eden modül var.")
        if "core" in archetype.battle_pool_ids:
            raise ValueError(f"{archetype.id} AI destesine Çekirdek eklenemez.")
        unknown = set(archetype.battle_pool_ids) - selectable
        if unknown:
            raise ValueError(f"{archetype.id} AI havuzunda bilinmeyen modül var: {sorted(unknown)}")
        if len(archetype.expansion_module_ids) < 2:
            raise ValueError(f"{archetype.id} AI için 5. ve 6. hak planı tanımlanmalıdır.")
        if any(module_id not in archetype.battle_pool_ids for module_id in archetype.expansion_module_ids):
            raise ValueError(f"{archetype.id} AI genişleme planı kendi havuzunda bulunmalıdır.")


validate_ai_archetype_catalog()
