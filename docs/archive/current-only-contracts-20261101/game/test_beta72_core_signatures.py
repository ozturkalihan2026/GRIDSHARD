import pytest

from app.game.core_balance import CORE_SIGNATURES, STATIC_CHARGE_INTERVAL_MS
from app.game.energy import process_energy_tick
from app.game.engine import BattleEngine, CORE_POWER_MAX_CHARGE
from app.game.models import BattleCommand, BattleState, ModuleStatus
from app.game.pvp_session import core_signature_badges
from app.meta_progression import CORE_TYPES, MetaProgressionService
from app.player_profile import PlayerProfileService


def duel(core_type="core_resonance"):
    engine = BattleEngine(BattleState(battle_id=f"core-signature-{core_type}"))
    for player_id in ("p1", "p2"):
        engine.add_player(player_id)
        engine.grant_module(player_id, f"{player_id}-core", "core")
        engine.set_initial_active_module(player_id, f"{player_id}-core", 2, 1)
    engine.grant_module("p1", "p1-laser", "laser")
    engine.set_initial_active_module("p1", "p1-laser", 0, 0)
    engine.grant_module("p2", "p2-repair", "repair")
    engine.set_initial_active_module("p2", "p2-repair", 0, 0)
    engine.grant_module("p2", "p2-shield", "shield")
    engine.set_initial_active_module("p2", "p2-shield", 1, 0)
    engine.start()
    engine.state.players["p1"].core_type = core_type
    return engine


def use_power(engine, request_id="use"):
    engine.enqueue_command(BattleCommand("p1", "use_core_power", {
        "request_id": request_id,
        "target_module_id": "p1-core",
    }))
    engine.step()


def signatures(engine, signature_id):
    return [
        event.data
        for event in engine.state.events
        if event.type == "core_signature_triggered"
        and event.data["signature_id"] == signature_id
    ]


def test_every_core_has_a_signature_and_no_rarity_curve():
    assert {core["id"] for core in CORE_TYPES} == set(CORE_SIGNATURES)
    common = duel("core_resonance").state.players["p1"]
    legendary = duel("core_phoenix").state.players["p1"]
    assert process_energy_tick(legendary).generated == pytest.approx(
        process_energy_tick(common).generated
    )
    assert legendary.modules["p1-core"].definition.max_hp == common.modules["p1-core"].definition.max_hp

    profile = PlayerProfileService().get_or_create("core-view")
    view = MetaProgressionService().view(profile)["cores"]["types"]
    for core in view:
        assert "rarity_bonuses" not in core
        assert core["signature_mechanic"].startswith(core["signature_name_tr"])
        assert core["telegraph_tr"] and core["counterplay_tr"]


def test_guardian_last_stand_only_below_half_core_hp():
    engine = duel("core_guardian")
    player = engine.state.players["p1"]
    player.core_power_charge = CORE_POWER_MAX_CHARGE
    use_power(engine, "full-hp")
    assert not signatures(engine, "last_stand")
    base = player.modules["p1-laser"].persistent_effects["core_guardian"].data["shield_hp"]

    player.modules["p1-core"].hp = 100
    assert core_signature_badges(player, player.modules["p1-core"], 0) == [{"kind": "last_stand"}]
    player.core_power_charge = CORE_POWER_MAX_CHARGE
    use_power(engine, "low-hp")
    assert signatures(engine, "last_stand")
    assert player.modules["p1-laser"].persistent_effects["core_guardian"].data["shield_hp"] == round(base * 1.5)
    assert player.modules["p1-core"].persistent_effects["core_guardian"].data["shield_hp"] == round(base * 3)


def test_overdrive_chain_extends_on_enemy_kills_up_to_two_seconds():
    engine = duel("core_overdrive")
    player = engine.state.players["p1"]
    player.core_power_charge = CORE_POWER_MAX_CHARGE
    use_power(engine)
    effect = player.modules["p1-laser"].persistent_effects["core_overdrive"]
    expires = effect.expires_at_ms
    engine.apply_damage("p2", "p2-repair", 999, source_player_id="p1", source_module_id="p1-laser")
    engine.apply_damage("p2", "p2-shield", 999, source_player_id="p1", source_module_id="p1-laser")
    assert effect.expires_at_ms == expires + 2_000
    assert [item["chain"] for item in signatures(engine, "overdrive_chain")] == [1, 2]


def test_disruptor_static_charge_lengthens_the_cut():
    engine = duel("core_disruptor")
    player = engine.state.players["p1"]
    player.core_power_charge = CORE_POWER_MAX_CHARGE
    for _ in range(5):
        engine.step()
    # Dolu bekleme her tikte birikir.
    assert player.core_signature_state["held_ms"] == 500
    player.core_signature_state["held_ms"] = 2 * STATIC_CHARGE_INTERVAL_MS
    assert core_signature_badges(player, player.modules["p1-core"], 0) == [
        {"kind": "static", "value": 2, "max": 4}
    ]
    use_power(engine)
    assert signatures(engine, "static_charge")[0]["bonus_ms"] == 1_000
    assert engine.state.players["p2"].modules["p2-repair"].debuffs
    assert player.core_signature_state["held_ms"] == 0


def test_capacitor_discharge_empties_reserve_for_an_extra_discount():
    engine = duel("core_capacitor")
    player = engine.state.players["p1"]
    player.energy_stock = 20.0
    player.core_power_charge = CORE_POWER_MAX_CHARGE
    use_power(engine, "full-reserve")
    assert player.discounted_deployments == 3
    assert signatures(engine, "reserve_discharge")[0]["energy_drained"] >= 12

    player.energy_stock = 2.0
    player.core_power_charge = CORE_POWER_MAX_CHARGE
    use_power(engine, "empty-reserve")
    assert player.discounted_deployments == 2


def test_phoenix_rebirth_needs_full_charge_and_happens_once():
    engine = duel("core_phoenix")
    player = engine.state.players["p1"]
    core = player.modules["p1-core"]
    player.core_power_charge = CORE_POWER_MAX_CHARGE
    assert core_signature_badges(player, core, 0) == [{"kind": "ember"}]

    engine.apply_damage("p1", "p1-core", 9_999, source_player_id="p2")
    assert core.status == ModuleStatus.ACTIVE
    assert core.hp == round(core.definition.max_hp * 0.25)
    assert player.core_power_charge == 0
    assert signatures(engine, "ember_rebirth")

    player.core_power_charge = CORE_POWER_MAX_CHARGE
    engine.apply_damage("p1", "p1-core", 9_999, source_player_id="p2")
    assert core.status == ModuleStatus.DESTROYED


def test_quantum_half_phase_gives_only_shields():
    engine = duel("core_quantum")
    player = engine.state.players["p1"]
    player.modules["p1-laser"].hp -= 40
    player.core_power_charge = 60.0
    use_power(engine)
    assert signatures(engine, "half_phase")
    assert "core_guardian" in player.modules["p1-laser"].persistent_effects
    assert not [
        event
        for event in engine.state.events
        if event.type == "module_repaired"
        and event.data.get("source_module_id") == "p1-core"
    ]
    assert player.core_power_charge < 60.0

    other = duel("core_overdrive")
    other.state.players["p1"].core_power_charge = 60.0
    use_power(other)
    assert any(event.type == "command_rejected" for event in other.state.events)


def test_ai_uses_core_power_according_to_its_signature():
    from app.game.ai import should_use_core_power

    engine = duel("core_phoenix")
    ai, rival = engine.state.players["p1"], engine.state.players["p2"]
    ai.core_power_charge = CORE_POWER_MAX_CHARGE
    ai.modules["p1-laser"].hp -= 30
    assert should_use_core_power(ai, rival)
    # Çekirdek zayıfken dolum Küllerden Doğuş için saklanır.
    ai.modules["p1-core"].hp = 90
    assert not should_use_core_power(ai, rival)

    ai.core_type = "core_disruptor"
    ai.core_signature_state["held_ms"] = 0
    assert not should_use_core_power(ai, rival)
    ai.core_signature_state["held_ms"] = 2 * STATIC_CHARGE_INTERVAL_MS
    assert should_use_core_power(ai, rival)
