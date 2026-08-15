from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState, BattleStatus


def create_engine() -> BattleEngine:
    state = BattleState(battle_id="test-battle")
    engine = BattleEngine(state)
    engine.start()
    return engine


def test_battle_starts_running():
    engine = create_engine()
    assert engine.state.status == BattleStatus.RUNNING


def test_150_ticks_equals_15_seconds():
    engine = create_engine()

    for _ in range(150):
        engine.step()

    assert engine.state.tick == 150
    assert engine.state.elapsed_ms == 15_000


def test_command_does_not_stop_battle_clock():
    engine = create_engine()

    for _ in range(50):
        engine.step()

    engine.enqueue_command(
        BattleCommand(
            player_id="player-1",
            kind="test_command",
        )
    )

    for _ in range(100):
        engine.step()

    assert engine.state.status == BattleStatus.RUNNING
    assert engine.state.elapsed_ms == 15_000


def test_multiple_commands_do_not_pause_battle():
    engine = create_engine()

    for tick in range(200):
        if tick in (20, 21, 25, 40, 41, 42, 100):
            engine.enqueue_command(
                BattleCommand(
                    player_id="player-1",
                    kind="test_command",
                    payload={"tick": tick},
                )
            )

        engine.step()

    assert engine.state.tick == 200
    assert engine.state.elapsed_ms == 20_000
    assert engine.state.status == BattleStatus.RUNNING


def test_finished_battle_no_longer_advances():
    engine = create_engine()

    for _ in range(50):
        engine.step()

    engine.finish("test")

    current_tick = engine.state.tick
    current_time = engine.state.elapsed_ms

    for _ in range(50):
        engine.step()

    assert engine.state.tick == current_tick
    assert engine.state.elapsed_ms == current_time
    assert engine.state.status == BattleStatus.FINISHED
