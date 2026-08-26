from __future__ import annotations

from itertools import combinations
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
SERVER = ROOT / "server"
sys.path.insert(0, str(SERVER))

from app.game.catalog import BASIC_MODULE_DEFINITIONS
from app.game.energy import (
    BASE_DISTRIBUTION_EFFICIENCY,
    ENERGY_LEECH_GENERATION_MULTIPLIER,
    SPLITTER_DISTRIBUTION_EFFICIENCY,
)
from app.game.simulation import (
    ARMOR_COUNTER_LAYOUT,
    BALANCED_LAYOUT,
    BATTERY_PULSE_LAYOUT,
    DEFENSE_LAYOUT,
    OFFENSE_LAYOUT,
    SABOTAGE_LAYOUT,
    run_round_robin,
)

OUTPUT = ROOT / "qa_reports/beta24_energy_port_report.json"


def main() -> int:
    generator = BASIC_MODULE_DEFINITIONS["generator"]
    repair = BASIC_MODULE_DEFINITIONS["repair"]
    consumers = [
        definition
        for definition in BASIC_MODULE_DEFINITIONS.values()
        if float(definition.energy_consumption or 0) > 0
    ]

    raw = float(generator.energy_generation)
    base_usable = raw * BASE_DISTRIBUTION_EFFICIENCY
    splitter_usable = raw * SPLITTER_DISTRIBUTION_EFFICIENCY
    leech_base = (
        raw
        * ENERGY_LEECH_GENERATION_MULTIPLIER
        * BASE_DISTRIBUTION_EFFICIENCY
    )
    leech_splitter = (
        raw
        * ENERGY_LEECH_GENERATION_MULTIPLIER
        * SPLITTER_DISTRIBUTION_EFFICIENCY
    )

    combo_rows = []
    for size in range(1, min(6, len(consumers)) + 1):
        for combo in combinations(consumers, size):
            demand = sum(float(item.energy_consumption or 0) for item in combo)
            combo_rows.append({
                "size": size,
                "ids": [item.id for item in combo],
                "demand": demand,
                "base_supported": demand <= base_usable + 1e-9,
                "splitter_supported": demand <= splitter_usable + 1e-9,
                "leech_base_supported": demand <= leech_base + 1e-9,
                "leech_splitter_supported": demand <= leech_splitter + 1e-9,
            })

    by_size = {}
    for size in range(1, 7):
        rows = [row for row in combo_rows if row["size"] == size]
        if not rows:
            continue
        by_size[str(size)] = {
            "total": len(rows),
            "base_supported": sum(1 for row in rows if row["base_supported"]),
            "splitter_supported": sum(
                1 for row in rows if row["splitter_supported"]
            ),
            "leech_base_supported": sum(
                1 for row in rows if row["leech_base_supported"]
            ),
            "leech_splitter_supported": sum(
                1 for row in rows if row["leech_splitter_supported"]
            ),
            "max_demand": max(row["demand"] for row in rows),
            "min_demand": min(row["demand"] for row in rows),
        }

    key_scenarios = {
        "laser_plus_shield": 3 + 2,
        "laser_plus_pulse": 3 + 5,
        "laser_plus_pulse_plus_shield": 3 + 5 + 2,
        "pulse_plus_railgun": 5 + 6,
        "railgun_plus_missile_plus_shield": 6 + 5 + 2,
        "repair_only": float(repair.energy_consumption or 0),
    }

    layouts = (
        BALANCED_LAYOUT,
        OFFENSE_LAYOUT,
        DEFENSE_LAYOUT,
        SABOTAGE_LAYOUT,
        BATTERY_PULSE_LAYOUT,
        ARMOR_COUNTER_LAYOUT,
    )
    report = run_round_robin(layouts, max_ticks=1800, mirrored=True)
    battle_rows = [{
        "a": match.layout_a_id,
        "b": match.layout_b_id,
        "winner": match.winner_layout_id,
        "draw": match.is_draw,
        "timed_out": match.timed_out,
        "elapsed_ms": match.elapsed_ms,
        "finish_reason": match.finish_reason,
    } for match in report.matches]

    payload = {
        "version": "2.0.0-beta.36",
        "generator": {
            "raw_generation_per_second": raw,
            "port_count": int(generator.port_count),
            "all_four_directions_available": int(generator.port_count) == 4,
            "base_usable_per_second": base_usable,
            "splitter_usable_per_second": splitter_usable,
            "energy_leech_base_usable_per_second": leech_base,
            "energy_leech_splitter_usable_per_second": leech_splitter,
        },
        "port_and_repair_validation": {
            "generator_has_four_ports": int(generator.port_count) == 4,
            "repair_energy_required_per_second": float(
                repair.energy_consumption or 0
            ),
            "repair_supported_on_base_line": (
                float(repair.energy_consumption or 0) <= base_usable + 1e-9
            ),
            "rotation_command_verified_by": [
                "server/tests/test_beta24_scope.py",
                "client/tests/app-startup.test.js",
            ],
            "post_finish_command_freeze_verified_by": (
                "client/tests/app-startup.test.js"
            ),
        },
        "combination_scan": {
            "consumer_count": len(consumers),
            "sizes_1_to_6": by_size,
            "combination_count": len(combo_rows),
            "note": (
                "Tüm enerji tüketen modüllerin 1-6 aktif tüketici "
                "kombinasyonları kanonik katalog değerleriyle tarandı."
            ),
        },
        "key_scenarios": {
            name: {
                "demand": demand,
                "base_supported": demand <= base_usable + 1e-9,
                "splitter_supported": demand <= splitter_usable + 1e-9,
            }
            for name, demand in key_scenarios.items()
        },
        "battle_regression": {
            "layout_count": len(layouts),
            "match_count": len(report.matches),
            "timeouts": report.timeouts,
            "draws": report.draws,
            "average_duration_ms": report.average_duration_ms,
            "wins_by_layout": report.wins_by_layout,
            "all_matches_resolved": report.timeouts == 0,
            "matches": battle_rows,
        },
        "decision": {
            "beta23_base_package_present": True,
            "generator_generation_changed_in_beta24": False,
            "generator_generation_preserved_at": raw,
            "generator_port_count_changed_from": 3,
            "generator_port_count_changed_to": int(generator.port_count),
            "automatic_numeric_balance_apply": False,
            "resource_constraint_preserved": True,
        },
    }

    if int(generator.port_count) != 4:
        raise RuntimeError("Beta.24 jeneratörü dört portlu değil.")
    if float(repair.energy_consumption or 0) > base_usable + 1e-9:
        raise RuntimeError("Onarım modülü temel jeneratör hattından enerji alamıyor.")
    if report.timeouts:
        raise RuntimeError("Beta.24 savaş regresyonunda timeout oluştu.")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("Beta.24 energy/port report:", OUTPUT)
    print(
        "matches",
        len(report.matches),
        "timeouts",
        report.timeouts,
        "draws",
        report.draws,
        "avg_ms",
        round(report.average_duration_ms, 1),
    )
    print(
        "energy_combinations",
        len(combo_rows),
        "generator",
        raw,
        "ports",
        generator.port_count,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
