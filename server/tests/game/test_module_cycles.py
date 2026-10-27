"""Modül çevrimleri (D13'ün tamamı, 13 Ekim 2026): her modül kendi çevrimiyle
çalışır, çevrim seviyeyle kısalır ve modüle özgü değerler seviyeyle büyür."""
import pytest

from app.arena_canon import MODULES, module_stats
from app.game.catalog import BASIC_MODULE_DEFINITIONS
from app.game.combat import ATTACK_COOLDOWN_ID, defense_profile, mirror_interceptor, phase_armor_active
from app.game.energy import storage_charge_rate_per_second
from app.game.engine import TICK_MS, BattleEngine
from app.game.models import BattleState, BattleStatus, ModuleStatus, Position
from app.game.module_cycles import (
    BLOCK_CHARGE_KEY,
    CYCLE_COOLDOWN_MS,
    DOME_CHARGE_KEY,
    MIRROR_CHARGE_KEY,
    OMEGA_CHARGE_KEY,
    OVERCLOCK_CHARGE_KEY,
    SABOTAGE_GUARD_KEY,
    TARGETING_LOCK_KEY,
    block_ratio,
    mirror_reflect_ratio,
)
from app.game.sabotage import EMP_DEBUFF_ID, EMP_DURATION_MS, sabotage_resistance
from app.game.support import (
    COOLER_HEAT_REDUCTION_PER_PULSE,
    OVERCLOCK_HEAT_PER_PULSE,
    PRECISION_MAX_STACKS,
    attack_support_modifiers,
    chrono_debt_ms,
)


def add(engine, player, instance_id, definition_id, x, y):
    module = engine.grant_module(player, instance_id, definition_id)
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    return module


def duel(battle_id="cycles", levels=None):
    engine = BattleEngine(BattleState(battle_id=battle_id))
    engine.add_player("p1")
    engine.add_player("p2")
    for player_id, player_levels in (levels or {}).items():
        engine.state.player_upgrade_levels[player_id] = player_levels
    add(engine, "p1", "p1-core", "core", 2, 1)
    add(engine, "p2", "p2-core", "core", 2, 1)
    return engine


def power(engine):
    engine._process_energy_flow()


def pulses(engine, kind):
    return [event.data for event in engine.state.events
            if event.type == "module_cycle_pulse" and event.data["kind"] == kind]


def hit(engine, attacker, target, elapsed_ms=None):
    return engine._resolve_hit(
        "p1", attacker, "p2", target, damage_multiplier=1.0,
        elapsed_ms=engine.state.elapsed_ms if elapsed_ms is None else elapsed_ms,
    )


# -- her modülün çevrimi ve kendi değerleri ----------------------------------------

def test_every_module_has_a_cycle_that_shortens_with_level_except_the_balancer():
    for module_id in MODULES:
        definition = BASIC_MODULE_DEFINITIONS[module_id]
        first, last = module_stats(definition, 0), module_stats(definition, 14)
        if module_id == "current_balancer":
            assert first["cooldown_ms"] == 0 and first["cycle_label_tr"] == ""
            continue
        assert first["cooldown_ms"] > 0, module_id
        assert last["cooldown_ms"] < first["cooldown_ms"], module_id
        assert first["cycle_label_tr"] and first["cycle_label_en"], module_id
        assert last["max_hp"] > first["max_hp"], module_id


def test_cycle_table_matches_the_catalog():
    for module_id, cycle in CYCLE_COOLDOWN_MS.items():
        assert BASIC_MODULE_DEFINITIONS[module_id].cooldown_ms == cycle
    # Kullanıcının örnekleri: Kalkan 1,2 sn, Yansıtıcı 1 sn.
    assert BASIC_MODULE_DEFINITIONS["shield"].cooldown_ms == 1200
    assert BASIC_MODULE_DEFINITIONS["reflector"].cooldown_ms == 1000
    # Türetilen kart temel kartın çevrimini devralmaz.
    assert BASIC_MODULE_DEFINITIONS["guardian_dome"].cooldown_ms == 1500
    assert BASIC_MODULE_DEFINITIONS["current_balancer"].cooldown_ms == 0


def test_every_module_shows_its_own_values_and_they_grow_with_level():
    growing = {
        "shield": "block", "prism_shield": "block", "reflector": "reflect", "armor": "regen",
        "barrier": "sabotage_guard", "guardian_dome": "dome_guard", "phase_armor": "reduction",
        "repair": "repair", "nano_medic": "repair", "phoenix_repair": "repair", "cooler": "cooling",
        "amplifier": "damage_boost", "targeting_computer": "speed_boost", "overclock_unit": "damage_boost",
        "precision_matrix": "damage_boost", "omega_amplifier": "resonance",
        "emp": "duration", "jammer": "duration", "virus": "virus_damage", "disruptor": "duration",
        "singularity_projector": "duration", "battery": "storage", "capacitor": "storage",
        "current_balancer": "saving", "laser": "dps", "pulse_cannon": "dps", "railgun": "dps",
    }
    for module_id in MODULES:
        definition = BASIC_MODULE_DEFINITIONS[module_id]
        first = {item["key"]: item for item in module_stats(definition, 0)["specials"]}
        last = {item["key"]: item for item in module_stats(definition, 14)["specials"]}
        assert first, module_id
        assert all(item["label_tr"] and item["label_en"] and item["unit"] for item in first.values()), module_id
        if module_id in growing:
            key = growing[module_id]
            assert last[key]["value"] > first[key]["value"], module_id
    # Zaman borcu seviyeyle kısalır.
    chrono = BASIC_MODULE_DEFINITIONS["chrono_relay"]
    debt = lambda level: next(item["value"] for item in module_stats(chrono, level)["specials"] if item["key"] == "debt")
    assert debt(0) == 2.5 and debt(14) < 2.0


def test_user_examples_shield_and_reflector_numbers():
    shield = BASIC_MODULE_DEFINITIONS["shield"]
    reflector = BASIC_MODULE_DEFINITIONS["reflector"]
    special = lambda definition, level, key: next(
        item["value"] for item in module_stats(definition, level)["specials"] if item["key"] == key
    )
    assert module_stats(shield, 0)["cooldown_ms"] == 1200
    assert special(shield, 0, "block") == 60
    assert 75 < special(shield, 14, "block") <= 85
    assert module_stats(reflector, 0)["cooldown_ms"] == 1000
    assert special(reflector, 0, "reflect") == 30
    assert 35 < special(reflector, 14, "reflect") <= 50
    assert module_stats(reflector, 14)["cooldown_ms"] < 900
    assert block_ratio("shield", 1.0) == pytest.approx(0.60)
    assert mirror_reflect_ratio(1.0) == pytest.approx(0.30)


def test_battery_output_shown_on_the_info_screen_grows_with_level():
    battery = BASIC_MODULE_DEFINITIONS["battery"]
    assert module_stats(battery, 0)["energy_generation"] == 4.5
    assert module_stats(battery, 14)["energy_generation"] == pytest.approx(4.5 * 1.035 ** 14, abs=0.01)


# -- Kalkan: aralıklı blok -------------------------------------------------------------

def test_shield_blocks_one_attack_then_waits_for_its_cycle():
    engine = duel()
    laser = add(engine, "p1", "laser", "laser", 0, 0)
    shield = add(engine, "p2", "shield", "shield", 0, 0)
    power(engine)

    first = hit(engine, laser, shield)
    assert (first.raw_damage, first.final_damage, first.defense_type) == (10, 4, "Kalkan")
    assert shield.mechanic_state[BLOCK_CHARGE_KEY] is False
    second = hit(engine, laser, shield)
    assert (second.final_damage, second.defense_type) == (10, "Yok")
    assert len(pulses(engine, "block")) == 1 and pulses(engine, "block")[0]["blocked_damage"] == 6

    engine.state.elapsed_ms = 1100
    engine._process_module_cycles()
    assert shield.mechanic_state[BLOCK_CHARGE_KEY] is False
    engine.state.elapsed_ms = 1200
    engine._process_module_cycles()
    assert shield.mechanic_state[BLOCK_CHARGE_KEY] is True
    assert hit(engine, laser, shield).final_damage == 4


def test_two_attacks_in_one_step_find_only_one_block():
    engine = duel()
    add(engine, "p1", "laser-a", "laser", 0, 0)
    add(engine, "p1", "laser-b", "laser", 1, 0)
    shield = add(engine, "p2", "shield", "shield", 0, 0)
    power(engine)
    engine._process_combat_actions()
    assert shield.definition.max_hp - shield.hp == 4 + 10


def test_silenced_shield_neither_blocks_nor_recharges():
    engine = duel()
    laser = add(engine, "p1", "laser", "laser", 0, 0)
    shield = add(engine, "p2", "shield", "shield", 0, 0)
    power(engine)
    hit(engine, laser, shield)
    shield.is_powered = False
    engine.state.elapsed_ms = 5000
    engine._process_module_cycles()
    assert shield.mechanic_state[BLOCK_CHARGE_KEY] is False
    assert hit(engine, laser, shield).final_damage == 10
    shield.is_powered = True
    engine._process_module_cycles()
    assert shield.mechanic_state[BLOCK_CHARGE_KEY] is True


def test_shield_cycle_and_block_improve_with_level():
    engine = duel(levels={"p2": {"shield": 14}})
    laser = add(engine, "p1", "laser", "laser", 0, 0)
    shield = add(engine, "p2", "shield", "shield", 0, 0)
    power(engine)
    assert shield.definition.cooldown_ms == round(1200 * 0.992 ** 14)
    first = hit(engine, laser, shield)
    assert first.reduced_damage / first.raw_damage == pytest.approx(0.80, abs=0.06)
    engine.state.elapsed_ms = shield.definition.cooldown_ms + TICK_MS
    engine._process_module_cycles()
    assert shield.mechanic_state[BLOCK_CHARGE_KEY] is True


def test_prism_shield_blocks_on_its_cycle_and_converts_the_blocked_damage():
    engine = duel()
    pulse = add(engine, "p1", "pulse", "pulse_cannon", 0, 0)
    prism = add(engine, "p2", "prism", "prism_shield", 0, 0)
    power(engine)
    engine.state.players["p2"].energy_stock = 0.0
    engine._process_combat_actions()
    blocked = [event.data for event in engine.state.events if event.type == "attack_performed"][0]
    assert blocked["defense_type"] == "Prizma Kalkanı"
    assert blocked["reduced_damage"] == round(blocked["raw_damage"] * 0.55)
    assert engine.state.players["p2"].energy_stock == pytest.approx(min(blocked["reduced_damage"] * 0.08, 3.0))
    assert prism.mechanic_state[BLOCK_CHARGE_KEY] is False
    assert defense_profile(prism, attacker=pulse)[1] == 1.0


# -- Yansıtıcı: saldırıyı üzerine çeker ve yansıtır -------------------------------------

def test_reflector_draws_an_attack_aimed_at_another_module_and_reflects_it():
    engine = duel()
    laser = add(engine, "p1", "laser", "laser", 0, 0)
    shield = add(engine, "p2", "a-shield", "shield", 0, 0)
    reflector = add(engine, "p2", "z-reflector", "reflector", 1, 0)
    power(engine)
    assert mirror_interceptor(engine.state.players["p2"], shield) is reflector

    engine._process_combat_actions()
    attack = [event.data for event in engine.state.events if event.type == "attack_performed"][0]
    assert attack["target_module_id"] == "z-reflector"
    assert shield.hp == shield.definition.max_hp
    # Gelen 10 hasarın %25'i azalır, %30'u saldırana döner.
    assert reflector.definition.max_hp - reflector.hp == 8
    assert laser.definition.max_hp - laser.hp == 3
    mirror = pulses(engine, "mirror")
    assert len(mirror) == 1 and mirror[0]["pulled_from_module_id"] == "a-shield"
    assert reflector.mechanic_state[MIRROR_CHARGE_KEY] is False


def test_reflector_draws_only_one_attack_per_cycle():
    engine = duel()
    add(engine, "p1", "laser-a", "laser", 0, 0)
    add(engine, "p1", "laser-b", "laser", 1, 0)
    shield = add(engine, "p2", "a-shield", "shield", 0, 0)
    reflector = add(engine, "p2", "z-reflector", "reflector", 1, 0)
    power(engine)
    engine._process_combat_actions()
    targets = [event.data["target_module_id"] for event in engine.state.events if event.type == "attack_performed"]
    assert sorted(targets) == ["a-shield", "z-reflector"]
    assert shield.hp < shield.definition.max_hp
    assert len([event for event in engine.state.events if event.type == "damage_reflected"]) == 1

    # Ayna 1 saniyede yeniden hazır olur.
    engine.state.elapsed_ms = 900
    engine._process_module_cycles()
    assert reflector.mechanic_state[MIRROR_CHARGE_KEY] is False
    engine.state.elapsed_ms = 1000
    engine._process_module_cycles()
    assert reflector.mechanic_state[MIRROR_CHARGE_KEY] is True


def test_uncharged_reflector_still_reduces_damage_but_does_not_reflect():
    engine = duel()
    laser = add(engine, "p1", "laser", "laser", 0, 0)
    reflector = add(engine, "p2", "reflector", "reflector", 0, 0)
    power(engine)
    first = hit(engine, laser, reflector)
    assert first.reflected_damage == 3 and first.mirror_charge_used
    second = hit(engine, laser, reflector)
    assert second.defense_type == "Yansıtıcı" and second.final_damage < second.raw_damage
    assert second.reflected_damage == 0


def test_missile_lock_is_not_reset_when_the_reflector_draws_the_shot():
    engine = duel()
    add(engine, "p1", "missile", "missile_launcher", 0, 0)
    add(engine, "p1", "battery", "battery", 1, 0)
    add(engine, "p2", "a-armor", "armor", 0, 0)
    reflector = add(engine, "p2", "z-reflector", "reflector", 1, 0)
    for _ in range(9):
        power(engine)
        engine._process_module_cycles()
        engine._process_combat_actions()
        engine.state.elapsed_ms += TICK_MS
    locks = [event.data for event in engine.state.events if event.type == "attack_windup_started"]
    attacks = [event.data for event in engine.state.events if event.type == "attack_performed"]
    assert len(locks) == 1 and locks[0]["target_module_id"] == "a-armor"
    assert len(attacks) == 1 and attacks[0]["target_module_id"] == "z-reflector"
    assert reflector.hp < reflector.definition.max_hp


# -- Koruyucu Kubbe, Faz Zırhı, Zırh, Bariyer ---------------------------------------------

def test_guardian_dome_guards_one_attack_on_another_module_per_cycle():
    engine = duel()
    laser = add(engine, "p1", "laser", "laser", 0, 0)
    armor = add(engine, "p2", "a-armor", "armor", 0, 0)
    dome = add(engine, "p2", "z-dome", "guardian_dome", 1, 0)
    power(engine)
    guarded = hit(engine, laser, armor)
    plain = hit(engine, laser, armor)
    # Lazer Zırh'a güçlüdür (15 ham hasar); Zırh %25, kubbe darbesi ayrıca %30 keser.
    assert guarded.raw_damage == 15 and guarded.final_damage == round(15 * 0.75 * 0.70)
    assert plain.final_damage == round(15 * 0.75) and "Kubbe" not in plain.defense_type
    assert dome.mechanic_state[DOME_CHARGE_KEY] is False
    assert pulses(engine, "dome_guard")[0]["target_module_id"] == "a-armor"
    engine.state.elapsed_ms = 1500
    engine._process_module_cycles()
    assert dome.mechanic_state[DOME_CHARGE_KEY] is True
    # Kubbe kendisini darbeyle değil sürekli azaltımıyla korur.
    own = hit(engine, laser, dome)
    assert own.defense_type == "Koruyucu Kubbe" and dome.mechanic_state[DOME_CHARGE_KEY] is True


def test_phase_armor_cycle_shortens_with_level():
    engine = duel(levels={"p2": {"phase_armor": 14}})
    veteran = add(engine, "p2", "phase", "phase_armor", 0, 0)
    cycle = veteran.definition.cooldown_ms
    assert cycle == round(6000 * 0.992 ** 14) < 6000
    assert phase_armor_active(0, cycle) and phase_armor_active(cycle + 500, cycle)
    assert not phase_armor_active(cycle - 500, cycle)
    # Seviye 1 çevrimi 6 saniyedir.
    assert phase_armor_active(6000 + 500) and not phase_armor_active(cycle + 500)
    laser = add(engine, "p1", "laser", "laser", 0, 0)
    power(engine)
    assert hit(engine, laser, veteran, elapsed_ms=cycle + 100).final_damage == 0
    assert hit(engine, laser, veteran, elapsed_ms=cycle - 100).final_damage > 0


def test_armor_mends_its_plating_on_its_cycle():
    engine = duel()
    armor = add(engine, "p2", "armor", "armor", 0, 0)
    power(engine)
    engine._process_module_cycles()
    assert armor.hp == armor.definition.max_hp
    assert not [event for event in engine.state.events if event.type == "module_repaired"]

    armor.hp -= 40
    engine._process_module_cycles()        # hasarsızken hazır bekleyen onarım hemen gelir
    assert armor.hp == armor.definition.max_hp - 35
    engine.state.elapsed_ms = 2900
    engine._process_module_cycles()
    assert armor.hp == armor.definition.max_hp - 35
    engine.state.elapsed_ms = 3000
    engine._process_module_cycles()
    assert armor.hp == armor.definition.max_hp - 30
    repairs = [event.data for event in engine.state.events if event.type == "module_repaired"]
    assert [item["repair"] for item in repairs] == [5, 5]
    assert all(item["mechanic"] == "armor_regen" and item["source_module_id"] == "armor" for item in repairs)


def test_barrier_resistance_shortens_one_sabotage_per_cycle():
    engine = duel()
    emp = add(engine, "p1", "emp", "emp", 0, 0)
    add(engine, "p1", "battery", "battery", 1, 0)
    barrier = add(engine, "p2", "barrier", "barrier", 0, 0)
    victim = add(engine, "p2", "victim", "battery", 1, 0)
    power(engine)
    guarded = sabotage_resistance(emp, victim, engine.state.players["p2"])
    assert guarded.guard_module_id == "barrier"
    assert guarded.duration_multiplier == pytest.approx(0.65)

    engine._process_sabotage_actions()
    effect = victim.debuffs[EMP_DEBUFF_ID]
    assert effect.expires_at_ms == round(EMP_DURATION_MS * 0.65)
    assert barrier.mechanic_state[SABOTAGE_GUARD_KEY] is False
    assert len(pulses(engine, "sabotage_guard")) == 1
    # Yük harcandı: sıradaki sabotaj tam süre işler.
    assert sabotage_resistance(emp, victim, engine.state.players["p2"]).duration_multiplier == pytest.approx(1.0)
    engine.state.elapsed_ms = 4000
    power(engine)
    engine._process_module_cycles()
    assert barrier.mechanic_state[SABOTAGE_GUARD_KEY] is True


# -- Destek darbeleri -------------------------------------------------------------------

def test_cooler_cools_once_per_cycle():
    engine = duel()
    add(engine, "p1", "cooler", "cooler", 0, 0)
    rail = add(engine, "p1", "rail", "railgun", 1, 0)
    power(engine)
    rail.heat = 50.0
    engine._process_support_actions()
    assert rail.heat == pytest.approx(50.0 - COOLER_HEAT_REDUCTION_PER_PULSE)
    engine.state.elapsed_ms = 900
    engine._process_support_actions()
    assert rail.heat == pytest.approx(50.0 - COOLER_HEAT_REDUCTION_PER_PULSE)
    engine.state.elapsed_ms = 1000
    engine._process_support_actions()
    assert rail.heat == pytest.approx(50.0 - 2 * COOLER_HEAT_REDUCTION_PER_PULSE)
    assert len(pulses(engine, "cooler")) == 2


def test_idle_cooler_keeps_its_pulse_ready():
    engine = duel()
    add(engine, "p1", "cooler", "cooler", 0, 0)
    rail = add(engine, "p1", "rail", "railgun", 1, 0)
    power(engine)
    engine._process_support_actions()
    engine.state.elapsed_ms = 300
    rail.heat = 20.0
    engine._process_support_actions()
    assert rail.heat == pytest.approx(20.0 - COOLER_HEAT_REDUCTION_PER_PULSE)


def test_targeting_lock_is_spent_by_a_shot_and_returns_on_the_pulse():
    engine = duel()
    add(engine, "p1", "targeting", "targeting_computer", 0, 0)
    laser = add(engine, "p1", "laser", "laser", 1, 0)
    add(engine, "p1", "battery", "battery", 3, 0)
    add(engine, "p2", "wall", "armor", 0, 0)
    player = engine.state.players["p1"]
    boosts = []
    for _ in range(31):
        power(engine)
        engine._process_module_cycles()
        engine._process_combat_actions()
        engine.state.elapsed_ms += TICK_MS
    boosts = [event.data["targeting_active"] for event in engine.state.events if event.type == "attack_support_applied"]
    # Kilit 2 saniyede bir gelir; kilitli atıştan sonraki bekleme %18 kısalır.
    # Lazer kilit aralığından sık ateş ettiği için her atışında kilit bulamaz.
    assert boosts[:4] == [True, False, False, True]
    cooldowns = [event.data["ready_at_ms"] - event.at_ms for event in engine.state.events
                 if event.type == "module_cooldown_started" and event.data["cooldown_id"] == ATTACK_COOLDOWN_ID]
    assert cooldowns[0] == 820 and cooldowns[1] == 1000
    assert len(pulses(engine, "targeting_computer")) == 2
    laser.mechanic_state[TARGETING_LOCK_KEY] = False
    assert attack_support_modifiers(player, laser, Position(2, 1)).targeting_active is False


def test_overclock_charges_the_heaviest_attack_and_heats_it_per_pulse():
    engine = duel()
    add(engine, "p1", "overclock", "overclock_unit", 0, 0)
    laser = add(engine, "p1", "laser", "laser", 1, 0)
    rail = add(engine, "p1", "rail", "railgun", 3, 0)
    power(engine)
    rail.mechanic_state[OVERCLOCK_CHARGE_KEY] = False
    player = engine.state.players["p1"]
    assert attack_support_modifiers(player, rail, Position(2, 1)).overclock_active is False

    engine._process_support_actions()
    assert rail.heat == pytest.approx(OVERCLOCK_HEAT_PER_PULSE) and laser.heat == 0
    assert attack_support_modifiers(player, rail, Position(2, 1)).overclock_active is True
    engine.state.elapsed_ms = 2400
    engine._process_support_actions()
    assert rail.heat == pytest.approx(OVERCLOCK_HEAT_PER_PULSE)
    engine.state.elapsed_ms = 2500
    engine._process_support_actions()
    assert rail.heat == pytest.approx(2 * OVERCLOCK_HEAT_PER_PULSE)


def test_chrono_time_debt_shortens_with_level():
    engine = duel(levels={"p2": {"chrono_relay": 14}})
    rookie = add(engine, "p1", "chrono", "chrono_relay", 0, 0)
    veteran = add(engine, "p2", "chrono", "chrono_relay", 0, 0)
    assert chrono_debt_ms(rookie) == 2500
    assert chrono_debt_ms(veteran) == round(6500 * 0.992 ** 14) - 4000 < 2000
    power(engine)
    engine._process_support_actions()
    assert veteran.mechanic_state["chrono_debt_until_ms"] - veteran.mechanic_state["chrono_boost_until_ms"] == chrono_debt_ms(veteran)


def test_precision_focus_builds_on_the_matrix_pulse_and_resets_on_a_new_target():
    engine = duel()
    add(engine, "p1", "matrix", "precision_matrix", 0, 0)
    laser = add(engine, "p1", "laser", "laser", 1, 0)
    add(engine, "p1", "battery", "battery", 3, 0)
    first = add(engine, "p2", "a-wall", "armor", 0, 0)
    add(engine, "p2", "b-wall", "armor", 1, 0)
    seen = []
    for _ in range(62):
        power(engine)
        engine._process_combat_actions()
        engine._process_module_cycles()
        seen.append(int(laser.mechanic_state.get("precision_focus_stacks", 0)))
        engine.state.elapsed_ms += TICK_MS
    # İlk atıştan sonra hazır bekleyen darbe ilk kademeyi verir; sonra 1,5 sn'de bir.
    assert seen[0] == 1 and seen[14] == 1 and seen[15] == 2 and seen[30] == 3
    assert max(seen) == PRECISION_MAX_STACKS
    assert laser.mechanic_state["precision_focus_target"] == "a-wall"

    engine.apply_damage("p2", first.instance_id, first.hp)
    laser.cooldowns_ready_at_ms.clear()
    power(engine)
    engine._process_combat_actions()
    assert laser.mechanic_state["precision_focus_target"] == "b-wall"
    assert laser.mechanic_state["precision_focus_stacks"] == 0


def test_omega_amplifier_charges_on_its_pulse():
    engine = duel()
    add(engine, "p1", "omega", "omega_amplifier", 0, 0)
    laser = add(engine, "p1", "laser", "laser", 1, 0)
    add(engine, "p1", "battery", "battery", 3, 0)
    add(engine, "p2", "wall", "armor", 0, 0)
    for _ in range(21):
        power(engine)
        engine._process_module_cycles()
        engine._process_combat_actions()
        engine.state.elapsed_ms += TICK_MS
    boosts = [event.data["amplifier_active"] for event in engine.state.events if event.type == "attack_support_applied"]
    assert boosts == [True, False, True]
    assert laser.mechanic_state[OMEGA_CHARGE_KEY] is False
    assert len(pulses(engine, "omega_amplifier")) == 2


# -- Sistem: deponun dolum çevrimi ---------------------------------------------------------

def test_storage_refill_time_is_the_cycle_and_shortens_with_level():
    engine = duel(levels={"p2": {"battery": 14, "capacitor": 14}})
    battery = add(engine, "p1", "battery", "battery", 0, 0)
    capacitor = add(engine, "p1", "capacitor", "capacitor", 1, 0)
    assert storage_charge_rate_per_second(battery) == pytest.approx(5.0)
    assert storage_charge_rate_per_second(capacitor) == pytest.approx(10.0)
    strong_battery = add(engine, "p2", "battery", "battery", 0, 0)
    strong_capacitor = add(engine, "p2", "capacitor", "capacitor", 1, 0)
    assert storage_charge_rate_per_second(strong_battery) > 5.0 * 1.6
    assert storage_charge_rate_per_second(strong_capacitor) > 10.0 * 1.6


# -- bütün modüllerle koşan savaş ---------------------------------------------------------

def test_a_running_battle_with_every_cycle_module_emits_their_pulses():
    engine = duel("cycles-smoke")
    own = ["shield", "reflector", "guardian_dome", "armor", "barrier", "phase_armor", "prism_shield",
           "cooler", "targeting_computer", "overclock_unit", "chrono_relay", "precision_matrix",
           "omega_amplifier", "amplifier"]
    cells = [(x, y) for y in range(3) for x in range(5) if (x, y) != (2, 1)]
    for index, module_id in enumerate(own):
        add(engine, "p2", f"m{index:02d}-{module_id}", module_id, *cells[index])
    for index, module_id in enumerate(["laser", "pulse_cannon", "arc_cannon", "emp", "jammer", "battery",
                                       "battery", "drone_bay", "railgun", "virus"]):
        add(engine, "p1", f"a{index:02d}-{module_id}", module_id, *cells[index])
    engine.state.status = BattleStatus.RUNNING
    for _ in range(400):
        engine.step()
    kinds = {event.data["kind"] for event in engine.state.events if event.type == "module_cycle_pulse"}
    assert {"block", "mirror", "dome_guard", "sabotage_guard"} <= kinds
    assert any(event.data.get("mechanic") == "armor_regen" for event in engine.state.events if event.type == "module_repaired")
