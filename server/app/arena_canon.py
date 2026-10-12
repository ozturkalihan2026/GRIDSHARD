"""GRIDSHARD 2.1 arena, trophy and bot data. No mutable player state here."""
from pathlib import Path
import hashlib
import json
import re

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CANON = json.loads((DATA_DIR / "arena_progression_v1.json").read_text(encoding="utf-8"))
ARENA_MINIMUM_RATING_BY_INDEX = {
    int(arena["index"]): int(arena["minimum_rating"])
    for arena in CANON["arenas"]
}

# Lig aşaması (12 Ekim 2026): beş kademeli yedi lig ve tek kademeli GRIDSHARD
# Ligi. Sıra: anahtar, ad, İngilizce ad, kademe sayısı, kademe genişliği (kupa).
LEAGUE_FLOOR_RATING = 3600
LEAGUE_GROUPS = (
    ("spark", "Kıvılcım Ligi", "Spark League", 5, 100),
    ("volt", "Voltaj Ligi", "Voltage League", 5, 100),
    ("reactor", "Reaktör Ligi", "Reactor League", 5, 100),
    ("quantum", "Kuantum Ligi", "Quantum League", 5, 100),
    ("nexus", "Nexus Ligi", "Nexus League", 5, 100),
    ("champions", "Şampiyonlar Ligi", "Champions League", 5, 200),
    ("legendary", "Efsanevi Lig", "Legendary League", 5, 300),
    ("gridshard", "GRIDSHARD Ligi", "GRIDSHARD League", 1, 0),
)
LEAGUE_TIER_NUMERALS = ("I", "II", "III", "IV", "V")
ARENA_COUNT = len(CANON["arenas"])


def _league_stage_outline() -> tuple[dict, ...]:
    """Kimlik, ad ve eşikler; ödül durakları modül tablosundan sonra eklenir."""
    stages: list[dict] = []
    minimum = LEAGUE_FLOOR_RATING
    for order, (key, name_tr, name_en, tiers, width) in enumerate(LEAGUE_GROUPS, start=1):
        kind = {"champions": "champions_league", "legendary": "legendary_league",
                "gridshard": "gridshard_league"}.get(key, "league")
        for tier in range(1, tiers + 1):
            numeral = "" if tiers == 1 else f" {LEAGUE_TIER_NUMERALS[tier - 1]}"
            stage_id = key if tiers == 1 else (
                f"{key}_{tier}" if kind != "league" else f"league_{key}_{tier}"
            )
            stages.append({
                "id": stage_id,
                "kind": kind,
                "index": len(stages) + 1,
                "name_tr": f"{name_tr}{numeral}",
                "name_en": f"{name_en}{numeral}",
                "minimum_rating": minimum,
                "league": key,
                "league_name_tr": name_tr,
                "league_name_en": name_en,
                "league_order": order,
                "league_tier": tier,
                "league_tiers": tiers,
                "tier_width": width,
            })
            minimum += width
    return tuple(stages)


_LEAGUE_OUTLINE = _league_stage_outline()
LEAGUE_ENTRY_RATING = {
    stage["league"]: stage["minimum_rating"]
    for stage in _LEAGUE_OUTLINE
    if stage["league_tier"] == 1
}
# Açılış sırası: 1-12 arenalar, 13 ve sonrası liglere giriş.
UNLOCK_ORDER_MINIMUM_RATING = {
    **ARENA_MINIMUM_RATING_BY_INDEX,
    **{
        ARENA_COUNT + order: LEAGUE_ENTRY_RATING[key]
        for order, (key, *_rest) in enumerate(LEAGUE_GROUPS, start=1)
    },
}
MODULES = {
    item["id"]: {
        **item,
        # The historical field marked the targeted reward stop. Collection
        # ownership now unlocks every module when its arena or league is reached.
        "road_reward_trophies": int(item["unlock_trophies"]),
        "unlock_trophies": UNLOCK_ORDER_MINIMUM_RATING[int(item["unlock_arena"])],
    }
    for item in CANON["modules"]
}
# 12 Ekim 2026 öncesinin açılış eşikleri (değişmez kayıt). O güne kadar açılmış
# modül, yeni dağıtımda ileri bir arenaya ya da lige taşınsa da hesapta açık kalır.
LEGACY_MODULE_UNLOCK_TROPHIES = {
    "laser": 0, "shield": 0, "repair": 0, "cooler": 0, "battery": 0, "amplifier": 0,
    "pulse_cannon": 0, "armor": 0, "emp": 0,
    "missile_launcher": 300, "targeting_computer": 300,
    "arc_cannon": 600, "barrier": 600, "capacitor": 600,
    "drone_bay": 900, "jammer": 900,
    "railgun": 1200, "reflector": 1200, "current_balancer": 1200,
    "virus": 1500, "overclock_unit": 1500,
    "plasma_mortar": 1800, "guardian_dome": 1800, "nano_medic": 1800,
    "quantum_repeater": 2100, "chrono_relay": 2100,
    "ion_spear": 2400, "phase_armor": 2400, "swarm_fabricator": 2400,
    "disruptor": 2700, "precision_matrix": 2700,
    "quantum_cannon": 3000, "phoenix_repair": 3000, "prism_shield": 3000,
    "singularity_projector": 3300, "omega_amplifier": 3300,
}


# v8 ve öncesi paketlere gömülü başlangıç destesi. O paketle açılan yeni hesap
# bu desteyle savaşa girer; içindeki Onarım Modülü koleksiyonda Arena 2'ye
# kadar kilitli görünse de savaşta oynanabilir sayılır (bkz. main.py).
LEGACY_STARTER_DECK_IDS = ("laser", "shield", "repair", "cooler", "battery", "amplifier")


def legacy_module_unlocks(peak_rating: int) -> tuple[str, ...]:
    """Eski eşiklerle açık olup yeni eşikle kilitlenecek modüller."""
    peak = max(0, int(peak_rating))
    return tuple(
        module_id
        for module_id, item in MODULES.items()
        if peak >= LEGACY_MODULE_UNLOCK_TROPHIES.get(module_id, item["unlock_trophies"])
        and peak < item["unlock_trophies"]
    )


def _normalized_arena_rewards() -> tuple[dict, ...]:
    """Keep arena entry unlocks separate from targeted road-piece rewards.

    The original data used ``module_id`` reward nodes, which made the road look
    as if a card had to be claimed. The live canon opens every card belonging
    to an arena at that arena's entry rating, then converts the old stops into
    targeted card pieces. Values scale gently by arena so early upgrades remain
    reachable while later levels still require continued play.
    """
    arenas: list[dict] = []
    for raw_arena in CANON["arenas"]:
        arena_index = int(raw_arena["index"])
        shard_amount = 2 + (arena_index * 2)  # Arena 1: 4, Arena 12: 26.
        nodes: list[dict] = []
        for raw_node in raw_arena["nodes"]:
            node = {**raw_node, "rewards": dict(raw_node.get("rewards", {}))}
            # Core fragments are reserved for Diamond Chests.  Strip legacy
            # arena-road values and their stale copy so old JSON cannot leak a
            # second core-fragment source into the live economy.
            node["rewards"].pop("core_shards", None)
            node["description_tr"] = re.sub(
                r"\s*\+?\s*\d+\s*Çekirdek Parçası",
                "",
                str(node.get("description_tr", "")),
                flags=re.IGNORECASE,
            ).strip(" ·")
            module_id = node["rewards"].pop("module_id", None)
            if module_id:
                node["rewards"].update({
                    "module_shards": shard_amount,
                    "module_shard_target": module_id,
                })
                module_name = MODULES.get(module_id, {}).get("name_tr", module_id)
                node["description_tr"] = f"{module_name} · {shard_amount} Modül Parçası"
            nodes.append(node)
        arenas.append({**raw_arena, "nodes": nodes})
    return tuple(arenas)


ARENAS = _normalized_arena_rewards()
from .season_competition import build_ai_population


_BASE_BOTS = json.loads(
    (DATA_DIR / "arena_bot_profiles_v1.json").read_text(encoding="utf-8")
)["bots"]
BOTS = build_ai_population(_BASE_BOTS)
STARTER_IDS = tuple(item["id"] for item in CANON["modules"] if int(item["unlock_arena"]) == 1)
TALENT_LEVELS = {"common": (5, 8, 11, 14), "rare": (6, 9, 12, 15),
                 "epic": (7, 10, 13, 15), "legendary": (8, 11, 14, 15)}

def module_talent_options(module_id: str) -> tuple[dict, ...]:
    category = MODULES[module_id]["category"]
    first = {"saldırı": "Hasar +%3", "savunma": "Savunma etkisi +%3", "destek": "Destek etkisi +%3",
             "sabotaj": "Kontrol etkisi +%3", "sistem": "Sistem etkisi +%3"}[category]
    power_description = {
        "saldırı": "Bu modülün verdiği hasarı kalıcı olarak %3 artırır.",
        "savunma": "Bu modülün savunma etkisini kalıcı olarak %3 artırır.",
        "destek": "Bu modülün destek etkisini kalıcı olarak %3 artırır.",
        "sabotaj": "Bu modülün kontrol etkisini kalıcı olarak %3 artırır.",
        "sistem": "Bu modülün sistem etkisini kalıcı olarak %3 artırır.",
    }[category]
    return tuple({"tier": str(i), "level": level, "flux_cost": 15 * (i + 1),
                  "choices": [
                      {"id": "power", "name_tr": first, "description_tr": power_description},
                      {"id": "resilience", "name_tr": "CAN +%5", "description_tr": "Bu modülün azami CAN değerini kalıcı olarak %5 artırır."},
                  ]}
                 for i, level in enumerate(TALENT_LEVELS[MODULES[module_id]["rarity"]]))
LEAGUE_NAMES = tuple(stage["name_tr"] for stage in _LEAGUE_OUTLINE)
# Lig sandıkları (12 Ekim 2026, kullanıcı kararı): lig sonundaki sandık mağazada
# ya da başka bir yerde bulunmaz. Adı, içeriği ve görünümü lige özeldir; içinden
# şansa bağlı olmadan o ligde açılan efsanevi modülün parçaları çıkar.
# Sıra: ad, İngilizce ad, Devre Kredisi, Akı, ligin modülünden parça.
LEAGUE_CHESTS = {
    "spark": ("Kıvılcım Sandığı", "Spark Chest", 1500, 60, 6),
    "volt": ("Voltaj Sandığı", "Voltage Chest", 2500, 90, 7),
    "reactor": ("Reaktör Sandığı", "Reactor Chest", 4000, 130, 8),
    "quantum": ("Kuantum Sandığı", "Quantum Chest", 6000, 180, 9),
    "nexus": ("Nexus Sandığı", "Nexus Chest", 9000, 250, 10),
    "champions": ("Şampiyonlar Sandığı", "Champions Chest", 14000, 350, 12),
    "legendary": ("Efsane Sandığı", "Legend Chest", 20000, 500, 15),
}
LEAGUE_ENTRY_MODULE_SHARDS = 6
GRIDSHARD_CHEST_NODE_ID = "gridshard_chest"
# Devre Yolu'nun son ödülü: içindeki kozmetikler yalnız bu duraktan kazanılır.
GRIDSHARD_CHEST_REWARDS = {
    "circuit_credits": 25000,
    "flux_shards": 1000,
    "module_shards": 100,
    "avatar_id": "gridshard_apex",
    "avatar_frame_id": "gridshard_apex",
    "profile_background_id": "gridshard_apex",
    "emoji_id": "gridshard_apex",
}


def _league_reward_nodes(stage: dict) -> tuple[dict, ...]:
    """Kademe içi ara ödüller ve kademe sonundaki ödül (lig sonunda sandık)."""
    minimum = int(stage["minimum_rating"])
    league = stage["league"]
    tier = int(stage["league_tier"])
    if league == "gridshard":
        return ({
            "id": GRIDSHARD_CHEST_NODE_ID,
            "trophies": minimum,
            "description_tr": "GRIDSHARD Sandığı",
            "description_en": "GRIDSHARD Chest",
            "rewards": dict(GRIDSHARD_CHEST_REWARDS),
            "league_chest": league,
            "is_final_reward": True,
        },)
    step = int(stage["index"]) - 1
    credits = 200 + step * 20
    shards = 10 + step // 2
    flux = 10 + step // 2

    def node(offset: int, description: str, rewards: dict) -> dict:
        trophies = minimum + offset
        return {"id": f"{stage['id']}_{trophies}", "trophies": trophies,
                "description_tr": description, "rewards": rewards}

    def league_chest(offset: int) -> dict:
        name_tr, name_en, chest_credits, chest_flux, chest_shards = LEAGUE_CHESTS[league]
        module_id = next(
            key for key, item in MODULES.items() if item.get("unlock_league") == league
        )
        return {
            **node(offset, name_tr, {
                "circuit_credits": chest_credits,
                "flux_shards": chest_flux,
                "module_shards": chest_shards,
                "module_shard_target": module_id,
            }),
            "description_en": name_en,
            "league_chest": league,
            "is_main_reward": True,
        }

    nodes: list[dict] = []
    if tier == 1:
        # Lige girişte açılan modülün hedefli parçası (ana ödül).
        for module_id, item in MODULES.items():
            if item.get("unlock_league") == league:
                nodes.append({
                    **node(25, f"{item['name_tr']} · {LEAGUE_ENTRY_MODULE_SHARDS} Modül Parçası", {
                        "module_shards": LEAGUE_ENTRY_MODULE_SHARDS,
                        "module_shard_target": module_id,
                    }),
                    "is_main_reward": True,
                })
    credit_node = lambda offset: node(offset, f"{credits} Devre Kredisi", {"circuit_credits": credits})
    shard_node = lambda offset: node(offset, f"{shards} Modül Parçası", {"module_shards": shards})
    flux_node = lambda offset: node(offset, f"{flux} Akı", {"flux_shards": flux})
    # Üst liglerde kademe geniştir; kademe sonu ödülü iki kat Devre Kredisidir.
    tier_end = lambda offset: node(
        offset, f"{credits * 2} Devre Kredisi", {"circuit_credits": credits * 2}
    )
    last_tier = tier == int(stage["league_tiers"])
    if league == "champions":
        nodes += [credit_node(50), shard_node(100), flux_node(150),
                  league_chest(200) if last_tier else tier_end(200)]
    elif league == "legendary":
        nodes += [credit_node(75), shard_node(150), flux_node(225),
                  league_chest(300) if last_tier else tier_end(300)]
    else:
        nodes.append(credit_node(50))
        if last_tier:
            nodes.append(league_chest(100))
        elif tier % 2:
            nodes.append(shard_node(100))
        else:
            nodes.append(flux_node(100))
    return tuple(nodes)


RANK_STAGES = tuple(
    {"id": a["id"], "kind": "arena", "index": a["index"], "name_tr": a["name_tr"], "minimum_rating": a["minimum_rating"]}
    for a in ARENAS
) + tuple(
    {**stage, "nodes": _league_reward_nodes(stage)}
    for stage in _LEAGUE_OUTLINE
)
LEAGUE_STAGES = tuple(stage for stage in RANK_STAGES if stage["kind"] != "arena")


def unlock_stage_for_module(module_id: str) -> dict:
    """Modülün açıldığı arena ya da ligin ilk kademesi."""
    order = int(MODULES[module_id]["unlock_arena"])
    if order <= ARENA_COUNT:
        return RANK_STAGES[order - 1]
    league = LEAGUE_GROUPS[order - ARENA_COUNT - 1][0]
    return next(stage for stage in LEAGUE_STAGES if stage["league"] == league)


def matchmaking_band(rating: int) -> int:
    """Eşleştirme kuşağı; Redis betiğindeki ``stage`` işleviyle aynı olmalıdır.

    Arenalarda kuşak arenanın kendisidir. Liglerde kuşak 200 kupadır ve 5600
    üstü tek kuşaktır: lig kademeleri 100 kupaya indiğinde eşleşme havuzu
    daralmasın diye kuşak görünen kademeden ayrıdır.
    """
    rating = max(0, int(rating))
    if rating < LEAGUE_FLOOR_RATING:
        return rating // 300
    return 12 + min(10, (rating - LEAGUE_FLOOR_RATING) // 200)


def rank_stage_for_rating(rating: int) -> dict:
    rating = max(0, int(rating))
    index = max(i for i, stage in enumerate(RANK_STAGES) if rating >= stage["minimum_rating"])
    return {**RANK_STAGES[index], "rating": rating,
            "next_stage": dict(RANK_STAGES[index + 1]) if index + 1 < len(RANK_STAGES) else None}

def trophy_delta(player_rating: int, opponent_rating: int, score: float) -> int:
    if score == 0.5:
        return 0
    correction = max(-8, min(8, int((opponent_rating - player_rating) / 100) * 2))
    return (25 if score >= 1 else -20) + correction

def unlocked_module_ids(rating: int, legacy_ids=()) -> tuple[str, ...]:
    """Kupayla açılan modüller ve hesabın eski dağıtımdan kalan açılışları."""
    legacy = set(legacy_ids or ())
    return tuple(
        key for key, item in MODULES.items()
        if rating >= item["unlock_trophies"] or key in legacy
    )


def unlocked_reward_module_ids(
    rating: int,
    highest_rating: int = 0,
    preferred_ids=(),
    legacy_ids=(),
) -> tuple[str, ...]:
    """Return the only module pool from which profile rewards may be drawn.

    Old profiles can contain removed ids or a deck saved at a higher arena.
    Rewards always start from the authoritative peak-rating unlock set; a
    preferred deck merely narrows that set when it still has valid members.
    """
    unlocked = unlocked_module_ids(max(int(rating), int(highest_rating)), legacy_ids)
    unlocked_set = set(unlocked)
    preferred = tuple(
        dict.fromkeys(
            str(module_id)
            for module_id in (preferred_ids or ())
            if str(module_id) in unlocked_set
        )
    )
    return preferred or unlocked


def validate_targeted_module_rewards() -> tuple[dict, ...]:
    """Fail fast when a road node targets a missing or later-arena module."""
    validated: list[dict] = []
    for stage in LEAGUE_STAGES:
        for node in stage.get("nodes", ()):
            target = node.get("rewards", {}).get("module_shard_target")
            if not target:
                continue
            if target not in MODULES:
                raise ValueError(f"Bilinmeyen Devre Yolu modülü: {target}")
            if target not in unlocked_module_ids(int(stage["minimum_rating"])):
                raise ValueError(
                    f"{node['id']} durağı {target} modülünü ligi açılmadan ödüllendiriyor."
                )
    for arena in ARENAS:
        for node in arena.get("nodes", ()):
            target = node.get("rewards", {}).get("module_shard_target")
            if not target:
                continue
            module = MODULES.get(target)
            if module is None:
                raise ValueError(f"Bilinmeyen Devre Yolu modülü: {target}")
            arena_minimum = int(arena["minimum_rating"])
            if target not in unlocked_module_ids(arena_minimum):
                raise ValueError(
                    f"{node['id']} düğümü {target} modülünü arenası açılmadan ödüllendiriyor."
                )
            if int(module["unlock_arena"]) > int(arena["index"]):
                raise ValueError(
                    f"{node['id']} düğümü sonraki arena modülünü ödüllendiriyor: {target}"
                )
            validated.append({
                "node_id": node["id"],
                "arena_index": int(arena["index"]),
                "arena_minimum_rating": arena_minimum,
                "trophies": int(node["trophies"]),
                "module_definition_id": target,
            })
    return tuple(validated)


TARGETED_MODULE_REWARD_CONTRACTS = validate_targeted_module_rewards()

RARITY_STAT_PROFILES = {
    # GRIDSHARD 2.1 enderlik kanunu: enderlik gizli bir güç merdiveni değildir.
    # Aynı seviyedeki kartlar yalnız çerçeveleri daha nadir olduğu için CAN,
    # hasar, etki, bekleme veya enerji avantajı almaz. Sayısal büyüme seviye ve
    # yeteneklerden gelir; enderlik açılış hızını ve imza mekaniğini belirler.
    rarity: {
        "hp": 1.00,
        "attack": 1.00,
        "effect": 1.00,
        "cooldown": 1.00,
        "energy": 1.00,
    }
    for rarity in ("common", "rare", "epic", "legendary")
}

# Eski dışa aktarımı kullanan istemci/test araçları için etki eğrisini aynı
# adla erişilebilir tutuyoruz.
RARITY_STAT_MULTIPLIER = {
    rarity: profile["effect"]
    for rarity, profile in RARITY_STAT_PROFILES.items()
}


def module_stats(definition, upgrade_level: int, talents: dict | None = None) -> dict:
    # Legacy storage counts upgrades from zero; the user-facing level is 1..15.
    level = max(0, min(14, int(upgrade_level)))
    learned = (talents or {}).values()
    power = 1 + .03 * sum(choice == "power" for choice in learned)
    resilience = 1 + .05 * sum(choice == "resilience" for choice in learned)
    rarity = str(getattr(definition, "rarity", "common") or "common").lower()
    rarity_profile = RARITY_STAT_PROFILES.get(
        rarity,
        RARITY_STAT_PROFILES["common"],
    )
    return {"level": level + 1, "rarity": rarity,
            "max_hp": round(definition.max_hp * rarity_profile["hp"] * 1.03 ** level * resilience),
            "base_damage": round(definition.base_damage * rarity_profile["attack"] * 1.05 ** level * power, 2),
            "cooldown_ms": round(definition.cooldown_ms * rarity_profile["cooldown"] * max(.88, .992 ** level)),
            "effect_multiplier": rarity_profile["effect"] * (1.03 if definition.category == "sabotaj" else 1.035) ** level * power,
            "energy_consumption": round(definition.energy_consumption * rarity_profile["energy"] * max(.92, .996 ** level), 2)}

def select_bot(rating: int, session_id: str) -> dict:
    stage = rank_stage_for_rating(rating)
    arena = stage["index"] if stage["kind"] == "arena" else 12
    profiles = [bot for bot in BOTS if bot["arena"] == arena]
    # The supplied profiles remain unchanged. League matches reuse Arena 12
    # identities/decks with a match-local trophy value in the player's league.
    candidates = [bot for bot in profiles if abs(bot["rating"] - rating) <= 250] if arena == stage["index"] and stage["kind"] == "arena" else profiles
    candidates = candidates or sorted(profiles, key=lambda bot: abs(bot["rating"] - rating))[:3]
    roll = int(hashlib.sha256(session_id.encode()).hexdigest()[:12], 16)
    selected = dict(candidates[roll % len(candidates)])
    selected["match_rating"] = selected["rating"] if stage["kind"] == "arena" else rating
    if stage["kind"] != "arena":
        selected["battle_pool_ids"] = league_bot_battle_pool(
            selected["battle_pool_ids"], stage, session_id
        )
    return selected


def league_bot_battle_pool(battle_pool_ids, stage: dict, session_id: str) -> list[str]:
    """Lig botu, oyuncunun liginde açılmış modüllerle güçlenir.

    Arena 12 destesindeki aynı sınıftan kart lig modülüyle değişir; oyuncunun
    henüz açamadığı modül bota verilmez. Seçim maç kimliğine bağlı ve kararlıdır.
    """
    deck = list(battle_pool_ids)
    league_modules = [
        module_id for module_id, item in MODULES.items()
        if item.get("unlock_league") and int(stage["minimum_rating"]) >= item["unlock_trophies"]
    ]
    for module_id in league_modules:
        if module_id in deck:
            continue
        roll = int(hashlib.sha256(f"{session_id}:{module_id}".encode()).hexdigest()[:8], 16)
        if roll % 2:
            continue
        category = MODULES[module_id]["category"]
        slot = next(
            (index for index, current in enumerate(deck)
             if MODULES[current]["category"] == category and not MODULES[current].get("unlock_league")),
            None,
        )
        if slot is not None:
            deck[slot] = module_id
    return deck
