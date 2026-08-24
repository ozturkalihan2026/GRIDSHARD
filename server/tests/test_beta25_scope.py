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
            2,
        )
    engine.start()
    return engine


def test_beta25_markup_exposes_required_battle_and_result_actions():
    html = client.get("/").text
    css = client.get("/src/styles.css").text
    app_source = client.get("/src/app.js").text

    assert "2.0.0-beta.31" in html
    assert 'class="lobby-wordmark"' in html
    assert 'id="battle-forfeit-button"' in html
    assert "Savaşı Bırak" in html
    assert 'id="return-preparation-button"' in html
    assert "Hazırlık Ekranına Dön" in html
    assert 'id="local-report-forfeit-penalty"' in html
    assert "--gs-arc-cyan:#35E5D2" in css
    assert ".battle-pool-actions" in css and "position:sticky" in css
    assert 'kind:"forfeit_battle"' in app_source
    assert "prepareLocalMatch();" in app_source


def test_forfeit_deducts_only_credits_earned_during_battle_and_loses():
    engine = running_engine()
    for _ in range(20):
        engine.step()

    alice = engine.state.players["alice"]
    assert alice.circuit_credits == 220
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
    assert alice.forfeit_credit_penalty == 20
    assert alice.circuit_credits == 200
    assert engine.state.tick == tick_before
    assert engine.state.elapsed_ms == elapsed_before
    assert engine.state.result_summary["alice"]["forfeit_credit_penalty"] == 20


def test_forfeit_penalty_never_makes_credit_balance_negative():
    engine = running_engine()
    alice = engine.state.players["alice"]
    alice.total_circuit_credits_earned = 350
    alice.circuit_credits = 40

    engine.enqueue_command(
        BattleCommand("alice", "forfeit_battle", {})
    )
    engine.step()

    assert alice.forfeit_credit_penalty == 40
    assert alice.circuit_credits == 0


def test_forfeit_event_records_auditable_penalty_and_winner():
    engine = running_engine()
    for _ in range(10):
        engine.step()
    engine.enqueue_command(
        BattleCommand("alice", "forfeit_battle", {})
    )
    engine.step()

    event = next(
        event
        for event in engine.state.events
        if event.type == "battle_forfeited"
    )
    assert event.data["winner_player_id"] == "bob"
    assert event.data["earned_during_battle"] == 10
    assert event.data["credit_penalty"] == 10
