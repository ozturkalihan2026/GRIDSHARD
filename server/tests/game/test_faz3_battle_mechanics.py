"""Faz 3 (12 Ekim 2026) savaş mekaniği: Güçlendirici'nin yükleme çevrimi (D13)
ve bilgi ekranındaki gerçek enerji tüketimi (D14)."""
import pytest

from app.arena_canon import MODULES, module_stats
from app.game.catalog import BASIC_MODULE_DEFINITIONS
from app.game.engine import TICK_MS, BattleEngine
from app.game.models import BattleState, BattleStatus, ModuleStatus, Position
from app.game.support import (
    AMPLIFIER_CHARGE_KEY,
    AMPLIFIER_PER_ATTACK_CAP,
    attack_support_modifiers,
)


def add(engine, player, instance_id, definition_id, x, y):
    module = engine.grant_module(player, instance_id, definition_id)
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    return module


def make_engine(battle_id="faz3"):
    engine = BattleEngine(BattleState(battle_id=battle_id))
    engine.add_player("p1")
    engine.add_player("p2")
    return engine


def amplifier_line(engine, attack="laser"):
    add(engine, "p1", "core", "core", 2, 1)
    amplifier = add(engine, "p1", "amp", "amplifier", 1, 0)
    weapon = add(engine, "p1", "weapon", attack, 0, 0)
    add(engine, "p1", "battery", "battery", 3, 0)
    add(engine, "p2", "core", "core", 2, 1)
    add(engine, "p2", "wall", "armor", 0, 0)
    engine._process_energy_flow()
    return amplifier, weapon


def advance(engine, milliseconds):
    for _ in range(milliseconds // TICK_MS):
        engine.state.elapsed_ms += TICK_MS
        engine._process_energy_flow()
        engine._process_amplifier_pulses()
        engine._process_combat_actions()


# -- D13: Güçlendirici 2 saniyede bir yükler -----------------------------------

def test_amplifier_has_a_two_second_cycle_that_shortens_with_level():
    definition = BASIC_MODULE_DEFINITIONS["amplifier"]
    assert definition.cooldown_ms == 2000
    cycle = [module_stats(definition, level)["cooldown_ms"] for level in range(15)]
    assert cycle[0] == 2000
    assert cycle == sorted(cycle, reverse=True)
    assert cycle[1] < cycle[0] and cycle[14] < cycle[1]
    # Yükleme çevrimi Güçlendirici'yi saldıran modül yapmaz.
    engine = make_engine("faz3-amp-not-attacker")
    amplifier, _ = amplifier_line(engine)
    from app.game.combat import is_attack_module

    assert not is_attack_module(amplifier)


def test_new_weapon_fires_its_first_shot_charged_then_waits_for_the_next_pulse():
    engine = make_engine("faz3-amp-charge")
    amplifier, laser = amplifier_line(engine)
    player = engine.state.players["p1"]
    engine.state.status = BattleStatus.RUNNING

    first = attack_support_modifiers(player, laser, engine.board.core_position)
    assert first.kind == "amplifier" and first.amplifier_active
    assert first.damage_multiplier == pytest.approx(
        1 + AMPLIFIER_PER_ATTACK_CAP * amplifier.definition.effect_multiplier
    )

    engine._process_amplifier_pulses()   # 0. ms: ilk yükleme, çevrim başlar
    engine._process_combat_actions()     # yüklü atış
    assert laser.mechanic_state[AMPLIFIER_CHARGE_KEY] is False
    spent = attack_support_modifiers(player, laser, engine.board.core_position)
    assert spent.kind == "" and spent.damage_multiplier == pytest.approx(1.0)

    # Lazer saniyede bir ateş eder; çevrim 2 saniyedir: sıradaki atış yüksüzdür.
    advance(engine, 1000)
    boosts = [
        event.data for event in engine.state.events
        if event.type == "attack_support_applied" and event.data["module_id"] == "weapon"
    ]
    assert [item["amplifier_active"] for item in boosts] == [True, False]

    # 2. saniyede Güçlendirici yeniden yükler ve o atış güçlenir.
    advance(engine, 1000)
    boosts = [
        event.data for event in engine.state.events
        if event.type == "attack_support_applied" and event.data["module_id"] == "weapon"
    ]
    assert [item["amplifier_active"] for item in boosts] == [True, False, True]
    pulses = [event for event in engine.state.events if event.type == "amplifier_pulse"]
    assert [event.at_ms for event in pulses] == [0, 2000]
    assert pulses[0].data["charged_module_ids"] == ["weapon"]


def test_weapon_slower_than_the_cycle_is_charged_on_every_shot():
    engine = make_engine("faz3-amp-slow")
    amplifier_line(engine, attack="pulse_cannon")
    engine.state.status = BattleStatus.RUNNING
    engine._process_amplifier_pulses()
    engine._process_combat_actions()
    advance(engine, 9000)
    boosts = [
        event.data["amplifier_active"] for event in engine.state.events
        if event.type == "attack_support_applied" and event.data["module_id"] == "weapon"
    ]
    assert len(boosts) >= 3 and all(boosts)


def test_silenced_or_unpowered_amplifier_does_not_charge():
    engine = make_engine("faz3-amp-silenced")
    amplifier, laser = amplifier_line(engine)
    laser.mechanic_state[AMPLIFIER_CHARGE_KEY] = False
    amplifier.is_powered = False
    engine._process_amplifier_pulses()
    assert laser.mechanic_state[AMPLIFIER_CHARGE_KEY] is False
    amplifier.is_powered = True
    engine._process_amplifier_pulses()
    assert laser.mechanic_state[AMPLIFIER_CHARGE_KEY] is True


# -- D14: her modül enerji tüketir; ekran gerçek tüketimi gösterir -------------------

def test_every_module_except_the_generator_spends_energy():
    for module_id in MODULES:
        stats = module_stats(BASIC_MODULE_DEFINITIONS[module_id], 0)
        if module_id == "battery":
            assert stats["energy_generation"] > 0 and stats["energy_per_second"] == 0
            continue
        assert stats["energy_per_second"] > 0, module_id
        assert stats["energy_generation"] == 0, module_id


def test_displayed_energy_use_is_upkeep_plus_action_cost_per_second():
    laser = module_stats(BASIC_MODULE_DEFINITIONS["laser"], 0)
    # Lazer saniyede bir atar, atış başına 1,2 enerji harcar; bakımı yoktur.
    assert (laser["energy_consumption"], laser["action_energy_cost"], laser["energy_per_second"]) == (0.0, 1.2, 1.2)
    cannon = module_stats(BASIC_MODULE_DEFINITIONS["pulse_cannon"], 0)
    assert cannon["energy_per_second"] == pytest.approx(5.0 / 2.5)
    shield = module_stats(BASIC_MODULE_DEFINITIONS["shield"], 0)
    assert (shield["action_energy_cost"], shield["energy_per_second"]) == (0.0, shield["energy_consumption"])
    assert module_stats(BASIC_MODULE_DEFINITIONS["capacitor"], 0)["energy_per_second"] == 0.2


def test_engine_still_charges_only_the_upkeep_continuously():
    engine = make_engine("faz3-energy-upkeep")
    add(engine, "p1", "core", "core", 2, 1)
    laser = add(engine, "p1", "laser", "laser", 0, 0)
    shield = add(engine, "p1", "shield", "shield", 1, 0)
    # Motorun sürekli tüketimi bakımdır; aksiyon bedeli atışta ayrıca ödenir.
    assert laser.definition.energy_consumption == 0.0
    assert laser.definition.action_energy_cost == 1.2
    assert shield.definition.energy_consumption == pytest.approx(0.8)


# -- D10: yetenek ağacı ------------------------------------------------------------

from app.arena_canon import module_talent_options  # noqa: E402
from app.game.combat import adjacent_targets  # noqa: E402
from app.game.talents import (  # noqa: E402
    CURRENT_TAP_PLAYER_GAP_MS,
    MODULE_SIGNATURES,
    default_ai_talents,
    module_signature,
)

HOOKS = {
    "splash_window", "execute", "nth_shot", "core_breaker", "armor_break", "free_shot",
    "kill_reload", "first_strike", "last_stand", "thorns", "death_ward", "periodic_block",
    "fortify", "pulse_window", "current_tap", "deploy_repair", "death_current", "shock",
}


def test_every_module_has_four_thresholds_with_two_signature_talents():
    assert set(MODULE_SIGNATURES) == set(MODULES)
    for module_id, spec in MODULES.items():
        tree = module_talent_options(module_id)
        assert [node["tier"] for node in tree] == ["0", "1", "2", "3"], module_id
        assert [node["kind"] for node in tree] == ["basic", "signature", "tuning", "mastery"]
        assert [node["flux_cost"] for node in tree] == [15, 30, 45, 60]
        levels = [node["level"] for node in tree]
        assert levels == sorted(levels) and levels[-1] <= 15
        for node in tree:
            # Kayıtlı seçimler bozulmasın diye dal kimlikleri eskisi gibidir.
            assert [choice["id"] for choice in node["choices"]] == ["power", "resilience"]
            for choice in node["choices"]:
                assert choice["name_tr"] and choice["name_en"], (module_id, node["tier"])
                assert choice["description_tr"] and choice["description_en"], (module_id, node["tier"])
        left, right = tree[1]["choices"]
        assert left["hook"] in HOOKS and right["hook"] in HOOKS
        # İki imza yeteneği birbirinden farklı bir kuraldır.
        assert left["hook"] != right["hook"], module_id
        assert left["name_tr"] != right["name_tr"]
        assert spec["rarity"] in ("common", "rare", "epic", "legendary")
    used = {choice["hook"] for module_id in MODULES for choice in module_talent_options(module_id)[1]["choices"]}
    assert used == HOOKS


def test_laser_carries_the_talent_from_the_players_own_example():
    spreading = module_talent_options("laser")[1]["choices"][0]
    assert spreading["name_tr"] == "Yayılım Işını"
    assert spreading["description_tr"] == (
        "Her 30 saniyede bir 5 saniye boyunca her atış, hedefin yanındaki modüllere "
        "hasarın %30 kadarını da verir."
    )
    assert module_signature("laser", {"1": "power"}) == {
        "hook": "splash_window", "name_tr": "Yayılım Işını", "name_en": "Spreading Beam",
        "mastered": False, "period_ms": 30_000, "window_ms": 5_000, "ratio": 0.30,
    }
    # Ustalık imza yeteneğini güçlendirir; imza seçilmemişse tek başına etkisizdir.
    assert module_signature("laser", {"1": "power", "3": "power"})["ratio"] == pytest.approx(0.45)
    assert module_signature("laser", {"3": "power"}) is None
    assert module_signature("laser", {"0": "power", "2": "power"}) is None


def test_stat_branches_change_only_their_own_value():
    laser = BASIC_MODULE_DEFINITIONS["laser"]
    base = module_stats(laser, 4)
    assert module_stats(laser, 4, {"0": "power"})["base_damage"] == pytest.approx(base["base_damage"] * 1.03, abs=0.01)
    assert module_stats(laser, 4, {"0": "resilience"})["max_hp"] == round(laser.max_hp * 1.03 ** 4 * 1.05)
    # İmza eşiği sayısal değer değiştirmez.
    for choice in ("power", "resilience"):
        assert module_stats(laser, 4, {"1": choice}) == base
    speed = module_stats(laser, 4, {"2": "power"})
    assert speed["cooldown_ms"] == round(laser.cooldown_ms * 0.992 ** 4 * 0.96)
    assert speed["cooldown_ms"] < base["cooldown_ms"]
    assert speed["effect_multiplier"] == pytest.approx(base["effect_multiplier"])
    lean = module_stats(laser, 4, {"2": "resilience"})
    assert lean["action_energy_cost"] == pytest.approx(round(1.2 * 0.88, 2))
    assert lean["energy_per_second"] < base["energy_per_second"]
    assert module_stats(laser, 4, {"3": "resilience"})["max_hp"] == round(laser.max_hp * 1.03 ** 4 * 1.08)
    assert module_stats(laser, 4, {"3": "power"}) == base
    # Çevrimi olmayan modülde (yalnız Akım Dengeleyici) hız dalı etkiyi artırır.
    balancer = BASIC_MODULE_DEFINITIONS["current_balancer"]
    assert balancer.cooldown_ms == 0
    assert module_stats(balancer, 0, {"2": "power"})["effect_multiplier"] == pytest.approx(1.04)
    # Kalkan artık çevrimlidir: hız dalı blok aralığını kısaltır.
    shield = BASIC_MODULE_DEFINITIONS["shield"]
    assert module_stats(shield, 0, {"2": "power"})["cooldown_ms"] == round(1200 * 0.96)
    assert module_stats(shield, 0, {"2": "power"})["effect_multiplier"] == pytest.approx(1.0)
    assert module_stats(shield, 0, {"2": "resilience"})["energy_consumption"] == pytest.approx(round(0.8 * 0.88, 2))


def test_ai_opponent_picks_stable_branches_at_reached_thresholds():
    assert default_ai_talents("laser", "common", 0) == {}
    assert set(default_ai_talents("laser", "common", 7)) == {"0", "1"}
    full = default_ai_talents("ion_spear", "legendary", 14)
    assert set(full) == {"0", "1", "2", "3"} and full["3"] == "power"
    assert default_ai_talents("laser", "common", 14) == default_ai_talents("laser", "common", 14)
    assert all(choice in ("power", "resilience") for choice in full.values())


# -- D10: kancalar motorda -----------------------------------------------------------

def talent_engine(talents, battle_id="faz3-talent"):
    engine = make_engine(battle_id)
    engine.state.player_module_talents["p1"] = talents
    engine.state.status = BattleStatus.RUNNING
    return engine


def duel(engine, attacker_definition, targets=(("wall", "armor", 1, 0),)):
    add(engine, "p1", "core", "core", 2, 1)
    attacker = add(engine, "p1", "gun", attacker_definition, 0, 0)
    add(engine, "p1", "battery", "battery", 3, 0)
    add(engine, "p2", "core", "core", 2, 1)
    placed = [add(engine, "p2", instance_id, definition_id, x, y) for instance_id, definition_id, x, y in targets]
    engine._process_energy_flow()
    return attacker, placed


def fire(engine):
    engine._process_energy_flow()
    engine._process_talent_ticks()
    engine._process_combat_actions()


def next_shot(engine, attacker):
    engine.state.elapsed_ms = attacker.cooldowns_ready_at_ms.get("attack", engine.state.elapsed_ms)
    fire(engine)


def shots(engine, attacker_id="gun"):
    return [event.data for event in engine.state.events
            if event.type == "attack_performed" and event.data["attacker_module_id"] == attacker_id]


def triggered(engine, module_id):
    return [event.data for event in engine.state.events
            if event.type == "module_talent_triggered" and event.data["module_id"] == module_id]


def test_spreading_beam_hits_the_modules_next_to_the_target_only_inside_its_window():
    engine = talent_engine({"laser": {"1": "power"}})
    laser, _ = duel(engine, "laser", targets=(
        ("a-wall", "armor", 1, 0), ("b-battery", "battery", 0, 0),
        ("c-cooler", "cooler", 2, 0), ("d-far", "cooler", 4, 2),
    ))
    target_player = engine.state.players["p2"]
    assert [module.instance_id for module in adjacent_targets(target_player, target_player.modules["a-wall"])] == [
        "b-battery", "c-cooler",
    ]
    fire(engine)   # yerleşme anı: pencere henüz açılmadı
    assert not [event for event in engine.state.events if event.type == "signature_secondary_hit"]

    engine.state.elapsed_ms = 30_000 + 1_000   # 30. saniyede 5 saniyelik pencere
    fire(engine)
    splash = [event.data for event in engine.state.events if event.type == "signature_secondary_hit"]
    assert sorted(item["target_module_id"] for item in splash) == ["b-battery", "c-cooler"]
    primary = shots(engine)[-1]
    assert all(item["damage"] == round(primary["raw_damage"] * 0.30) for item in splash)
    assert triggered(engine, "gun")[0]["hook"] == "splash_window"

    engine.state.elapsed_ms = 30_000 + 6_000   # pencere kapandı
    count = len(splash)
    fire(engine)
    assert len([event for event in engine.state.events if event.type == "signature_secondary_hit"]) == count


def test_finishing_beam_hits_weakened_targets_harder():
    engine = talent_engine({"laser": {"1": "resilience"}})
    laser, (wall,) = duel(engine, "laser")
    fire(engine)
    wall.hp = int(wall.definition.max_hp * 0.30)
    next_shot(engine, laser)
    healthy, weakened = shots(engine)
    assert weakened["raw_damage"] == pytest.approx(healthy["raw_damage"] * 1.25, abs=1)


def test_third_pulse_and_armor_breaker():
    engine = talent_engine({"pulse_cannon": {"1": "power"}})
    cannon, _ = duel(engine, "pulse_cannon", targets=(("wall", "barrier", 1, 0),))
    engine.state.players["p1"].energy_stock = 60
    fire(engine)
    next_shot(engine, cannon)
    next_shot(engine, cannon)
    damage = [item["raw_damage"] for item in shots(engine)]
    assert damage[0] == damage[1] and damage[2] == pytest.approx(damage[0] * 1.6, abs=1)

    plain = talent_engine({}, "faz3-armor-plain")
    duel(plain, "pulse_cannon")
    fire(plain)
    breaker = talent_engine({"pulse_cannon": {"1": "resilience"}}, "faz3-armor-break")
    duel(breaker, "pulse_cannon")
    fire(breaker)
    kept, broken = shots(plain)[0], shots(breaker)[0]
    assert kept["defense_multiplier"] < 1
    assert broken["defense_multiplier"] == pytest.approx(1 - (1 - kept["defense_multiplier"]) * 0.70)
    assert "kırıldı" in broken["defense_type"]


def test_core_hunter_only_boosts_damage_to_the_core():
    engine = talent_engine({"missile_launcher": {"1": "power"}})
    launcher, (wall,) = duel(engine, "missile_launcher")
    engine.state.players["p1"].energy_stock = 80
    for _ in range(30):
        engine.state.elapsed_ms += TICK_MS
        fire(engine)
    at_module = shots(engine)[0]["attack_multiplier"]
    wall.status = ModuleStatus.DESTROYED
    wall.position = None
    for _ in range(80):
        engine.state.elapsed_ms += TICK_MS
        fire(engine)
    at_core = [item for item in shots(engine) if item["target_module_id"] == "core"]
    assert at_core and at_core[0]["attack_multiplier"] == pytest.approx(at_module * 1.30)


def test_rapid_launch_reloads_after_a_kill():
    engine = talent_engine({"quantum_repeater": {"1": "resilience"}})
    repeater, (wall, second) = duel(engine, "quantum_repeater", targets=(
        ("wall", "armor", 1, 0), ("wall-2", "armor", 3, 0),
    ))
    wall.hp = 1
    fire(engine)
    assert wall.status == ModuleStatus.DESTROYED
    assert repeater.cooldowns_ready_at_ms["attack"] == engine.state.elapsed_ms + TICK_MS
    assert triggered(engine, "gun")[0]["hook"] == "kill_reload"
    # Yok etmeyen atış normal beklemesine girer.
    next_shot(engine, repeater)
    assert repeater.cooldowns_ready_at_ms["attack"] - engine.state.elapsed_ms > TICK_MS


def test_superconductor_fires_every_fourth_shot_without_energy_or_heat():
    engine = talent_engine({"arc_cannon": {"1": "resilience"}})
    cannon, _ = duel(engine, "arc_cannon")
    player = engine.state.players["p1"]
    player.energy_stock = 80
    fire(engine)
    for _ in range(2):
        next_shot(engine, cannon)
    engine.state.elapsed_ms = cannon.cooldowns_ready_at_ms["attack"]
    engine._process_energy_flow()
    engine._process_talent_ticks()
    stock, heat = player.energy_stock, cannon.heat
    engine._process_combat_actions()   # dördüncü atış
    assert len(shots(engine)) == 4
    assert player.energy_stock == pytest.approx(stock)
    assert cannon.heat == pytest.approx(heat)
    assert triggered(engine, "gun")[-1]["hook"] == "free_shot"


def test_first_round_boosts_the_opening_shot_and_the_shot_after_each_kill():
    engine = talent_engine({"railgun": {"1": "power"}})
    railgun, (wall, second) = duel(engine, "railgun", targets=(
        ("wall", "armor", 1, 0), ("wall-2", "armor", 3, 0),
    ))
    engine.state.players["p1"].energy_stock = 80
    fire(engine)
    next_shot(engine, railgun)
    first, second_shot = shots(engine)
    assert first["attack_multiplier"] == pytest.approx(second_shot["attack_multiplier"] * 1.5)
    wall.hp = 1
    next_shot(engine, railgun)          # yok eden atış (güçlenmemiş)
    assert wall.status == ModuleStatus.DESTROYED
    next_shot(engine, railgun)          # yok edişten sonraki ilk atış
    after_kill = shots(engine)[-1]
    assert after_kill["attack_multiplier"] == pytest.approx(second_shot["attack_multiplier"] * 1.5)


def hit(engine, module_id, amount):
    return engine.apply_damage("p1", module_id, amount, source_player_id="p2", source_module_id="foe")


def defender(talents, definition_id, battle_id):
    engine = talent_engine(talents, battle_id)
    add(engine, "p1", "core", "core", 2, 1)
    module = add(engine, "p1", "guard", definition_id, 1, 0)
    ally = add(engine, "p1", "ally", "cooler", 0, 0)
    add(engine, "p2", "core", "core", 2, 1)
    foe = add(engine, "p2", "foe", "laser", 0, 0)
    engine._process_talent_ticks()
    return engine, module, ally, foe


def test_full_block_stops_one_hit_per_period():
    engine, shield, _, _ = defender({"shield": {"1": "power"}}, "shield", "faz3-block")
    assert hit(engine, "guard", 30) == 0
    assert hit(engine, "guard", 30) == 30
    engine.state.elapsed_ms = 11_900
    assert hit(engine, "guard", 30) == 30
    engine.state.elapsed_ms = 12_000
    assert hit(engine, "guard", 30) == 0
    assert [item["blocked_damage"] for item in triggered(engine, "guard")] == [30, 30]
    # Kaynağı olmayan hasar (ör. uzatma baskısı) blok harcamaz.
    engine.state.elapsed_ms = 30_000
    assert engine.apply_damage("p1", "guard", 5) == 5


def test_recoil_shield_returns_damage_to_the_attacker_without_looping():
    engine, shield, _, foe = defender({"shield": {"1": "resilience"}}, "shield", "faz3-thorns")
    before = foe.hp
    assert hit(engine, "guard", 40) == 40
    assert foe.hp == before - 6     # 40 hasarın %15 kadarı
    # Kaynak modülü olmayan hasar geri dönmez.
    engine.apply_damage("p1", "guard", 20, source_player_id="p2")
    assert foe.hp == before - 6


def test_last_layer_and_fresh_barrier_reduce_incoming_damage():
    engine, armor, _, _ = defender({"armor": {"1": "power"}}, "armor", "faz3-last-stand")
    assert hit(engine, "guard", 20) == 20
    armor.hp = int(armor.definition.max_hp * 0.39)
    assert hit(engine, "guard", 20) == 14     # %30 daha az

    engine, barrier, _, _ = defender({"barrier": {"1": "power"}}, "barrier", "faz3-fortify")
    assert hit(engine, "guard", 20) == 12     # ilk 8 saniye %40 daha az
    engine.state.elapsed_ms = 8_000
    assert hit(engine, "guard", 20) == 20


def test_shattering_armor_repairs_allies_and_final_charge_grants_current():
    engine, armor, ally, _ = defender({"armor": {"1": "resilience"}}, "armor", "faz3-death-ward")
    core = engine.state.players["p1"].modules["core"]
    ally.hp = 40
    core.hp = 100
    hit(engine, "guard", 10_000)
    assert armor.status == ModuleStatus.DESTROYED
    assert ally.hp == 65            # +25
    assert core.hp == 100           # Çekirdek onarılmaz
    assert triggered(engine, "guard")[-1]["repair"] == 25

    engine, amplifier, _, _ = defender({"amplifier": {"1": "resilience"}}, "amplifier", "faz3-death-current")
    player = engine.state.players["p1"]
    player.circuit_credits = 3
    hit(engine, "guard", 10_000)
    assert player.circuit_credits == 5


def test_emergency_repair_window_raises_the_effect_and_then_restores_it():
    engine, repair, _, _ = defender({"repair": {"1": "power"}}, "repair", "faz3-pulse")
    base = repair.definition.effect_multiplier
    engine.state.elapsed_ms = 19_900
    engine._process_talent_ticks()
    assert repair.definition.effect_multiplier == pytest.approx(base)
    engine.state.elapsed_ms = 20_000
    engine._process_talent_ticks()
    assert repair.definition.effect_multiplier == pytest.approx(base * 1.6)
    engine.state.elapsed_ms = 24_900
    engine._process_talent_ticks()
    assert repair.definition.effect_multiplier == pytest.approx(base * 1.6)
    engine.state.elapsed_ms = 25_000
    engine._process_talent_ticks()
    assert repair.definition.effect_multiplier == pytest.approx(base)
    engine.state.elapsed_ms = 40_000
    engine._process_talent_ticks()
    assert repair.definition.effect_multiplier == pytest.approx(base * 1.6)
    assert len(triggered(engine, "guard")) == 2


def test_field_setup_repairs_allies_once_on_deployment():
    engine = talent_engine({"repair": {"1": "resilience"}}, "faz3-deploy-repair")
    add(engine, "p1", "core", "core", 2, 1)
    ally = add(engine, "p1", "ally", "cooler", 0, 0)
    ally.hp = 30
    add(engine, "p1", "guard", "repair", 1, 0)
    engine._process_talent_ticks()
    assert ally.hp == 50
    ally.hp = 30
    engine.state.elapsed_ms = 5_000
    engine._process_talent_ticks()
    assert ally.hp == 30


def test_heat_recovery_grants_current_with_a_shared_player_gap():
    engine = talent_engine({"cooler": {"1": "resilience"}, "battery": {"1": "resilience"}}, "faz3-tap")
    add(engine, "p1", "core", "core", 2, 1)
    add(engine, "p1", "cooler", "cooler", 1, 0)
    add(engine, "p1", "battery", "battery", 0, 0)
    add(engine, "p2", "core", "core", 2, 1)
    player = engine.state.players["p1"]
    player.circuit_credits = 0
    engine._process_talent_ticks()
    engine.state.elapsed_ms = 19_900
    engine._process_talent_ticks()
    assert player.circuit_credits == 0
    engine.state.elapsed_ms = 20_000
    engine._process_talent_ticks()
    assert player.circuit_credits == 1            # Soğutucu (20 sn)
    engine.state.elapsed_ms = 25_000              # Batarya (25 sn) ortak aralığa takılır
    engine._process_talent_ticks()
    assert player.circuit_credits == 1
    engine.state.elapsed_ms = 20_000 + CURRENT_TAP_PLAYER_GAP_MS
    engine._process_talent_ticks()
    assert player.circuit_credits == 2
    # Akım tavandayken kazanç verilmez.
    player.circuit_credits = engine.circuit_credit_config.maximum_current
    engine.state.elapsed_ms = 60_000
    engine._process_talent_ticks()
    assert player.circuit_credits == engine.circuit_credit_config.maximum_current


def test_shock_pulse_makes_sabotage_deal_damage():
    def sabotage(talents, battle_id):
        engine = talent_engine(talents, battle_id)
        add(engine, "p1", "core", "core", 2, 1)
        add(engine, "p1", "emp", "emp", 0, 0)
        add(engine, "p1", "battery", "battery", 1, 0)
        add(engine, "p2", "core", "core", 2, 1)
        target = add(engine, "p2", "victim", "amplifier", 0, 0)
        engine.state.players["p1"].energy_stock = 40
        engine._process_energy_flow()
        engine._process_talent_ticks()
        engine._process_sabotage_actions()
        applied = [event for event in engine.state.events if event.type == "sabotage_applied"]
        return engine, target, applied

    _, plain_target, plain_applied = sabotage({}, "faz3-shock-plain")
    assert plain_applied and plain_target.hp == plain_target.definition.max_hp
    engine, target, applied = sabotage({"emp": {"1": "power"}}, "faz3-shock")
    assert applied and target.hp == target.definition.max_hp - 12
    assert triggered(engine, "emp")[0]["hook"] == "shock"


# -- D12: çekirdek yetenekleri ------------------------------------------------------

from app.game.engine import CORE_POWER_MAX_CHARGE, OVERTIME_START_MS  # noqa: E402
from app.game.energy import process_energy_tick  # noqa: E402
from app.game.models import BattleCommand  # noqa: E402
from app.game.talents import CORE_TALENTS, core_skill_tree, core_talents  # noqa: E402
from app.meta_progression import CORE_TYPES, MetaProgressionService  # noqa: E402
from app.player_profile import PlayerProfileService  # noqa: E402

CORE_HOOKS = {
    "opening_charge", "kill_charge", "loss_charge", "power_echo", "power_current",
    "emergency_shield", "thorned_core", "surplus_reactor", "overtime_resolve",
}


def test_every_core_has_six_distinct_talents_under_the_saved_ids():
    assert set(CORE_TALENTS) == {core["id"] for core in CORE_TYPES}
    used = set()
    for core in CORE_TYPES:
        skills = core["skills"]
        assert [skill["id"] for skill in skills] == [
            "0_energy", "0_charge", "1_energy", "1_charge", "2_energy", "2_charge",
        ]
        assert [skill["level"] for skill in skills] == [5, 5, 9, 9, 13, 13]
        assert [skill["flux_cost"] for skill in skills] == [25, 25, 50, 50, 75, 75]
        hooks = [skill["hook"] for skill in skills]
        # Bir çekirdeğin altı yeteneği altı ayrı kuraldır; düz "+%3" artışı yoktur.
        assert len(set(hooks)) == 6 and set(hooks) <= CORE_HOOKS, core["id"]
        assert len({skill["name_tr"] for skill in skills}) == 6
        for skill in skills:
            assert skill["name_en"] and skill["description_tr"] and skill["description_en"]
            assert "+%3" not in skill["name_tr"]
        used |= set(hooks)
    assert used == CORE_HOOKS
    assert core_skill_tree("core_resonance")[1]["description_tr"] == "Savaşa %25 güç dolumuyla başlar."
    # Kayıtlı seçim kimlikleri yeni kurallara eşlenir; tanınmayan kimlik yok sayılır.
    assert core_talents("core_resonance", ("0_charge", "1_energy", "bozuk", "9_energy")) == {
        "opening_charge": {"amount": 25, "name_tr": "Hazır Rezonans", "name_en": "Primed Resonance"},
        "loss_charge": {"amount": 12, "name_tr": "Derin Rezonans", "name_en": "Deep Resonance"},
    }


def test_core_view_lists_talents_and_a_saved_pick_can_still_be_learned():
    service = MetaProgressionService()
    profile = PlayerProfileService().get_or_create("faz3-core-view")
    profile.core_upgrade_levels["core_resonance"] = 4
    profile.flux_shards = 100
    view = next(core for core in service.view(profile)["cores"]["types"] if core["id"] == "core_resonance")
    assert [skill["name_tr"] for skill in view["skills"]][:2] == ["Kararlı Frekans", "Hazır Rezonans"]
    assert all("learned" in skill and "tier_selected" in skill for skill in view["skills"])
    # Yetenek enerji üretimini koşullu artırır; bilgi ekranındaki temel değer değişmez.
    before = view["energy_per_second"]
    receipt = service.unlock_core_skill(profile, "core_resonance", "0_energy", "faz3-core-skill")
    assert receipt["skill_id"] == "0_energy"
    after = next(core for core in service.view(profile)["cores"]["types"] if core["id"] == "core_resonance")
    assert after["energy_per_second"] == before
    assert [skill["learned"] for skill in after["skills"]][:2] == [True, False]


def core_duel(core_type, skills, battle_id=None):
    engine = make_engine(battle_id or f"faz3-core-{core_type}-{'-'.join(skills)}")
    for player_id in ("p1", "p2"):
        add(engine, player_id, "core", "core", 2, 1)
    add(engine, "p1", "ally", "cooler", 0, 0)
    add(engine, "p2", "foe", "laser", 0, 0)
    add(engine, "p2", "foe-wall", "armor", 1, 0)
    player = engine.state.players["p1"]
    player.core_type = core_type
    player.core_skills = tuple(skills)
    engine.state.status = BattleStatus.RUNNING
    return engine, player


def core_events(engine, hook):
    return [event.data for event in engine.state.events
            if event.type == "core_talent_triggered" and event.data["hook"] == hook]


def test_opening_charge_is_applied_once_at_the_start():
    engine, player = core_duel("core_resonance", ("0_charge",))
    engine._update_core_power_charge()
    assert 25.0 <= player.core_power_charge < 26.0
    first = player.core_power_charge
    engine._update_core_power_charge()
    assert player.core_power_charge - first < 1.0
    assert len(core_events(engine, "opening_charge")) == 1
    # Yeteneği olmayan rakip sıfırdan başlar ve eski düz dolum artışı yoktur.
    rival = engine.state.players["p2"]
    rival.core_skills = ("0_charge",)
    assert rival.core_power_charge < 1.0


def test_lost_and_destroyed_modules_feed_the_power_charge():
    engine, player = core_duel("core_resonance", ("1_energy",))
    engine.apply_damage("p1", "ally", 10_000, source_player_id="p2", source_module_id="foe")
    assert player.core_power_charge == pytest.approx(12.0)
    assert core_events(engine, "loss_charge")

    engine, player = core_duel("core_overdrive", ("1_energy",))
    engine.apply_damage("p2", "foe-wall", 10_000, source_player_id="p1", source_module_id="ally")
    assert player.core_power_charge == pytest.approx(12.0)
    # Çekirdeğin yok olması modül kaybı sayılmaz; kendi kendine hasar da saymaz.
    engine.apply_damage("p2", "foe", 10_000, source_player_id="p2", source_module_id="foe-wall")
    assert player.core_power_charge == pytest.approx(12.0)
    player.core_power_charge = 95.0
    engine.state.players["p2"].modules["foe"].status = ModuleStatus.ACTIVE
    engine.state.players["p2"].modules["foe"].hp = 5
    engine.apply_damage("p2", "foe", 10_000, source_player_id="p1", source_module_id="ally")
    assert player.core_power_charge == CORE_POWER_MAX_CHARGE
    assert [event for event in engine.state.events if event.type == "core_power_ready"]


def use_core_power(engine):
    engine.enqueue_command(BattleCommand("p1", "use_core_power", {
        "request_id": "faz3-core-power", "target_module_id": "core",
    }))
    engine.step()


def test_power_echo_and_power_current_fire_when_the_power_is_used():
    engine, player = core_duel("core_resonance", ("1_charge", "2_charge"))
    engine.state.players["p1"].modules["ally"].hp = 20
    player.core_power_charge = CORE_POWER_MAX_CHARGE
    player.circuit_credits = 3
    use_core_power(engine)
    assert player.core_power_uses == 1
    # Dolum sıfırdan değil %20'den başlar (aynı adımın dolumu eklenmiş olabilir).
    assert 20.0 <= player.core_power_charge < 21.5
    assert player.circuit_credits >= 5
    assert core_events(engine, "power_echo") and core_events(engine, "power_current")

    plain, plain_player = core_duel("core_resonance", (), "faz3-core-plain-power")
    plain.state.players["p1"].modules["ally"].hp = 20
    plain_player.core_power_charge = CORE_POWER_MAX_CHARGE
    plain_player.circuit_credits = 3
    use_core_power(plain)
    assert plain_player.core_power_charge < 1.5


def test_emergency_shield_triggers_once_below_its_threshold():
    engine, player = core_duel("core_resonance", ("2_energy",))
    core = player.modules["core"]
    core.hp = int(core.definition.max_hp * 0.45)
    engine.apply_damage("p1", "core", 30, source_player_id="p2", source_module_id="foe")
    shield = core.persistent_effects["core_guardian"]
    assert shield.data["shield_hp"] == 60 and shield.expires_at_ms == engine.state.elapsed_ms + 6_000
    hp = core.hp
    assert engine.apply_damage("p1", "core", 25, source_player_id="p2", source_module_id="foe") == 0
    assert core.hp == hp and shield.data["shield_hp"] == 35
    # Maçta bir kez: kalkan bittikten sonra yeniden tetiklenmez.
    core.persistent_effects.pop("core_guardian")
    engine.apply_damage("p1", "core", 5, source_player_id="p2", source_module_id="foe")
    assert "core_guardian" not in core.persistent_effects
    assert len(core_events(engine, "emergency_shield")) == 1


def test_thorned_core_and_overtime_resolve():
    engine, player = core_duel("core_guardian", ("0_energy", "2_energy"))
    foe = engine.state.players["p2"].modules["foe"]
    before = foe.hp
    assert engine.apply_damage("p1", "core", 20, source_player_id="p2", source_module_id="foe") == 20
    assert foe.hp == before - 4
    # Çekirdek dışındaki modüle gelen vuruş diken hasarı vermez.
    engine.apply_damage("p1", "ally", 5, source_player_id="p2", source_module_id="foe")
    assert foe.hp == before - 4
    engine.state.elapsed_ms = OVERTIME_START_MS
    assert engine.apply_damage("p1", "core", 20, source_player_id="p2", source_module_id="foe") == 16
    assert engine.apply_damage("p1", "ally", 5, source_player_id="p2", source_module_id="foe") == 5


def test_surplus_reactor_raises_generation_only_while_the_core_is_healthy():
    def generated(skills, hp_ratio):
        engine, player = core_duel("core_resonance", skills, f"faz3-reactor-{len(skills)}-{hp_ratio}")
        core = player.modules["core"]
        core.hp = int(core.definition.max_hp * hp_ratio)
        return process_energy_tick(player, engine.board.core_position).generated

    base = generated((), 1.0)
    assert generated(("0_energy",), 1.0) == pytest.approx(base * 1.10)
    assert generated(("0_energy",), 0.70) == pytest.approx(base * 1.10)
    assert generated(("0_energy",), 0.60) == pytest.approx(base)
    # Eski düz artış kalktı: sağ dal enerji üretimini değiştirmez.
    assert generated(("0_charge",), 1.0) == pytest.approx(base)
