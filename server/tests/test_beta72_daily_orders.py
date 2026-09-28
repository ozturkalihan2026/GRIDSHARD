from types import SimpleNamespace

from app.player_profile import DAILY_MISSIONS, PlayerProfileService
from app.player_progression import PlayerProgressionService


def test_daily_orders_cover_six_battle_goals():
    assert [mission["id"] for mission in DAILY_MISSIONS] == [
        "complete_battles",
        "deal_damage",
        "circuit_actions",
        "win_battles",
        "destroy_modules",
        "core_power",
    ]
    assert all(mission["target"] > 0 for mission in DAILY_MISSIONS)


def test_battle_engagement_progresses_new_orders_with_caps():
    service = PlayerProfileService()
    profile = service.record_battle_engagement(
        "orders-player",
        season_xp_awarded=0,
        damage_dealt=0,
        circuit_actions=0,
        won=True,
        modules_destroyed=9,
        core_power_uses=1,
        day_key="2026-09-25",
    )

    assert profile.daily_mission_progress["win_battles"] == 1
    assert profile.daily_mission_progress["destroy_modules"] == 4
    assert profile.daily_mission_progress["core_power"] == 1


def _event(event_type, **data):
    return SimpleNamespace(type=event_type, data=data)


def _module(definition_id):
    return SimpleNamespace(definition=SimpleNamespace(id=definition_id))


def test_destroyed_modules_count_only_opponent_non_core_modules():
    state = SimpleNamespace(
        players={
            "a": SimpleNamespace(modules={"a-1": _module("pulse_cannon")}),
            "b": SimpleNamespace(
                modules={
                    "b-1": _module("shield"),
                    "b-2": _module("pulse_cannon"),
                    "b-core": _module("core"),
                }
            ),
        },
        events=[
            _event("module_destroyed", player_id="b", module_id="b-1"),
            _event("module_destroyed", player_id="b", module_id="b-2"),
            _event("module_destroyed", player_id="b", module_id="b-core"),
            _event("module_destroyed", player_id="a", module_id="a-1"),
            _event("module_damaged", player_id="b", module_id="b-1"),
        ],
    )

    assert PlayerProgressionService._opponent_modules_destroyed(state, "a") == 2
    assert PlayerProgressionService._opponent_modules_destroyed(state, "b") == 1
