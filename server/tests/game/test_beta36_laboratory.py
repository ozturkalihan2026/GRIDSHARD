from app.game.battle_pool import default_battle_pool
from app.game.catalog import BASIC_MODULE_DEFINITIONS
from app.game.pvp_session import PvPSessionService
from app.laboratory import (
    LABORATORY_LEVEL_COSTS,
    LaboratoryError,
    build_laboratory_view,
    reset_calibrations,
    upgrade_calibration,
)
from app.player_profile import PlayerProfile
from app.player_data_store import InMemoryPlayerDataRepository, PlayerDataStoreService
from app.player_profile import PlayerProfileService
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService


def test_laboratory_catalog_has_24_modules_and_first_spend_costs_25_flux():
    profile = PlayerProfile(player_id="beta36-catalog", display_name="Lab")
    profile.flux_shards = 25

    view = build_laboratory_view(profile)

    assert len(view["modules"]) == 24
    assert view["level_costs"] == [25, 75, 150]
    assert view["ranked_normalized"] is True
    laser = next(item for item in view["modules"] if item["id"] == "laser")
    assert laser["level"] == 0
    assert laser["next_cost"] == 25
    assert laser["can_upgrade"] is True


def test_upgrade_is_atomic_idempotent_and_max_level_is_bounded():
    profile = PlayerProfile(player_id="beta36-upgrade", display_name="Lab")
    profile.flux_shards = sum(LABORATORY_LEVEL_COSTS)

    first = upgrade_calibration(profile, "laser", "upgrade-1")
    replay = upgrade_calibration(profile, "laser", "upgrade-1")

    assert first["cost"] == 25
    assert replay["replayed"] is True
    assert profile.module_calibration_levels["laser"] == 1
    assert profile.flux_shards == 225
    assert len(profile.laboratory_transactions) == 1

    upgrade_calibration(profile, "laser", "upgrade-2")
    upgrade_calibration(profile, "laser", "upgrade-3")
    assert profile.module_calibration_levels["laser"] == 3
    assert profile.flux_shards == 0
    try:
        upgrade_calibration(profile, "laser", "upgrade-4")
    except LaboratoryError as exc:
        assert "en yüksek" in str(exc)
    else:
        raise AssertionError("Dördüncü laboratuvar seviyesi reddedilmeliydi.")


def test_free_beta_reset_refunds_exact_investment_once():
    profile = PlayerProfile(player_id="beta36-reset", display_name="Lab")
    profile.flux_shards = 100
    upgrade_calibration(profile, "laser", "laser-1")
    upgrade_calibration(profile, "shield", "shield-1")
    assert profile.flux_shards == 50

    receipt = reset_calibrations(profile, "reset-1")
    replay = reset_calibrations(profile, "reset-1")

    assert receipt["refund"] == 50
    assert replay["replayed"] is True
    assert profile.flux_shards == 100
    assert profile.module_calibration_levels == {}
    assert profile.laboratory_reset_count == 1
    assert len(profile.laboratory_transactions) == 3


def test_laboratory_levels_history_and_receipts_survive_profile_reload():
    profiles = PlayerProfileService()
    store = PlayerDataStoreService(
        profile_service=profiles,
        statistics_service=PlayerStatisticsService(),
        settings_service=PlayerSettingsService(),
        repository=InMemoryPlayerDataRepository(),
    )
    profile = profiles.get_or_create("beta36-persistence")
    profile.flux_shards = 100
    upgrade_calibration(profile, "shield", "persistent-upgrade")
    store.save_player(profile.player_id)

    profiles._profiles.clear()
    store.load_player("beta36-persistence")
    restored = profiles.get("beta36-persistence")

    assert restored.module_calibration_levels == {"shield": 1}
    assert restored.flux_shards == 75
    assert restored.laboratory_transactions[0]["flux_delta"] == -25
    assert restored.laboratory_receipts["persistent-upgrade"]["cost"] == 25


def _grant_laser(service: PvPSessionService, session_id: str):
    session = service.get_session(session_id)
    session.engine.set_battle_pool(
        "player",
        default_battle_pool().module_definition_ids,
    )
    return session.engine.grant_module("player", "laser-1", "laser")


def test_ranked_snapshot_is_always_normalized_and_never_applies_lab_power():
    service = PvPSessionService()
    session = service.create_session(
        "beta36-ranked",
        match_type="ranked_pvp",
        ranked_eligible=True,
        normalized=False,
        laboratory_effects_enabled=True,
    )
    service.join(session.session_id, "player")
    service.set_player_calibrations(session.session_id, "player", {"laser": 3})
    laser = _grant_laser(service, session.session_id)
    snapshot = service.snapshot(session.session_id, "player")

    assert snapshot["normalized"] is True
    assert snapshot["laboratory_effects_enabled"] is False
    assert laser.definition.base_damage == BASIC_MODULE_DEFINITIONS["laser"].base_damage
    assert laser.calibration_level == 3
    assert laser.calibration_applied is False


def test_feature_flagged_unranked_session_applies_small_experimental_effect():
    service = PvPSessionService()
    session = service.create_session(
        "beta36-experimental",
        match_type="unranked_ai",
        ranked_eligible=False,
        normalized=False,
        laboratory_effects_enabled=True,
    )
    service.join(session.session_id, "player")
    service.set_player_calibrations(session.session_id, "player", {"laser": 3})
    laser = _grant_laser(service, session.session_id)
    snapshot = service.snapshot(session.session_id, "player")
    module_view = snapshot["players"]["player"]["modules"][0]

    assert snapshot["normalized"] is False
    assert snapshot["laboratory_effects_enabled"] is True
    assert laser.definition.base_damage > BASIC_MODULE_DEFINITIONS["laser"].base_damage
    assert module_view["calibration_level"] == 3
    assert module_view["calibration_applied"] is True
