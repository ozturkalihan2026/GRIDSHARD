"""Isolated before/after battle probes; never opens a player store or a network connection."""
from dataclasses import replace
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "server"))

from app.game import heat
from app.game.ai import enqueue_ai_actions
from app.game.catalog import BASIC_MODULE_DEFINITIONS as DEFINITIONS
from app.game.engine import BattleEngine
from app.game.models import BattleState
from app.game.talents import default_ai_talents

DECKS = {
    "common": ("laser", "shield", "repair", "battery", "cooler", "armor"),
    "heavy": ("quantum_cannon", "ion_spear", "prism_shield", "phoenix_repair", "omega_amplifier", "battery"),
    "heavy_cooled": ("quantum_cannon", "ion_spear", "prism_shield", "phoenix_repair", "omega_amplifier", "cooler"),
}


def setup(level=15, decks=None):
    engine = BattleEngine(BattleState(battle_id="production-balance-isolated"))
    for player_id in ("a", "b"):
        player = engine.add_player(player_id)
        player.core_level = level
        if decks:
            engine.set_battle_pool(player_id, decks[player_id])
        engine.state.player_upgrade_levels[player_id] = {key: level - 1 for key in DEFINITIONS}
        engine.state.player_module_talents[player_id] = {
            key: default_ai_talents(key, value.rarity, level - 1)
            for key, value in DEFINITIONS.items() if key != "core"
        }
        engine.grant_module(player_id, f"{player_id}-core", "core")
        engine.set_initial_active_module(player_id, f"{player_id}-core", 2, 1)
    return engine


def sustained_fire(module_id, *, level=15, cooler=False):
    engine = setup(level)
    gun = engine.grant_module("a", "gun", module_id)
    engine.set_initial_active_module("a", "gun", 1, 1)
    if cooler:
        engine.grant_module("a", "cooler", "cooler")
        engine.set_initial_active_module("a", "cooler", 1, 0)
    target = engine.state.players["b"].modules["b-core"]
    target.definition = replace(target.definition, max_hp=1_000_000)
    target.hp = 1_000_000
    engine.start()
    hot_at = None
    for _ in range(1200):
        engine.step()
        if hot_at is None and gun.heat >= 45:
            hot_at = engine.state.elapsed_ms
    shots = [event for event in engine.state.events if event.type == "attack_performed"]
    overheats = [event.at_ms for event in engine.state.events if event.type == "module_overheated"]
    return {"id": module_id, "level": level, "cooler": cooler, "shots_in_120s": len(shots),
            "first_slowdown_ms": hot_at, "first_overheat_ms": min(overheats, default=None),
            "overheats": len(overheats)}


def duel(first, second, *, level, baseline):
    engine = setup(level, {"a": DECKS[first], "b": DECKS[second]})
    engine.start()
    if baseline:
        for player in engine.state.players.values():
            core = next(module for module in player.modules.values() if module.definition.id == "core")
            core.definition = replace(core.definition, max_hp=300)
            core.hp = 300
    for tick in range(2400):
        if engine.state.status.value == "finished":
            break
        if tick % 10 == 0:
            for owner, opponent in (("a", "b"), ("b", "a")):
                enqueue_ai_actions(engine, owner, opponent)
        engine.step()
    return {"first": first, "second": second, "level": level,
            "winner": {"a": first, "b": second}.get(engine.state.winner_player_id),
            "duration_ms": engine.state.elapsed_ms, "finished": engine.state.status.value == "finished",
            "deployments": {owner: len(player.modules) - 1 for owner, player in engine.state.players.items()},
            "core_max_hp": {owner: next(m.definition.max_hp for m in player.modules.values() if m.definition.id == "core")
                            for owner, player in engine.state.players.items()},
            "core_attacks": [{"at_ms": event.at_ms, **event.data} for event in engine.state.events
                             if event.type == "attack_performed" and str(event.data.get("target_id", event.data.get("target_module_id", ""))).endswith("-core")]}


def main():
    report = {"limits": "Deterministic synthetic AI duels, no active core powers; not live-player win rates."}
    saved = {key: DEFINITIONS[key] for key in ("quantum_repeater", "ion_spear", "quantum_cannon")}
    for baseline in (True, False):
        heat.HEAT_PER_ACTION_ENERGY = 2.2 if baseline else 0.9
        for key, definition in saved.items():
            DEFINITIONS[key] = replace(definition, current_cost=(5 if key == "quantum_repeater" else 6)) if baseline else definition
        name = "before" if baseline else "after"
        report[name] = {
            "sustained_fire": [sustained_fire(key, level=level, cooler=cooler)
                               for level in (1, 15) for key in ("laser", "ion_spear", "quantum_cannon")
                               for cooler in (False, True)],
            "duels": [duel(first, second, level=level, baseline=baseline)
                      for level in (1, 15) for first, second in
                      (("common", "heavy"), ("heavy", "common"), ("common", "heavy_cooled"), ("heavy_cooled", "common"))],
        }
    output = ROOT / "artifacts/production-fixes-20261027/balance-probe.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(output)
    for name in ("before", "after"):
        print(name, json.dumps(report[name]))


if __name__ == "__main__":
    main()
