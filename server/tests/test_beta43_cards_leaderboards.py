from datetime import datetime, timezone

from app import main as gateway
from app.game.battle_pool import default_battle_pool
from app.game.engine import BattleEngine
from app.game.booster_schedule import build_booster_offer
from app.game.models import BattleCommand, BattleEvent, BattleState, BattleStatus, ModuleStatus, Position
from app.player_data_store import InMemoryPlayerDataRepository
from app.player_profile import PlayerProfileService, monthly_season_descriptor
from app.player_progression import PlayerProgressionService
from app.meta_progression import MetaProgressionService, RANK_STAGES


def test_calendar_month_rollover_preserves_arena_and_resets_league_to_first_level():
    clock = {"now": datetime(2026, 9, 30, 23, 59, tzinfo=timezone.utc)}
    profiles = PlayerProfileService(now_func=lambda: clock["now"])
    arena = profiles.get_or_create("arena-player")
    arena.rating = 1250
    arena.highest_rating = 1400
    arena.season_xp = 500
    league = profiles.get_or_create("league-player")
    league.rating = 4875
    league.highest_rating = 5100

    clock["now"] = datetime(2026, 10, 1, 0, 0, tzinfo=timezone.utc)
    profiles.get_or_create(arena.player_id)
    profiles.get_or_create(league.player_id)

    assert arena.rating == 1250
    assert arena.highest_rating == 1400
    assert arena.season_xp == 0
    assert league.rating == 3600
    assert league.highest_rating == 5100
    assert arena.active_meta_season_id == "gridshard_2026_10"
    assert league.active_meta_season_id == "gridshard_2026_10"
    assert arena.season_archives[-1]["final_rating"] == 1250
    assert league.season_archives[-1]["final_rating"] == 4875


def test_monthly_season_descriptor_uses_calendar_month_bounds():
    season = monthly_season_descriptor(datetime(2026, 12, 18, tzinfo=timezone.utc))
    assert season == {
        "id": "gridshard_2026_12",
        "name_tr": "Aralık 2026 Sezonu",
        "starts_at": "2026-12-01T00:00:00Z",
        "ends_at": "2026-12-31T23:59:59Z",
    }


def test_every_booster_offer_has_three_rotating_choices():
    offers = [build_booster_offer("player", index) for index in range(5)]

    assert all(len(offer.booster_ids) == 3 for offer in offers)
    assert all(len(set(offer.booster_ids)) == 3 for offer in offers)
    assert all(current.booster_ids != following.booster_ids for current, following in zip(offers, offers[1:]))


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


def test_leaderboards_rank_players_core_damage_and_team_trophy_totals(monkeypatch):
    repository = InMemoryPlayerDataRepository()
    monkeypatch.setattr(gateway, "player_data_repository", repository)
    gateway.player_profile_service._profiles.clear()

    alpha = gateway.player_profile_service.get_or_create("alpha")
    alpha.display_name = "Alfa"
    alpha.rating = 900
    alpha.lifetime_stats["core_damage_dealt"] = 1200
    alpha.team_id = "team-grid"
    alpha.team_name = "Grid Birliği"

    beta = gateway.player_profile_service.get_or_create("beta")
    beta.display_name = "Beta"
    beta.rating = 1500
    beta.lifetime_stats["core_damage_dealt"] = 400
    beta.team_id = "team-grid"
    beta.team_name = "Grid Birliği"

    payload = gateway.get_leaderboards()

    assert payload["trophies"][0]["player_id"] == "beta"
    assert payload["core_damage"][0]["player_id"] == "alpha"
    assert payload["teams"][0]["team_name"] == "Grid Birliği"
    assert payload["teams"][0]["member_count"] == 2
    assert payload["teams"][0]["value"] == 2400


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
        purchase = gateway.purchase_player_daily_shop_offer(
            player_id,
            "bronze_daily",
            gateway.MetaOperationRequest(request_id="shop-persist-once"),
        )

        assert gift["receipt"]["chest"]["chest_id"]
        assert purchase["receipt"]["rewards"]["module_shards"] > 0
        assert repository.load(player_id) is not None

        gateway.player_profile_service._profiles.pop(player_id, None)
        gateway.player_statistics_service._statistics.pop(player_id, None)
        gateway.player_settings_service._settings.pop(player_id, None)
        gateway.player_data_store_service.load_player(player_id)
        restored = gateway.player_profile_service.get(player_id)

        assert restored.gift_chest_claim_receipts["gift-persist-once"]["chest"]["chest_id"]
        assert restored.shop_receipts["shop-persist-once"]["offer_id"] == "bronze_daily"
        assert "bronze_daily" in restored.shop_purchased_offer_ids
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


def test_canonical_board_allows_drop_move_swap_and_replace_commands():
    engine = _interactive_canonical_engine()
    _run_command(engine, "place_module", module_id="laser-1", x=1, y=1)
    laser = engine.state.players["p1"].modules["laser-1"]
    assert laser.status is ModuleStatus.ACTIVE
    assert laser.position == Position(1, 1)
    placement_event = engine.state.events[-1]
    assert placement_event.type == "module_placed"
    assert placement_event.data["port_count"] == 1
    assert placement_event.data["ports"]

    _run_command(engine, "move_module", module_id="laser-1", x=0, y=1)
    assert laser.position == Position(0, 1)

    _run_command(engine, "place_module", module_id="shield-1", x=1, y=1)
    shield = engine.state.players["p1"].modules["shield-1"]
    _run_command(
        engine,
        "swap_modules",
        module_id="laser-1",
        target_module_id="shield-1",
    )
    assert laser.position == Position(1, 1)
    assert shield.position == Position(0, 1)

    _run_command(
        engine,
        "replace_module",
        outgoing_module_id="shield-1",
        incoming_module_id="battery-1",
    )
    battery = engine.state.players["p1"].modules["battery-1"]
    assert shield.status is ModuleStatus.RESERVE
    assert battery.status is ModuleStatus.ACTIVE
    assert battery.position == Position(0, 1)
    assert not any(event.type == "command_rejected" for event in engine.state.events)


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


def test_engine_emits_three_booster_offer_options_when_due():
    engine = _interactive_canonical_engine()
    engine.state.elapsed_ms = 30_000
    engine._update_booster_offers()
    offer = engine.state.players["p1"].pending_booster_offer
    assert offer is not None
    assert len(offer.booster_ids) == 3
    assert len(set(offer.booster_ids)) == 3
