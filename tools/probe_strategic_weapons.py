"""Equal-frontline weapon comparisons, without deployment AI or core powers.

These are diagnostic fixtures, not a measurement of human deck win rates.
"""
import json
from itertools import combinations
from pathlib import Path

import audit_module_balance as shared


def main():
    weapons = [key for key, d in shared.DEFINITIONS.items() if d.base_damage > 0 and d.category == "saldırı"]
    rows = []
    for level in (1, 15):
        for frontline in (False, True):
            for first, second in combinations(weapons, 2):
                for left, right in ((first, second), (second, first)):
                    engine = shared.setup(level, talents=False, battle_id="equal-frontline")
                    for owner, key in (("a", left), ("b", right)):
                        shared.add(engine, owner, key, 1, 1)
                        if frontline:
                            shared.add(engine, owner, "shield", 1, 0)
                            shared.add(engine, owner, "battery", 0, 0)
                            shared.add(engine, owner, "repair", 0, 1)
                    engine.start()
                    for _ in range(6000):
                        engine.step()
                        if engine.state.status.value == "finished":
                            break
                    rows.append({"level": level, "frontline": frontline, "left": left,
                                 "right": right, "winner": engine.state.winner_player_id,
                                 "seconds": engine.state.elapsed_ms / 1000})
    dest = Path(__file__).resolve().parents[1] / "artifacts/strategy-window-20261028/05-equal-frontline.json"
    dest.write_text(json.dumps(rows), encoding="utf8")
    for level in (1, 15):
        for frontline in (False, True):
            scores = {}
            for key in weapons:
                played = [r for r in rows if r["level"] == level and r["frontline"] == frontline
                          and key in (r["left"], r["right"])]
                scores[key] = sum(r["winner"] == ("a" if r["left"] == key else "b") for r in played)
            print(level, frontline, sorted(scores.items(), key=lambda item: -item[1]), flush=True)


if __name__ == "__main__":
    main()
