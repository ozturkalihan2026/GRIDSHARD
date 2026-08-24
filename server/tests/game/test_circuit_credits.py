from app.game.economy import CircuitCreditConfig
from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState, ModuleStatus


def create_engine(
    *,
    starting_credits: int = 200,
    passive_per_second: int = 10,
    move_cost: int = 10,
) -> BattleEngine:
    config = CircuitCreditConfig(
        starting_credits=starting_credits,
        passive_credits_per_second=passive_per_second,
        move_cost=move_cost,
        rotate_cost=0,
        remove_cost=0,
    )
    engine = BattleEngine(
        BattleState(battle_id="credit-test"),
        circuit_credit_config=config,
    )
    engine.add_player("player-1")
    engine.grant_module("player-1", "core-1", "core")
    engine.grant_module("player-1", "generator-1", "generator")
    engine.grant_module("player-1", "laser-1", "laser")
    engine.grant_module("player-1", "shield-1", "shield")
    engine.grant_module("player-1", "battery-1", "battery")
    engine.set_initial_active_module("player-1", "core-1", 2, 2)
    engine.set_initial_active_module("player-1", "generator-1", 2, 3)
    engine.start()
    return engine


def advance_to(engine: BattleEngine, elapsed_ms: int) -> None:
    while engine.state.elapsed_ms < elapsed_ms:
        engine.step()


def command(engine: BattleEngine, kind: str, **payload) -> None:
    engine.enqueue_command(
        BattleCommand(
            player_id="player-1",
            kind=kind,
            payload=payload,
        )
    )
    engine.step()


def test_player_starts_with_configured_circuit_credits():
    engine = create_engine(starting_credits=250)
    assert engine.circuit_credits("player-1") == 250


def test_passive_income_updates_credits_in_real_time():
    engine = create_engine(starting_credits=200, passive_per_second=10)
    for _ in range(10):
        engine.step()
    assert engine.state.elapsed_ms == 1_000
    assert engine.circuit_credits("player-1") == 210


def test_energy_state_is_independent_from_circuit_credits():
    engine = create_engine()
    engine.set_module_stored_energy("player-1", "laser-1", 18.0)
    before = engine.circuit_credits("player-1")
    assert engine.state.players["player-1"].modules["laser-1"].stored_energy == 18.0
    assert engine.circuit_credits("player-1") == before


def test_placing_module_spends_its_credit_cost():
    engine = create_engine()
    advance_to(engine, 15_000)
    before = engine.circuit_credits("player-1")
    assert before == 350

    command(engine, "place_module", module_id="laser-1", x=3, y=3)

    assert engine.state.players["player-1"].modules["laser-1"].status == ModuleStatus.ACTIVE
    # Komut aynı tick'te 90 DK harcar, ardından o tick'in 1 DK pasif geliri gelir.
    assert engine.circuit_credits("player-1") == before - 90 + 1


def test_insufficient_credits_reject_place_without_state_change():
    engine = create_engine(starting_credits=0, passive_per_second=0)
    advance_to(engine, 15_000)

    command(engine, "place_module", module_id="laser-1", x=3, y=3)

    laser = engine.state.players["player-1"].modules["laser-1"]
    assert laser.status == ModuleStatus.RESERVE
    assert engine.circuit_credits("player-1") == 0
    assert any(
        event.type == "command_rejected" and "Yetersiz Devre Kredisi" in event.data["reason"]
        for event in engine.state.events
    )


def test_remove_to_shelf_has_no_refund_and_no_cost_by_default():
    engine = create_engine()
    advance_to(engine, 15_000)
    command(engine, "place_module", module_id="laser-1", x=3, y=3)
    before_remove = engine.circuit_credits("player-1")

    command(engine, "remove_module", module_id="laser-1")

    # Yalnızca o tick'in pasif 1 DK geliri eklenir; satış/iade yoktur.
    assert engine.circuit_credits("player-1") == before_remove + 1
    assert engine.state.players["player-1"].modules["laser-1"].status == ModuleStatus.RESERVE


def test_redeploy_spends_deploy_cost_again_and_preserves_hp():
    engine = create_engine()
    advance_to(engine, 15_000)
    command(engine, "place_module", module_id="laser-1", x=3, y=3)
    engine.apply_damage("player-1", "laser-1", 40)
    command(engine, "remove_module", module_id="laser-1")
    before = engine.circuit_credits("player-1")

    command(engine, "place_module", module_id="laser-1", x=1, y=2)

    laser = engine.state.players["player-1"].modules["laser-1"]
    assert laser.hp == 60
    assert laser.status == ModuleStatus.ACTIVE
    assert engine.circuit_credits("player-1") == before - 90 + 1


def test_move_spends_configured_move_cost():
    engine = create_engine(move_cost=10)
    advance_to(engine, 15_000)
    command(engine, "place_module", module_id="laser-1", x=3, y=3)
    before = engine.circuit_credits("player-1")

    command(engine, "move_module", module_id="laser-1", x=1, y=3)

    assert engine.circuit_credits("player-1") == before - 10 + 1


def test_replace_spends_incoming_module_cost_and_preserves_outgoing_state():
    engine = create_engine()
    advance_to(engine, 15_000)
    command(engine, "place_module", module_id="laser-1", x=3, y=3)
    engine.apply_damage("player-1", "laser-1", 25)
    before = engine.circuit_credits("player-1")

    command(
        engine,
        "replace_module",
        outgoing_module_id="laser-1",
        incoming_module_id="battery-1",
    )

    modules = engine.state.players["player-1"].modules
    assert modules["laser-1"].status == ModuleStatus.RESERVE
    assert modules["laser-1"].hp == 75
    assert modules["battery-1"].status == ModuleStatus.ACTIVE
    assert engine.circuit_credits("player-1") == before - 70 + 1


def test_failed_replace_is_atomic_when_credits_are_insufficient():
    engine = create_engine(starting_credits=0, passive_per_second=0)
    advance_to(engine, 15_000)

    # Başlangıç kredisi yokken doğrudan aktif bir test modülü hazırlıyoruz.
    laser = engine.state.players["player-1"].modules["laser-1"]
    laser.status = ModuleStatus.ACTIVE
    from app.game.models import Position
    laser.position = Position(3, 3)

    command(
        engine,
        "replace_module",
        outgoing_module_id="laser-1",
        incoming_module_id="battery-1",
    )

    battery = engine.state.players["player-1"].modules["battery-1"]
    assert laser.status == ModuleStatus.ACTIVE
    assert laser.position == Position(3, 3)
    assert battery.status == ModuleStatus.RESERVE
    assert battery.position is None
    assert engine.circuit_credits("player-1") == 0


def test_explicit_credit_award_hook_supports_future_battle_income():
    engine = create_engine(starting_credits=100, passive_per_second=0)
    engine.award_circuit_credits("player-1", 25, reason="test_savas_odulu")
    assert engine.circuit_credits("player-1") == 125
    assert engine.state.players["player-1"].total_circuit_credits_earned == 125
