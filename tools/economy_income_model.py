"""Günlük geliri ve yükseltme sürelerini sunucu kodundaki sayılardan hesaplar.

Beklenen değer hesabıdır; simülasyon ya da oyuncu verisi değildir. Ücretsiz
oyuncuyu varsayar: reklam bonusu, Savaş Premium, ücretli geçiş, turnuva
ödülleri ve Devre Yolu'nun tek seferlik ödülleri gelire katılmaz. Maliyet,
sandık, giriş takvimi, sezon yolu ya da parça dağıtımı değişince çalıştırılır:

    python tools/economy_income_model.py [maç/gün] [galibiyet oranı]
"""
from __future__ import annotations

from collections import Counter
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

from app import arena_canon as canon
from app import meta_progression as meta
from app import player_profile as profile
from app import player_progression as progression


RARITIES = ("common", "rare", "epic", "legendary")
RARITY = {"common": "Sıradan", "rare": "Ender", "epic": "Destansı", "legendary": "Efsanevi"}
LEVELS = (5, 8, 10, 12, 15)
DAYS = len(profile.LOGIN_PERIOD_REWARDS)
SEASON_CHEST = {"silver": "circuit_8h", "gold": "core_24h", "diamond": "diamond_24h"}
GIFT_CHESTS_PER_DAY = 3


def mean(pair) -> float:
    return (pair[0] + pair[1]) / 2


def chest_value(definition_id: str) -> dict:
    definition = meta.CHEST_DEFINITIONS[definition_id]
    shards = {rarity: 0.0 for rarity in RARITIES}
    for rarity, share in definition["rarity_odds"].items():
        shards[rarity] = definition["module_drop_chance"] * share * mean(definition["shards_by_rarity"][rarity])
    return {"credits": mean(definition["coins"]), "flux": mean(definition["flux"]),
            "shards": shards, "core": definition["core_drop_chance"] * definition["core_drop_shards"]}


def module_cost(rarity: str, level: int) -> tuple[int, int, int]:
    """Ortak tablodan seviye1→hedef toplam DK, ilgili parça ve Akı."""
    costs = [meta.rarity_upgrade_cost(rarity, counter) for counter in range(max(0, min(14, level-1)))]
    return tuple(sum(c[key] for c in costs) for key in ("circuit_credits", "shards", "flux_shards"))


def daily_income(rating: int, matches: float, win_rate: float) -> dict:
    stage = canon.rank_stage_for_rating(rating)
    unlocked = canon.unlocked_module_ids(rating)
    wins, losses = matches * win_rate, matches * (1 - win_rate)
    victory = progression.match_circuit_credit_reward(stage, won=True, draw=False, match_type="ranked")
    defeat = progression.match_circuit_credit_reward(stage, won=False, draw=False, match_type="ranked")
    mission_xp = sum(item["season_xp_reward"] for item in profile.DAILY_MISSIONS)
    season_xp = wins * progression.WIN_XP + losses * progression.LOSS_XP + mission_xp

    sources = {"Maç ödülü": [wins * victory + losses * defeat, 0.0]}
    pool = {rarity: 0.0 for rarity in RARITIES}
    core = 0.0

    battle = [0.0, 0.0]
    previous = 0.0
    for upper, definition_id in meta.BATTLE_CHEST_DROP_THRESHOLDS:
        chance, previous = upper - previous, upper
        value = chest_value(definition_id)
        battle[0] += wins * chance * value["credits"]
        battle[1] += wins * chance * value["flux"]
        core += wins * chance * value["core"]
        for rarity in RARITIES:
            pool[rarity] += wins * chance * value["shards"][rarity]
    sources["Galibiyet sandığı"] = battle

    gift = chest_value(meta.GIFT_CHEST_ID)
    sources["Hediye sandık"] = [GIFT_CHESTS_PER_DAY * gift["credits"], GIFT_CHESTS_PER_DAY * gift["flux"]]
    core += GIFT_CHESTS_PER_DAY * gift["core"]
    for rarity in RARITIES:
        pool[rarity] += GIFT_CHESTS_PER_DAY * gift["shards"][rarity]

    sources["Günlük devre emirleri"] = [0.0, float(sum(item["flux_shard_reward"] for item in profile.DAILY_MISSIONS))]
    login = profile.LOGIN_PERIOD_REWARDS
    sources["Giriş takvimi"] = [sum(item["circuit_credits"] for item in login) / DAYS,
                                sum(item["flux_shards"] for item in login) / DAYS]
    # Açık modüllerden birine giden ödüller (yazılan miktar sıradan kartın aldığıdır).
    untargeted = [item["module_shards"] for item in login]
    core_per_cycle = float(sum(item["core_shards"] for item in login))

    season = [0.0, 0.0]
    tiers = 0
    for reward in profile.SEASON_REWARD_TRACK:
        if reward["required_xp"] > season_xp * DAYS:
            break
        tiers += 1
        season[0] += reward["circuit_credits"]
        season[1] += reward["flux_shards"]
        untargeted.append(reward["module_shards"])
        if reward["chest_tier"]:
            value = chest_value(SEASON_CHEST[reward["chest_tier"]])
            season[0] += value["credits"]
            season[1] += value["flux"]
            core_per_cycle += value["core"]
            for rarity in RARITIES:
                pool[rarity] += value["shards"][rarity] / DAYS
    sources["Sezon yolu"] = [season[0] / DAYS, season[1] / DAYS]
    core += core_per_cycle / DAYS

    cards = Counter(canon.MODULES[module_id]["rarity"] for module_id in unlocked)
    per_card = {
        rarity: pool[rarity] / cards[rarity]
        + sum(canon.reward_shards_for_rarity(amount, rarity) for amount in untargeted if amount) / len(unlocked) / DAYS
        for rarity in RARITIES if cards[rarity]
    }
    unlocked_cores = sum(rating >= meta.core_unlock_rating(core_type) for core_type in meta.CORE_TYPES)
    return {
        "stage": stage["name_tr"], "cards": cards, "sources": sources, "season_xp": season_xp, "tiers": tiers,
        "credits": sum(value[0] for value in sources.values()), "flux": sum(value[1] for value in sources.values()),
        "per_card": per_card, "core": core, "unlocked_cores": unlocked_cores,
    }


def report(rating: int, matches: float, win_rate: float) -> None:
    income = daily_income(rating, matches, win_rate)
    print(f"\n== {income['stage']} ({rating} kupa): açık modül {sum(income['cards'].values())}, "
          f"açık çekirdek {income['unlocked_cores']} ==")
    for name, (credits, flux) in income["sources"].items():
        print(f"  {name:<22} Devre Kredisi {credits:7.0f}   Akı {flux:5.0f}")
    print(f"  {'Toplam / gün':<22} Devre Kredisi {income['credits']:7.0f}   Akı {income['flux']:5.0f}")
    print(f"  Sezon deneyimi {income['season_xp']:.0f}/gün; {DAYS} günde {income['tiers']}/{len(profile.SEASON_REWARD_TRACK)} kademe")
    print("  Bir kartın süresi (gün; parça | tek başına Devre Kredisi | tek başına Akı):")
    for rarity, rate in income["per_card"].items():
        cells = "  ".join(
            f"S{level} {module_cost(rarity, level)[1] / rate:5.0f} | {module_cost(rarity, level)[0] / income['credits']:4.0f} | {module_cost(rarity, level)[2] / income['flux']:4.0f}"
            for level in LEVELS
        )
        print(f"    {RARITY[rarity]:<9} {rate:5.2f} parça/gün   {cells}")
    per_core = income["core"] / income["unlocked_cores"]
    print(f"  Çekirdek: {income['core']:.3f} parça/gün (çekirdek başına {per_core:.3f})")
    for core_type in meta.CORE_TYPES:
        if rating < meta.core_unlock_rating(core_type):
            continue
        cells = "  ".join(
            f"S{level} {module_cost(core_type['rarity'], level)[1] / per_core:5.0f} | {module_cost(core_type['rarity'], level)[0] / income['credits']:4.0f} | {module_cost(core_type['rarity'], level)[2] / income['flux']:4.0f}"
            for level in LEVELS
        )
        print(f"    {core_type['name_tr']}: {cells}")


def main() -> None:
    matches = float(sys.argv[1]) if len(sys.argv) > 1 else 10.0
    win_rate = float(sys.argv[2]) if len(sys.argv) > 2 else 0.55
    print(f"Ücretsiz oyuncu, günde {matches:g} maç, galibiyet %{win_rate * 100:.0f}, "
          f"günde {GIFT_CHESTS_PER_DAY} hediye sandık, bütün devre emirleri.")
    for rating in (0, canon.ARENA_MINIMUM_RATING_BY_INDEX[6], canon.ARENA_MINIMUM_RATING_BY_INDEX[12], canon.GRIDSHARD_SUMMIT_RATING):
        report(rating, matches, win_rate)
    all_credits = sum(module_cost(item["rarity"], 15)[0] for item in canon.MODULES.values())
    road = Counter()
    for stage in (*canon.ARENAS, *canon.LEAGUE_STAGES):
        for node in stage.get("nodes", ()):
            for key in ("circuit_credits", "flux_shards", "module_shards", "universal_module_shards", "core_shards"):
                road[key] += int(node["rewards"].get(key, 0))
    print(f"\nBütün modüllerin son seviyesi: {all_credits:,} Devre Kredisi".replace(",", "."))
    print("Devre Yolu'nun tek seferlik ödülleri (gelire katılmadı):", dict(road))


if __name__ == "__main__":
    main()
