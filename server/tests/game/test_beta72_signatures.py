import pytest

from app.game.catalog import BASIC_MODULE_DEFINITIONS
from app.game.combat import (
    ATTACK_WINDUP_MS,
    circuit_guard_multiplier,
    counter_strategy_multiplier,
    defense_profile,
    is_attack_module,
    resolve_attack,
)
from app.game.engine import BattleEngine
from app.game.models import BattleState, ModuleStatus, Position
from app.game.sabotage import SINGULARITY_DURATION_MS, VIRUS_DEBUFF_ID, plan_sabotage
from app.game.support import PHOENIX_COOLDOWN_ID, attack_support_modifiers


def add(engine, player_id, instance_id, definition_id, x, y):
    module = engine.grant_module(player_id, instance_id, definition_id)
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    return module


def destroy(module):
    module.status = ModuleStatus.DESTROYED
    module.position = None
    module.hp = 0


def duel():
    engine = BattleEngine(BattleState(battle_id="beta72-signatures"))
    engine.add_player("p1")
    engine.add_player("p2")
    add(engine, "p1", "p1-core", "core", 2, 1)
    add(engine, "p2", "p2-core", "core", 2, 1)
    engine._process_energy_flow()
    for player in engine.state.players.values():
        player.energy_stock = 24.0
    return engine


def events(engine, event_type):
    return [event for event in engine.state.events if event.type == event_type]


def test_signature_cards_keep_their_family_for_counters_and_defense():
    prism = BASIC_MODULE_DEFINITIONS["prism_shield"]
    assert prism.mechanic_id == "shield"
    engine = duel()
    pulse = add(engine, "p1", "pulse", "pulse_cannon", 0, 0)
    target = add(engine, "p2", "prism", "prism_shield", 0, 0)
    # Darbe Topu'nun Kalkan'a karşı üstünlüğü Prizma Kalkanı'nda da geçerli.
    assert counter_strategy_multiplier(pulse, target) == pytest.approx(1.25)


def test_sabotage_cards_do_not_also_attack():
    engine = duel()
    singularity = add(engine, "p1", "sing", "singularity_projector", 0, 0)
    target = add(engine, "p2", "amp", "amplifier", 0, 0)
    assert singularity.definition.base_damage == 0
    assert is_attack_module(singularity) is False
    plan = plan_sabotage(singularity, engine.state.players["p2"])
    assert plan.duration_ms == SINGULARITY_DURATION_MS
    assert plan.target_module_id == target.instance_id


def test_missile_locks_on_before_firing_without_losing_dps():
    engine = duel()
    missile = add(engine, "p1", "missile", "missile_launcher", 0, 0)
    add(engine, "p2", "armor", "armor", 0, 0)
    engine._process_combat_actions()
    assert events(engine, "attack_windup_started")
    assert not events(engine, "attack_performed")

    engine.state.elapsed_ms += ATTACK_WINDUP_MS["missile_launcher"]
    engine._process_combat_actions()
    assert events(engine, "attack_performed")
    ready_at = missile.cooldowns_ready_at_ms["attack"]
    assert ready_at - engine.state.elapsed_ms == (
        missile.definition.cooldown_ms - ATTACK_WINDUP_MS["missile_launcher"]
    )


def test_secondary_hit_goes_through_the_next_targets_defense():
    engine = duel()
    add(engine, "p1", "arc", "arc_cannon", 0, 0)
    add(engine, "p2", "barrier", "barrier", 0, 0)
    add(engine, "p2", "shield", "shield", 1, 0)
    engine._process_energy_flow()
    engine.state.players["p1"].energy_stock = 24.0
    engine._process_combat_actions()
    hits = events(engine, "signature_secondary_hit")
    assert hits
    assert hits[0].data["target_module_id"] == "shield"
    assert hits[0].data["defense_type"].startswith("Kalkan")
    assert hits[0].data["reduced_damage"] > 0


def test_quantum_repeater_echoes_on_the_fourth_hit_on_one_target():
    engine = duel()
    repeater = add(engine, "p1", "rep", "quantum_repeater", 0, 0)
    add(engine, "p2", "armor", "armor", 0, 0)
    for _ in range(4):
        repeater.cooldowns_ready_at_ms.clear()
        engine.state.players["p1"].energy_stock = 24.0
        engine._process_combat_actions()
    assert len(events(engine, "quantum_repeat")) == 1


def test_quantum_cannon_charges_only_from_wasted_energy_and_spends_it():
    engine = duel()
    cannon = add(engine, "p1", "qc", "quantum_cannon", 0, 0)
    player = engine.state.players["p1"]
    player.energy_stock = 1000.0
    engine._process_energy_flow()
    assert cannon.mechanic_state.get("quantum_charge", 0) > 0

    empty = duel()
    hungry = add(empty, "p1", "qc", "quantum_cannon", 0, 0)
    empty.state.players["p1"].energy_stock = 0.0
    empty._process_energy_flow()
    assert hungry.mechanic_state.get("quantum_charge", 0) == 0

    add(engine, "p2", "armor", "armor", 0, 0)
    cannon.mechanic_state["quantum_charge"] = 30.0
    player.energy_stock = 24.0
    engine._process_combat_actions()
    assert cannon.mechanic_state["quantum_charge"] == 0
    assert events(engine, "quantum_collapse")


def test_guardian_dome_protects_the_rest_of_the_circuit():
    engine = duel()
    laser = add(engine, "p1", "laser", "laser", 0, 0)
    ally = add(engine, "p2", "amp", "amplifier", 0, 0)
    without = resolve_attack("p1", laser, "p2", ally)
    add(engine, "p2", "dome", "guardian_dome", 1, 0)
    guard = circuit_guard_multiplier(engine.state.players["p2"], ally)
    with_dome = resolve_attack("p1", laser, "p2", ally, circuit_guard=guard)
    assert guard < 1.0
    assert with_dome.final_damage < without.final_damage


def test_phase_armor_voids_attacks_only_inside_its_window():
    engine = duel()
    armor = add(engine, "p2", "phase", "phase_armor", 0, 0)
    _, inside, _ = defense_profile(armor, elapsed_ms=500)
    _, outside, _ = defense_profile(armor, elapsed_ms=2500)
    assert inside == 0.0
    assert 0.0 < outside < 1.0


def test_prism_shield_turns_prevented_damage_into_energy():
    engine = duel()
    add(engine, "p1", "pulse", "pulse_cannon", 0, 0)
    add(engine, "p2", "prism", "prism_shield", 0, 0)
    engine.state.players["p2"].energy_stock = 0.0
    engine._process_combat_actions()
    assert events(engine, "prism_energy_converted")
    assert engine.state.players["p2"].energy_stock > 0


def test_nano_medic_repairs_two_modules():
    engine = duel()
    add(engine, "p1", "nano", "nano_medic", 0, 0)
    first = add(engine, "p1", "shield", "shield", 1, 0)
    second = add(engine, "p1", "laser", "laser", 3, 0)
    first.hp, second.hp = 40, 30
    engine._process_support_actions()
    assert first.hp > 40 and second.hp > 30
    assert events(engine, "nano_repair_pulse")


def test_phoenix_revives_within_class_limits_and_only_once_per_module():
    engine = duel()
    player = engine.state.players["p1"]
    phoenix = add(engine, "p1", "phoenix", "phoenix_repair", 0, 0)
    add(engine, "p1", "shield", "shield", 1, 0)
    add(engine, "p1", "armor", "armor", 3, 0)
    add(engine, "p1", "barrier", "barrier", 4, 0)
    reflector = add(engine, "p1", "reflector", "reflector", 0, 2)
    laser = add(engine, "p1", "laser", "laser", 1, 2)
    destroy(reflector)
    destroy(laser)

    engine._process_support_actions()

    # Dördüncü savunma modülü sınıf sınırını aşacağı için dirilemez.
    assert reflector.status == ModuleStatus.DESTROYED
    assert laser.status == ModuleStatus.ACTIVE
    assert laser.hp == round(laser.definition.max_hp * 0.30)
    assert events(engine, "phoenix_rebirth")

    destroy(laser)
    phoenix.cooldowns_ready_at_ms.pop(PHOENIX_COOLDOWN_ID, None)
    player.energy_stock = 24.0
    engine._process_support_actions()
    assert laser.status == ModuleStatus.DESTROYED
    assert len(events(engine, "phoenix_rebirth")) == 1


def test_chrono_debt_is_paid_even_when_another_support_is_chosen():
    engine = duel()
    chrono = add(engine, "p1", "chrono", "chrono_relay", 0, 0)
    add(engine, "p1", "amp", "amplifier", 1, 0)
    laser = add(engine, "p1", "laser", "laser", 3, 0)
    engine._process_energy_flow()
    player = engine.state.players["p1"]
    chrono.mechanic_state.update({"chrono_boost_until_ms": 0, "chrono_debt_until_ms": 5_000})
    mods = attack_support_modifiers(player, laser, engine.board.core_position, elapsed_ms=1_000)
    assert mods.amplifier_active is True
    assert mods.cooldown_multiplier > 1.0
    assert mods.damage_multiplier < 1.15


def test_virus_damage_escalates_each_tick():
    engine = duel()
    add(engine, "p1", "virus", "virus", 0, 0)
    target = add(engine, "p2", "repair", "repair", 0, 0)
    engine._process_sabotage_actions()
    assert VIRUS_DEBUFF_ID in target.debuffs
    engine._process_virus_effects()
    engine.state.elapsed_ms += 1_000
    engine._process_virus_effects()
    damages = [event.data["damage"] for event in events(engine, "virus_damage")]
    assert damages[1] == damages[0] + 2
