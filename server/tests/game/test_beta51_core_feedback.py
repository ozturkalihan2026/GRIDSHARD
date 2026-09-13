import pytest

from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState


CORE_EFFECTS = {
    "core_resonance": "heal",
    "core_guardian": "defense",
    "core_overdrive": "attack",
    "core_disruptor": "sabotage",
    "core_capacitor": "energy",
    "core_phoenix": "heal",
    "core_quantum": "hybrid",
}


def activate_core_power(core_type):
    engine = BattleEngine(BattleState(battle_id=f"feedback-{core_type}"))
    for player_id in ("p1", "p2"):
        engine.add_player(player_id)
        engine.grant_module(player_id, f"{player_id}-core", "core")
        engine.set_initial_active_module(
            player_id,
            f"{player_id}-core",
            engine.board.core_position.x,
            engine.board.core_position.y,
        )
    engine.grant_module("p1", "p1-laser", "laser")
    engine.set_initial_active_module("p1", "p1-laser", 0, 0)
    engine.grant_module("p2", "p2-repair", "repair")
    engine.set_initial_active_module("p2", "p2-repair", 0, 0)
    engine.start()

    player = engine.state.players["p1"]
    player.core_type = core_type
    player.core_power_charge = 100
    player.modules["p1-laser"].hp -= 50
    engine.enqueue_command(BattleCommand("p1", "use_core_power", {
        "request_id": f"use-{core_type}",
        "target_module_id": "p1-core",
    }))
    engine.step()
    return engine


@pytest.mark.parametrize("core_type,effect_kind", CORE_EFFECTS.items())
def test_every_core_publishes_its_semantic_wave(core_type, effect_kind):
    engine = activate_core_power(core_type)
    activation = next(
        event.data
        for event in engine.state.events
        if event.type == "core_power_activated"
    )

    assert activation["effect_kind"] == effect_kind
    assert activation["affected_targets"]
    if core_type == "core_disruptor":
        assert activation["affected_targets"] == [
            {"player_id": "p2", "module_id": "p2-repair"}
        ]
    elif core_type == "core_capacitor":
        assert activation["affected_targets"] == [
            {"player_id": "p1", "module_id": "p1-core"}
        ]


@pytest.mark.parametrize(
    "core_type,effect_kind,target_player_id",
    (
        ("core_guardian", "defense", "p1"),
        ("core_overdrive", "attack", "p1"),
        ("core_disruptor", "sabotage", "p2"),
        ("core_capacitor", "energy", "p1"),
        ("core_quantum", "defense", "p1"),
    ),
)
def test_non_heal_core_effects_publish_numeric_target_feedback(
    core_type,
    effect_kind,
    target_player_id,
):
    engine = activate_core_power(core_type)
    feedback = [
        event.data
        for event in engine.state.events
        if event.type == "core_effect_applied"
        and event.data.get("effect_kind") == effect_kind
    ]

    assert feedback
    assert all(event["target_player_id"] == target_player_id for event in feedback)
    assert all(float(event["value"]) > 0 for event in feedback)


@pytest.mark.parametrize(
    "core_type",
    ("core_resonance", "core_phoenix", "core_quantum"),
)
def test_healing_cores_publish_only_real_positive_repairs(core_type):
    engine = activate_core_power(core_type)
    repairs = [
        event.data
        for event in engine.state.events
        if event.type == "module_repaired"
        and event.data.get("source_module_id") == "p1-core"
    ]

    assert repairs
    assert all(event["repair"] > 0 for event in repairs)
    assert {event["target_module_id"] for event in repairs} == {"p1-laser"}
