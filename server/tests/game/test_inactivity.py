from app.game.engine import (
    INACTIVITY_FORFEIT_MS,
    INACTIVITY_WARNING_MS,
    BattleEngine,
)
from app.game.models import BattleCommand, BattleState, BattleStatus
from app.game.pvp_session import PvPSessionService

DECK = ("laser", "shield", "repair", "cooler", "battery", "amplifier")
# Akım 6 ile başlar, 2,5 sn'de +1: tavana (12) 15 sn'de ulaşır.
SECONDS_TO_CAP = 15


def engine_with(*, inactivity=True, decks=("a",), before_start=None):
    engine = BattleEngine(
        BattleState(battle_id="inactivity"),
        inactivity_forfeit_ms=INACTIVITY_FORFEIT_MS if inactivity else None,
    )
    for player_id in ("a", "b"):
        engine.add_player(player_id)
        if player_id in decks:
            engine.set_battle_pool(player_id, DECK)
        engine.grant_module(player_id, f"{player_id}-core", "core")
        engine.set_initial_active_module(player_id, f"{player_id}-core", 2, 1)
    if before_start is not None:
        before_start(engine)
    engine.start()
    return engine


def run_seconds(engine, seconds):
    for _ in range(seconds * 10):
        if engine.state.status != BattleStatus.RUNNING:
            break
        engine.step()


def test_engine_rule_is_off_by_default_and_on_for_live_sessions():
    engine = engine_with(inactivity=False)
    run_seconds(engine, 120)
    assert engine.state.status == BattleStatus.RUNNING

    session = PvPSessionService().create_session("live")
    assert session.engine.inactivity_forfeit_ms == INACTIVITY_FORFEIT_MS


def test_idle_player_is_warned_then_counted_as_forfeit():
    engine = engine_with(decks=("a",))
    run_seconds(engine, SECONDS_TO_CAP + INACTIVITY_WARNING_MS // 1000 + 1)
    warning = next(event for event in engine.state.events if event.type == "inactivity_warning")
    assert warning.data["player_id"] == "a"
    assert warning.data["remaining_ms"] == INACTIVITY_FORFEIT_MS - INACTIVITY_WARNING_MS
    assert engine.state.status == BattleStatus.RUNNING

    run_seconds(engine, 30)
    assert engine.state.status == BattleStatus.FINISHED
    assert engine.state.finish_reason == "player_inactive"
    assert engine.state.loser_player_id == "a"
    assert engine.state.winner_player_id == "b"
    assert engine.state.finished_at_ms <= (SECONDS_TO_CAP * 1000 + INACTIVITY_FORFEIT_MS + 1_000)


def test_deploying_a_card_resets_the_idle_clock():
    engine = engine_with(decks=("a",))
    run_seconds(engine, SECONDS_TO_CAP + 25)
    engine.enqueue_command(BattleCommand("a", "deploy_module", {"definition_id": "shield"}))
    engine.step()
    assert engine.state.players["a"].idle_at_cap_ms == 0
    run_seconds(engine, 10)
    assert engine.state.status == BattleStatus.RUNNING


def test_player_with_a_full_board_is_not_inactive():
    def fill_board(engine):
        for index, position in enumerate(engine.board.placeable_positions):
            instance_id = f"a-shield-{index}"
            engine.grant_module("a", instance_id, "shield")
            engine.set_initial_active_module("a", instance_id, position.x, position.y)

    engine = engine_with(decks=("a",), before_start=fill_board)
    run_seconds(engine, 90)
    assert engine.state.status == BattleStatus.RUNNING
    assert engine.state.players["a"].circuit_credits == 12


def test_both_players_idle_at_the_same_time_is_a_draw():
    engine = engine_with(decks=("a", "b"))
    run_seconds(engine, 60)
    assert engine.state.status == BattleStatus.FINISHED
    assert engine.state.is_draw is True
    assert engine.state.finish_reason == "mutual_inactivity"
