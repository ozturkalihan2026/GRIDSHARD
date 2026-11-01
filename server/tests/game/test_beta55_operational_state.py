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
    ),
)
def test_hard_control_suspends_work_but_not_physical_presence(effect_id):
    engine = BattleEngine(BattleState(battle_id=f"beta55-{effect_id}"))
    player = engine.add_player("p1")
    add(engine, "p1", "core", "core", 2, 1)
    module = add(engine, "p1", "laser", "laser", 0, 0)
    module.debuffs[effect_id] = TimedModuleEffect(
        id=effect_id,
        name_tr="Sabotaj",
        expires_at_ms=5000,
    )


    assert module_is_operational(module) is False
    assert is_attack_module(module) is False


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


    assert module_is_operational(module) is False


def test_sabotaged_shield_remains_a_physical_target():
    engine = BattleEngine(BattleState(battle_id="beta55-targeting"))
    player = engine.add_player("p2")
    add(engine, "p2", "core", "core", 2, 1)
    shield = add(engine, "p2", "shield", "shield", 0, 0)
    shield.debuffs["emp_disabled"] = TimedModuleEffect(
        id="emp_disabled",
        name_tr="EMP",
        expires_at_ms=5000,
    )

    assert select_target(player).instance_id == shield.instance_id


def test_current_costs_follow_the_strategic_balance_table():
    # Cost follows measured power/tempo. The October 28 durability pass lets
    # legendary utility join a formation before the next weapon replacement.
    from app.module_roster import MODULE_SPECS
    assert {k:v['current_cost'] for k,v in MODULES.items()} == {k:v['current_cost'] for k,v in MODULE_SPECS.items()}
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
