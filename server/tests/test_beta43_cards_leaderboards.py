from datetime import datetime, timezone

from app import main as gateway
from app.game.engine import BattleEngine
from app.game.booster_schedule import build_booster_offer
from app.game.models import BattleCommand, BattleEvent, BattleState, BattleStatus, ModuleStatus, Position
from app.player_data_store import InMemoryPlayerDataRepository
from app.player_profile import PlayerProfileService, monthly_season_descriptor
from app.player_progression import PlayerProgressionService


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


def test_engine_emits_three_booster_offer_options_when_due():
    engine = _interactive_canonical_engine()
    engine.state.elapsed_ms = 30_000
    engine._update_booster_offers()
    offer = engine.state.players["p1"].pending_booster_offer
    assert offer is not None
    assert len(offer.booster_ids) == 3
    assert len(set(offer.booster_ids)) == 3
