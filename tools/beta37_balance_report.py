from __future__ import annotations

from dataclasses import replace
import json
from pathlib import Path
import random
from statistics import mean, median
import sys


ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "server"
sys.path.insert(0, str(SERVER))

from app.game.models import ModuleDefinition
from app.game.simulation import (
    ARMOR_COUNTER_LAYOUT,
    BALANCED_LAYOUT,
    BATTERY_PULSE_LAYOUT,
    DEFENSE_LAYOUT,
    OFFENSE_LAYOUT,
    SABOTAGE_LAYOUT,
    run_match,
)


VERSION = "2.0.0-beta.37"
OUTPUT = ROOT / "qa_reports" / "beta37_balance_report.json"
LAYOUTS = (
    BALANCED_LAYOUT,
    OFFENSE_LAYOUT,
    DEFENSE_LAYOUT,
    SABOTAGE_LAYOUT,
    BATTERY_PULSE_LAYOUT,
    ARMOR_COUNTER_LAYOUT,
)
VARIANTS = ("baseline", "damage_minus_5", "defense_hp_plus_8", "core_hp_plus_8")


def transform_for(variant: str):
    def transform(definition: ModuleDefinition) -> ModuleDefinition:
        if variant == "damage_minus_5" and definition.base_damage > 0:
            return replace(definition, base_damage=definition.base_damage * 0.95)
        if variant == "defense_hp_plus_8" and definition.category == "savunma":
            return replace(definition, max_hp=round(definition.max_hp * 1.08))
        if variant == "core_hp_plus_8" and definition.id == "core":
            return replace(definition, max_hp=round(definition.max_hp * 1.08))
        return definition

    return None if variant == "baseline" else transform


def engine_corpus(variant: str) -> list[dict]:
    rows: list[dict] = []
    transform = transform_for(variant)
    for first in LAYOUTS:
        for second in LAYOUTS:
            result = run_match(
                first,
                second,
                max_ticks=1800,
                definition_transform=transform,
            )
            generated = float(result.player_a_summary.get("energy_generated_total", 0)) + float(
                result.player_b_summary.get("energy_generated_total", 0)
            )
            consumed = float(result.player_a_summary.get("energy_consumed_total", 0)) + float(
                result.player_b_summary.get("energy_consumed_total", 0)
            )
            rows.append(
                {
                    "a": first.id,
                    "b": second.id,
                    "winner": result.winner_layout_id,
                    "draw": result.is_draw,
                    "timeout": result.timed_out,
                    "duration_ms": result.elapsed_ms,
                    "booster_window_reached": result.elapsed_ms >= 30_000,
                    "energy_pressure_ratio": round(consumed / generated, 6) if generated else 0.0,
                }
            )
    return rows


def summarize(rows: list[dict]) -> dict:
    durations = sorted(row["duration_ms"] for row in rows)
    wins = {layout.id: 0 for layout in LAYOUTS}
    appearances = {layout.id: 0 for layout in LAYOUTS}
    for row in rows:
        appearances[row["a"]] += 1
        appearances[row["b"]] += 1
        if row["winner"] in wins:
            wins[row["winner"]] += 1
    win_rates = {
        layout_id: round(wins[layout_id] / max(1, appearances[layout_id]), 6)
        for layout_id in wins
    }
    count = len(rows)
    return {
        "trials": count,
        "average_duration_ms": round(mean(durations), 3),
        "median_duration_ms": median(durations),
        "p10_duration_ms": durations[int((count - 1) * 0.10)],
        "p90_duration_ms": durations[int((count - 1) * 0.90)],
        "draw_rate": round(sum(row["draw"] for row in rows) / count, 6),
        "timeout_rate": round(sum(row["timeout"] for row in rows) / count, 6),
        "booster_window_reached_rate": round(
            sum(row["booster_window_reached"] for row in rows) / count, 6
        ),
        "average_energy_pressure_ratio": round(
            mean(row["energy_pressure_ratio"] for row in rows), 6
        ),
        "archetype_win_rates": win_rates,
        "archetype_win_rate_spread": round(max(win_rates.values()) - min(win_rates.values()), 6),
    }


def bootstrap(corpus: list[dict], trials: int, seed: int) -> list[dict]:
    rng = random.Random(seed)
    return [corpus[rng.randrange(len(corpus))] for _ in range(trials)]


def score(metrics: dict) -> float:
    median_seconds = float(metrics["median_duration_ms"]) / 1000
    duration_gap = max(0.0, 75.0 - median_seconds, median_seconds - 95.0)
    draw_penalty = max(0.0, float(metrics["draw_rate"]) - 0.02) * 500
    timeout_penalty = float(metrics["timeout_rate"]) * 1000
    spread_penalty = float(metrics["archetype_win_rate_spread"]) * 20
    return round(duration_gap + draw_penalty + timeout_penalty + spread_penalty, 6)


def main() -> int:
    corpora = {variant: engine_corpus(variant) for variant in VARIANTS}
    screening = {}
    for index, variant in enumerate(VARIANTS):
        metrics = summarize(bootstrap(corpora[variant], 10_000, 3700 + index))
        screening[variant] = {**metrics, "score": score(metrics)}

    top_two = sorted(
        (variant for variant in VARIANTS if variant != "baseline"),
        key=lambda variant: screening[variant]["score"],
    )[:2]
    finalists = {}
    for index, variant in enumerate(top_two):
        metrics = summarize(bootstrap(corpora[variant], 50_000, 37_000 + index))
        finalists[variant] = {**metrics, "score": score(metrics)}

    best = min(top_two, key=lambda variant: finalists[variant]["score"])
    baseline = screening["baseline"]
    recommended = finalists[best]["median_duration_ms"] > baseline["median_duration_ms"]
    payload = {
        "version": VERSION,
        "method": {
            "engine": "BattleEngine deterministic ordered archetype corpus",
            "engine_corpus_matches_per_variant": len(corpora["baseline"]),
            "screening_trials_per_variant": 10_000,
            "finalist_trials_per_variant": 50_000,
            "sampling": "seeded bootstrap from real engine outcomes",
            "canonical_values_mutated_during_study": False,
        },
        "targets": {
            "median_duration_seconds": [75, 95],
            "draw_rate_max": 0.02,
            "booster_window_reached": "majority",
        },
        "screening": screening,
        "top_two": top_two,
        "finalists": finalists,
        "decision": {
            "best_candidate": best,
            "candidate_improves_median": recommended,
            "canonical_change_applied": False,
            "reason": (
                "The simulation result is recorded for human review; canonical combat values remain unchanged until real-player telemetry confirms the candidate."
            ),
        },
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Beta.37 balance report: {OUTPUT}")
    print(f"screening={len(VARIANTS) * 10_000} finalists={len(top_two) * 50_000} best={best}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
