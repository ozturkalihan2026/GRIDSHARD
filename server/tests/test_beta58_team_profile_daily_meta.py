from datetime import datetime, timezone

import pytest

from app import main as gateway
from app.game.energy import process_energy_tick
from app.game.engine import BattleEngine
from app.game.models import BattleState, ModuleStatus, Position
from app.player_data_store import InMemoryPlayerDataRepository
from app.season_competition import (
    DAILY_META_DEFINITIONS,
    daily_meta_catalog_view,
    daily_meta_for_seed,
)
from app.team_service import InMemoryTeamRepository, TeamService


def _grant(meta_id: str, definition_id: str):
    engine = BattleEngine(BattleState(battle_id=f"beta58-{meta_id}-{definition_id}"))
    engine.add_player("p1")
    engine.state.player_daily_meta_ids["p1"] = meta_id
    return engine.grant_module("p1", definition_id, definition_id)


def _active(engine: BattleEngine, definition_id: str, x: int, y: int):
    module = engine.grant_module("p1", definition_id, definition_id)
    module.status = ModuleStatus.ACTIVE
    module.position = Position(x, y)
    return module


def test_daily_meta_catalog_has_seven_unique_equal_options_and_utc_reset():
    moment = datetime(2026, 9, 19, 21, 30, tzinfo=timezone.utc)
    catalog = daily_meta_catalog_view(moment)

    assert catalog["day"] == "2026-09-19"
    assert catalog["resets_at"] == "2026-09-20T00:00:00Z"
    assert catalog["dice_sides"] == 7
    assert catalog["probability_per_meta"] == pytest.approx(1 / 7)
    assert len(catalog["options"]) == 7
    assert len({item["id"] for item in catalog["options"]}) == 7


def test_seeded_ai_meta_is_stable_for_identity_and_day():
    moment = datetime(2026, 9, 19, 12, tzinfo=timezone.utc)
    first = daily_meta_for_seed("local-ai-archetype:balanced", moment)
    replay = daily_meta_for_seed("local-ai-archetype:balanced", moment)

    assert first == replay
    assert first["id"] in {item["id"] for item in DAILY_META_DEFINITIONS}


@pytest.mark.parametrize(
    ("meta_id", "definition_id", "attribute"),
    (
        ("damage", "laser", "base_damage"),
        ("defense", "shield", "max_hp"),
        ("support", "repair", "effect_multiplier"),
        ("sabotage", "emp", "effect_multiplier"),
        ("system", "battery", "effect_multiplier"),
        ("core", "core", "max_hp"),
        ("current_support", "battery", "effect_multiplier"),
    ),
)
def test_each_daily_meta_improves_its_real_battle_axis(
    meta_id,
    definition_id,
    attribute,
):
    baseline = _grant("", definition_id)
    enhanced = _grant(meta_id, definition_id)

    assert getattr(enhanced.definition, attribute) > getattr(
        baseline.definition,
        attribute,
    )


@pytest.mark.parametrize("meta_id", ("system", "current_support"))
def test_energy_daily_metas_increase_real_circuit_generation(meta_id):
    def generated(active_meta_id: str) -> float:
        engine = BattleEngine(BattleState(battle_id=f"beta58-energy-{active_meta_id}"))
        player = engine.add_player("p1")
        engine.state.player_daily_meta_ids["p1"] = active_meta_id
        _active(engine, "core", 2, 1)
        _active(engine, "battery", 0, 0)
        return process_energy_tick(player).generated

    assert generated(meta_id) > generated("")


def test_daily_meta_roll_is_same_day_immutable_and_persisted(monkeypatch):
    player_id = "beta58-daily-meta-player"
    repository = InMemoryPlayerDataRepository()
    monkeypatch.setattr(gateway, "player_data_repository", repository)
    monkeypatch.setattr(gateway.player_data_store_service, "repository", repository)
    monkeypatch.setattr(gateway.secrets, "randbelow", lambda _: 3)
    gateway.player_profile_service._profiles.pop(player_id, None)
    gateway.player_statistics_service._statistics.pop(player_id, None)
    gateway.player_settings_service._settings.pop(player_id, None)

    try:
        first = gateway.roll_player_daily_meta(
            player_id,
            gateway.MetaOperationRequest(request_id="first-roll"),
        )
        replay = gateway.roll_player_daily_meta(
            player_id,
            gateway.MetaOperationRequest(request_id="second-roll"),
        )
        snapshot = repository.load(player_id)

        assert first["selected"] is True
        assert first["meta"]["id"] == DAILY_META_DEFINITIONS[3]["id"]
        assert replay["meta"]["id"] == first["meta"]["id"]
        assert replay["replayed"] is True
        assert snapshot is not None
        persisted = snapshot.profile["meta_progression_state"]
        assert persisted["daily_meta_day"] == first["day"]
        assert persisted["daily_meta_id"] == first["meta"]["id"]
    finally:
        gateway.player_profile_service._profiles.pop(player_id, None)
        gateway.player_statistics_service._statistics.pop(player_id, None)
        gateway.player_settings_service._settings.pop(player_id, None)


def test_team_tab_and_public_profile_share_the_same_server_summary(monkeypatch):
    owner_id = "beta58-team-owner"
    member_id = "beta58-team-member"
    repository = InMemoryPlayerDataRepository()
    teams = TeamService(InMemoryTeamRepository())
    monkeypatch.setattr(gateway, "player_data_repository", repository)
    monkeypatch.setattr(gateway.player_data_store_service, "repository", repository)
    monkeypatch.setattr(gateway, "team_service", teams)

    for player_id in (owner_id, member_id):
        gateway.player_profile_service._profiles.pop(player_id, None)
        gateway.player_statistics_service._statistics.pop(player_id, None)
        gateway.player_settings_service._settings.pop(player_id, None)

    try:
        owner = gateway.player_profile_service.get_or_create(owner_id)
        member = gateway.player_profile_service.get_or_create(member_id)
        owner.rating = 420
        member.rating = 180
        owner_stats = gateway.player_statistics_service.get_or_create(owner_id)
        member_stats = gateway.player_statistics_service.get_or_create(member_id)
        owner_stats.total_matches, owner_stats.wins = 8, 5
        member_stats.total_matches, member_stats.wins = 2, 1

        created = gateway.create_team(gateway.TeamCreateRequest(
            player_id=owner_id,
            name="Beta 58 Devresi",
            request_id="beta58-create",
        ))
        gateway.join_team(
            created["team_id"],
            gateway.TeamJoinRequest(
                player_id=member_id,
                request_id="beta58-join",
            ),
        )
        gateway.review_team_application(
            created["team_id"],
            gateway.TeamApplicationActionRequest(
                player_id=owner_id,
                applicant_id=member_id,
                accept=True,
                request_id="beta58-accept",
            ),
        )

        own_tab = gateway.get_player_team(owner_id)
        public_profile = gateway.get_public_team_profile(created["team_id"])

        for field in ("total_trophies", "average_trophies", "statistics", "tournament"):
            assert own_tab[field] == public_profile[field]
        assert own_tab["total_trophies"] == 600
        assert own_tab["statistics"]["total_matches"] == 10
        assert own_tab["statistics"]["win_rate"] == pytest.approx(.6)
    finally:
        for player_id in (owner_id, member_id):
            gateway.player_profile_service._profiles.pop(player_id, None)
            gateway.player_statistics_service._statistics.pop(player_id, None)
            gateway.player_settings_service._settings.pop(player_id, None)
