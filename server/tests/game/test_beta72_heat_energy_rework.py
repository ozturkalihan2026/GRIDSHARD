"""Beta.72 tur 12 — ısı bütün modüllere yayıldı, enerji darlaştı.

Isı yüzdedir: %40'ın üzerinde her tam %5 eylem aralığını %5 uzatır (sürekli
sistemlerde etkiyi aynı oranda düşürür), %100'de modül susar ve %70'in altına
inene kadar çalışmaz. Çekirdek üretimi 12 → 5,5 enerji/sn (tur 14'te oyuncu
tahtası için 9, Batarya 3 → 4,5); bekleyen aksiyonlar adil bir enerji sırasıyla
ödenir. Değerler denge simülasyonuyla seçildi.
"""
import pytest

from app.game.combat import ATTACK_WINDUP_MS, defense_profile
from app.game.energy import (
    BASE_CORE_GENERATION_PER_SECOND,
    BASE_DISTRIBUTION_EFFICIENCY,
    BATTERY_SUPPLY_PER_SECOND,
    TICK_SECONDS,
    process_energy_tick,
    spend_action_energy,
)
from app.game.engine import BattleEngine
from app.game.heat import (
    HEAT_PER_BLOCKED_DAMAGE,
    HEAT_PER_DISCHARGED_ENERGY,
    HEAT_PER_UPKEEP_ENERGY,
    OVERHEAT_DEBUFF_ID,
    action_heat_gain,
)
from app.game.models import BattleState, ModuleStatus, Position
from app.game.support import attack_support_modifiers, cooler_targets

POSITIONS = (
    (0, 0), (1, 0), (2, 0), (3, 0), (4, 0), (0, 1),
    (1, 1), (3, 1), (4, 1), (0, 2), (1, 2), (3, 2),
)


def add(engine, player_id, instance_id, definition_id, x, y):
    module = engine.grant_module(player_id, instance_id, definition_id)
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    return module


def duel():
    engine = BattleEngine(BattleState(battle_id="beta72-heat-energy-rework"))
    engine.add_player("p1")
    engine.add_player("p2")
    add(engine, "p1", "p1-core", "core", 2, 1)
    add(engine, "p2", "p2-core", "core", 2, 1)
    return engine


def events(engine, event_type):
    return [event for event in engine.state.events if event.type == event_type]


# --- Isı: kademeli yavaşlama ------------------------------------------------

def test_hot_attack_waits_longer_between_shots():
    engine = duel()
    add(engine, "p2", "p2-armor", "armor", 0, 0)
    laser = add(engine, "p1", "laser", "laser", 1, 0)
    laser.heat = 70.0  # 6 adım: aralık ×1,30
    engine._process_combat_actions()
    assert events(engine, "attack_performed")
    ready_at = laser.cooldowns_ready_at_ms["attack"]
    assert ready_at - engine.state.elapsed_ms == round(laser.definition.cooldown_ms * 1.30)
    assert laser.heat == pytest.approx(70.0 + action_heat_gain(laser))


def test_hot_defense_protects_less_before_it_shuts_down():
    engine = duel()
    shield = add(engine, "p2", "shield", "shield", 0, 0)
    laser = add(engine, "p1", "laser", "laser", 0, 0)
    _, cold, _ = defense_profile(shield, attacker=laser)
    shield.heat = 70.0
    _, hot, _ = defense_profile(shield, attacker=laser)
    assert cold < hot < 1.0
    assert (1 - hot) == pytest.approx((1 - cold) / 1.30)


# --- Isı: çalışan her modül ısınır ------------------------------------------

def test_repair_heats_per_action_and_slows_when_hot():
    engine = duel()
    repair = add(engine, "p1", "repair", "repair", 0, 0)
    shield = add(engine, "p1", "shield", "shield", 1, 0)
    engine._process_energy_flow()
    shield.hp = 40
    repair.heat = 50.0  # 2 adım: aralık ×1,10
    engine._process_support_actions()
    assert shield.hp > 40
    assert repair.heat == pytest.approx(50.0 + action_heat_gain(repair))
    ready_at = repair.cooldowns_ready_at_ms["support_repair"]
    assert ready_at - engine.state.elapsed_ms == round(repair.definition.cooldown_ms * 1.10)


def test_sabotage_heats_per_action():
    engine = duel()
    emp = add(engine, "p1", "emp", "emp", 0, 0)
    add(engine, "p2", "p2-shield", "shield", 0, 0)
    engine._process_energy_flow()
    engine._process_sabotage_actions()
    assert events(engine, "sabotage_applied")
    assert emp.heat == pytest.approx(action_heat_gain(emp))


def test_defense_heats_from_blocked_damage():
    engine = duel()
    add(engine, "p1", "pulse", "pulse_cannon", 0, 0)
    shield = add(engine, "p2", "shield", "shield", 0, 0)
    engine._process_energy_flow()
    shield.heat = 0.0
    engine._process_combat_actions()
    attack = events(engine, "attack_performed")[0]
    assert attack.data["reduced_damage"] > 0
    assert shield.heat == pytest.approx(attack.data["reduced_damage"] * HEAT_PER_BLOCKED_DAMAGE)


def test_continuous_systems_heat_from_upkeep_but_core_and_cooler_do_not():
    engine = duel()
    dome = add(engine, "p1", "dome", "guardian_dome", 0, 0)
    cooler = add(engine, "p1", "cooler", "cooler", 1, 0)
    engine._process_energy_flow()
    player = engine.state.players["p1"]
    assert dome.heat == pytest.approx(
        dome.definition.energy_consumption * TICK_SECONDS * HEAT_PER_UPKEEP_ENERGY
    )
    assert cooler.heat == 0.0
    assert player.modules["p1-core"].heat == 0.0


def test_battery_heats_when_it_discharges_for_an_action():
    engine = duel()
    battery = add(engine, "p1", "battery", "battery", 0, 0)
    pulse = add(engine, "p1", "pulse", "pulse_cannon", 1, 0)
    player = engine.state.players["p1"]
    battery.stored_energy = 10.0
    player.energy_stock = 1.0
    result = spend_action_energy(player, pulse)
    assert result.success is True
    assert battery.heat == pytest.approx(4.0 * HEAT_PER_DISCHARGED_ENERGY)


# --- Isı: %100'de her sınıf susar -------------------------------------------

def test_overheated_modules_stop_working_in_every_class():
    engine = duel()
    shield = add(engine, "p2", "shield", "shield", 0, 0)
    laser = add(engine, "p1", "laser", "laser", 0, 0)
    amp = add(engine, "p1", "amp", "amplifier", 1, 0)
    battery = add(engine, "p1", "battery", "battery", 3, 0)
    engine._process_energy_flow()
    player = engine.state.players["p1"]

    _, cold_multiplier, _ = defense_profile(shield, attacker=laser)
    assert cold_multiplier < 1.0
    assert attack_support_modifiers(player, laser, engine.board.core_position).amplifier_active
    with_battery = process_energy_tick(player).generated

    for module, owner in ((shield, "p2"), (amp, "p1"), (battery, "p1")):
        module.heat = 100.0
        engine.add_debuff(owner, module.instance_id, OVERHEAT_DEBUFF_ID, "Aşırı Isınma", None)

    _, hot_multiplier, _ = defense_profile(shield, attacker=laser)
    assert hot_multiplier == 1.0
    assert not attack_support_modifiers(player, laser, engine.board.core_position).amplifier_active
    assert process_energy_tick(player).generated < with_battery


def test_overheated_repair_stays_silent():
    engine = duel()
    repair = add(engine, "p1", "repair", "repair", 0, 0)
    shield = add(engine, "p1", "shield", "shield", 1, 0)
    engine._process_energy_flow()
    shield.hp = 40
    repair.heat = 90.0
    engine.add_debuff("p1", "repair", OVERHEAT_DEBUFF_ID, "Aşırı Isınma", None)
    engine._process_support_actions()
    assert shield.hp == 40


def test_continuous_module_at_full_heat_shuts_down_before_cooling():
    engine = duel()
    shield = add(engine, "p1", "shield", "shield", 0, 0)
    shield.heat = 100.0
    engine._process_passive_heat()
    assert OVERHEAT_DEBUFF_ID in shield.debuffs
    assert any(
        event.data["module_id"] == "shield"
        for event in events(engine, "module_overheated")
    )


# --- Soğutucu ---------------------------------------------------------------

def test_cooler_rescues_overheated_modules_first_and_twice_as_fast():
    engine = duel()
    cooler = add(engine, "p1", "cooler", "cooler", 0, 0)
    silenced = add(engine, "p1", "silenced", "railgun", 1, 0)
    hot = [
        add(engine, "p1", f"hot-{index}", "laser", *POSITIONS[index + 2])
        for index in range(3)
    ]
    silenced.heat = 80.0
    engine.add_debuff("p1", "silenced", OVERHEAT_DEBUFF_ID, "Aşırı Isınma", None)
    for module, heat in zip(hot, (95.0, 90.0, 85.0)):
        module.heat = heat
    engine._process_energy_flow()

    targets = cooler_targets(engine.state.players["p1"], cooler, engine.board.core_position)
    assert [module.instance_id for module in targets] == ["silenced", "hot-0", "hot-1"]

    engine._process_support_actions()
    assert 80.0 - silenced.heat == pytest.approx(2 * (95.0 - hot[0].heat))
    assert hot[2].heat == 85.0


# --- Enerji ------------------------------------------------------------------

def test_core_carries_a_mid_game_circuit_and_two_batteries_carry_a_full_one():
    # Beta.72 tur 14: oyuncu tahtası 7–14 modüle çıkıyor, Batarya en fazla 2 kopya.
    assert BASE_CORE_GENERATION_PER_SECOND == 9.0
    assert BATTERY_SUPPLY_PER_SECOND == 4.5
    engine = duel()
    player = engine.state.players["p1"]
    # 7 modüllük orta oyun devresi (9,1 enerji/sn): Çekirdek tek başına taşır;
    # yük istemcinin enerji darlığı eşiğinin (1,1) altında kalır.
    mid = ("pulse_cannon", "pulse_cannon", "pulse_cannon", "shield", "shield", "repair", "cooler")
    for index, module_id in enumerate(mid):
        add(engine, "p1", f"mid{index}", module_id, *POSITIONS[index])
    process_energy_tick(player)
    assert 1.0 < player.energy_load_ratio < 1.1

    engine = duel()
    player = engine.state.players["p1"]
    # Tam devre: 6 Darbe Topu + Soğutucu, Onarım, Kalkan, EMP (15,3 enerji/sn).
    full = ("pulse_cannon",) * 6 + ("cooler", "repair", "shield", "emp")
    for index, module_id in enumerate(full):
        add(engine, "p1", f"full{index}", module_id, *POSITIONS[index])
    process_energy_tick(player)
    without_battery = player.energy_load_ratio
    add(engine, "p1", "battery-1", "battery", *POSITIONS[10])
    process_energy_tick(player)
    one_battery = player.energy_load_ratio
    add(engine, "p1", "battery-2", "battery", *POSITIONS[11])
    process_energy_tick(player)
    assert without_battery > 1.5
    assert one_battery > 1.0
    # İki Bataryayla talep devreye dağıtılan enerjinin (%90) içinde kalır.
    assert player.energy_load_ratio < BASE_DISTRIBUTION_EFFICIENCY


def test_waiting_heavy_shot_is_not_starved_by_cheaper_actions():
    engine = duel()
    rail = add(engine, "p1", "rail", "railgun", 0, 0)
    laser = add(engine, "p1", "laser", "laser", 1, 0)
    player = engine.state.players["p1"]
    player.energy_stock = 3.0
    assert spend_action_energy(player, rail).success is False
    assert player.energy_wait_queue == ["rail"]
    # Lazer ucuz ama rezerv Ray Topu'nun payını karşılamıyor: sıraya girer.
    assert spend_action_energy(player, laser).success is False
    assert player.energy_wait_queue == ["rail", "laser"]
    assert player.energy_stock == 3.0

    player.energy_stock = 6.5
    assert spend_action_energy(player, laser).success is False
    assert spend_action_energy(player, rail).success is True
    assert player.energy_wait_queue == ["laser"]
    assert spend_action_energy(player, laser).success is False
    player.energy_stock = 2.0
    assert spend_action_energy(player, laser).success is True
    assert player.energy_wait_queue == []


def test_module_that_stops_retrying_leaves_the_energy_queue():
    engine = duel()
    rail = add(engine, "p1", "rail", "railgun", 0, 0)
    laser = add(engine, "p1", "laser", "laser", 1, 0)
    player = engine.state.players["p1"]
    player.energy_stock = 0.0
    assert spend_action_energy(player, rail).success is False
    process_energy_tick(player)  # son adımda denedi: sırasını korur
    assert player.energy_wait_queue == ["rail"]
    process_energy_tick(player)  # yeniden denemedi: sıradan çıkar
    assert player.energy_wait_queue == []
    assert rail.energy_waiting is False
    player.energy_stock = 2.0
    assert spend_action_energy(player, laser).success is True


def test_missile_keeps_its_lock_while_waiting_for_energy():
    engine = duel()
    missile = add(engine, "p1", "missile", "missile_launcher", 0, 0)
    add(engine, "p2", "p2-armor", "armor", 0, 0)
    player = engine.state.players["p1"]
    player.energy_stock = 0.0
    engine._process_combat_actions()  # kilit başlar
    engine.state.elapsed_ms += ATTACK_WINDUP_MS["missile_launcher"]
    engine._process_combat_actions()  # kilit tamam, enerji yok
    assert missile.energy_waiting is True
    assert missile.mechanic_state.get("windup_target_id") == "p2-armor"

    player.energy_stock = 24.0
    engine._process_combat_actions()
    assert events(engine, "attack_performed")
    assert len(events(engine, "attack_windup_started")) == 1

