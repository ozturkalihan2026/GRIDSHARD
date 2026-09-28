from datetime import datetime, timezone

from app import main as gateway
from app.game.battle_pool import default_battle_pool
from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleEvent, BattleState, BattleStatus, ModuleStatus
from app.player_data_store import InMemoryPlayerDataRepository
from app.player_profile import PlayerProfileService, season_descriptor
from app.player_progression import PlayerProgressionService
from app.meta_progression import MetaProgressionService, RANK_STAGES


def test_four_week_rollover_preserves_arena_and_resets_league_to_first_level():
    # 1. döngü 28 Eylül–25 Ekim; 26 Ekim Pazartesi yeni sezon başlar.
    clock = {"now": datetime(2026, 10, 25, 23, 59, tzinfo=timezone.utc)}
    profiles = PlayerProfileService(now_func=lambda: clock["now"])
    arena = profiles.get_or_create("arena-player")
    arena.rating = 1250
    arena.highest_rating = 1400
    arena.season_xp = 500
    league = profiles.get_or_create("league-player")
    league.rating = 4875
    league.highest_rating = 5100

    clock["now"] = datetime(2026, 10, 26, 0, 0, tzinfo=timezone.utc)
    profiles.get_or_create(arena.player_id)
    profiles.get_or_create(league.player_id)

    assert arena.rating == 1250
    assert arena.highest_rating == 1400
    assert arena.season_xp == 0
    assert league.rating == 3600
    assert league.highest_rating == 5100
    assert arena.active_meta_season_id == "gridshard_2026_10_26"
    assert league.active_meta_season_id == "gridshard_2026_10_26"
    assert arena.season_archives[-1]["final_rating"] == 1250
    assert league.season_archives[-1]["final_rating"] == 4875


def test_season_descriptor_uses_monday_four_week_cycles():
    season = season_descriptor(datetime(2026, 12, 18, tzinfo=timezone.utc))
    assert season == {
        "id": "gridshard_2026_11_23",
        "name_tr": "Sezon 3",
        "starts_at": "2026-11-23T00:00:00Z",
        "ends_at": "2026-12-20T23:59:59Z",
    }


def test_september_2026_season_hands_over_to_the_first_cycle():
    legacy = season_descriptor(datetime(2026, 9, 25, 12, tzinfo=timezone.utc))
    assert legacy == {
        "id": "gridshard_2026_09",
        "name_tr": "Eylül 2026 Sezonu",
        "starts_at": "2026-09-01T00:00:00Z",
        "ends_at": "2026-09-27T23:59:59Z",
    }
    first = season_descriptor(datetime(2026, 9, 28, 0, 0, tzinfo=timezone.utc))
    assert first["id"] == "gridshard_2026_09_28"
    assert first["name_tr"] == "Sezon 1"
    assert first["ends_at"] == "2026-10-25T23:59:59Z"


def test_every_league_stage_has_three_claimable_intermediate_rewards():
    league_stages = [stage for stage in RANK_STAGES if stage["kind"] != "arena"]
    assert len(league_stages) == 11
    assert all(len(stage["nodes"]) == 3 for stage in league_stages)

    profiles = PlayerProfileService()
    profile = profiles.get_or_create("league-reward-player")
    profile.rating = 3650
    profile.highest_rating = 3650
    service = MetaProgressionService()
    view = service.view(profile)
    first_stage = next(stage for stage in view["rank_stages"] if stage["id"] == "league_1")
    first_node = first_stage["nodes"][0]

    assert first_node["claimable"] is True
    before = profile.circuit_credits
    receipt = service.claim_arena_reward(profile, first_node["id"])
    assert receipt["node_id"] == first_node["id"]
    assert profile.circuit_credits > before
    assert service.view(profile)["rank_stages"][12]["nodes"][0]["claimed"] is True


def test_core_damage_is_recorded_from_authoritative_damage_events():
    profiles = PlayerProfileService()
    state = BattleState(battle_id="core-damage-battle")
    engine = BattleEngine(state)
    engine.add_player("attacker")
    engine.add_player("defender")
    engine.grant_module("defender", "defender-core", "core")
    state.events.append(BattleEvent(
        type="module_damaged",
        at_ms=1_000,
        data={
            "player_id": "defender",
            "module_id": "defender-core",
            "source_player_id": "attacker",
            "source_module_id": "laser-1",
            "damage": 73,
        },
    ))
    state.status = BattleStatus.FINISHED
    state.account_player_ids = ("attacker",)
    state.player_match_ratings = {"attacker": 0, "defender": 0}
    state.winner_player_id = "attacker"
    state.loser_player_id = "defender"
    state.finish_reason = "core_destroyed"

    PlayerProgressionService(profiles).process_finished_battle(state)

    assert profiles.get("attacker").lifetime_stats["core_damage_dealt"] == 73


def test_shop_claim_and_purchase_are_persisted_before_response(monkeypatch):
    repository = InMemoryPlayerDataRepository()
    monkeypatch.setattr(gateway, "player_data_repository", repository)
    monkeypatch.setattr(gateway.player_data_store_service, "repository", repository)
    player_id = "beta43-shop-persistence"
    gateway.player_profile_service._profiles.pop(player_id, None)
    gateway.player_statistics_service._statistics.pop(player_id, None)
    gateway.player_settings_service._settings.pop(player_id, None)

    try:
        gift = gateway.claim_player_progression_gift_chest(
            player_id,
            "field_3h",
            gateway.MetaOperationRequest(request_id="gift-persist-once"),
        )
        gateway.player_profile_service.get_or_create(player_id).circuit_credits = 1000
        purchase = gateway.buy_store_chest(
            player_id,
            "field_3h",
            gateway.MetaOperationRequest(request_id="shop-persist-once"),
        )

        assert gift["receipt"]["chest"]["chest_id"]
        assert purchase["receipt"]["rewards"]["circuit_credits"] > 0
        assert repository.load(player_id) is not None

        gateway.player_profile_service._profiles.pop(player_id, None)
        gateway.player_statistics_service._statistics.pop(player_id, None)
        gateway.player_settings_service._settings.pop(player_id, None)
        gateway.player_data_store_service.load_player(player_id)
        restored = gateway.player_profile_service.get(player_id)

        assert restored.gift_chest_claim_receipts["gift-persist-once"]["chest"]["chest_id"]
        assert restored.shop_receipts["shop-persist-once"]["store_chest_id"] == "field_3h"
    finally:
        gateway.player_profile_service._profiles.pop(player_id, None)
        gateway.player_statistics_service._statistics.pop(player_id, None)
        gateway.player_settings_service._settings.pop(player_id, None)


def _interactive_canonical_engine() -> BattleEngine:
    engine = BattleEngine(BattleState(battle_id="beta43-interactions"))
    engine.add_player("p1")
    engine.state.players["p1"].circuit_credits = 2_000
    engine.grant_module("p1", "core-1", "core")
    engine.set_initial_active_module("p1", "core-1", 2, 1)
    for instance_id, definition_id in (
        ("laser-1", "laser"),
        ("shield-1", "shield"),
        ("battery-1", "battery"),
    ):
        engine.grant_module("p1", instance_id, definition_id)
    engine.start()
    return engine


def _run_command(engine: BattleEngine, kind: str, **payload) -> None:
    engine.enqueue_command(BattleCommand("p1", kind, payload))
    engine.step()


def test_canonical_board_capacity_is_core_plus_fourteen_module_cells():
    engine = _interactive_canonical_engine()
    player = engine.state.players["p1"]
    player.battle_pool = default_battle_pool()
    player.circuit_credits = 10_000

    for _index in range(14):
        _run_command(engine, "deploy_module", definition_id="laser")

    active = [module for module in player.modules.values() if module.status is ModuleStatus.ACTIVE]
    occupied = {
        (module.position.x, module.position.y)
        for module in active
        if module.position is not None
    }
    assert len(active) == 15
    assert len(occupied) == 15

    module_count = len(player.modules)
    _run_command(engine, "deploy_module", definition_id="laser")
    assert len(player.modules) == module_count
    assert engine.state.events[-1].type == "command_rejected"
