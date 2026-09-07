from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib
import math
from typing import Callable
from uuid import uuid4

from .game.catalog import BASIC_MODULE_DEFINITIONS
from .player_profile import CURRENT_SEASON_ID


class MetaProgressionError(ValueError):
    pass


from .arena_canon import (
    ARENAS, MODULES, RANK_STAGES, rank_stage_for_rating, trophy_delta, module_stats, unlocked_module_ids, module_talent_options,
)
from threading import RLock

MODULE_RARITY = {key: item["rarity"] for key, item in MODULES.items()}
RARITY_UNLOCK_ARENA = {"common": 1, "rare": 1, "epic": 5, "legendary": 9}

RARITY_COST_MULTIPLIER = {
    "common": 1.0,
    "rare": 1.35,
    "epic": 1.8,
    "legendary": 2.5,
}


CORE_TYPES: tuple[dict, ...] = (
    {
        "id": "core_resonance",
        "name_tr": "Rezonans Çekirdeği",
        "role_tr": "Hasarlı çekirdeği 45 CAN onarır.",
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
CORE_TYPES = tuple({**core, "role_tr": CORE_ROLES[i], "skills": tuple(
    {"id": f"{tier}_{choice}", "tier": str(tier), "level": level, "flux_cost": 25 * (tier + 1),
     "name_tr": "Enerji üretimi +%3" if choice == "energy" else "Aktif güç dolumu +%3"}
    for tier, level in enumerate((5, 9, 13)) for choice in ("energy", "charge")
)} for i, core in enumerate(CORE_TYPES))

CHEST_DEFINITIONS: dict[str, dict] = {
    "field_3h": {
        "id": "field_3h",
        "name_tr": "Bronz Sandık",
        "visual_tier": "bronze",
        "unlock_hours": 3,
        "coins": (90, 140),
        "shards": (12, 22),
        "rarity_odds": {
            "common": 0.70,
            "rare": 0.24,
            "epic": 0.055,
            "legendary": 0.005,
        },
    },
    "circuit_8h": {
        "id": "circuit_8h",
        "name_tr": "Gümüş Sandık",
        "visual_tier": "silver",
        "unlock_hours": 8,
        "coins": (220, 340),
        "shards": (24, 42),
        "rarity_odds": {
            "common": 0.55,
            "rare": 0.32,
            "epic": 0.115,
            "legendary": 0.015,
        },
    },
    "core_24h": {
        "id": "core_24h",
        "name_tr": "Altın Sandık",
        "visual_tier": "gold",
        "unlock_hours": 24,
        "coins": (550, 850),
        "shards": (55, 90),
        "rarity_odds": {
            "common": 0.35,
            "rare": 0.40,
            "epic": 0.22,
            "legendary": 0.03,
        },
    },
    "diamond_24h": {
        "id": "diamond_24h",
        "name_tr": "Elmas Sandık",
        "visual_tier": "diamond",
        "unlock_hours": 24,
        "coins": (950, 1350),
        "shards": (90, 140),
        "rarity_odds": {
            "common": 0.18,
            "rare": 0.37,
            "epic": 0.37,
            "legendary": 0.08,
        },
    },
}

DAILY_SHOP_OFFERS: tuple[dict, ...] = (
    {
        "id": "bronze_daily",
        "name_tr": "Bronz Sandık",
        "tier": "bronze",
        "currency": "circuit_credits",
        "cost": 120,
        "circuit_credits": (35, 65),
        "flux_shards": (2, 5),
        "module_shards": (8, 14),
        "core_shards": (0, 1),
        "rarity_odds": {"common": 0.82, "rare": 0.17, "epic": 0.01},
    },
    {
        "id": "silver_daily",
        "name_tr": "Gümüş Sandık",
        "tier": "silver",
        "currency": "circuit_credits",
        "cost": 400,
        "circuit_credits": (80, 125),
        "flux_shards": (5, 10),
        "module_shards": (18, 30),
        "core_shards": (1, 3),
        "rarity_odds": {"common": 0.48, "rare": 0.43, "epic": 0.085, "legendary": 0.005},
    },
    {
        "id": "gold_daily",
        "name_tr": "Altın Sandık",
        "tier": "gold",
        "currency": "circuit_credits",
        "cost": 900,
        "circuit_credits": (170, 260),
        "flux_shards": (10, 20),
        "module_shards": (36, 58),
        "core_shards": (3, 6),
        "rarity_odds": {"common": 0.18, "rare": 0.47, "epic": 0.31, "legendary": 0.04},
    },
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_utc(value: datetime) -> str:
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_utc(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def arena_floor_for_rating(rating: int) -> int:
    return min(3600, (max(0, int(rating)) // 300) * 300)


def module_upgrade_cost(module_definition_id: str, current_level: int) -> dict:
    rarity = MODULE_RARITY.get(module_definition_id, "common")
    next_level = max(0, int(current_level)) + 1
    multiplier = RARITY_COST_MULTIPLIER[rarity]
    return {
        "next_level": next_level,
        "circuit_credits": round(100 * next_level * multiplier),
        "shards": (2, 4, 8, 12, 20, 30, 45, 65, 90, 120, 160, 210, 270, 340)[min(13, next_level - 1)],
    }


def _hash_unit(seed: str) -> float:
    value = int(hashlib.sha256(seed.encode("utf-8")).hexdigest()[:13], 16)
    return value / float(0xFFFFFFFFFFFFF)


def _hash_range(seed: str, low: int, high: int) -> int:
    if high <= low:
        return low
    return low + int(_hash_unit(seed) * ((high - low) + 1)) % ((high - low) + 1)


def _rarity_from_roll(odds: dict[str, float], roll: float) -> str:
    cursor = 0.0
    for rarity in ("legendary", "epic", "rare", "common"):
        cursor += float(odds.get(rarity, 0.0))
        if roll <= cursor:
            return rarity
    return "common"


def _module_ids_for_rarity(rarity: str, max_arena: int = 12) -> list[str]:
    return [
        module_id
        for module_id in MODULES
        if MODULE_RARITY.get(module_id, "common") == rarity
        and MODULES[module_id]["unlock_arena"] <= max_arena
    ]


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
             "nodes": [{**node, "claimed": node["id"] in profile.arena_reward_claims,
                        "claimable": peak >= node["trophies"] and node["id"] not in profile.arena_reward_claims}
                       for node in arena["nodes"]]}
            for arena in ARENAS
        ]

    def claim_arena_reward(self, profile, node_id: str) -> dict:
        with self._lock:
            node = next((node for arena in ARENAS for node in arena["nodes"] if node["id"] == node_id), None)
            if node is None:
                raise MetaProgressionError("Arena ödülü bulunamadı.")
            if node_id in profile.arena_reward_claims:
                return {"node_id": node_id, "replayed": True}
            if max(profile.rating, profile.highest_rating) < node["trophies"]:
                raise MetaProgressionError("Bu ödülün kupa eşiğine henüz ulaşmadın.")
            rewards = node["rewards"]
            profile.circuit_credits += rewards.get("circuit_credits", 0)
            profile.flux_shards += rewards.get("flux_shards", 0)
            self.award_core_pieces(profile, rewards.get("core_shards", 0), node_id)
            shard_rewards = {}
            shard_target = rewards.get("module_shard_target") or rewards.get("module_id")
            if shard_target:
                shard_rewards[shard_target] = (
                    int(rewards.get("module_shards", 0))
                    if rewards.get("module_shard_target")
                    else 2
                )
            unlocked = unlocked_module_ids(max(profile.rating, profile.highest_rating))
            generic_shard_count = 0 if rewards.get("module_shard_target") else int(rewards.get("module_shards", 0))
            for index in range(generic_shard_count):
                module_id = unlocked[_hash_range(f"{profile.player_id}:{node_id}:{index}", 0, len(unlocked) - 1)]
                shard_rewards[module_id] = shard_rewards.get(module_id, 0) + 1
            for module_id, amount in shard_rewards.items():
                profile.module_shards[module_id] = profile.module_shards.get(module_id, 0) + amount
            if rewards.get("chest_id"):
                definition = CHEST_DEFINITIONS[rewards["chest_id"]]
                now = self._now_func()
                profile.chest_slots.append({"chest_id": f"arena-{uuid4().hex}", "definition_id": definition["id"],
                    "name_tr": definition["name_tr"], "source": node_id, "source_battle_id": None,
                    "overflow": len(profile.chest_slots) >= 4,
                    "awarded_at": iso_utc(now), "unlocks_at": iso_utc(now + timedelta(hours=definition["unlock_hours"]))})
            profile.arena_reward_claims = (*profile.arena_reward_claims, node_id)
            return {"node_id": node_id, "rewards": rewards, "module_shards": shard_rewards}

    def view(self, profile) -> dict:
        current_rank = rank_stage_for_rating(profile.rating)
        profile.highest_rating = max(profile.highest_rating, profile.rating)
        shop_day = self._now_func().date().isoformat()
        claimed_gifts_today = {
            str(receipt.get("definition_id"))
            for receipt in profile.gift_chest_claim_receipts.values()
            if str(receipt.get("claim_day")) == shop_day
        }
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
            "rank_stages": [dict(item) for item in RANK_STAGES],
            "arena_floor": arena_floor_for_rating(profile.rating),
            "coins": profile.circuit_credits,  # compatibility only
            "arena_path": self.arena_path(profile),
            "highest_rating": profile.highest_rating,
            "flux_shards": profile.flux_shards,
            "circuit_credits": profile.circuit_credits,
            "core_shards": profile.core_shards,
            "module_collection": [
                self._module_view(profile, module_id, current_rank)
                for module_id in MODULES
            ],
            "chests": {
                "slots": [dict(item) for item in profile.chest_slots],
                "definitions": [
                    {
                        **definition,
                        "rarity_odds": dict(definition["rarity_odds"]),
                        "claim_available": definition["id"] not in claimed_gifts_today
                        and not any(
                            item.get("definition_id") == definition["id"]
                            for item in profile.chest_slots
                        ),
                    }
                    for definition in CHEST_DEFINITIONS.values()
                ],
                "server_time": iso_utc(self._now_func()),
            },
            "shop": {
                "day": shop_day,
                "offers": [
                    {
                        "id": offer["id"],
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
                    }
                    for offer in DAILY_SHOP_OFFERS
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
            "strategic_role": definition.strategic_role,
            "strong_against": list(definition.strong_against),
            "weak_against": list(definition.weak_against),
            "synergy_with": list(definition.synergy_with),
            "stats": module_stats(definition, level, profile.module_talents.get(module_id)),
            "next_stats": module_stats(definition, level + 1, profile.module_talents.get(module_id)) if level < 14 else None,
            "talents": [{**node, "selected": profile.module_talents.get(module_id, {}).get(node["tier"])} for node in module_talent_options(module_id)],
            "talent_levels": {"common": [5, 8, 11, 14], "rare": [6, 9, 12, 15], "epic": [7, 10, 13, 15], "legendary": [8, 11, 14, 15]}[rarity],
            "ranked_normalized": False,
        }

    def _core_view(self, profile, core_type: dict, current_rank: dict) -> dict:
        unlocked = max(profile.highest_rating, profile.rating) >= (core_type["unlock_arena"] - 1) * 300
        counter = max(0, min(14, profile.core_upgrade_levels.get(core_type["id"], 0)))
        return {
            **{key: value for key, value in core_type.items() if key != "skills"},
            "unlocked": unlocked, "selected": profile.selected_core_type == core_type["id"],
            "level": counter + 1, "shards": profile.core_shards_by_type.get(core_type["id"], 0),
            "legacy_shards": profile.core_shards,
            "energy_per_second": round(10 * 1.04 ** counter * (1 + .03 * sum(s.endswith("_energy") for s in profile.core_skills.get(core_type["id"], ()))), 2), "energy_capacity": 100 + counter * 3,
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
        if profile.circuit_credits < cost["circuit_credits"] or shards < cost["shards"]:
            raise MetaProgressionError(f"Gerekli: {cost['circuit_credits']} Devre Kredisi ve {cost['shards']} modül parçası.")
        profile.circuit_credits -= int(cost["circuit_credits"])
        profile.module_shards[module_id] = shards - int(cost["shards"])
        profile.module_upgrade_levels[module_id] = int(cost["next_level"])
        receipt = {
            "request_id": request_id,
            "module_definition_id": module_id,
            "level_before": level,
            "level_after": int(cost["next_level"]),
            "circuit_credits_spent": int(cost["circuit_credits"]),
            "shards_spent": int(cost["shards"]),
            "ranked_normalized": False,
        }
        profile.module_upgrade_receipts[request_id] = dict(receipt)
        return receipt

    def claim_gift_chest(self, profile, definition_id: str, request_id: str) -> dict:
        with self._lock:
            return self._claim_gift_chest(profile, definition_id, request_id)

    def _claim_gift_chest(self, profile, definition_id: str, request_id: str) -> dict:
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
        previous = next(
            (
                receipt
                for receipt in profile.gift_chest_claim_receipts.values()
                if receipt.get("definition_id") == definition_id
                and receipt.get("claim_day") == claim_day
            ),
            None,
        )
        if previous is not None:
            return dict(previous)
        if any(item.get("definition_id") == definition_id for item in profile.chest_slots):
            raise MetaProgressionError("Bu sandığın açılma süresi zaten işliyor.")
        if len(profile.chest_slots) >= 4:
            raise MetaProgressionError("Sandık yuvaları dolu.")
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

    def _award_battle_chest(self, profile, battle_id: str, won: bool) -> dict | None:
        if any(r.get("source_battle_id") == battle_id for r in profile.chest_receipts.values()):
            return None
        if not won or len(profile.chest_slots) >= 4:
            return None
        if any(item.get("source_battle_id") == battle_id for item in profile.chest_slots):
            return next(item for item in profile.chest_slots if item.get("source_battle_id") == battle_id)
        roll = _hash_unit(f"{battle_id}:{profile.player_id}:chest")
        definition_id = (
            "diamond_24h"
            if roll < 0.02
            else "core_24h"
            if roll < 0.08
            else "circuit_8h"
            if roll < 0.28
            else "field_3h"
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
        if now < parse_utc(str(chest["unlocks_at"])):
            raise MetaProgressionError("Sandık henüz açılmaya hazır değil.")
        definition = CHEST_DEFINITIONS[str(chest["definition_id"])]
        seed = f"{profile.player_id}:{chest_id}"
        coins = _hash_range(f"{seed}:coins", *definition["coins"])
        rarity = _rarity_from_roll(definition["rarity_odds"], _hash_unit(f"{seed}:rarity"))
        rank = rank_stage_for_rating(profile.rating)
        current_arena = int(rank["index"]) if rank["kind"] == "arena" else 12
        candidates = _module_ids_for_rarity(rarity, current_arena)
        if not candidates:
            rarity = next(
                (
                    fallback
                    for fallback in ("epic", "rare", "common")
                    if _module_ids_for_rarity(fallback, current_arena)
                ),
                "common",
            )
            candidates = _module_ids_for_rarity(rarity, current_arena)
        module_id = candidates[_hash_range(f"{seed}:module", 0, len(candidates) - 1)]
        shards = _hash_range(f"{seed}:shards", *definition["shards"])
        profile.circuit_credits += coins
        flux = _hash_range(f"{seed}:flux", 3, max(5, definition["unlock_hours"] * 2))
        core_pieces = _hash_range(f"{seed}:core", 1, 4) if definition["unlock_hours"] >= 8 else 0
        core_type = self.award_core_pieces(profile, core_pieces, seed)
        profile.flux_shards += flux
        profile.module_shards[module_id] = int(profile.module_shards.get(module_id, 0)) + shards
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
                "module_definition_id": module_id,
                "module_rarity": rarity,
                "module_shards": shards,
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
        offer = next((item for item in DAILY_SHOP_OFFERS if item["id"] == offer_id), None)
        if offer is None:
            raise MetaProgressionError("Günlük teklif bulunamadı.")
        shop_day = self._now_func().date().isoformat()
        if profile.shop_purchase_day != shop_day:
            profile.shop_purchase_day = shop_day
            profile.shop_purchased_offer_ids = ()
        if offer_id in profile.shop_purchased_offer_ids:
            raise MetaProgressionError("Bu günlük teklif daha önce alındı.")
        currency = str(offer["currency"])
        balance = int(getattr(profile, currency))
        cost = int(offer["cost"])
        if balance < cost:
            raise MetaProgressionError("Bu sandık için kaynak yetersiz.")

        seed = f"{profile.player_id}:{shop_day}:{offer_id}"
        rank = rank_stage_for_rating(profile.rating)
        current_arena = int(rank["index"]) if rank["kind"] == "arena" else 12
        rarity = _rarity_from_roll(offer["rarity_odds"], _hash_unit(f"{seed}:rarity"))
        candidates = _module_ids_for_rarity(rarity, current_arena)
        if not candidates:
            rarity = "common"
            candidates = _module_ids_for_rarity(rarity, current_arena)
        module_id = candidates[_hash_range(f"{seed}:module", 0, len(candidates) - 1)]
        rewards = {
            "circuit_credits": _hash_range(f"{seed}:credits", *offer["circuit_credits"]),
            "flux_shards": _hash_range(f"{seed}:flux", *offer["flux_shards"]),
            "module_definition_id": module_id,
            "module_rarity": rarity,
            "module_shards": _hash_range(f"{seed}:module-shards", *offer["module_shards"]),
            "core_shards": _hash_range(f"{seed}:core-shards", *offer["core_shards"]),
        }
        setattr(profile, currency, balance - cost)
        profile.circuit_credits += int(rewards["circuit_credits"])
        profile.flux_shards += int(rewards["flux_shards"])
        rewards["core_type_id"] = self.award_core_pieces(profile, int(rewards["core_shards"]), seed)
        profile.module_shards[module_id] = (
            int(profile.module_shards.get(module_id, 0)) + int(rewards["module_shards"])
        )
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

    def award_core_pieces(self, profile, count: int, seed: str) -> str:
        unlocked = [c["id"] for c in CORE_TYPES if max(profile.highest_rating, profile.rating) >= (c["unlock_arena"] - 1) * 300]
        core_id = unlocked[_hash_range(seed + ":core-type", 0, len(unlocked) - 1)]
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
