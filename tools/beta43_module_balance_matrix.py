from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import replace
from datetime import datetime, timezone
import json
from pathlib import Path
from statistics import mean, median
import sys


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

from app.arena_canon import MODULES, module_stats
from app.game.catalog import BASIC_MODULE_DEFINITIONS
from app.game.catalog_view import build_module_catalog_view
from app.game.simulation import BattleLayoutSpec, LayoutModule, run_match


OUTPUT = ROOT / "qa_reports" / "beta43_module_balance_matrix.json"
BOT_SOURCE = ROOT / "server" / "data" / "arena_bot_profiles_v1.json"
POSITIONS = ((0, 0), (1, 0), (2, 0), (3, 0), (4, 0), (1, 1))
SYNTHETIC_POSITIONS = {
    # Support modules are deliberately adjacent to the attack modules they
    # affect.  A shared sequential placement would benchmark broken topology,
    # not the role's actual combat value.
    "support": ((0, 1), (1, 0), (2, 0), (3, 1), (0, 0), (1, 1)),
    "energy_system": ((0, 1), (1, 0), (1, 1), (2, 0), (3, 1), (0, 0)),
    "balanced": ((0, 1), (1, 0), (1, 1), (2, 0), (3, 1), (3, 0)),
    "defense": ((0, 1), (1, 1), (1, 0), (2, 0), (3, 1), (3, 0)),
    "sabotage": ((0, 1), (1, 0), (1, 1), (2, 0), (3, 0), (3, 1)),
}
SYNTHETIC_POOLS = {
    "attack_heavy": (
        "laser", "pulse_cannon", "drone_bay", "missile_launcher", "railgun", "arc_cannon",
    ),
    "balanced": (
        "laser", "pulse_cannon", "shield", "battery", "repair", "emp",
    ),
    "defense": (
        "laser", "shield", "armor", "barrier", "guardian_dome", "repair",
    ),
    "energy_system": (
        "laser", "pulse_cannon", "battery", "capacitor", "current_balancer", "targeting_computer",
    ),
    "support": (
        "laser", "pulse_cannon", "repair", "cooler", "targeting_computer", "amplifier",
    ),
    "sabotage": (
        "laser", "pulse_cannon", "shield", "emp", "jammer", "virus",
    ),
}


def _layout(bot: dict) -> BattleLayoutSpec:
    modules = (LayoutModule("core", "core", 2, 1),) + tuple(
        LayoutModule(f"slot-{index}", module_id, *POSITIONS[index])
        for index, module_id in enumerate(bot["battle_pool_ids"])
    )
    return BattleLayoutSpec(
        id=str(bot["id"]),
        name_tr=str(bot["display_name"]),
        modules=modules,
    )


def _synthetic_layout(layout_id: str, module_ids: tuple[str, ...]) -> BattleLayoutSpec:
    positions = SYNTHETIC_POSITIONS.get(layout_id, POSITIONS)
    return BattleLayoutSpec(
        id=f"synthetic-{layout_id}",
        name_tr=layout_id,
        modules=(LayoutModule("core", "core", 2, 1),) + tuple(
            LayoutModule(f"slot-{index}", module_id, *positions[index])
            for index, module_id in enumerate(module_ids)
        ),
    )


def _rate(numerator: int, denominator: int) -> float:
    return round(numerator / denominator, 6) if denominator else 0.0


def _candidate_transform(candidate: str):
    def transform(definition):
        canon = MODULES.get(definition.id)
        if canon is None:
            return definition
        category = canon["category"]
        if candidate == "attack_damage_minus_10" and category == "saldırı":
            return replace(definition, base_damage=definition.base_damage * 0.90)
        if candidate == "attack_damage_minus_5" and category == "saldırı":
            return replace(definition, base_damage=definition.base_damage * 0.95)
        if candidate == "attack_damage_minus_7_5" and category == "saldırı":
            return replace(definition, base_damage=definition.base_damage * 0.925)
        if candidate == "support_cooldown_minus_15" and category == "destek":
            return replace(definition, cooldown_ms=max(100, round(definition.cooldown_ms * 0.85)))
        if candidate == "mixed_role_rebalance":
            if category == "saldırı":
                return replace(definition, base_damage=definition.base_damage * 0.92)
            if category == "savunma":
                return replace(definition, max_hp=round(definition.max_hp * 1.10))
            if category == "destek":
                return replace(
                    definition,
                    max_hp=round(definition.max_hp * 1.05),
                    cooldown_ms=max(100, round(definition.cooldown_ms * 0.85)),
                )
            if category == "sistem":
                return replace(
                    definition,
                    max_hp=round(definition.max_hp * 1.05),
                    energy_generation=definition.energy_generation * 1.15,
                )
        if candidate == "attack_energy_pressure" and category == "saldırı":
            return replace(
                definition,
                energy_consumption=definition.energy_consumption * 1.20,
            )
        if candidate == "support_effect_plus_25" and category == "destek":
            return replace(
                definition,
                max_hp=round(definition.max_hp * 1.10),
                effect_multiplier=definition.effect_multiplier * 1.25,
            )
        if candidate == "role_cost_rebalance":
            if category == "saldırı":
                return replace(
                    definition,
                    energy_consumption=definition.energy_consumption * 1.15,
                )
            if category == "savunma":
                return replace(definition, max_hp=round(definition.max_hp * 1.20))
            if category == "destek":
                return replace(
                    definition,
                    max_hp=round(definition.max_hp * 1.10),
                    effect_multiplier=definition.effect_multiplier * 1.30,
                    energy_consumption=definition.energy_consumption * 0.80,
                )
            if category == "sistem":
                return replace(
                    definition,
                    max_hp=round(definition.max_hp * 1.10),
                    effect_multiplier=definition.effect_multiplier * 1.20,
                    energy_consumption=definition.energy_consumption * 0.60,
                )
        return definition

    return transform


def _module_matrix(bots: list[dict]) -> list[dict]:
    catalog = {
        item["id"]: item
        for item in build_module_catalog_view()["modules"]
    }
    usage = Counter(
        module_id
        for bot in bots
        for module_id in bot["battle_pool_ids"]
    )
    archetypes_by_module: dict[str, set[str]] = defaultdict(set)
    for bot in bots:
        for module_id in bot["battle_pool_ids"]:
            archetypes_by_module[module_id].add(str(bot["archetype_tr"]))

    rows = []
    for module_id, canon in MODULES.items():
        definition = BASIC_MODULE_DEFINITIONS[module_id]
        levels = {
            str(level + 1): module_stats(definition, level)
            for level in (0, 7, 14)
        }
        rows.append({
            "definition_id": module_id,
            "name_tr": definition.name_tr,
            "category": canon["category"],
            "rarity": canon["rarity"],
            "unlock_arena": canon["unlock_arena"],
            "unlock_trophies": canon["unlock_trophies"],
            "current_cost": canon["current_cost"],
            "levels": levels,
            "effect_lines": list(catalog[module_id]["effect_lines"]),
            "bot_deck_appearances": usage[module_id],
            "bot_archetypes": sorted(archetypes_by_module[module_id]),
        })
    return rows


def _simulate(bots: list[dict]) -> dict:
    layouts = {str(bot["id"]): _layout(bot) for bot in bots}
    bots_by_id = {str(bot["id"]): bot for bot in bots}
    pairs: set[tuple[str, str]] = set()
    by_arena: dict[int, list[dict]] = defaultdict(list)
    for bot in bots:
        by_arena[int(bot["arena"])].append(bot)
    for arena_bots in by_arena.values():
        ordered = sorted(arena_bots, key=lambda item: str(item["id"]))
        for index, bot in enumerate(ordered):
            for offset in (1, 5):
                opponent = ordered[(index + offset) % len(ordered)]
                pair = tuple(sorted((str(bot["id"]), str(opponent["id"]))))
                if pair[0] != pair[1]:
                    pairs.add(pair)

    results = []
    for first_id, second_id in sorted(pairs):
        results.append(run_match(layouts[first_id], layouts[second_id]))
        results.append(run_match(layouts[second_id], layouts[first_id]))

    archetype_appearances = Counter()
    archetype_wins = Counter()
    archetype_draws = Counter()
    module_appearances = Counter()
    module_wins = Counter()
    deck_bucket_appearances = Counter()
    deck_bucket_wins = Counter()
    durations = []
    timeouts = 0
    draws = 0

    def deck_bucket(bot: dict) -> str:
        attack_count = sum(
            MODULES[module_id]["category"] == "saldırı"
            for module_id in bot["battle_pool_ids"]
        )
        if attack_count >= 4:
            return "attack_heavy_4_plus"
        if attack_count >= 2:
            return "mixed_2_3_attack"
        return "utility_0_1_attack"

    for result in results:
        durations.append(result.elapsed_ms)
        if result.timed_out:
            timeouts += 1
        elif result.is_draw:
            draws += 1
        participant_ids = (result.layout_a_id, result.layout_b_id)
        for bot_id in participant_ids:
            bot = bots_by_id[bot_id]
            archetype = str(bot["archetype_tr"])
            archetype_appearances[archetype] += 1
            bucket = deck_bucket(bot)
            deck_bucket_appearances[bucket] += 1
            for module_id in bot["battle_pool_ids"]:
                module_appearances[module_id] += 1
            if result.is_draw:
                archetype_draws[archetype] += 1
        if result.winner_layout_id:
            winner = bots_by_id[result.winner_layout_id]
            archetype_wins[str(winner["archetype_tr"])] += 1
            deck_bucket_wins[deck_bucket(winner)] += 1
            for module_id in winner["battle_pool_ids"]:
                module_wins[module_id] += 1

    archetypes = {
        archetype: {
            "appearances": appearances,
            "wins": archetype_wins[archetype],
            "draws": archetype_draws[archetype],
            "win_rate": _rate(archetype_wins[archetype], appearances),
        }
        for archetype, appearances in sorted(archetype_appearances.items())
    }
    module_performance = {
        module_id: {
            "appearances": appearances,
            "wins_in_deck": module_wins[module_id],
            "deck_win_rate": _rate(module_wins[module_id], appearances),
        }
        for module_id, appearances in sorted(module_appearances.items())
    }
    buckets = {
        bucket: {
            "appearances": appearances,
            "wins": deck_bucket_wins[bucket],
            "win_rate": _rate(deck_bucket_wins[bucket], appearances),
        }
        for bucket, appearances in sorted(deck_bucket_appearances.items())
    }
    cooler = module_performance.get("cooler", {"appearances": 0, "wins_in_deck": 0, "deck_win_rate": 0.0})
    non_cooler_appearances = sum(module_appearances.values()) // 6 - cooler["appearances"]
    total_wins = sum(module_wins.values()) // 6
    non_cooler_wins = total_wins - cooler["wins_in_deck"]

    synthetic_layouts = {
        layout_id: _synthetic_layout(layout_id, module_ids)
        for layout_id, module_ids in SYNTHETIC_POOLS.items()
    }
    synthetic_appearances = Counter()
    synthetic_wins = Counter()
    synthetic_draws = Counter()
    synthetic_timeouts = 0
    synthetic_matches = 0
    synthetic_ids = tuple(synthetic_layouts)
    for index, first_id in enumerate(synthetic_ids):
        for second_id in synthetic_ids[index + 1:]:
            for first, second in ((first_id, second_id), (second_id, first_id)):
                result = run_match(
                    synthetic_layouts[first],
                    synthetic_layouts[second],
                )
                synthetic_matches += 1
                synthetic_appearances[first] += 1
                synthetic_appearances[second] += 1
                if result.timed_out:
                    synthetic_timeouts += 1
                elif result.is_draw:
                    synthetic_draws[first] += 1
                    synthetic_draws[second] += 1
                elif result.winner_layout_id:
                    synthetic_wins[
                        result.winner_layout_id.removeprefix("synthetic-")
                    ] += 1
    synthetic_comparison = {
        layout_id: {
            "module_ids": list(SYNTHETIC_POOLS[layout_id]),
            "category_counts": dict(Counter(
                MODULES[module_id]["category"]
                for module_id in SYNTHETIC_POOLS[layout_id]
            )),
            "appearances": synthetic_appearances[layout_id],
            "wins": synthetic_wins[layout_id],
            "draws": synthetic_draws[layout_id],
            "win_rate": _rate(
                synthetic_wins[layout_id],
                synthetic_appearances[layout_id],
            ),
        }
        for layout_id in synthetic_ids
    }
    candidate_screening = {}
    for candidate in (
        "attack_damage_minus_5",
        "attack_damage_minus_7_5",
        "attack_damage_minus_10",
        "support_cooldown_minus_15",
        "mixed_role_rebalance",
        "attack_energy_pressure",
        "support_effect_plus_25",
        "role_cost_rebalance",
    ):
        candidate_wins = Counter()
        candidate_appearances = Counter()
        transform = _candidate_transform(candidate)
        for index, first_id in enumerate(synthetic_ids):
            for second_id in synthetic_ids[index + 1:]:
                for first, second in ((first_id, second_id), (second_id, first_id)):
                    result = run_match(
                        synthetic_layouts[first],
                        synthetic_layouts[second],
                        definition_transform=transform,
                    )
                    candidate_appearances[first] += 1
                    candidate_appearances[second] += 1
                    if result.winner_layout_id:
                        candidate_wins[
                            result.winner_layout_id.removeprefix("synthetic-")
                        ] += 1
        rates = {
            layout_id: _rate(
                candidate_wins[layout_id],
                candidate_appearances[layout_id],
            )
            for layout_id in synthetic_ids
        }
        candidate_screening[candidate] = {
            "automatic_apply": False,
            "win_rates": rates,
            "win_rate_spread": round(max(rates.values()) - min(rates.values()), 6),
        }

    candidate_bot_results = []
    bot_candidate_transform = _candidate_transform("attack_damage_minus_7_5")
    for first_id, second_id in sorted(pairs):
        candidate_bot_results.append(run_match(
            layouts[first_id], layouts[second_id],
            definition_transform=bot_candidate_transform,
        ))
        candidate_bot_results.append(run_match(
            layouts[second_id], layouts[first_id],
            definition_transform=bot_candidate_transform,
        ))
    candidate_bucket_appearances = Counter()
    candidate_bucket_wins = Counter()
    candidate_archetype_appearances = Counter()
    candidate_archetype_wins = Counter()
    for result in candidate_bot_results:
        for bot_id in (result.layout_a_id, result.layout_b_id):
            bot = bots_by_id[bot_id]
            candidate_bucket_appearances[deck_bucket(bot)] += 1
            candidate_archetype_appearances[str(bot["archetype_tr"])] += 1
        if result.winner_layout_id:
            winner = bots_by_id[result.winner_layout_id]
            candidate_bucket_wins[deck_bucket(winner)] += 1
            candidate_archetype_wins[str(winner["archetype_tr"])] += 1
    candidate_bot_screening = {
        "candidate": "attack_damage_minus_7_5",
        "automatic_apply": False,
        "matches": len(candidate_bot_results),
        "attack_stack_buckets": {
            bucket: {
                "appearances": appearances,
                "wins": candidate_bucket_wins[bucket],
                "win_rate": _rate(candidate_bucket_wins[bucket], appearances),
            }
            for bucket, appearances in sorted(candidate_bucket_appearances.items())
        },
        "archetypes": {
            archetype: {
                "appearances": appearances,
                "wins": candidate_archetype_wins[archetype],
                "win_rate": _rate(candidate_archetype_wins[archetype], appearances),
            }
            for archetype, appearances in sorted(candidate_archetype_appearances.items())
        },
    }

    return {
        "method": {
            "matchups": "Each of 120 canonical arena bots faces two same-arena peers from both sides.",
            "core": "Common base core; this matrix isolates module deck composition.",
            "module_levels": "Base combat level in matches; levels 1/8/15 are audited separately in module_matrix.",
            "automatic_balance_changes": False,
            "synthetic_topology": "Support and system modules are placed adjacent to the modules they affect.",
        },
        "matches": len(results),
        "average_duration_ms": round(mean(durations), 3),
        "median_duration_ms": median(durations),
        "timeout_rate": _rate(timeouts, len(results)),
        "draw_rate": _rate(draws, len(results)),
        "archetypes": archetypes,
        "attack_stack_buckets": buckets,
        "synthetic_archetype_comparison": {
            "matches": synthetic_matches,
            "timeout_rate": _rate(synthetic_timeouts, synthetic_matches),
            "layouts": synthetic_comparison,
            "candidate_screening": candidate_screening,
        },
        "candidate_bot_screening": candidate_bot_screening,
        "module_deck_performance": module_performance,
        "cooler_review": {
            **cooler,
            "non_cooler_deck_win_rate": _rate(non_cooler_wins, non_cooler_appearances),
            "decision": "keep_current_role_pending_real_player_telemetry",
        },
    }


def main() -> int:
    bots = json.loads(BOT_SOURCE.read_text(encoding="utf-8"))["bots"]
    module_matrix = _module_matrix(bots)
    simulation = _simulate(bots)
    unused = [
        row["definition_id"]
        for row in module_matrix
        if row["bot_deck_appearances"] == 0
    ]
    payload = {
        "version": "2.1.0-beta.43-checkpoint",
        "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source": {
            "canonical_modules": "server/app/arena_canon.py",
            "engine_catalog": "server/app/game/catalog.py + catalog_view.py",
            "bot_profiles": "server/data/arena_bot_profiles_v1.json",
        },
        "coverage": {
            "module_count": len(module_matrix),
            "bot_count": len(bots),
            "modules_seen_in_bot_decks": len(module_matrix) - len(unused),
            "modules_missing_from_bot_decks": unused,
            "levels_audited": [1, 8, 15],
        },
        "module_matrix": module_matrix,
        "simulation": simulation,
        "decision": {
            "numeric_balance_changed": True,
            "severe_energy_overload": "At load ratios above 1.6, damage now remains penalized at 75% instead of incorrectly returning to 100%.",
            "cooler": "No automatic +5% fire-rate change; preserve the current heat/control role until real-player telemetry is sufficient.",
            "attack_stacking": "Do not ban attack-heavy decks; use the measured bucket rates as a telemetry baseline.",
            "human_review_required": True,
        },
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Beta.43 module balance matrix: {OUTPUT}")
    print(
        f"modules={len(module_matrix)} bots={len(bots)} "
        f"matches={simulation['matches']} missing={unused}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
