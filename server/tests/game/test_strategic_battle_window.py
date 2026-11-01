"""Durability must leave time to build a formation with ordinary Current."""
import json
from pathlib import Path
import re

import pytest

from app.arena_canon import MODULES, module_stats
from app.game.catalog import BASIC_MODULE_DEFINITIONS
from app.game.core_stats import CORE_BASE_HP, core_max_hp
from app.game.economy import DEFAULT_CIRCUIT_CREDIT_CONFIG
from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState


@pytest.mark.parametrize("elapsed_ms", (179_900, 180_000, 600_000, 900_000))
def test_damage_and_repair_have_no_elapsed_time_penalty(elapsed_ms):
    def sample(at):
        engine = BattleEngine(BattleState(battle_id="no-time-pressure"))
        for owner in ("a", "b"):
            engine.add_player(owner)
            engine.grant_module(owner, f"{owner}-core", "core")
            engine.set_initial_active_module(owner, f"{owner}-core", 2, 1)
            engine.grant_module(owner, f"{owner}-laser", "laser")
            engine.set_initial_active_module(owner, f"{owner}-laser", 1, 1)
        gun = engine.state.players["a"].modules["a-laser"]
        engine.grant_module("a", "repair", "repair")
        engine.set_initial_active_module("a", "repair", 0, 1)
        engine.start()
        gun.hp -= 100
        engine.state.elapsed_ms = at
        engine.step()
        assert not any(e.type == "battle_overtime_started" for e in engine.state.events)
        return ([e.data["damage"] for e in engine.state.events if e.type == "attack_performed"],
                [e.data["repair"] for e in engine.state.events if e.type == "module_repaired"])
    baseline = sample(0)
    assert baseline[0] and baseline[1]
    assert sample(elapsed_ms) == baseline


@pytest.mark.parametrize("level", (1, 8, 15))
def test_opening_weapon_survives_while_player_funds_defense_and_support(level):
    engine = BattleEngine(BattleState(battle_id="strategic-window"))
    for owner in ("a", "b"):
        player = engine.add_player(owner)
        player.core_level = level
        engine.state.player_upgrade_levels[owner] = {key: level - 1 for key in MODULES}
        engine.grant_module(owner, f"{owner}-core", "core")
        engine.set_initial_active_module(owner, f"{owner}-core", 2, 1)
        engine.set_battle_pool(owner, ("laser", "shield", "repair", "pulse_cannon", "amplifier", "armor"))
    engine.start()
    for owner in ("a", "b"):
        engine.enqueue_command(BattleCommand(owner, "deploy_module", {"definition_id": "laser"}))
        # Spend the rest of the opening seven; the next two cards need real regen.
        engine.enqueue_command(BattleCommand(owner, "deploy_module", {"definition_id": "laser"}))
    engine.step()
    opening = [m for m in engine.state.players["a"].modules.values() if m.definition.id == "laser"]
    for definition_id in ("shield", "repair"):
        cost = BASIC_MODULE_DEFINITIONS[definition_id].current_cost
        while engine.circuit_credits("a") < cost:
            engine.step()
            assert engine.state.status.value == "running"
            assert any(m.hp > 0 for m in opening)
        engine.enqueue_command(BattleCommand("a", "deploy_module", {"definition_id": definition_id}))
        engine.step()
    assert any(m.hp > 0 for m in opening)
    living = [m.definition.id for m in engine.state.players["a"].modules.values() if m.hp > 0]
    assert "shield" in living and "repair" in living
    while engine.state.elapsed_ms < 12_000:
        engine.step()
        assert any(m.hp > 0 for m in opening)
        assert engine.state.status.value == "running"


def test_default_current_has_exact_interval_and_twelve_cap():
    config = DEFAULT_CIRCUIT_CREDIT_CONFIG
    assert (config.starting_credits, config.maximum_current, config.current_regen_interval_ms) == (7, 12, 3000)
    engine = BattleEngine(BattleState(battle_id="default-current-boundary"))
    engine.add_player("a")
    engine.grant_module("a", "core", "core")
    engine.set_initial_active_module("a", "core", 2, 1)
    engine.start()
    for _ in range(29):
        engine.step()
    assert engine.circuit_credits("a") == 7
    engine.step()
    assert engine.circuit_credits("a") == 8
    for _ in range(30 * 20):
        engine.step()
    assert engine.circuit_credits("a") == 12


def test_observation_window_is_not_a_gameplay_deadline_or_automatic_core_damage():
    engine = BattleEngine(BattleState(battle_id="no-audit-deadline"))
    for owner in ("a", "b"):
        engine.add_player(owner)
        engine.grant_module(owner, f"{owner}-core", "core")
        engine.set_initial_active_module(owner, f"{owner}-core", 2, 1)
    engine.start()
    for _ in range(6001):
        engine.step()
    assert engine.state.elapsed_ms > 600_000
    assert engine.state.status.value == "running"
    assert engine.state.winner_player_id is None
    assert all(player.modules[f"{owner}-core"].hp == CORE_BASE_HP
               for owner, player in engine.state.players.items())


def test_all_24_collection_hp_values_and_client_preview_match_engine():
    root = Path(__file__).resolve().parents[3]
    source = (root / "client/src/canon-data.js").read_text(encoding="utf8")
    client = json.loads(source[source.index("["):source.rindex("]") + 1])
    assert len(client) == len(MODULES) == 24
    for item in client:
        definition = BASIC_MODULE_DEFINITIONS[item["id"]]
        assert item["max_hp"] == definition.max_hp == MODULES[item["id"]]["max_hp"]
        for level in (0, 7, 14):
            assert module_stats(definition, level)["max_hp"] >= definition.max_hp
    app = (root / "client/src/app.js").read_text(encoding="utf8")
    assert int(re.search(r"const CORE_BASE_HP = (\d+);", app)[1]) == CORE_BASE_HP
    assert BASIC_MODULE_DEFINITIONS["core"].max_hp == core_max_hp(1) == CORE_BASE_HP
