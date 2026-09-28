from fastapi.testclient import TestClient

from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState, BattleStatus
from app.main import app


client = TestClient(app)


def running_engine() -> BattleEngine:
    engine = BattleEngine(BattleState(battle_id="beta25-forfeit"))
    engine.add_player("alice")
    engine.add_player("bob")
    for player_id in ("alice", "bob"):
        engine.grant_module(player_id, f"{player_id}-core", "core")
        engine.set_initial_active_module(
            player_id,
            f"{player_id}-core",
            2,
            1,
        )
    engine.start()
    return engine


def test_forfeit_is_an_immediate_loss_without_an_akim_penalty():
    engine = running_engine()
    for _ in range(50):
        engine.step()

    alice = engine.state.players["alice"]
    # Akım 6 ile başlar ve 2,5 saniyede bir artar.
    assert alice.circuit_credits == 8
    tick_before = engine.state.tick
    elapsed_before = engine.state.elapsed_ms

    engine.enqueue_command(
        BattleCommand("alice", "forfeit_battle", {})
    )
    engine.step()

    assert engine.state.status == BattleStatus.FINISHED
    assert engine.state.winner_player_id == "bob"
    assert engine.state.loser_player_id == "alice"
    assert engine.state.finish_reason == "player_forfeit"
    # Akım maça özeldir; çekilmenin bedeli yalnız mağlubiyettir.
    assert alice.circuit_credits == 8
    assert engine.state.tick == tick_before
    assert engine.state.elapsed_ms == elapsed_before
    assert "forfeit_credit_penalty" not in engine.state.result_summary["alice"]


def test_forfeit_event_records_the_winner_only():
    engine = running_engine()
    engine.enqueue_command(
        BattleCommand("alice", "forfeit_battle", {})
    )
    engine.step()

    event = next(
        event
        for event in engine.state.events
        if event.type == "battle_forfeited"
    )
    assert event.data == {"player_id": "alice", "winner_player_id": "bob"}
