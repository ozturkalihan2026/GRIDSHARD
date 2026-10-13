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

# Kupa ölçeği (12 Ekim 2026, kullanıcı kararı): arenalar ileride genişler
# (300 … 600 kupa) ve 5400 kupada biter; ligler oradan başlar ve GRIDSHARD
# Ligi 8600'dedir. Sezon değişiminde lig oyuncusu lig tabanına döner; en üst
# lig için bir sezonda 3200 kupa gerekir.
ARENA_COUNT = len(CANON["arenas"])
ARENA_FLOOR_RATINGS = tuple(int(arena["minimum_rating"]) for arena in CANON["arenas"])
LEAGUE_FLOOR_RATING = int(CANON["arenas"][-1]["maximum_rating"]) + 1
# Lig aşaması: beş kademeli yedi lig ve tek kademeli GRIDSHARD Ligi.
# Sıra: anahtar, ad, İngilizce ad, kademe sayısı, kademe genişliği (kupa).
LEAGUE_GROUPS = (
    ("spark", "Kıvılcım Ligi", "Spark League", 5, 80),
    ("volt", "Voltaj Ligi", "Voltage League", 5, 80),
    ("reactor", "Reaktör Ligi", "Reactor League", 5, 80),
    ("quantum", "Kuantum Ligi", "Quantum League", 5, 80),
    ("nexus", "Nexus Ligi", "Nexus League", 5, 80),
    ("champions", "Şampiyonlar Ligi", "Champions League", 5, 100),
    ("legendary", "Efsanevi Lig", "Legendary League", 5, 140),
    ("gridshard", "GRIDSHARD Ligi", "GRIDSHARD League", 1, 0),
)
LEAGUE_TIER_NUMERALS = ("I", "II", "III", "IV", "V")
# Eşleştirme kuşağı liglerde 200 kupadır; on kuşaktan sonrası tek kuşaktır.
MATCHMAKING_LEAGUE_BAND_WIDTH = 200
MATCHMAKING_LEAGUE_BAND_LIMIT = 10


def arena_index_for_rating(rating: int) -> int:
    """Kupanın düştüğü arena (1-12); lig oyuncusu için 12."""
    rating = max(0, int(rating))
    return max(index for index, floor in enumerate(ARENA_FLOOR_RATINGS, start=1) if rating >= floor)


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
# 12 Ekim 2026 öncesinin kupa ölçeği (değişmez kayıt): 12 arena 300'er kupa;
# 3600'den sonra 200'er kupalık beş lig, Şampiyonlar I-V ve 5600'den itibaren
# Efsanevi Lig. O günün kayıtları bu ölçektedir; ilk yüklemede yeni ölçeğe
# taşınır ve kayda ölçek sürümü yazılır (bkz. player_data_store).
TROPHY_SCALE_VERSION = 2
LEGACY_ARENA_WIDTH = 300
LEGACY_LEAGUE_WIDTH = 200
LEGACY_LEAGUE_FLOOR_RATING = LEGACY_ARENA_WIDTH * ARENA_COUNT


def rating_from_legacy_scale(rating: int) -> int:
    """Eski ölçekteki kupayı yeni ölçeğe taşır.

    Oyuncu aynı aşamada ve aşamanın aynı oranında kalır; sıralama değişmez.
    Arenalarda yukarı yuvarlanır: ulaşılmış bir ödül durağı taşıma sonrasında
    geride kalmaz.
    """
    rating = max(0, int(rating))
    if rating < LEGACY_LEAGUE_FLOOR_RATING:
        index, offset = divmod(rating, LEGACY_ARENA_WIDTH)
        arena = CANON["arenas"][index]
        width = int(arena["maximum_rating"]) - int(arena["minimum_rating"]) + 1
        return int(arena["minimum_rating"]) + -(-offset * width // LEGACY_ARENA_WIDTH)
    offset = rating - LEGACY_LEAGUE_FLOOR_RATING
    plain_span = 5 * LEGACY_LEAGUE_WIDTH
    if offset < plain_span:  # Kıvılcım … Nexus: lig başına 200 kupa
        league, inside = divmod(offset, LEGACY_LEAGUE_WIDTH)
        key, _name_tr, _name_en, tiers, width = LEAGUE_GROUPS[league]
        return LEAGUE_ENTRY_RATING[key] + inside * tiers * width // LEGACY_LEAGUE_WIDTH
    if offset < 2 * plain_span:  # Şampiyonlar I-V: kademe başına 200 kupa
        _key, _name_tr, _name_en, tiers, width = LEAGUE_GROUPS[5]
        return LEAGUE_ENTRY_RATING["champions"] + (offset - plain_span) * tiers * width // plain_span
    # Efsanevi Lig'in üst sınırı yoktu; fark aynen taşınır.
    return LEAGUE_ENTRY_RATING["legendary"] + (offset - 2 * plain_span)


def rating_on_current_scale(rating: int, scale_version) -> int:
    """Kayıttaki kupayı güncel ölçekte verir; ölçek sürümü olmayan kayıt eskidir."""
    if int(scale_version or 1) >= TROPHY_SCALE_VERSION:
        return max(0, int(rating))
    return rating_from_legacy_scale(rating)


# 12 Ekim 2026 öncesinin açılış eşikleri (eski ölçekte; değişmez kayıt). O güne
# kadar açılmış modül, yeni dağıtımda ileri bir arenaya ya da lige taşınsa da
# hesapta açık kalır.
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


def legacy_module_unlocks(legacy_peak_rating: int) -> tuple[str, ...]:
    """Eski eşiklerle açık olup yeni eşikle kilitlenecek modüller.

    Kupa eski ölçekte verilir; yeni eşikle karşılaştırma, aynı kupanın yeni
    ölçeğe taşınmış değeriyle yapılır.
    """
    legacy_peak = max(0, int(legacy_peak_rating))
    peak = rating_from_legacy_scale(legacy_peak)
    return tuple(
        module_id
        for module_id, item in MODULES.items()
        if module_id in LEGACY_MODULE_UNLOCK_TROPHIES
        and legacy_peak >= LEGACY_MODULE_UNLOCK_TROPHIES[module_id]
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
BOTS = build_ai_population(
    _BASE_BOTS,
    {int(arena["index"]): (int(arena["minimum_rating"]), int(arena["maximum_rating"])) for arena in ARENAS},
)
STARTER_IDS = tuple(item["id"] for item in CANON["modules"] if int(item["unlock_arena"]) == 1)
from .game.talents import TALENT_LEVELS, module_talent_tree, stat_modifiers


def module_talent_options(module_id: str) -> tuple[dict, ...]:
    """Modülün dört yetenek eşiği: temel uzmanlık, imza yeteneği, ince ayar, ustalık."""
    # Katalog bu dosyayı içe aktarır; bekleme bilgisi çağrı anında okunur.
    from .game.catalog import BASIC_MODULE_DEFINITIONS

    return module_talent_tree(
        module_id,
        MODULES[module_id]["category"],
        MODULES[module_id]["rarity"],
        BASIC_MODULE_DEFINITIONS[module_id].cooldown_ms > 0,
    )
LEAGUE_NAMES = tuple(stage["name_tr"] for stage in _LEAGUE_OUTLINE)
# Lig sandıkları (12 Ekim 2026, kullanıcı kararı): lig sonundaki sandık mağazada
# ya da başka bir yerde bulunmaz. Adı, içeriği ve görünümü lige özeldir; içeriği
# şansa bağlı değildir ve belirli bir modüle değil, her modülde harcanabilen
# evrensel parçaya dayanır.
# Sıra: ad, İngilizce ad, Devre Kredisi, Akı, evrensel modül parçası.
LEAGUE_CHESTS = {
    "spark": ("Kıvılcım Sandığı", "Spark Chest", 1500, 60, 5),
    "volt": ("Voltaj Sandığı", "Voltage Chest", 2500, 90, 7),
    "reactor": ("Reaktör Sandığı", "Reactor Chest", 4000, 130, 9),
    "quantum": ("Kuantum Sandığı", "Quantum Chest", 6000, 180, 12),
    "nexus": ("Nexus Sandığı", "Nexus Chest", 9000, 250, 15),
    "champions": ("Şampiyonlar Sandığı", "Champions Chest", 14000, 350, 20),
    "legendary": ("Efsane Sandığı", "Legend Chest", 20000, 500, 25),
}
GRIDSHARD_CHEST_NODE_ID = "gridshard_chest"
# GRIDSHARD Ligi 8600'de başlar; sandığı ve son unvan ligin içinde, 10000
# kupadadır (kullanıcı kararı, 12 Ekim 2026): Efsane Sandığı ile aynı kupada
# durmaz ve en üst lige çıkan oyuncunun önünde bir hedef kalır.
GRIDSHARD_SUMMIT_RATING = 10000
# Devre Yolu'nun son ödülü: içindeki kozmetikler yalnız bu duraktan kazanılır.
GRIDSHARD_CHEST_REWARDS = {
    "circuit_credits": 25000,
    "flux_shards": 1000,
    "universal_module_shards": 40,
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
            "trophies": max(minimum, GRIDSHARD_SUMMIT_RATING),
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
        return {
            **node(offset, name_tr, {
                "circuit_credits": chest_credits,
                "flux_shards": chest_flux,
                "universal_module_shards": chest_shards,
            }),
            "description_en": name_en,
            "league_chest": league,
            "is_main_reward": True,
        }

    nodes: list[dict] = []
    credit_node = lambda offset: node(offset, f"{credits} Devre Kredisi", {"circuit_credits": credits})
    shard_node = lambda offset: node(offset, f"{shards} Modül Parçası", {"module_shards": shards})
    flux_node = lambda offset: node(offset, f"{flux} Akı", {"flux_shards": flux})
    # Üst liglerde kademe geniştir; kademe sonu ödülü iki kat Devre Kredisidir.
    tier_end = lambda offset: node(
        offset, f"{credits * 2} Devre Kredisi", {"circuit_credits": credits * 2}
    )
    last_tier = tier == int(stage["league_tiers"])
    # Duraklar kademe genişliğine göre yerleşir: üst liglerde dörtte bir
    # aralıklarla dört durak, diğerlerinde kademenin ortası ve sonu.
    width = int(stage["tier_width"])
    if league in ("champions", "legendary"):
        quarter = width // 4
        nodes += [credit_node(quarter), shard_node(2 * quarter), flux_node(3 * quarter),
                  league_chest(width) if last_tier else tier_end(width)]
    else:
        nodes.append(credit_node(width // 2))
        if last_tier:
            nodes.append(league_chest(width))
        elif tier % 2:
            nodes.append(shard_node(width))
        else:
            nodes.append(flux_node(width))
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

    Arenalarda kuşak arenanın kendisidir. Liglerde kuşak 200 kupadır ve onuncu
    kuşaktan (Şampiyonlar Ligi) sonrası tek kuşaktır: lig kademeleri dar olduğu
    için eşleşme havuzu daralmasın diye kuşak görünen kademeden ayrıdır.
    """
    rating = max(0, int(rating))
    if rating < LEAGUE_FLOOR_RATING:
        return arena_index_for_rating(rating) - 1
    return ARENA_COUNT + min(
        MATCHMAKING_LEAGUE_BAND_LIMIT,
        (rating - LEAGUE_FLOOR_RATING) // MATCHMAKING_LEAGUE_BAND_WIDTH,
    )


def matchmaking_band_lua() -> str:
    """Redis eşleştirme betiğinin ``stage`` işlevi; eşikler bu dosyadan gelir."""
    floors = ", ".join(str(floor) for floor in ARENA_FLOOR_RATINGS)
    return (
        f"local arena_floors = {{{floors}}}\n"
        "local function stage(rating)\n"
        f"    if rating >= {LEAGUE_FLOOR_RATING} then\n"
        f"        return {ARENA_COUNT} + math.min({MATCHMAKING_LEAGUE_BAND_LIMIT}, "
        f"math.floor((rating - {LEAGUE_FLOOR_RATING}) / {MATCHMAKING_LEAGUE_BAND_WIDTH}))\n"
        "    end\n"
        "    local band = 0\n"
        "    for index, floor in ipairs(arena_floors) do\n"
        "        if rating >= floor then band = index - 1 end\n"
        "    end\n"
        "    return band\n"
        "end\n"
    )


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
    # Yetenek dallarının sayısal etkisi; imza yeteneği savaşta ayrıca çalışır.
    talent = stat_modifiers(talents, definition.cooldown_ms > 0)
    power = talent["power"]
    resilience = talent["hp"]
    rarity = str(getattr(definition, "rarity", "common") or "common").lower()
    rarity_profile = RARITY_STAT_PROFILES.get(
        rarity,
        RARITY_STAT_PROFILES["common"],
    )
    cooldown_ms = round(
        definition.cooldown_ms * rarity_profile["cooldown"] * max(.88, .992 ** level) * talent["cooldown"]
    )
    upkeep = round(
        definition.energy_consumption * rarity_profile["energy"] * max(.92, .996 ** level) * talent["energy"], 2
    )
    # Bilgi ekranındaki "enerji tüketimi" modülün saniyede gerçekten harcadığı
    # enerjidir: sürekli bakım ve (saldırı, onarım, sabotaj gibi iş yaptıkça
    # ödeyen kartlarda) aksiyon bedelinin bekleme süresine bölümü. Yalnız bakım
    # gösterilince bu kartlarda 0 yazıyordu.
    action_cost = float(getattr(definition, "action_energy_cost", 0.0) or 0.0) * talent["energy"]
    action_rate = action_cost / (cooldown_ms / 1000) if action_cost > 0 and cooldown_ms > 0 else 0.0
    stats = {"level": level + 1, "rarity": rarity,
            "max_hp": round(definition.max_hp * rarity_profile["hp"] * 1.03 ** level * resilience),
            "base_damage": round(definition.base_damage * rarity_profile["attack"] * 1.05 ** level * power, 2),
            "cooldown_ms": cooldown_ms,
            "effect_multiplier": rarity_profile["effect"] * (1.03 if definition.category == "sabotaj" else 1.035) ** level * power * talent["effect"],
            "energy_consumption": upkeep,
            "action_energy_cost": round(action_cost, 2),
            "energy_per_second": round(upkeep + action_rate, 2),
            "energy_generation": round(float(getattr(definition, "energy_generation", 0.0) or 0.0), 2)}
    # Modüle özgü değerler ve çevrimin adı (bilgi ekranı); motorla aynı
    # sabitlerden hesaplanır. İçe aktarım döngüsü olmasın diye burada yapılır.
    from .game.module_sheet import cycle_label, module_specials
    if stats["energy_generation"] > 0:
        # Batarya üretimi etki çarpanıyla büyür (energy.py).
        stats["energy_generation"] = round(stats["energy_generation"] * stats["effect_multiplier"], 2)
    stats["cycle_label_tr"], stats["cycle_label_en"] = cycle_label(definition)
    stats["specials"] = module_specials(definition, stats)
    return stats

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
    """Lig botu efsanevi modüllerle güçlenir; ilerideki liglerde daha çok taşır.

    Efsanevi modüllerin hepsi ilk lige girişte açılır. Zorluk yine lig lig
    artsın diye bot, liginin sırası kadar (Kıvılcım 1 … Efsanevi 7) modül
    arasından seçer; Arena 12 destesindeki aynı sınıftan kart onunla değişir.
    Oyuncunun henüz açamadığı modül bota verilmez. Seçim maç kimliğine bağlı ve
    kararlıdır.
    """
    deck = list(battle_pool_ids)
    league_modules = sorted(
        (
            module_id for module_id, item in MODULES.items()
            if item.get("unlock_league") and int(stage["minimum_rating"]) >= item["unlock_trophies"]
        ),
        key=lambda module_id: hashlib.sha256(f"{session_id}:order:{module_id}".encode()).hexdigest(),
    )[:max(1, int(stage.get("league_order", 1)))]
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
