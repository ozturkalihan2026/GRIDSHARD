import pytest

from app.arena_canon import MODULES
from app.game.combat import is_attack_module, select_target
from app.game.engine import BattleEngine
from app.game.models import (
    BattleState,
    ModuleStatus,
    Position,
    TimedModuleEffect,
)
from app.game.operations import module_is_operational


def add(engine, player_id, instance_id, definition_id, x, y):
    module = engine.grant_module(player_id, instance_id, definition_id)
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    return module


@pytest.mark.parametrize(
    "effect_id",
    (
        "emp_disabled",
        "support_jammed",
        "virus",
        "line_disrupted",
    ),
)
def test_every_sabotage_family_suspends_the_affected_module(effect_id):
    engine = BattleEngine(BattleState(battle_id=f"beta55-{effect_id}"))
    player = engine.add_player("p1")
    add(engine, "p1", "core", "core", 2, 1)
    module = add(engine, "p1", "laser", "laser", 0, 0)
    module.debuffs[effect_id] = TimedModuleEffect(
        id=effect_id,
        name_tr="Sabotaj",
        expires_at_ms=5000,
    )

    engine._process_energy_flow()

    assert module.is_powered is False
    assert module.energy_required_last_tick == 0
    assert module_is_operational(module) is False
    assert is_attack_module(module) is False
    assert player.energy_load_ratio == 0


@pytest.mark.parametrize("definition_id", tuple(sorted(MODULES)))
def test_suspension_rule_covers_every_catalog_module(definition_id):
    engine = BattleEngine(BattleState(battle_id=f"beta55-all-{definition_id}"))
    engine.add_player("p1")
    add(engine, "p1", "core", "core", 2, 1)
    module = add(engine, "p1", definition_id, definition_id, 0, 0)
    module.debuffs["emp_disabled"] = TimedModuleEffect(
        id="emp_disabled",
        name_tr="EMP",
        expires_at_ms=5000,
    )

    engine._process_energy_flow()

    assert module.is_powered is False
    assert module_is_operational(module) is False
    assert module.energy_required_last_tick == 0


def test_sabotaged_shield_does_not_attract_an_attack():
    engine = BattleEngine(BattleState(battle_id="beta55-targeting"))
    player = engine.add_player("p2")
    add(engine, "p2", "core", "core", 2, 1)
    shield = add(engine, "p2", "shield", "shield", 0, 0)
    armor = add(engine, "p2", "armor", "armor", 1, 0)
    shield.debuffs["emp_disabled"] = TimedModuleEffect(
        id="emp_disabled",
        name_tr="EMP",
        expires_at_ms=5000,
    )
    engine._process_energy_flow()

    assert select_target(player).instance_id == armor.instance_id


def test_current_costs_follow_the_r2_balance_table():
    # Beta.72 R2: maliyet enderliği değil ölçülen güç/tempo değerini izler.
    r2 = {
        "laser": 3, "shield": 3, "armor": 3, "repair": 3, "pulse_cannon": 4,
        "quantum_repeater": 5, "ion_spear": 6, "quantum_cannon": 6,
        "prism_shield": 4, "phoenix_repair": 4, "reflector": 3, "swarm_fabricator": 3,
        "chrono_relay": 3, "overclock_unit": 3, "precision_matrix": 3,
        "omega_amplifier": 3, "disruptor": 3, "singularity_projector": 3,
    }
    for module_id, cost in r2.items():
        assert MODULES[module_id]["current_cost"] == cost, module_id
    # Her kart başlangıç Akımıyla (6) basılabilir; hiçbir kart tavanı (12) zorlamaz.
    assert all(2 <= module["current_cost"] <= 6 for module in MODULES.values())


def test_client_canon_data_uses_the_same_costs():
    import json
    import re
    from pathlib import Path

    source = (Path(__file__).resolve().parents[3] / "client/src/canon-data.js").read_text(encoding="utf-8")
    payload = json.loads(re.search(r"Object\.freeze\((\[[\s\S]*?\])\)", source).group(1))
    client_costs = {item["id"]: item["current_cost"] for item in payload}
    assert client_costs == {module_id: item["current_cost"] for module_id, item in MODULES.items()}
