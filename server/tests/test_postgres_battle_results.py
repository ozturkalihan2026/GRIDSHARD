from copy import deepcopy
from datetime import datetime, timezone
from uuid import uuid4

import pytest

from app import main as gateway
from app.game.engine import BattleEngine
from app.game.models import BattleEvent, BattleState, BattleStatus
from app.player_progression import PlayerProgressionService
from app.postgres_battle_results import BattleResultError, PostgresBattleResults, restore_terminal, terminal_projection
from app.telemetry import InMemoryTelemetryService
from app.player_profile import season_descriptor
from test_postgres_persistent_operations import team_db, social_db  # noqa: F401
from test_postgres_social_api import erasure_db  # noqa: F401


def finished_state(a, b, match_type="ranked_pvp"):
    state = BattleState(
        battle_id="ledger-" + uuid4().hex, match_type=match_type,
        ranked_eligible=match_type == "ranked_pvp", account_player_ids=(a, b),
    )
    engine = BattleEngine(state)
    for owner in (a, b):
        engine.add_player(owner)
        engine.grant_module(owner, owner + "-laser", "laser")
    state.status = BattleStatus.FINISHED
    state.winner_player_id, state.loser_player_id = a, b
    state.finish_reason = "core_destroyed"
    state.finished_at_ms = state.elapsed_ms = 120_000
    state.result_summary = {a: {"damage_dealt": 900}, b: {"damage_dealt": 450}}
    state.events.append(BattleEvent("module_placed", 100, {"player_id": a, "module_id": a + "-laser"}))
    return state


@pytest.fixture
def battle_db(team_db, monkeypatch):
    pool, players, _, ids, _ = team_db
    monkeypatch.setattr(gateway, "player_progression_service", PlayerProgressionService(gateway.player_profile_service))
    monkeypatch.setattr(gateway, "telemetry_service", InMemoryTelemetryService())
    monkeypatch.setattr(gateway.product_analytics_service, "record", lambda *args, **kwargs: False)
    yield pool, players, ids, PostgresBattleResults(pool)
    with pool.transaction() as connection:
        connection.execute("DELETE FROM battle_results WHERE account_player_ids && %s", (list(ids),))


def test_terminal_facts_round_trip_without_executable_engine_state():
    state = finished_state("a", "b")
    projection = terminal_projection(state)
    assert terminal_projection(restore_terminal(deepcopy(projection))) == projection
    state.status = BattleStatus.RUNNING
    with pytest.raises(BattleResultError):
        terminal_projection(state)


def test_failed_grant_survives_ram_loss_and_recovery_is_exactly_once(battle_db, monkeypatch):
    pool, players, (a, b, _), ledger = battle_db
    week = datetime.now(timezone.utc).isocalendar()
    for owner in (a, b):
        profile = gateway.player_profile_service.get_or_create(owner)
        profile.weekly_tournament_registered_period = f"{week.year}-W{week.week:02d}"
        gateway.player_data_store_service.save_player(owner)
    state = finished_state(a, b)
    before = {owner: players.load(owner).to_dict() for owner in (a, b)}
    original = PostgresBattleResults.apply

    def fail_after_ledger_write(self, battle_id, results):
        original(self, battle_id, results)
        raise RuntimeError("injected after result writes")

    with monkeypatch.context() as patch:
        patch.setattr(PostgresBattleResults, "apply", fail_after_ledger_write)
        with pytest.raises(RuntimeError, match="injected"):
            gateway.process_completed_pvp_battle(state)
    for owner in (a, b):
        assert players.load(owner).to_dict() == before[owner]
        assert gateway.player_profile_service.get_or_create(owner).rating == before[owner]["profile"]["rating"]
        assert ledger.player_result(state.battle_id, owner) is None
    assert len(ledger.pending()) == 1
    assert state.battle_id not in gateway.player_progression_service._processed_battle_ids
    gateway.pvp_service._sessions.clear()
    gateway.player_profile_service._profiles.clear()
    gateway.player_statistics_service._statistics.clear()
    gateway._recover_pending_battle_results()
    assert ledger.pending() == []
    result = ledger.player_result(state.battle_id, a)
    assert result["rating_delta"] > 0
    assert result["circuit_credits_awarded"] > 0
    saved = {owner: players.load(owner).to_dict() for owner in (a, b)}
    assert saved[a]["statistics"]["total_matches"] == 1
    assert saved[a]["profile"]["meta_progression_state"]["weekly_tournament_trophies_earned"] == result["rating_delta"]
    monkeypatch.setattr(gateway, "player_progression_service", PlayerProgressionService(gateway.player_profile_service))
    gateway.process_completed_pvp_battle(state)
    assert {owner: players.load(owner).to_dict() for owner in (a, b)} == saved
    assert gateway.get_battle_progression(state.battle_id, a) == result
    assert gateway.get_post_match_sync(state.battle_id, a)["progression"] == result
    assert gateway.get_player_battle_history(a)["battles"][0]["battle_id"] == state.battle_id
    state.is_draw = True
    with pytest.raises(BattleResultError, match="farklı"):
        gateway.process_completed_pvp_battle(state)


@pytest.mark.parametrize("mode", ["friend_battle", "team_training", "team_tournament"])
def test_durable_accounting_keeps_training_and_team_rewards_separate(battle_db, mode):
    _, players, (a, b, _), ledger = battle_db
    state = finished_state(a, b, mode)
    before = players.load(a).profile
    gateway.process_completed_pvp_battle(state)
    after = players.load(a)
    result = ledger.player_result(state.battle_id, a)
    assert result["rating_delta"] == result["xp_awarded"] == result["circuit_credits_awarded"] == 0
    assert after.profile["rating"] == before["rating"]
    assert after.statistics["total_matches"] == 0
    assert result["team_tournament_points_awarded"] == (1 if mode == "team_tournament" else 0)
    assert after.profile["meta_progression_state"]["circuit_credits"] == before["meta_progression_state"]["circuit_credits"]


def test_missing_participant_cannot_be_recreated_by_pending_result(battle_db):
    _, players, (a, b, _), ledger = battle_db
    state = finished_state(a, b)
    ledger.record_terminal(state)
    players.delete(a)
    gateway._recover_pending_battle_results()
    assert players.load(a) is None
    assert ledger.pending() == []
    assert ledger.player_result(state.battle_id, b) is None


def test_ad_bonus_uses_durable_result_after_restart_once(battle_db, monkeypatch):
    _, players, (a, b, _), ledger = battle_db
    state = finished_state(a, b)
    gateway.process_completed_pvp_battle(state)
    original = ledger.player_result(state.battle_id, a)
    before = players.load(a).profile["meta_progression_state"]["circuit_credits"]
    monkeypatch.setattr(gateway, "player_progression_service", PlayerProgressionService(gateway.player_profile_service))
    monkeypatch.setattr(gateway, "AD_TEST_MODE", True)
    request = gateway.AdRewardRequest(provider="test", request_id=uuid4().hex)
    first = gateway.claim_battle_ad_reward(a, state.battle_id, request)
    second = gateway.claim_battle_ad_reward(a, state.battle_id, request)
    assert first["receipt"]["replayed"] is False
    assert second["receipt"]["replayed"] is True
    assert players.load(a).profile["meta_progression_state"]["circuit_credits"] == before + original["circuit_credits_awarded"]


def test_pending_result_precedes_rollover_after_a_multi_period_outage(battle_db, monkeypatch):
    pool, players, (a, b, _), ledger = battle_db
    completed = datetime(2026, 9, 27, 22, tzinfo=timezone.utc)
    rebooted = datetime(2026, 11, 2, 12, tzinfo=timezone.utc)
    service = gateway.player_profile_service
    monkeypatch.setattr(service, "_now_func", lambda: completed)
    for owner in (a, b):
        # Start with an isolated old-period snapshot, not a real player.
        profile = service.get(owner)
        profile.season_archives.clear()
        profile.active_meta_season_id = season_descriptor(completed)["id"]
        profile.rating = profile.highest_rating = 4000
        profile.season_xp = 100
        week = completed.isocalendar()
        profile.weekly_tournament_registered_period = f"{week.year}-W{week.week:02d}"
        gateway.player_data_store_service.save_player(owner)
    state = finished_state(a, b)
    state.season_id = season_descriptor(completed)["id"]
    ledger.record_terminal(state)
    with pool.transaction() as connection:
        connection.execute("UPDATE battle_results SET completed_at=%s WHERE battle_id=%s", (completed, state.battle_id))
    service._profiles.clear()
    monkeypatch.setattr(service, "_now_func", lambda: rebooted)
    # This ordinary profile operation must drain the old result BEFORE it
    # archives the old season, even if no explicit maintenance task ran yet.
    gateway.get_profile(a)
    result = ledger.player_result(state.battle_id, a)
    saved = players.load(a).profile["meta_progression_state"]
    archive = saved["season_archives"][-1]
    assert archive["season_id"] == state.season_id
    assert archive["season_xp"] == 100 + result["xp_awarded"]
    assert archive["final_rating"] == result["rating_after"]
    assert players.load(a).profile["engagement"]["season_xp"] == 0
    assert saved["active_season_id"] == season_descriptor(rebooted)["id"]
    assert saved["weekly_tournament_trophies_earned"] == result["rating_delta"]
    assert players.load(a).statistics["total_matches"] == 1
    gateway.get_profile(a)
    assert players.load(a).statistics["total_matches"] == 1
