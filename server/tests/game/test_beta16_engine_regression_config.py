from app.game.engine import (
    BattleEngine,
    MODULE_INTERACTION_UNLOCK_MS,
    max_active_modules_for_elapsed_ms,
)
from app.game.models import (
    BattleCommand,
    BattleState,
    ModuleStatus,
)


def fixture(unlock_ms=MODULE_INTERACTION_UNLOCK_MS):
    engine=BattleEngine(
        BattleState(
            battle_id="beta16-unlock"
        ),
        module_interaction_unlock_ms=
            unlock_ms,
    )
    engine.add_player("p1")
    engine.grant_module(
        "p1","core-1","core"
    )
    engine.grant_module(
        "p1",
        "generator-1",
        "generator",
    )
    engine.grant_module(
        "p1","laser-1","laser"
    )
    engine.set_initial_active_module(
        "p1","core-1",2,2
    )
    engine.set_initial_active_module(
        "p1","generator-1",2,3
    )
    engine.start()
    return engine


def advance(engine,target):
    while engine.state.elapsed_ms < target:
        engine.step()


def test_default_capacity_schedule_opens_fifth_slot_at_unlock():
    assert max_active_modules_for_elapsed_ms(14_900) is None
    assert max_active_modules_for_elapsed_ms(15_000)==5
    assert max_active_modules_for_elapsed_ms(24_900)==5
    assert max_active_modules_for_elapsed_ms(25_000)==6
    assert max_active_modules_for_elapsed_ms(75_000)==10


def test_injected_unlock_moves_the_relative_capacity_schedule():
    assert max_active_modules_for_elapsed_ms(
        11_900,
        12_000,
    ) is None
    assert max_active_modules_for_elapsed_ms(
        12_000,
        12_000,
    )==5
    assert max_active_modules_for_elapsed_ms(
        22_000,
        12_000,
    )==6


def test_engine_rejects_before_injected_unlock_and_accepts_at_unlock():
    engine=fixture(12_000)
    advance(engine,11_900)
    engine.enqueue_command(
        BattleCommand(
            player_id="p1",
            kind="place_module",
            payload={
                "module_id":"laser-1",
                "x":3,
                "y":3,
            },
        )
    )
    engine.step()
    assert (
        engine.state.players[
            "p1"
        ].modules[
            "laser-1"
        ].status
        == ModuleStatus.RESERVE
    )

    engine=fixture(12_000)
    advance(engine,12_000)
    engine.enqueue_command(
        BattleCommand(
            player_id="p1",
            kind="place_module",
            payload={
                "module_id":"laser-1",
                "x":3,
                "y":3,
            },
        )
    )
    engine.step()
    assert (
        engine.state.players[
            "p1"
        ].modules[
            "laser-1"
        ].status
        == ModuleStatus.ACTIVE
    )
