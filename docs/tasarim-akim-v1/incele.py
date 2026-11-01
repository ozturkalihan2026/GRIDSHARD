"""Design consistency and isolated arithmetic, NOT a playable battle simulator."""
import json
from collections import Counter
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]


def fixed_target_time(module, hp, armor=0.0, shield=False):
    # Reference test only: first volley after one full cycle; target stationary,
    # no other guns, healing, core powers, routing, placement or player input.
    hp_left, block_at, volley = float(hp), 0.0, 0
    kept_reduction = 0.35 if module["id"] == "rail" else 1.0
    while hp_left > 1e-8:
        volley += 1
        for hit in range(module.get("hits", 1)):
            at = volley * module["cycle"] + hit * module.get("hit_spacing", 0)
            damage = module["damage"] * (1 - armor * kept_reduction)
            if shield and at + 1e-8 >= block_at:
                damage *= 0.4
                block_at = at + 3
            hp_left -= damage
            if hp_left <= 1e-8:
                return round(at, 3)


def main():
    plan = json.loads((HERE / "moduller.json").read_text(encoding="utf8"))
    modules = {m["id"]: m for m in plan["modules"]}
    assert len(modules) == len(plan["modules"]) == 16
    assert Counter(m["cls"] for m in modules.values()) == {"saldiri": 6, "savunma": 4, "taktik": 6}
    assert all(isinstance(m["cost"], int) and 2 <= m["cost"] <= 5 and m["hp"] > 0 for m in modules.values())
    actual = json.loads((ROOT / "server/data/arena_progression_v1.json").read_text(encoding="utf8"))["modules"]
    mapped = plan["legacy_mapping"]
    assert len(mapped) == len({m["from"] for m in mapped}) == 36
    assert {m["from"] for m in mapped} == {m["id"] for m in actual}
    assert all(m["to"] is None or m["to"] in modules for m in mapped)
    for deck in plan["decks"]:
        assert len(deck["ids"]) == len(set(deck["ids"])) == 6
        assert sum(modules[k]["cls"] == "saldiri" for k in deck["ids"]) >= 2

    attacks = []
    for module in modules.values():
        if module["cls"] != "saldiri":
            continue
        single = module["damage"] * module.get("hits", 1) / module["cycle"]
        area = single + module.get("secondary_damage", 0) * (module.get("max_targets", 1) - 1) / module["cycle"]
        attacks.append({"id": module["id"], "name": module["name"],
                        "single_dps": round(single, 3), "maximum_multi_target_dps": round(area, 3),
                        "neutral_260_hp_seconds": fixed_target_time(module, 260),
                        "armor_300_hp_seconds": fixed_target_time(module, 300, armor=.35),
                        "shield_320_hp_seconds": fixed_target_time(module, 320, shield=True)})
    laser = modules["laser"]["damage"] / modules["laser"]["cycle"]
    repair = modules["repair"]["healing_total"] / modules["repair"]["cycle"]
    nano = modules["nano"]["healing_total"] / modules["nano"]["cycle"]
    assert repair < min(a["single_dps"] for a in attacks)
    assert next(a for a in attacks if a["id"] == "rail")["armor_300_hp_seconds"] < next(a for a in attacks if a["id"] == "laser")["armor_300_hp_seconds"]
    opening = []
    spent = 0
    for key in plan["decks"][0]["opening"]:
        spent += modules[key]["cost"]
        at = max(0, spent - plan["economy"]["start"]) * plan["economy"]["regen_seconds"]
        opening.append({"id": key, "earliest_affordable_seconds": round(at, 1)})
    paper = {"status": "ISOLATED_REFERENCE_ARITHMETIC_NOT_FULL_GAME_BALANCE", "attacks": attacks,
             "repair_hps": repair, "nano_hps_per_target": round(nano, 3),
             "one_laser_plus_amplifier_dps": round(laser * 1.35, 3),
             "two_lasers_dps": round(laser * 2, 3),
             "two_lasers_plus_amplifier_dps": round(laser * 2 * 1.35, 3),
             "one_laser_vs_armor_minus_repair_net_dps": round(laser * .65 - repair, 3),
             "two_lasers_vs_armor_minus_repair_net_dps": round(laser * 2 * .65 - repair, 3),
             "two_lasers_core_900_continuous_seconds": round(900 / (laser * 2), 3),
             "balanced_opening": opening,
             "checks": {"classes_and_unique_ids": True, "all_36_legacy_ids_accounted_for": True,
                        "four_legal_six_card_decks": True, "repair_below_single_weapon_raw_dps": True}}
    (HERE / "aritmetik.json").write_text(json.dumps(paper, ensure_ascii=False, indent=2), encoding="utf8")
    print(json.dumps(paper, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
