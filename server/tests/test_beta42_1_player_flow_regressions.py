from datetime import datetime, timedelta, timezone
from time import monotonic

from fastapi.testclient import TestClient

from app import main as gateway
from app.arena_canon import ARENAS
from app.game.engine import BattleEngine
from app.game.models import BattleState, BattleStatus
from app.meta_progression import MetaProgressionService
from app.player_profile import PlayerProfileService
from app.player_progression import PlayerProgressionService
from app.player_data_store import InMemoryPlayerDataRepository, PlayerDataStoreService
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService


def test_guaranteed_arena_chest_is_claimed_when_regular_slots_are_full():
    profile = PlayerProfileService().get_or_create("arena-overflow-player")
    profile.rating = 1000
    profile.highest_rating = 1000
    profile.chest_slots = [
        {"chest_id": f"owned-{index}", "definition_id": "field_3h"}
        for index in range(4)
    ]
    service = MetaProgressionService()

    receipt = service.claim_arena_reward(profile, "arena_2_600")

    assert receipt["node_id"] == "arena_2_600"
    assert "arena_2_600" in profile.arena_reward_claims
    assert len(profile.chest_slots) == 5
    assert profile.chest_slots[-1]["source"] == "arena_2_600"
    assert profile.chest_slots[-1]["overflow"] is True


def test_module_upgrade_spends_credits_and_shards_and_changes_level():
    profile = PlayerProfileService().get_or_create("module-upgrade-player")
    profile.circuit_credits = 1000
    profile.module_shards["laser"] = 20
    service = MetaProgressionService()

    receipt = service.upgrade_module(profile, "laser", "module-upgrade-1")

    assert receipt["level_after"] == 1
    assert profile.module_upgrade_levels["laser"] == 1
    assert profile.circuit_credits == 900
    assert profile.module_shards["laser"] == 18


def test_beta_ai_matchmaking_returns_a_ready_session_without_client_timeout(monkeypatch):
    gateway.matchmaking_service._queue.clear()
    gateway.matchmaking_service._matches_by_player.clear()
    gateway.pvp_service._sessions.clear()
    gateway.player_profile_service._profiles.clear()
    monkeypatch.setattr(gateway, "MATCHMAKING_AI_ONLY", True)
    client = TestClient(gateway.app)

    started = monotonic()
    response = client.post(
        "/matchmaking/join",
        json={"player_id": "beta-ai-player"},
    )

    assert response.status_code == 200
    assert monotonic() - started < 10
    payload = response.json()
    assert payload["matched"] is True
    assert payload["opponent_type"] == "ai"
    session = gateway.pvp_service.get_session(payload["session_id"])
    assert len(session.ai_player_ids) == 1


def test_beta_ai_status_recovers_an_orphaned_queue_immediately(monkeypatch):
    gateway.matchmaking_service._queue.clear()
    gateway.matchmaking_service._matches_by_player.clear()
    gateway.pvp_service._sessions.clear()
    gateway.player_profile_service._profiles.clear()
    monkeypatch.setattr(gateway, "MATCHMAKING_AI_ONLY", True)
    profile = gateway.player_profile_service.get_or_create("orphaned-beta-player")
    gateway.matchmaking_service.enqueue(
        profile.player_id,
        rating=profile.rating,
        league_name_tr=profile.league_name_tr,
        level=profile.level,
    )

    started = monotonic()
    response = TestClient(gateway.app).get(f"/matchmaking/{profile.player_id}")

    assert response.status_code == 200
    assert monotonic() - started < 10
    payload = response.json()
    assert payload["matched"] is True
    assert payload["opponent_type"] == "ai"
    assert gateway.pvp_service.get_session(payload["session_id"]).ai_player_ids


def test_arena_result_persists_trophy_and_circuit_credit_rewards_once():
    profiles = PlayerProfileService()
    profile = profiles.get_or_create("reward-player")
    profile.rating = 1000
    profile.highest_rating = 1000
    state = BattleState(battle_id="reward-battle")
    engine = BattleEngine(state)
    engine.add_player("reward-player")
    engine.add_player("arena-bot")
    state.status = BattleStatus.FINISHED
    state.match_type = "arena_ai"
    state.account_player_ids = ("reward-player",)
    state.player_match_ratings = {"reward-player": 1000, "arena-bot": 1000}
    state.winner_player_id = "reward-player"
    state.loser_player_id = "arena-bot"
    state.finish_reason = "core_destroyed"
    service = PlayerProgressionService(profiles)

    assert service.process_finished_battle(state) is True
    result = service.player_result("reward-battle", "reward-player")
    assert result["rating_delta"] == 25
    assert result["circuit_credits_awarded"] == 50
    assert profile.circuit_credits == 400
    assert service.process_finished_battle(state) is False
    assert profile.circuit_credits == 400


def test_opened_chest_rewards_survive_account_reload():
    now = datetime(2026, 9, 6, 20, 0, tzinfo=timezone.utc)
    profiles = PlayerProfileService()
    repository = InMemoryPlayerDataRepository()
    store = PlayerDataStoreService(
        profile_service=profiles,
        statistics_service=PlayerStatisticsService(),
        settings_service=PlayerSettingsService(),
        repository=repository,
    )
    profile = profiles.get_or_create("persistent-chest-player")
    profile.chest_slots = [{
        "chest_id": "ready-chest",
        "definition_id": "field_3h",
        "name_tr": "Bronz Sandık",
        "unlocks_at": (now - timedelta(seconds=1)).isoformat(),
    }]
    service = MetaProgressionService(now_func=lambda: now)

    receipt = service.open_chest(profile, "ready-chest", "open-once")
    expected_credits = profile.circuit_credits
    expected_flux = profile.flux_shards
    module_id = receipt["rewards"]["module_definition_id"]
    expected_shards = profile.module_shards[module_id]
    store.save_player(profile.player_id)
    profiles._profiles.clear()
    store.load_player(profile.player_id)
    restored = profiles.get(profile.player_id)

    assert restored.circuit_credits == expected_credits
    assert restored.flux_shards == expected_flux
    assert restored.module_shards[module_id] == expected_shards
    assert restored.chest_slots == []
    assert restored.chest_receipts["open-once"]["chest_id"] == "ready-chest"


def test_arena_road_uses_targeted_module_pieces_instead_of_card_claims():
    module_stops = [
        (arena, node)
        for arena in ARENAS
        for node in arena["nodes"]
        if node["rewards"].get("module_shard_target")
    ]

    assert module_stops
    assert all("module_id" not in node["rewards"] for _, node in module_stops)
    assert all(
        node["rewards"]["module_shards"] == 2 + (int(arena["index"]) * 2)
        for arena, node in module_stops
    )

    profile = PlayerProfileService().get_or_create("targeted-road-pieces")
    profile.rating = 300
    profile.highest_rating = 300
    before = profile.module_shards.get("pulse_cannon", 0)

    receipt = MetaProgressionService().claim_arena_reward(profile, "arena_1_50")

    assert receipt["module_shards"] == {"pulse_cannon": 4}
    assert profile.module_shards["pulse_cannon"] == before + 4
