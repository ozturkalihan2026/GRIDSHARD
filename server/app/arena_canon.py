"""GRIDSHARD 2.1 arena, trophy and bot data. No mutable player state here."""
from pathlib import Path
import hashlib
import json

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
CANON = json.loads((DATA_DIR / "arena_progression_v1.json").read_text(encoding="utf-8"))
ARENA_MINIMUM_RATING_BY_INDEX = {
    int(arena["index"]): int(arena["minimum_rating"])
    for arena in CANON["arenas"]
}
MODULES = {
    item["id"]: {
        **item,
        # The historical field marked the targeted reward stop. Collection
        # ownership now unlocks every module when its arena is reached.
        "road_reward_trophies": int(item["unlock_trophies"]),
        "unlock_trophies": ARENA_MINIMUM_RATING_BY_INDEX[int(item["unlock_arena"])],
    }
    for item in CANON["modules"]
}


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
BOTS = json.loads((DATA_DIR / "arena_bot_profiles_v1.json").read_text(encoding="utf-8"))["bots"]
STARTER_IDS = tuple(item["id"] for item in CANON["modules"] if item["unlock_trophies"] == 0)
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
LEAGUE_NAMES = ("Kıvılcım Ligi", "Voltaj Ligi", "Reaktör Ligi", "Kuantum Ligi", "Nexus Ligi",
                "Şampiyonlar I", "Şampiyonlar II", "Şampiyonlar III", "Şampiyonlar IV", "Şampiyonlar V", "Efsanevi Lig")


def _league_reward_nodes(league_index: int, minimum_rating: int) -> tuple[dict, ...]:
    """Return the three persistent reward stops inside every league stage."""
    credit_reward = 100 + ((league_index - 1) * 15)
    module_reward = 8 + (league_index - 1)
    flux_reward = 6 + ((league_index - 1) // 2)
    return (
        {
            "id": f"league_{league_index}_{minimum_rating + 50}",
            "trophies": minimum_rating + 50,
            "description_tr": f"{credit_reward} Devre Kredisi",
            "rewards": {"circuit_credits": credit_reward},
        },
        {
            "id": f"league_{league_index}_{minimum_rating + 100}",
            "trophies": minimum_rating + 100,
            "description_tr": f"{module_reward} Modül Parçası",
            "rewards": {"module_shards": module_reward},
        },
        {
            "id": f"league_{league_index}_{minimum_rating + 150}",
            "trophies": minimum_rating + 150,
            "description_tr": f"{flux_reward} Akı",
            "rewards": {"flux_shards": flux_reward},
        },
    )


def _league_stage_identity(league_index: int) -> tuple[str, str]:
    if league_index <= 5:
        return f"league_{league_index}", "league"
    if league_index <= 10:
        return f"champions_{league_index - 5}", "champions_league"
    return "legendary", "legendary_league"


RANK_STAGES = tuple(
    {"id": a["id"], "kind": "arena", "index": a["index"], "name_tr": a["name_tr"], "minimum_rating": a["minimum_rating"]}
    for a in ARENAS
) + tuple(
    {
        "id": _league_stage_identity(i + 1)[0],
        "kind": _league_stage_identity(i + 1)[1],
        "index": i + 1,
        "name_tr": name,
        "minimum_rating": 3600 + i * 200,
        "nodes": _league_reward_nodes(i + 1, 3600 + i * 200),
    }
    for i, name in enumerate(LEAGUE_NAMES)
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

def unlocked_module_ids(rating: int) -> tuple[str, ...]:
    return tuple(key for key, item in MODULES.items() if rating >= item["unlock_trophies"])


def unlocked_reward_module_ids(
    rating: int,
    highest_rating: int = 0,
    preferred_ids=(),
) -> tuple[str, ...]:
    """Return the only module pool from which profile rewards may be drawn.

    Old profiles can contain removed ids or a deck saved at a higher arena.
    Rewards always start from the authoritative peak-rating unlock set; a
    preferred deck merely narrows that set when it still has valid members.
    """
    unlocked = unlocked_module_ids(max(int(rating), int(highest_rating)))
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

def module_stats(definition, upgrade_level: int, talents: dict | None = None) -> dict:
    # Legacy storage counts upgrades from zero; the user-facing level is 1..15.
    level = max(0, min(14, int(upgrade_level)))
    learned = (talents or {}).values()
    power = 1 + .03 * sum(choice == "power" for choice in learned)
    resilience = 1 + .05 * sum(choice == "resilience" for choice in learned)
    return {"level": level + 1, "max_hp": round(definition.max_hp * 1.03 ** level * resilience),
            "base_damage": round(definition.base_damage * 1.05 ** level * power, 2),
            "cooldown_ms": round(definition.cooldown_ms * max(.88, .992 ** level)),
            "effect_multiplier": (1.03 if definition.category == "sabotaj" else 1.035) ** level * power,
            "energy_consumption": definition.energy_consumption}

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
    return selected
