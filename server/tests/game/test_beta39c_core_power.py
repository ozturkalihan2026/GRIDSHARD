from app.game.battle_pool import default_battle_pool
from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState


def create_engine() -> BattleEngine:
    engine = BattleEngine(BattleState(battle_id="beta39c-core-power"))
    engine.add_player("player")
    engine.set_battle_pool("player", default_battle_pool().module_definition_ids)
    engine.grant_module("player", "core", "core")
    engine.grant_module("player", "generator", "generator")
    engine.set_initial_active_module("player", "core", 2, 2)
    engine.set_initial_active_module("player", "generator", 2, 3)
    engine.start()
    return engine


def test_core_power_charges_once_and_repairs_own_core_atomically():
    engine = create_engine()
    for _ in range(350):
        engine.step()

    player = engine.state.players["player"]
    ready_events = [event for event in engine.state.events if event.type == "core_power_ready"]
    assert len(ready_events) == 1
    assert player.core_power_charge == 100

    core = player.modules["core"]
    core.hp = 200
    engine.enqueue_command(BattleCommand("player", "use_core_power", {
        "request_id": "power-request-1",
        "target_module_id": "core",
    }))
    engine.step()

    assert core.hp == 245
    assert player.core_power_uses == 1
    assert 0 < player.core_power_charge < 1
    assert any(event.type == "core_power_used" for event in engine.state.events)


def test_core_power_replay_does_not_apply_the_effect_twice():
    engine = create_engine()
    player = engine.state.players["player"]
    core = player.modules["core"]
    core.hp = 200
    player.core_power_charge = 100
    command = BattleCommand("player", "use_core_power", {
        "request_id": "same-request",
        "target_module_id": "core",
    })
    engine.enqueue_command(command)
    engine.step()
    hp_after_first_use = core.hp

    player.core_power_charge = 100
    engine.enqueue_command(command)
    engine.step()

    assert core.hp == hp_after_first_use
    assert player.core_power_uses == 1
    assert any(event.type == "core_power_replayed" for event in engine.state.events)


def test_full_health_rejection_preserves_charge():
    engine = create_engine()
    player = engine.state.players["player"]
    player.core_power_charge = 100
    engine.enqueue_command(BattleCommand("player", "use_core_power", {
        "request_id": "full-health",
        "target_module_id": "core",
    }))
    engine.step()

    assert player.core_power_charge == 100
    assert player.core_power_uses == 0
    assert engine.state.events[-1].type == "command_rejected"

