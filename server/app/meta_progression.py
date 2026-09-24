from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import math
from typing import Callable
from uuid import uuid4

from .game.catalog import BASIC_MODULE_DEFINITIONS
from .game.catalog_view import build_module_catalog_view
from .game.core_balance import core_rarity_profile
from .game.energy import (
    BASE_CORE_GENERATION_PER_SECOND,
    CORE_LEVEL_GENERATION_MULTIPLIER,
)
from .player_profile import CURRENT_SEASON_ID


class MetaProgressionError(ValueError):
    pass


from .arena_canon import (
    ARENAS, MODULES, RANK_STAGES, rank_stage_for_rating, trophy_delta,
    module_stats, unlocked_module_ids, unlocked_reward_module_ids,
    module_talent_options,
)
from threading import RLock

MODULE_RARITY = {key: item["rarity"] for key, item in MODULES.items()}
MODULE_CATALOG_COPY = {item["id"]: item for item in build_module_catalog_view()["modules"]}
MODULE_EFFECT_LINES = {
    module_id: tuple(item.get("effect_lines", ()))
    for module_id, item in MODULE_CATALOG_COPY.items()
}
RARITY_UNLOCK_ARENA = {"common": 1, "rare": 1, "epic": 5, "legendary": 9}

RARITY_COST_MULTIPLIER = {
    "common": 1.0,
    "rare": 1.35,
    "epic": 1.8,
    "legendary": 2.5,
}

MODULE_TALENT_RESET_COST_PER_SELECTION = 25


CORE_TYPES: tuple[dict, ...] = (
    {
        "id": "core_resonance",
        "name_tr": "Rezonans Çekirdeği",
        "role_tr": "Hasarlı çekirdeği 45 CAN onarır.",
        "rarity": "common",
        "unlock_arena": 1,
        "skills": (
            {"id": "stable_frequency", "name_tr": "Kararlı Frekans", "requires": None},
            {"id": "deep_resonance", "name_tr": "Derin Rezonans", "requires": "stable_frequency"},
            {"id": "second_pulse", "name_tr": "İkinci Darbe", "requires": "deep_resonance"},
        ),
    },
    {
        "id": "core_guardian",
        "name_tr": "Muhafız Çekirdeği",
        "role_tr": "Savunma odaklı çekirdek prototipi.",
        "rarity": "rare",
        "unlock_arena": 3,
        "skills": (
            {"id": "barrier_seed", "name_tr": "Bariyer Tohumu", "requires": None},
            {"id": "shield_matrix", "name_tr": "Kalkan Matrisi", "requires": "barrier_seed"},
            {"id": "last_stand", "name_tr": "Son Direniş", "requires": "shield_matrix"},
        ),
    },
    {
        "id": "core_overdrive",
        "name_tr": "Aşırı Yük Çekirdeği",
        "role_tr": "Saldırı temposu odaklı çekirdek prototipi.",
        "rarity": "rare",
        "unlock_arena": 5,
        "skills": (
            {"id": "hot_start", "name_tr": "Sıcak Başlangıç", "requires": None},
            {"id": "surge", "name_tr": "Enerji Sıçraması", "requires": "hot_start"},
            {"id": "redline", "name_tr": "Kırmızı Hat", "requires": "surge"},
        ),
    },
    {
        "id": "core_disruptor",
        "name_tr": "Kesinti Çekirdeği",
        "role_tr": "Sabotaj odaklı çekirdek prototipi.",
        "rarity": "epic",
        "unlock_arena": 7,
        "skills": (
            {"id": "static_field", "name_tr": "Statik Alan", "requires": None},
            {"id": "signal_break", "name_tr": "Sinyal Kırılması", "requires": "static_field"},
            {"id": "blackout", "name_tr": "Karartma", "requires": "signal_break"},
        ),
    },
    {
        "id": "core_capacitor",
        "name_tr": "Kapasitör Çekirdeği",
        "role_tr": "Enerji ekonomisi odaklı çekirdek prototipi.",
        "rarity": "epic",
        "unlock_arena": 9,
        "skills": (
            {"id": "reserve_cell", "name_tr": "Yedek Hücre", "requires": None},
            {"id": "fast_charge", "name_tr": "Hızlı Dolum", "requires": "reserve_cell"},
            {"id": "overflow", "name_tr": "Taşma", "requires": "fast_charge"},
        ),
    },
    {
        "id": "core_phoenix",
        "name_tr": "Anka Çekirdeği",
        "role_tr": "Kurtarma ve yeniden toparlanma prototipi.",
        "rarity": "legendary",
        "unlock_arena": 11,
        "skills": (
            {"id": "ember", "name_tr": "Kor", "requires": None},
            {"id": "rebirth", "name_tr": "Yeniden Doğuş", "requires": "ember"},
            {"id": "solar_wing", "name_tr": "Güneş Kanadı", "requires": "rebirth"},
        ),
    },
    {
        "id": "core_quantum",
        "name_tr": "Kuantum Çekirdeği",
        "role_tr": "Üst düzey taktik esneklik prototipi.",
        "rarity": "legendary",
        "unlock_arena": 12,
        "skills": (
            {"id": "phase_seed", "name_tr": "Faz Tohumu", "requires": None},
            {"id": "probability_bend", "name_tr": "Olasılık Bükümü", "requires": "phase_seed"},
            {"id": "singularity", "name_tr": "Tekillik", "requires": "probability_bend"},
        ),
    },
)


CORE_ROLES = (
    "Dost devreye onarım darbesi: Çekirdeğe 45, modüllere 15 CAN.",
    "Dost devreye 4 saniye boyunca modül başına 20 kalkan.",
    "Tüm dost modüllere 3 saniye +%25 hasar.",
    "Rakip desteği 2 saniye keser; aktif hasar güçlerini siler.",
    "Sonraki iki yerleştirmede 1 Akım indirim (asgari maliyet 1).",
    "Tüm dost modüllere %20 CAN iyileştirmesi.",
    "İyileştirme ve kısa takım kalkanını birleştirir.",
)
CORE_ROLES_EN = (
    "Repair pulse to the allied circuit: 45 HP to the Core and 15 HP to modules.",
    "Grant each allied module 20 shield for 4 seconds.",
    "Grant all allied modules +25% damage for 3 seconds.",
    "Interrupt enemy support for 2 seconds and clear active damage boosts.",
    "Reduce Current cost by 1 for the next two deployments (minimum cost 1).",
    "Heal all allied modules for 20% HP.",
    "Combine healing with a brief team shield.",
)
CORE_NAMES_EN = (
    "Resonance Core", "Guardian Core", "Overdrive Core", "Disruptor Core",
    "Capacitor Core", "Phoenix Core", "Quantum Core",
)
CORE_TYPES = tuple({**core, "name_en": CORE_NAMES_EN[i], "role_tr": CORE_ROLES[i], "role_en": CORE_ROLES_EN[i], "skills": tuple(
    {"id": f"{tier}_{choice}", "tier": str(tier), "level": level, "flux_cost": 25 * (tier + 1),
     "name_tr": "Enerji üretimi +%3" if choice == "energy" else "Aktif güç dolumu +%3",
     "name_en": "Energy generation +3%" if choice == "energy" else "Active power charge +3%"}
    for tier, level in enumerate((5, 9, 13)) for choice in ("energy", "charge")
)} for i, core in enumerate(CORE_TYPES))

CHEST_DEFINITIONS: dict[str, dict] = {
    "field_3h": {
        "id": "field_3h",
        "name_tr": "Bronz Sandık",
        "visual_tier": "bronze",
        "unlock_hours": 0,
        "claim_cooldown_hours": 3,
        "open_seconds": 1,
        "coins": (45, 75),
        "flux": (2, 4),
        # Credits and Flux are guaranteed. Module and Core pieces use separate
        # absolute rolls so the public probabilities match the actual receipt.
        "shards": (1, 2),
        "shards_by_rarity": {"common": (1, 2)},
        "module_drop_chance": 0.35,
        "module_rarity_drop_odds": {"common": 0.35},
        "core_drop_chance": 0.0,
        "reward_odds": {"circuit_credits": 1.0, "flux_shards": 1.0, "module_shards": 0.35, "core_shards": 0.0},
        "allowed_rarities": ("common",),
        "rarity_odds": {
            "common": 1.0,
        },
    },
    "circuit_8h": {
        "id": "circuit_8h",
        "name_tr": "Gümüş Sandık",
        "visual_tier": "silver",
        "unlock_hours": 0,
        "claim_cooldown_hours": 8,
        "open_seconds": 1,
        "coins": (90, 145),
        "flux": (3, 6),
        "shards": (1, 3),
        "shards_by_rarity": {"common": (2, 3), "rare": (1, 2)},
        "module_drop_chance": 0.35,
        "module_rarity_drop_odds": {"common": 0.25, "rare": 0.10},
        "core_drop_chance": 0.0,
        "reward_odds": {"circuit_credits": 1.0, "flux_shards": 1.0, "module_shards": 0.35, "core_shards": 0.0},
        "allowed_rarities": ("common", "rare"),
        "rarity_odds": {
            # Absolute table: 25% common + 10% rare = 35% module drop.
            "common": 0.714285,
            "rare": 0.285715,
        },
    },
    "core_24h": {
        "id": "core_24h",
        "name_tr": "Altın Sandık",
        "visual_tier": "gold",
        "unlock_hours": 0,
        "claim_cooldown_hours": 16,
        "open_seconds": 1,
        "coins": (175, 280),
        "flux": (5, 9),
        "shards": (1, 4),
        "shards_by_rarity": {"common": (3, 4), "rare": (2, 3), "epic": (1, 2)},
        "module_drop_chance": 0.50,
        "module_rarity_drop_odds": {"common": 0.30, "rare": 0.15, "epic": 0.05},
        "core_drop_chance": 0.0,
        "reward_odds": {"circuit_credits": 1.0, "flux_shards": 1.0, "module_shards": 0.50, "core_shards": 0.0},
        "allowed_rarities": ("common", "rare", "epic"),
        "rarity_odds": {
            "common": 0.60,
            "rare": 0.30,
            "epic": 0.10,
        },
    },
    "diamond_24h": {
        "id": "diamond_24h",
        "name_tr": "Elmas Sandık",
        "visual_tier": "diamond",
        "unlock_hours": 0,
        "claim_cooldown_hours": 24,
        "open_seconds": 1,
        "coins": (320, 480),
        "flux": (10, 15),
        "shards": (1, 5),
        "shards_by_rarity": {
            "common": (4, 5),
            "rare": (3, 4),
            "epic": (2, 3),
            "legendary": (1, 1),
        },
        "module_drop_chance": 0.53,
        "module_rarity_drop_odds": {
            "common": 0.25,
            "rare": 0.15,
            "epic": 0.10,
            "legendary": 0.03,
        },
        "core_drop_chance": 0.06,
        "reward_odds": {"circuit_credits": 1.0, "flux_shards": 1.0, "module_shards": 0.53, "core_shards": 0.06},
        "allowed_rarities": ("common", "rare", "epic", "legendary"),
        "rarity_odds": {
            # Absolute table: 25/15/10/3 points inside a 53% module roll.
            "common": 0.471698,
            "rare": 0.283019,
            "epic": 0.188679,
            "legendary": 0.056604,
        },
    },
}

# Battle victories award lower-tier chests most often while keeping the higher
# tiers visible in ordinary play. Values are cumulative upper bounds.
BATTLE_CHEST_DROP_THRESHOLDS: tuple[tuple[float, str], ...] = (
    (0.03, "diamond_24h"),
    (0.12, "core_24h"),
    (0.35, "circuit_8h"),
    (1.00, "field_3h"),
)

def _daily_shop_chest_offer(
    offer_id: str,
    definition_id: str,
    cost: int,
) -> dict:
    """Bind rotating shop offers to the same reward contract as their tier."""
    definition = CHEST_DEFINITIONS[definition_id]
    return {
        "id": offer_id,
        "definition_id": definition_id,
        "name_tr": definition["name_tr"],
        "tier": definition["visual_tier"],
        "currency": "circuit_credits",
        "cost": cost,
        "circuit_credits": tuple(definition["coins"]),
        "flux_shards": tuple(definition["flux"]),
        "module_shards": tuple(definition["shards"]),
        "shards_by_rarity": dict(definition["shards_by_rarity"]),
        "core_shards": (0, 0),
        "reward_odds": dict(definition["reward_odds"]),
        "module_drop_chance": definition["module_drop_chance"],
        "module_rarity_drop_odds": dict(definition["module_rarity_drop_odds"]),
        "allowed_rarities": tuple(definition["allowed_rarities"]),
        "rarity_odds": dict(definition["rarity_odds"]),
    }


DAILY_SHOP_OFFERS: tuple[dict, ...] = (
    _daily_shop_chest_offer("bronze_daily", "field_3h", 120),
    _daily_shop_chest_offer("silver_daily", "circuit_8h", 400),
    _daily_shop_chest_offer("gold_daily", "core_24h", 900),
)
# Legacy symbol and offer ids stay valid for old receipts and clients.  The
# reset contract itself is weekly from Beta.56 onward.
WEEKLY_SHOP_OFFERS = DAILY_SHOP_OFFERS


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_utc(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def weekly_shop_period(now: datetime) -> tuple[str, datetime]:
    current = now.astimezone(timezone.utc)
    starts_at = (current - timedelta(days=current.weekday())).replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0,
    )
    return starts_at.date().isoformat(), starts_at + timedelta(days=7)


def parse_utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def arena_floor_for_rating(rating: int) -> int:
    return min(3600, (max(0, int(rating)) // 300) * 300)


def module_upgrade_cost(module_definition_id: str, current_level: int) -> dict:
    rarity = MODULE_RARITY.get(module_definition_id, "common")
    next_level = max(0, int(current_level)) + 1
    multiplier = RARITY_COST_MULTIPLIER[rarity]
    credit_curve = (100, 220, 380, 600, 900, 1300, 1800, 2400, 3150, 4050, 5150, 6500, 8100, 10000)
    shard_curve = (2, 4, 8, 14, 22, 32, 44, 58, 74, 92, 112, 136, 164, 200)
    index = min(13, next_level - 1)
    return {
        "next_level": next_level,
        "circuit_credits": round(credit_curve[index] * multiplier),
        "shards": shard_curve[index],
    }


def _hash_unit(seed: str) -> float:
    value = int(hashlib.sha256(seed.encode("utf-8")).hexdigest()[:13], 16)
    return value / float(0xFFFFFFFFFFFFF)


def _hash_range(seed: str, low: int, high: int) -> int:
    if high <= low:
        return low
    return low + int(_hash_unit(seed) * ((high - low) + 1)) % ((high - low) + 1)


def _module_shard_range(definition: dict, rarity: str) -> tuple[int, int]:
    """Return a tier-aware piece range, with fewer pieces for rarer modules."""
    ranges = definition.get("shards_by_rarity", {})
    selected = ranges.get(rarity, definition.get("shards", (0, 0)))
    return int(selected[0]), int(selected[1])


def _rarity_from_roll(odds: dict[str, float], roll: float) -> str:
    cursor = 0.0
    for rarity in ("legendary", "epic", "rare", "common"):
        cursor += float(odds.get(rarity, 0.0))
        if roll <= cursor:
            return rarity
    return "common"


def _module_ids_for_rarity(rarity: str, eligible_ids) -> list[str]:
    return [
        module_id
        for module_id in eligible_ids
        if MODULE_RARITY.get(module_id, "common") == rarity
    ]


def _select_reward_module(
    profile,
    seed: str,
    *,
    rarity: str | None = None,
    preferred_ids=(),
) -> tuple[str, str]:
    """Select one reward module without ever leaving the peak unlock pool."""
    eligible = unlocked_reward_module_ids(
        profile.rating,
        profile.highest_rating,
        preferred_ids,
    )
    candidates = _module_ids_for_rarity(rarity, eligible) if rarity else list(eligible)
    if not candidates:
        candidates = list(eligible)
    module_id = candidates[_hash_range(seed, 0, len(candidates) - 1)]
    return module_id, MODULE_RARITY.get(module_id, "common")


def _aggregate_chest_rewards(receipts: list[dict]) -> dict:
    """Combine a bulk opening into one server-authored reward summary."""
    circuit_credits = 0
    flux_shards = 0
    module_rewards: dict[str, dict] = {}
    core_rewards: dict[str, dict] = {}
    for receipt in receipts:
        rewards = dict(receipt.get("rewards") or {})
        circuit_credits += max(0, int(rewards.get("circuit_credits", 0)))
        flux_shards += max(0, int(rewards.get("flux_shards", 0)))

        module_amount = max(0, int(rewards.get("module_shards", 0)))
        module_id = str(rewards.get("module_definition_id") or "")
        if module_amount and module_id:
            entry = module_rewards.setdefault(module_id, {
                "module_definition_id": module_id,
                "module_rarity": str(rewards.get("module_rarity") or "common"),
                "module_shards": 0,
            })
            entry["module_shards"] += module_amount

        core_amount = max(0, int(rewards.get("core_shards", 0)))
        core_type_id = str(rewards.get("core_type_id") or "")
        if core_amount and core_type_id:
            entry = core_rewards.setdefault(core_type_id, {
                "core_type_id": core_type_id,
                "core_shards": 0,
            })
            entry["core_shards"] += core_amount

    return {
        "circuit_credits": circuit_credits,
        "flux_shards": flux_shards,
        "module_shards": sum(item["module_shards"] for item in module_rewards.values()),
        "core_shards": sum(item["core_shards"] for item in core_rewards.values()),
        "module_rewards": list(module_rewards.values()),
        "core_rewards": list(core_rewards.values()),
    }


def unlocked_core_type_ids(profile) -> tuple[str, ...]:
    peak = max(int(profile.highest_rating), int(profile.rating))
    return tuple(
        core["id"]
        for core in CORE_TYPES
        if peak >= (int(core["unlock_arena"]) - 1) * 300
    )


def core_reward_type_id(profile, seed: str) -> str:
    unlocked = unlocked_core_type_ids(profile)
    return unlocked[_hash_range(f"{seed}:core-type", 0, len(unlocked) - 1)]


class MetaProgressionService:
    def __init__(self, now_func: Callable[[], datetime] = utc_now):
        self._now_func = now_func
        self._lock = RLock()

    def arena_path(self, profile) -> list[dict]:
        peak = max(profile.rating, profile.highest_rating)
        core_unlocks = {int(core["unlock_arena"]): core for core in CORE_TYPES}
        return [
            {**arena, "unlocked": peak >= arena["minimum_rating"],
             "core_unlock": {key: value for key, value in core_unlocks[arena["index"]].items() if key != "skills"} if arena["index"] in core_unlocks else None,
             "nodes": [{**node, "rewards": self._arena_reward_preview(profile, node),
                        "claimed": node["id"] in profile.arena_reward_claims,
                        "claimable": peak >= node["trophies"] and node["id"] not in profile.arena_reward_claims}
                       for node in arena["nodes"]]}
            for arena in ARENAS
        ]

    def _arena_reward_preview(self, profile, node: dict) -> dict:
        rewards = dict(node.get("rewards", {}))
        shard_count = int(rewards.get("module_shards", 0))
        if shard_count:
            module_id = rewards.get("module_shard_target")
            if not module_id:
                module_id, _ = _select_reward_module(
                    profile,
                    f"{profile.player_id}:{node['id']}:module",
                )
            rewards["module_definition_id"] = module_id
        if "core_shards" in rewards:
            rewards["core_type_id"] = core_reward_type_id(profile, node["id"])
        return rewards

    def claim_arena_reward(self, profile, node_id: str) -> dict:
        with self._lock:
            node = next(
                (
                    node
                    for stage in (*ARENAS, *RANK_STAGES)
                    for node in stage.get("nodes", ())
                    if node["id"] == node_id
                ),
                None,
            )
            if node is None:
                raise MetaProgressionError("Arena ödülü bulunamadı.")
            if node_id in profile.arena_reward_claims:
                return {"node_id": node_id, "replayed": True}
            if max(profile.rating, profile.highest_rating) < node["trophies"]:
                raise MetaProgressionError("Bu ödülün kupa eşiğine henüz ulaşmadın.")
            rewards = dict(node["rewards"])
            profile.circuit_credits += rewards.get("circuit_credits", 0)
            profile.flux_shards += rewards.get("flux_shards", 0)
            core_count = int(rewards.get("core_shards", 0))
            # Keep a stable identity in receipts for older clients; the count
            # is zero on every road node, so no fragments are awarded here.
            core_type_id = core_reward_type_id(profile, node_id)
            self.award_core_pieces(profile, core_count, node_id)
            shard_rewards = {}
            shard_target = rewards.get("module_shard_target") or rewards.get("module_id")
            if shard_target:
                shard_rewards[shard_target] = (
                    int(rewards.get("module_shards", 0))
                    if rewards.get("module_shard_target")
                    else 2
                )
            generic_shard_count = 0 if rewards.get("module_shard_target") else int(rewards.get("module_shards", 0))
            if generic_shard_count:
                module_id, _ = _select_reward_module(
                    profile,
                    f"{profile.player_id}:{node_id}:module",
                )
                shard_rewards[module_id] = generic_shard_count
            for module_id, amount in shard_rewards.items():
                profile.module_shards[module_id] = profile.module_shards.get(module_id, 0) + amount
            module_definition_id = next(iter(shard_rewards), None)
            if module_definition_id:
                rewards["module_definition_id"] = module_definition_id
            if core_type_id:
                rewards["core_type_id"] = core_type_id
            if rewards.get("chest_id"):
                definition = CHEST_DEFINITIONS[rewards["chest_id"]]
                now = self._now_func()
                profile.chest_slots.append({"chest_id": f"arena-{uuid4().hex}", "definition_id": definition["id"],
                    "name_tr": definition["name_tr"], "source": node_id, "source_battle_id": None,
                    # Kept as legacy display metadata; it no longer blocks
                    # accumulation or bulk opening beyond four chests.
                    "overflow": len(profile.chest_slots) >= 4,
                    "awarded_at": iso_utc(now), "unlocks_at": iso_utc(now + timedelta(hours=definition["unlock_hours"]))})
            profile.arena_reward_claims = (*profile.arena_reward_claims, node_id)
            return {
                "node_id": node_id,
                "rewards": rewards,
                "module_shards": shard_rewards,
                "module_definition_id": module_definition_id,
                "core_type_id": core_type_id,
            }

    def view(self, profile) -> dict:
        current_rank = rank_stage_for_rating(profile.rating)
        profile.highest_rating = max(profile.highest_rating, profile.rating)
        now = self._now_func()
        shop_day, shop_reset_at = weekly_shop_period(now)
        purchased = (
            set(profile.shop_purchased_offer_ids)
            if profile.shop_purchase_day == shop_day
            else set()
        )
        return {
            "statistics": {
                **profile.lifetime_stats,
                "current_trophies": profile.rating,
                "highest_trophies": max(profile.rating, profile.highest_rating),
                "rank": current_rank["name_tr"],
                "unlocked_modules": len(unlocked_module_ids(profile.highest_rating)),
                "upgraded_modules": sum(v > 0 for v in profile.module_upgrade_levels.values()),
                "highest_module_level": 1 + max(profile.module_upgrade_levels.values(), default=0),
                "unlocked_cores": sum(profile.highest_rating >= (c["unlock_arena"] - 1) * 300 for c in CORE_TYPES),
                "opened_chests": len(profile.chest_receipts) + len(profile.shop_receipts),
                "most_used_decks": [{"module_ids": key.split("|"), "matches": count} for key, count in sorted(profile.lifetime_stats.get("decks", {}).items(), key=lambda p: -p[1])[:3]],
            },
            "season_id": profile.active_meta_season_id,
            "rank": current_rank,
            "rank_stages": [
                {
                    **stage,
                    "nodes": [
                        {
                            **node,
                            "rewards": self._arena_reward_preview(profile, node),
                            "claimed": node["id"] in profile.arena_reward_claims,
                            "claimable": (
                                max(profile.rating, profile.highest_rating) >= node["trophies"]
                                and node["id"] not in profile.arena_reward_claims
                            ),
                        }
                        for node in stage.get("nodes", ())
                    ],
                }
                for stage in RANK_STAGES
            ],
            "arena_floor": arena_floor_for_rating(profile.rating),
            "coins": profile.circuit_credits,  # compatibility only
            "arena_path": self.arena_path(profile),
            "highest_rating": profile.highest_rating,
            "flux_shards": profile.flux_shards,
            "circuit_credits": profile.circuit_credits,
            "core_shards": profile.core_shards,
            "universal_module_shards": profile.universal_module_shards,
            "module_collection": [
                self._module_view(profile, module_id, current_rank)
                for module_id in MODULES
            ],
            "chests": {
                "slots": [dict(item) for item in profile.chest_slots],
                "inventory": self._owned_chest_inventory_view(profile, now),
                "definitions": [
                    self._gift_chest_definition_view(profile, definition, now)
                    for definition in CHEST_DEFINITIONS.values()
                ],
                "server_time": iso_utc(now),
            },
            "shop": {
                "day": shop_day,
                "week": shop_day,
                "period": "weekly",
                "reset_at": iso_utc(shop_reset_at),
                "offers": [
                    {
                        "id": offer["id"],
                        "definition_id": offer["definition_id"],
                        "name_tr": offer["name_tr"],
                        "tier": offer["tier"],
                        "currency": offer["currency"],
                        "cost": offer["cost"],
                        "purchased": offer["id"] in purchased,
                        "reward_preview": {
                            "circuit_credits": list(offer["circuit_credits"]),
                            "flux_shards": list(offer["flux_shards"]),
                            "module_shards": list(offer["module_shards"]),
                            "core_shards": list(offer["core_shards"]),
                        },
                        "reward_odds": dict(offer["reward_odds"]),
                        "module_drop_chance": offer["module_drop_chance"],
                        "module_rarity_drop_odds": dict(offer["module_rarity_drop_odds"]),
                        "rarity_odds": dict(offer["rarity_odds"]),
                        "shards_by_rarity": {
                            rarity: list(amount_range)
                            for rarity, amount_range in offer["shards_by_rarity"].items()
                        },
                    }
                    for offer in WEEKLY_SHOP_OFFERS
                ],
            },
            "cores": {
                "selected_core_type": profile.selected_core_type,
                "skill_points": profile.core_skill_points,
                "ranked_normalized": False,
                "competitive_power_enabled": True,
                "types": [self._core_view(profile, item, current_rank) for item in CORE_TYPES],
            },
            "season_archives": [dict(item) for item in profile.season_archives],
            "economy_separation": {
                "module_upgrades": "circuit_credits_and_module_shards",
                "laboratory": "flux_shards",
                "ranked_normalized": False,
            },
        }

    def _owned_chest_inventory_view(self, profile, now: datetime) -> list[dict]:
        inventory: list[dict] = []
        for definition in CHEST_DEFINITIONS.values():
            owned = [
                chest
                for chest in profile.chest_slots
                if str(chest.get("definition_id")) == str(definition["id"])
            ]
            openable = []
            locked_until: list[datetime] = []
            for chest in owned:
                try:
                    unlocks_at = parse_utc(str(chest.get("unlocks_at", "")))
                except (TypeError, ValueError):
                    # Old entries without a valid timer remain usable.
                    unlocks_at = now
                if unlocks_at <= now:
                    openable.append(chest)
                else:
                    locked_until.append(unlocks_at)
            inventory.append({
                "definition_id": definition["id"],
                "name_tr": definition["name_tr"],
                "visual_tier": definition["visual_tier"],
                "count": len(owned),
                "openable_count": len(openable),
                "locked_count": len(owned) - len(openable),
                "next_unlock_at": (
                    iso_utc(min(locked_until)) if locked_until else None
                ),
            })
        return inventory

    def _gift_chest_definition_view(self, profile, definition: dict, now: datetime) -> dict:
        """Expose a deterministic server countdown for each free chest.

        Gift chests are opened immediately, so the only gate is the per-tier
        claim cooldown.  Keeping the timestamp in the API lets the client
        render a countdown without relying on a local clock or a stale daily
        reset flag.
        """
        latest = max(
            (
                receipt
                for receipt in profile.gift_chest_claim_receipts.values()
                if str(receipt.get("definition_id")) == str(definition["id"])
                and receipt.get("claimed_at")
            ),
            key=lambda receipt: receipt.get("claimed_at", ""),
            default=None,
        )
        cooldown = timedelta(hours=float(definition.get("claim_cooldown_hours", 0)))
        next_claim_at = None
        remaining = 0
        if latest is not None:
            try:
                next_moment = parse_utc(str(latest["claimed_at"])) + cooldown
                if next_moment > now:
                    next_claim_at = iso_utc(next_moment)
                    remaining = max(1, int((next_moment - now).total_seconds()))
            except (KeyError, TypeError, ValueError):
                # A legacy receipt without a parseable timestamp is treated as
                # available instead of wedging the shop forever.
                pass
        return {
            **definition,
            "rarity_odds": dict(definition["rarity_odds"]),
            "claim_available": remaining <= 0,
            "next_claim_at": next_claim_at,
            "claim_remaining_seconds": remaining,
        }

    def _module_view(self, profile, module_id: str, current_rank: dict) -> dict:
        definition = BASIC_MODULE_DEFINITIONS[module_id]
        rarity = MODULE_RARITY.get(module_id, "common")
        unlock_arena = MODULES[module_id]["unlock_arena"]
        current_arena = (
            int(current_rank["index"])
            if current_rank["kind"] == "arena"
            else 12
        )
        level = int(profile.module_upgrade_levels.get(module_id, 0))
        selected_talent_count = len(profile.module_talents.get(module_id, {}))
        catalog_copy = MODULE_CATALOG_COPY.get(module_id, {})
        return {
            "definition_id": module_id,
            "name_tr": definition.name_tr,
            "category": MODULES[module_id]["category"],
            "rarity": rarity,
            "unlock_arena": unlock_arena,
            "unlock_trophies": MODULES[module_id]["unlock_trophies"],
            "unlocked": max(profile.highest_rating, profile.rating) >= MODULES[module_id]["unlock_trophies"],
            "level": level,
            "shards": int(profile.module_shards.get(module_id, 0)),
            "next_upgrade_cost": module_upgrade_cost(module_id, level) if level < 14 else None,
            "max_level": 15,
            "current_cost": MODULES[module_id]["current_cost"],
            "description_tr": definition.description_tr,
            "description_en": catalog_copy.get("description_en", ""),
            "strategic_role": definition.strategic_role,
            "strategic_role_en": catalog_copy.get("strategic_role_en", ""),
            "effect_lines": list(MODULE_EFFECT_LINES.get(module_id, ())),
            "effect_lines_en": list(catalog_copy.get("effect_lines_en", ())),
            "strong_against": list(definition.strong_against),
            "weak_against": list(definition.weak_against),
            "synergy_with": list(definition.synergy_with),
            "stats": module_stats(definition, level, profile.module_talents.get(module_id)),
            "next_stats": module_stats(definition, level + 1, profile.module_talents.get(module_id)) if level < 14 else None,
            "talents": [{**node, "selected": profile.module_talents.get(module_id, {}).get(node["tier"])} for node in module_talent_options(module_id)],
            "talent_levels": {"common": [5, 8, 11, 14], "rare": [6, 9, 12, 15], "epic": [7, 10, 13, 15], "legendary": [8, 11, 14, 15]}[rarity],
            "selected_talent_count": selected_talent_count,
            "talent_reset_cost_flux": (
                selected_talent_count * MODULE_TALENT_RESET_COST_PER_SELECTION
            ),
            "ranked_normalized": False,
        }

    def _core_view(self, profile, core_type: dict, current_rank: dict) -> dict:
        unlocked = max(profile.highest_rating, profile.rating) >= (core_type["unlock_arena"] - 1) * 300
        counter = max(0, min(14, profile.core_upgrade_levels.get(core_type["id"], 0)))
        rarity_profile = core_rarity_profile(core_type["id"])
        return {
            **{key: value for key, value in core_type.items() if key != "skills"},
            "unlocked": unlocked, "selected": profile.selected_core_type == core_type["id"],
            "level": counter + 1, "shards": profile.core_shards_by_type.get(core_type["id"], 0),
            "legacy_shards": profile.core_shards,
            "energy_per_second": round(
                BASE_CORE_GENERATION_PER_SECOND
                * CORE_LEVEL_GENERATION_MULTIPLIER ** counter
                * rarity_profile["energy"]
                * (1 + .03 * sum(s.endswith("_energy") for s in profile.core_skills.get(core_type["id"], ()))),
                2,
            ),
            "energy_capacity": 100 + counter * 3,
            "rarity_bonuses": {
                key: round(value, 3)
                for key, value in rarity_profile.items()
            },
            "next_upgrade_cost": {"flux_shards": 20 * (counter + 1), "shards": (2, 4, 8, 12, 20, 30, 45, 65, 90, 120, 160, 210, 270, 340)[counter]} if counter < 14 else None,
            "skills": [{**skill, "learned": skill["id"] in profile.core_skills.get(core_type["id"], ()),
                        "tier_selected": any(s.startswith(skill["tier"] + "_") for s in profile.core_skills.get(core_type["id"], ()))} for skill in core_type["skills"]],
            "ranked_normalized": False,
        }

    def upgrade_core(self, profile, core_id: str, request_id: str) -> dict:
        with self._lock:
            previous = profile.core_receipts.get(request_id)
            if previous:
                if previous.get("core_type_id") != core_id or previous.get("operation") != "upgrade":
                    raise MetaProgressionError("Talep kimliği farklı bir işleme ait.")
                return dict(previous)
            if not request_id.strip():
                raise MetaProgressionError("Talep kimliği zorunludur.")
            core = next((c for c in self.view(profile)["cores"]["types"] if c["id"] == core_id), None)
            if not core or not core["unlocked"]:
                raise MetaProgressionError("Çekirdek henüz açılmadı.")
            cost = core["next_upgrade_cost"]
            if not cost:
                raise MetaProgressionError("Çekirdek azami seviyede.")
            owned = profile.core_shards_by_type.get(core_id, 0)
            if profile.flux_shards < cost["flux_shards"] or owned + profile.core_shards < cost["shards"]:
                raise MetaProgressionError(f"Gerekli: {cost['flux_shards']} Akı ve {cost['shards']} çekirdek parçası.")
            profile.flux_shards -= cost["flux_shards"]
            used = min(owned, cost["shards"])
            profile.core_shards_by_type[core_id] = owned - used
            profile.core_shards -= cost["shards"] - used  # Preserve spendability of legacy generic pieces.
            profile.core_upgrade_levels[core_id] = core["level"]
            receipt = {"request_id": request_id, "operation": "upgrade", "core_type_id": core_id, "level": core["level"] + 1}
            profile.core_receipts[request_id] = receipt
            return dict(receipt)

    def choose_module_talent(self, profile, module_id: str, tier: str, choice: str, request_id: str) -> dict:
        with self._lock:
            if not request_id.strip() or module_id not in MODULES:
                raise MetaProgressionError("Geçersiz yetenek isteği.")
            previous = profile.module_upgrade_receipts.get(request_id)
            if previous:
                if (previous.get("module_definition_id"), previous.get("tier"), previous.get("choice")) != (module_id, tier, choice):
                    raise MetaProgressionError("Talep kimliği farklı bir işleme ait.")
                return dict(previous)
            node = next((n for n in module_talent_options(module_id) if n["tier"] == tier), None)
            if not node or choice not in {c["id"] for c in node["choices"]}:
                raise MetaProgressionError("Yetenek bulunamadı.")
            if module_id not in unlocked_module_ids(max(profile.highest_rating, profile.rating)) or profile.module_upgrade_levels.get(module_id, 0) + 1 < node["level"]:
                raise MetaProgressionError("Gerekli modül seviyesine ulaşılmadı.")
            choices = profile.module_talents.setdefault(module_id, {})
            if tier in choices:
                raise MetaProgressionError("Bu eşikte zaten bir uzmanlık seçildi.")
            if profile.flux_shards < node["flux_cost"]:
                raise MetaProgressionError("Yetenek için Akı yetersiz.")
            profile.flux_shards -= node["flux_cost"]
            choices[tier] = choice
            receipt = {"request_id": request_id, "module_definition_id": module_id, "tier": tier, "choice": choice}
            profile.module_upgrade_receipts[request_id] = receipt
            return dict(receipt)

    def reset_module_talents(self, profile, module_id: str, request_id: str) -> dict:
        with self._lock:
            clean_request_id = request_id.strip()
            if not clean_request_id or module_id not in MODULES:
                raise MetaProgressionError("Geçersiz yetenek sıfırlama isteği.")
            previous = profile.module_upgrade_receipts.get(clean_request_id)
            if previous:
                if (
                    previous.get("operation") != "talent_reset"
                    or previous.get("module_definition_id") != module_id
                ):
                    raise MetaProgressionError("Talep kimliği farklı bir işleme ait.")
                return dict(previous)

            selected = dict(profile.module_talents.get(module_id, {}))
            if not selected:
                raise MetaProgressionError("Bu modülde sıfırlanacak yetenek yok.")
            reset_cost = len(selected) * MODULE_TALENT_RESET_COST_PER_SELECTION
            if profile.flux_shards < reset_cost:
                raise MetaProgressionError(
                    f"Yetenekleri sıfırlamak için {reset_cost} Akı gerekli."
                )

            profile.flux_shards -= reset_cost
            profile.module_talents.pop(module_id, None)
            receipt = {
                "request_id": clean_request_id,
                "operation": "talent_reset",
                "module_definition_id": module_id,
                "reset_selection_count": len(selected),
                "flux_shards_spent": reset_cost,
            }
            profile.module_upgrade_receipts[clean_request_id] = dict(receipt)
            return receipt

    def upgrade_module(self, profile, module_id: str, request_id: str) -> dict:
        with self._lock:
            return self._upgrade_module(profile, module_id, request_id)

    def _upgrade_module(self, profile, module_id: str, request_id: str) -> dict:
        request_id = request_id.strip()
        if not request_id:
            raise MetaProgressionError("Yükseltme talep kimliği zorunludur.")
        if request_id in profile.module_upgrade_receipts:
            receipt = profile.module_upgrade_receipts[request_id]
            if receipt.get("module_definition_id") != module_id or "level_after" not in receipt:
                raise MetaProgressionError("Talep kimliği farklı bir işleme ait.")
            return dict(receipt)
        if module_id not in MODULES:
            raise MetaProgressionError("Yükseltilebilir modül bulunamadı.")
        module_view = next(
            item for item in self.view(profile)["module_collection"]
            if item["definition_id"] == module_id
        )
        if not module_view["unlocked"]:
            raise MetaProgressionError("Bu modül henüz bulunduğun arenada açılmadı.")
        level = int(profile.module_upgrade_levels.get(module_id, 0))
        if level >= 14:
            raise MetaProgressionError("Modül azami seviyede.")
        cost = module_upgrade_cost(module_id, level)
        shards = int(profile.module_shards.get(module_id, 0))
        universal_shards = max(0, int(profile.universal_module_shards))
        if profile.circuit_credits < cost["circuit_credits"] or shards + universal_shards < cost["shards"]:
            raise MetaProgressionError(f"Gerekli: {cost['circuit_credits']} Devre Kredisi ve {cost['shards']} modül parçası.")
        profile.circuit_credits -= int(cost["circuit_credits"])
        card_shards_spent = min(shards, int(cost["shards"]))
        universal_spent = int(cost["shards"]) - card_shards_spent
        profile.module_shards[module_id] = shards - card_shards_spent
        profile.universal_module_shards = universal_shards - universal_spent
        profile.module_upgrade_levels[module_id] = int(cost["next_level"])
        receipt = {
            "request_id": request_id,
            "module_definition_id": module_id,
            "level_before": level,
            "level_after": int(cost["next_level"]),
            "circuit_credits_spent": int(cost["circuit_credits"]),
            "shards_spent": int(cost["shards"]),
            "module_shards_spent": card_shards_spent,
            "universal_module_shards_spent": universal_spent,
            "ranked_normalized": False,
        }
        profile.module_upgrade_receipts[request_id] = dict(receipt)
        return receipt

    def claim_gift_chest(self, profile, definition_id: str, request_id: str) -> dict:
        with self._lock:
            return self._claim_gift_chest(profile, definition_id, request_id)

    def claim_and_open_gift_chest(
        self,
        profile,
        definition_id: str,
        request_id: str,
    ) -> dict:
        """Claim a timed shop gift and apply its rewards in one operation.

        Gift chests are not inventory chests: the player opens them from the
        shop and sees the reward immediately. Deterministic request ids make a
        retry return the same reward instead of rolling or crediting it twice.
        """
        with self._lock:
            claim_receipt = self._claim_gift_chest(
                profile,
                definition_id,
                request_id,
            )
            chest = dict(claim_receipt.get("chest") or {})
            receipt = self._open_chest(
                profile,
                str(chest["chest_id"]),
                f"{request_id}:instant-open",
            )
            receipt["chest"] = chest
            receipt["claim_day"] = claim_receipt.get("claim_day")
            receipt["claimed_at"] = claim_receipt.get("claimed_at")
            return receipt

    def _claim_gift_chest(
        self,
        profile,
        definition_id: str,
        request_id: str,
    ) -> dict:
        request_id = request_id.strip()
        if not request_id:
            raise MetaProgressionError("Sandık talep kimliği zorunludur.")
        if request_id in profile.gift_chest_claim_receipts:
            receipt = profile.gift_chest_claim_receipts[request_id]
            if receipt.get("definition_id") != definition_id:
                raise MetaProgressionError("Talep kimliği farklı bir sandığa ait.")
            return dict(receipt)
        definition = CHEST_DEFINITIONS.get(definition_id)
        if definition is None:
            raise MetaProgressionError("Hediye sandık türü bulunamadı.")
        now = self._now_func()
        claim_day = now.date().isoformat()
        previous = max(
            (
                receipt
                for receipt in profile.gift_chest_claim_receipts.values()
                if str(receipt.get("definition_id")) == definition_id
                and receipt.get("claimed_at")
            ),
            key=lambda receipt: receipt.get("claimed_at", ""),
            default=None,
        )
        if previous is not None:
            try:
                next_claim_at = parse_utc(str(previous["claimed_at"])) + timedelta(
                    hours=float(definition.get("claim_cooldown_hours", 0))
                )
            except (KeyError, TypeError, ValueError):
                next_claim_at = now
            if next_claim_at > now:
                remaining = max(1, int((next_claim_at - now).total_seconds()))
                raise MetaProgressionError(
                    f"Bu sandık {remaining} saniye sonra yeniden açılabilir."
                )
        chest = {
            "chest_id": f"gift-{uuid4().hex}",
            "definition_id": definition_id,
            "name_tr": definition["name_tr"],
            "source_battle_id": None,
            "source": "daily_gift",
            "awarded_at": iso_utc(now),
            "unlocks_at": iso_utc(now + timedelta(hours=definition["unlock_hours"])),
        }
        profile.chest_slots.append(chest)
        receipt = {
            "request_id": request_id,
            "definition_id": definition_id,
            "claim_day": claim_day,
            "claimed_at": iso_utc(now),
            "chest": dict(chest),
        }
        profile.gift_chest_claim_receipts[request_id] = dict(receipt)
        return receipt

    def award_battle_chest(self, profile, battle_id: str, won: bool) -> dict | None:
        with self._lock:
            return self._award_battle_chest(profile, battle_id, won)

    def award_instant_chest(
        self,
        profile,
        definition_id: str,
        source_id: str,
        request_id: str,
    ) -> dict:
        """Create and open a non-slot reward chest in one persisted operation."""
        with self._lock:
            request_id = request_id.strip()
            if not request_id:
                raise MetaProgressionError("Sandık talep kimliği zorunludur.")
            previous = profile.chest_receipts.get(request_id)
            if previous is not None:
                if previous.get("source_id") != source_id:
                    raise MetaProgressionError("Talep kimliği farklı bir sandığa ait.")
                return dict(previous)
            definition = CHEST_DEFINITIONS.get(definition_id)
            if definition is None:
                raise MetaProgressionError("Ödül sandığı türü bulunamadı.")
            awarded_at = self._now_func()
            chest = {
                "chest_id": f"instant-{uuid4().hex}",
                "definition_id": definition_id,
                "name_tr": definition["name_tr"],
                "source_battle_id": None,
                "source": source_id,
                "awarded_at": iso_utc(awarded_at),
                "unlocks_at": iso_utc(awarded_at),
            }
            profile.chest_slots.append(chest)
            receipt = self._open_chest(profile, chest["chest_id"], request_id)
            receipt["source_id"] = source_id
            profile.chest_receipts[request_id] = dict(receipt)
            return receipt

    def _award_battle_chest(self, profile, battle_id: str, won: bool) -> dict | None:
        if any(r.get("source_battle_id") == battle_id for r in profile.chest_receipts.values()):
            return None
        if not won:
            return None
        if any(item.get("source_battle_id") == battle_id for item in profile.chest_slots):
            return next(item for item in profile.chest_slots if item.get("source_battle_id") == battle_id)
        roll = _hash_unit(f"{battle_id}:{profile.player_id}:chest")
        definition_id = next(
            chest_id
            for upper_bound, chest_id in BATTLE_CHEST_DROP_THRESHOLDS
            if roll < upper_bound
        )
        definition = CHEST_DEFINITIONS[definition_id]
        awarded_at = self._now_func()
        chest = {
            "chest_id": f"chest-{uuid4().hex}",
            "definition_id": definition_id,
            "name_tr": definition["name_tr"],
            "source_battle_id": battle_id,
            "awarded_at": iso_utc(awarded_at),
            "unlocks_at": iso_utc(awarded_at + timedelta(hours=definition["unlock_hours"])),
        }
        profile.chest_slots.append(chest)
        return dict(chest)

    def open_chest(self, profile, chest_id: str, request_id: str) -> dict:
        with self._lock:
            return self._open_chest(profile, chest_id, request_id)

    def open_all_available_chests(
        self,
        profile,
        definition_id: str,
        request_id: str,
    ) -> dict:
        with self._lock:
            clean_request_id = request_id.strip()
            if not clean_request_id:
                raise MetaProgressionError("Toplu sandık talep kimliği zorunludur.")
            if definition_id not in CHEST_DEFINITIONS:
                raise MetaProgressionError("Sandık türü bulunamadı.")
            previous = profile.chest_batch_receipts.get(clean_request_id)
            if previous is not None:
                if previous.get("definition_id") != definition_id:
                    raise MetaProgressionError("Talep kimliği farklı bir sandık türüne ait.")
                return dict(previous)

            child_prefix = f"{clean_request_id}:"
            receipts = [
                dict(receipt)
                for child_request_id, receipt in profile.chest_receipts.items()
                if child_request_id.startswith(child_prefix)
                and receipt.get("definition_id") == definition_id
            ]
            now = self._now_func()
            candidates = []
            for chest in profile.chest_slots:
                if str(chest.get("definition_id")) != definition_id:
                    continue
                try:
                    unlocks_at = parse_utc(str(chest.get("unlocks_at", "")))
                except (TypeError, ValueError):
                    unlocks_at = now
                if unlocks_at <= now:
                    candidates.append(chest)
            candidates.sort(
                key=lambda chest: (
                    str(chest.get("awarded_at", "")),
                    str(chest.get("chest_id", "")),
                )
            )

            errors = []
            for chest in candidates:
                chest_id = str(chest.get("chest_id", ""))
                child_request_id = f"{clean_request_id}:{chest_id}"
                try:
                    receipt = self._open_chest(
                        profile,
                        chest_id,
                        child_request_id,
                    )
                except (MetaProgressionError, KeyError, TypeError, ValueError) as exc:
                    errors.append({"chest_id": chest_id, "detail": str(exc)})
                    continue
                receipts.append(dict(receipt))

            remaining_count = sum(
                1
                for chest in profile.chest_slots
                if str(chest.get("definition_id")) == definition_id
            )
            batch_receipt = {
                "request_id": clean_request_id,
                "definition_id": definition_id,
                "opened_at": iso_utc(now),
                "opened_count": len(receipts),
                "remaining_count": remaining_count,
                "receipts": receipts,
                "reward_totals": _aggregate_chest_rewards(receipts),
                "errors": errors,
                "partial": bool(errors),
            }
            profile.chest_batch_receipts[clean_request_id] = dict(batch_receipt)
            return batch_receipt

    def _open_chest(self, profile, chest_id: str, request_id: str) -> dict:
        request_id = request_id.strip()
        if not request_id:
            raise MetaProgressionError("Sandık talep kimliği zorunludur.")
        if request_id in profile.chest_receipts:
            receipt = profile.chest_receipts[request_id]
            if receipt.get("chest_id") != chest_id:
                raise MetaProgressionError("Talep kimliği farklı bir sandığa ait.")
            return dict(receipt)
        chest = next((item for item in profile.chest_slots if item.get("chest_id") == chest_id), None)
        if chest is None:
            raise MetaProgressionError("Sandık bulunamadı veya daha önce açıldı.")
        now = self._now_func()
        definition = CHEST_DEFINITIONS[str(chest["definition_id"])]
        seed = f"{profile.player_id}:{chest_id}"
        coins = _hash_range(f"{seed}:coins", *definition["coins"])
        rarity = _rarity_from_roll(definition["rarity_odds"], _hash_unit(f"{seed}:rarity"))
        module_id, rarity = _select_reward_module(
            profile,
            f"{seed}:module",
            rarity=rarity,
        )
        module_drop = _hash_unit(f"{seed}:module-drop") < float(definition.get("module_drop_chance", 1.0))
        shard_range = _module_shard_range(definition, rarity)
        shards = (
            _hash_range(f"{seed}:shards", *shard_range)
            if module_drop
            else 0
        )
        profile.circuit_credits += coins
        flux = _hash_range(f"{seed}:flux", *definition["flux"])
        # Core fragments are an endgame chase item and only come from the
        # highest tier chest.  Other reward paths deliberately return zero.
        core_drop = (
            definition["id"] == "diamond_24h"
            and _hash_unit(f"{seed}:core-drop")
            < float(definition.get("core_drop_chance", 0.0))
        )
        core_pieces = 1 if core_drop else 0
        core_type = core_reward_type_id(profile, seed)
        self.award_core_pieces(profile, core_pieces, seed)
        profile.flux_shards += flux
        # Keep the selected module identity in the receipt even on a miss so
        # clients can explain the deterministic roll; only a successful roll
        # changes the player's shard balance.
        profile.module_shards.setdefault(module_id, int(profile.module_shards.get(module_id, 0)))
        if shards:
            profile.module_shards[module_id] += shards
        profile.chest_slots = [item for item in profile.chest_slots if item.get("chest_id") != chest_id]
        receipt = {
            "request_id": request_id,
            "chest_id": chest_id,
            "source_battle_id": chest.get("source_battle_id"),
            "definition_id": definition["id"],
            "opened_at": iso_utc(now),
            "rewards": {
                "circuit_credits": coins,
                "flux_shards": flux,
                "core_shards": core_pieces,
                "core_type_id": core_type,
                "core_drop": core_drop,
                "module_definition_id": module_id,
                "module_rarity": rarity,
                "module_shards": shards,
                "module_drop": module_drop,
            },
        }
        profile.chest_receipts[request_id] = dict(receipt)
        return receipt

    def purchase_daily_offer(self, profile, offer_id: str, request_id: str) -> dict:
        with self._lock:
            return self._purchase_daily_offer(profile, offer_id, request_id)

    def _purchase_daily_offer(self, profile, offer_id: str, request_id: str) -> dict:
        request_id = request_id.strip()
        if not request_id:
            raise MetaProgressionError("Mağaza talep kimliği zorunludur.")
        if request_id in profile.shop_receipts:
            receipt = profile.shop_receipts[request_id]
            if receipt.get("offer_id") != offer_id:
                raise MetaProgressionError("Talep kimliği farklı bir teklife ait.")
            return dict(receipt)
        offer = next((item for item in WEEKLY_SHOP_OFFERS if item["id"] == offer_id), None)
        if offer is None:
            raise MetaProgressionError("Haftalık teklif bulunamadı.")
        shop_day, _ = weekly_shop_period(self._now_func())
        if profile.shop_purchase_day != shop_day:
            profile.shop_purchase_day = shop_day
            profile.shop_purchased_offer_ids = ()
        if offer_id in profile.shop_purchased_offer_ids:
            raise MetaProgressionError("Bu haftalık teklif daha önce alındı.")
        currency = str(offer["currency"])
        balance = int(getattr(profile, currency))
        cost = int(offer["cost"])
        if balance < cost:
            raise MetaProgressionError("Bu sandık için kaynak yetersiz.")

        seed = f"{profile.player_id}:{shop_day}:{offer_id}"
        rarity = _rarity_from_roll(offer["rarity_odds"], _hash_unit(f"{seed}:rarity"))
        module_id, rarity = _select_reward_module(
            profile,
            f"{seed}:module",
            rarity=rarity,
        )
        module_drop = _hash_unit(f"{seed}:module-drop") < float(offer.get("module_drop_chance", 1.0))
        shard_range = _module_shard_range(offer, rarity)
        rewards = {
            "circuit_credits": _hash_range(f"{seed}:credits", *offer["circuit_credits"]),
            "flux_shards": _hash_range(f"{seed}:flux", *offer["flux_shards"]),
            "module_definition_id": module_id,
            "module_rarity": rarity,
            "module_shards": (
                _hash_range(f"{seed}:module-shards", *shard_range)
                if module_drop
                else 0
            ),
            "core_shards": _hash_range(f"{seed}:core-shards", *offer["core_shards"]),
            "module_drop": module_drop,
        }
        setattr(profile, currency, balance - cost)
        profile.circuit_credits += int(rewards["circuit_credits"])
        profile.flux_shards += int(rewards["flux_shards"])
        rewards["core_type_id"] = core_reward_type_id(profile, seed)
        self.award_core_pieces(profile, int(rewards["core_shards"]), seed)
        profile.module_shards.setdefault(module_id, int(profile.module_shards.get(module_id, 0)))
        if rewards["module_shards"]:
            profile.module_shards[module_id] += int(rewards["module_shards"])
        profile.shop_purchased_offer_ids = tuple(
            dict.fromkeys((*profile.shop_purchased_offer_ids, offer_id))
        )
        receipt = {
            "request_id": request_id,
            "offer_id": offer_id,
            "purchased_at": iso_utc(self._now_func()),
            "currency": currency,
            "cost": cost,
            "rewards": rewards,
        }
        profile.shop_receipts[request_id] = dict(receipt)
        return receipt

    def select_core(self, profile, core_type_id: str) -> None:
        core_view = next(
            (item for item in self.view(profile)["cores"]["types"] if item["id"] == core_type_id),
            None,
        )
        if core_view is None or not core_view["unlocked"]:
            raise MetaProgressionError("Bu çekirdek türü henüz açılmadı.")
        profile.unlocked_core_types = tuple(dict.fromkeys((*profile.unlocked_core_types, core_type_id)))
        profile.selected_core_type = core_type_id

    def award_core_pieces(self, profile, count: int, seed: str) -> str | None:
        count = max(0, int(count))
        if count == 0:
            return None
        core_id = core_reward_type_id(profile, seed)
        profile.core_shards_by_type[core_id] = profile.core_shards_by_type.get(core_id, 0) + count
        return core_id

    def unlock_core_skill(self, profile, core_type_id: str, skill_id: str, request_id: str) -> dict:
        with self._lock:
            previous = profile.core_receipts.get(request_id)
            if previous:
                if (previous.get("core_type_id"), previous.get("skill_id")) != (core_type_id, skill_id):
                    raise MetaProgressionError("Talep kimliği farklı bir işleme ait.")
                return dict(previous)
            core = next((c for c in self.view(profile)["cores"]["types"] if c["id"] == core_type_id), None)
            skill = next((s for s in core["skills"] if s["id"] == skill_id), None) if core else None
            if not request_id.strip() or not core or not core["unlocked"] or not skill:
                raise MetaProgressionError("Çekirdek yeteneği bulunamadı veya henüz açılmadı.")
            if skill["tier_selected"] or core["level"] < skill["level"]:
                raise MetaProgressionError("Eşik seçilmiş veya çekirdek seviyesi yetersiz.")
            if profile.flux_shards < skill["flux_cost"]:
                raise MetaProgressionError("Çekirdek yeteneği için Akı yetersiz.")
            profile.flux_shards -= skill["flux_cost"]
            profile.core_skills[core_type_id] = (*profile.core_skills.get(core_type_id, ()), skill_id)
            receipt = {"request_id": request_id, "core_type_id": core_type_id, "skill_id": skill_id}
            profile.core_receipts[request_id] = receipt
            return dict(receipt)


def archive_and_soft_reset_season(profile, next_season_id: str, archived_at: str | None = None) -> dict | None:
    next_season_id = next_season_id.strip()
    if not next_season_id:
        raise MetaProgressionError("Yeni sezon kimliği zorunludur.")
    if profile.active_meta_season_id == next_season_id:
        return None
    archive = {
        "season_id": profile.active_meta_season_id,
        "final_rating": int(profile.rating),
        "final_rank": rank_stage_for_rating(profile.rating),
        "season_xp": int(profile.season_xp),
        "claimed_tiers": list(profile.claimed_season_tiers),
        "archived_at": archived_at or iso_utc(utc_now()),
    }
    profile.season_archives.append(archive)
    # Arena progress is permanent. League players return to League 1.
    if profile.rating >= 3600:
        profile.rating = 3600
    profile.season_xp = 0
    profile.claimed_season_tiers = ()
    profile.active_meta_season_id = next_season_id
    return archive


DEFAULT_META_SEASON_ID = CURRENT_SEASON_ID
