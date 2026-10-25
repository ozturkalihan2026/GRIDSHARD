from datetime import datetime, timedelta, timezone
from copy import deepcopy
import pytest

from app.competition_control import launch_status, competition_eligible
from app.competition_cycle import competition_cycle, cycle_for_id
from app.player_profile import PlayerProfileService, PlayerProfileError, season_descriptor
from app.production_cutover import reset_snapshot
from app.store_catalog import process_purchase, store_view, StoreError
from app.season_competition import build_events_view

NOW = datetime(2026,10,26,1,tzinfo=timezone.utc)


@pytest.fixture
def closed(monkeypatch):
    monkeypatch.delenv("GRIDSHARD_SEASON_STARTS_AT",raising=False)
    monkeypatch.delenv("GRIDSHARD_TEAM_TOURNAMENT_STARTS_AT",raising=False)
    monkeypatch.setenv("GRIDSHARD_OWNER_PLAYER_ID","owner")
    return monkeypatch


def test_oct26_rollover_cannot_launch_an_unapproved_season(closed):
    assert not launch_status(NOW)["active"]
    assert season_descriptor(NOW)["id"] == "gridshard_waiting"
    service=PlayerProfileService(now_func=lambda:NOW)
    p=service.get_or_create("player")
    assert p.login_period_day == 0
    assert not any(r["claimable"] for r in p.engagement_view()["daily_login"]["rewards"])
    before=deepcopy((p.circuit_credits,p.flux_shards,p.module_shards))
    with pytest.raises(PlayerProfileError,match="başlamadı"):
        service.claim_login_reward(p.player_id,1,"prelaunch")
    p.season_xp=100000
    with pytest.raises(PlayerProfileError,match="başlamadı"):
        service.claim_season_tier(p.player_id,1,"prelaunch-season")
    with pytest.raises(StoreError,match="Sezon başlamadan"):
        process_purchase(p,"season_pass_premium","test","prelaunch-store",test_mode=True,now_iso=NOW.isoformat())
    assert (p.circuit_credits,p.flux_shards,p.module_shards) == before
    assert not store_view(p,purchase_test_mode=True,ad_test_mode=True)["season_pass"]["purchasable"]


def test_manual_start_anchors_full_28_days_and_login_to_same_season(closed):
    start=datetime(2026,11,4,15,30,tzinfo=timezone.utc)
    closed.setenv("GRIDSHARD_SEASON_STARTS_AT",start.isoformat())
    assert not launch_status(start-timedelta(seconds=1))["active"]
    assert launch_status(start)["active"]
    cycle=competition_cycle(start)
    assert cycle["number"]==1 and cycle["starts_at"]==start and cycle["ends_at"]==start+timedelta(days=28)
    assert cycle_for_id(cycle["id"])["starts_at"]==start
    service=PlayerProfileService(now_func=lambda:start)
    p=service.get_or_create("player")
    assert p.login_period_day==1
    assert not launch_status(start,team=True)["active"]


def test_bots_and_owner_do_not_count_as_real_weekly_participants(closed):
    closed.setenv("GRIDSHARD_SEASON_STARTS_AT","2026-09-28T00:00:00Z")
    closed.setenv("GRIDSHARD_WEEKLY_MIN_PLAYERS","4")
    players=[{"player_id":pid,"display_name":pid,"rating":0,"is_bot":bot,
              "weekly_registered_period":"2026-W44"} for pid,bot in [("owner",False),("ai",True),("real",False)]]
    view=build_events_view(players,NOW)["weekly_tournament"]
    assert view["status"]=="waiting_for_participants" and view["participant_count"]==1
    assert [r["player_id"] for r in view["standings"]]==["real"]
    assert not competition_eligible("owner") and not competition_eligible("ai",is_bot=True)


def test_reset_preserves_identity_settings_and_test_purchase_deduplication(closed):
    p=PlayerProfileService().get_or_create("player",display_name="Player")
    p.rating=3000;p.circuit_credits=999999;p.module_upgrade_levels={"laser":14}
    old=p.to_view();old["meta_progression_state"]={"purchase_receipts":{"test:1":{"environment":"test"}}}
    converted=reset_snapshot("player",old,{"music_volume":.2})
    assert converted["profile"]["display_name"]=="Player"
    assert converted["profile"]["rating"]==0
    assert converted["profile"]["meta_progression_state"]["circuit_credits"]==350
    assert converted["profile"]["meta_progression_state"]["purchase_receipts"]==old["meta_progression_state"]["purchase_receipts"]
    assert converted["settings"]=={"music_volume":.2}
    assert converted["statistics"]["total_matches"]==0
    old["meta_progression_state"]["purchase_receipts"]["real"]={"environment":"production"}
    with pytest.raises(ValueError,match="Real purchase"):
        reset_snapshot("player",old,{})


def test_owner_has_maximum_progress_but_remains_unranked(closed):
    p=PlayerProfileService().get_or_create("owner",display_name="Uç")
    view=reset_snapshot("owner",p.to_view(),{},owner=True)["profile"]
    meta=view["meta_progression_state"]
    assert view["rating"]==10000 and set(meta["module_upgrade_levels"].values())=={14}
    assert len(meta["core_upgrade_levels"])==7 and len(meta["arena_reward_claims"])>20
    assert len(meta["claimed_premium_season_tiers"])==40
    assert not competition_eligible("owner")
