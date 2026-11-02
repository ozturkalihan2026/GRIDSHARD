from copy import deepcopy
from datetime import datetime, timezone
import json
from pathlib import Path

import pytest

from app import cosmetic_releases as releases
from app.cosmetic_releases import CosmeticReleaseError, CosmeticReleaseRegistry
from app.player_profile import PlayerProfileError, PlayerProfileService
from app.team_service import InMemoryTeamRepository, TeamService, TeamServiceError, team_appearance_unlocked


NOW = datetime(2026,11,2,tzinfo=timezone.utc)


def registry():
    return CosmeticReleaseRegistry(json.loads(releases.CATALOG_PATH.read_text(encoding="utf-8")))


def test_new_cosmetics_start_locked_and_cannot_be_equipped_or_granted_by_legacy_fallback():
    r = registry()
    assert len(r.items) == 15 and not r.used and not r.releases
    service = PlayerProfileService()
    profile = service.get_or_create("cosmetic-release-new")
    for item in r.items.values():
        if item["field"] in releases.PLAYER_FIELDS:
            argument = "avatar_frame_id" if item["field"] == "avatar_frame_id" else "profile_background_id"
            with pytest.raises(PlayerProfileError):
                service.set_cosmetics(profile.player_id, **{argument: item["id"]})
    assert profile.unlocked_avatar_frame_ids == ("none",)
    assert profile.unlocked_profile_background_ids == ("default",)


def test_drafts_do_not_award_and_two_periods_receive_different_real_designs():
    r = registry().reserve("weekly_tournament", "2027-W01", "weekly-2027-01")
    base = {"flux_shards": 10, "avatar_id": "weekly_champion"}
    assert r.reward("weekly_tournament", "2027-W01", 1, base) == base
    r = r.publish("weekly-2027-01", now=NOW)
    first = r.reward("weekly_tournament", "2027-W01", 1, base)
    r = r.reserve("weekly_tournament", "2027-W02", "weekly-2027-02").publish("weekly-2027-02", now=NOW)
    second = r.reward("weekly_tournament", "2027-W02", 1, base)
    assert first["avatar_frame_id"] != second["avatar_frame_id"]
    assert first["profile_background_id"] != second["profile_background_id"]
    assert "avatar_id" not in first and first["flux_shards"] == second["flux_shards"] == 10
    assert base == {"flux_shards": 10, "avatar_id": "weekly_champion"}
    with pytest.raises(CosmeticReleaseError, match="Fresh rewards missing"):
        r.reward("weekly_tournament", "2027-W03", 1, base)


def test_stock_exhaustion_never_wraps_and_a_published_reward_cannot_change():
    r = registry()
    for week in range(1, 4):
        r = r.reserve("weekly_tournament", f"2027-W{week:02}", f"week-{week}").publish(f"week-{week}", now=NOW)
    with pytest.raises(CosmeticReleaseError, match="exhausted"):
        r.reserve("weekly_tournament", "2027-W04", "week-4")
    modified = deepcopy(r.document)
    modified["releases"][0]["placements"][0]["cosmetics"]["avatar_frame_id"] = "solar_frame"
    with pytest.raises(CosmeticReleaseError):
        CosmeticReleaseRegistry(modified)
    modified = deepcopy(r.document)
    modified["items"][0]["look"]["color"] = "#ffffff"
    with pytest.raises(CosmeticReleaseError, match="Published reward/art changed"):
        CosmeticReleaseRegistry(modified)


def test_renamed_or_recolored_visual_and_wrong_field_or_period_are_rejected():
    doc = deepcopy(registry().document)
    duplicate = {**deepcopy(doc["items"][0]), "id": "renamed_frame", "design_id": "renamed_v1"}
    doc["items"].append(duplicate)
    with pytest.raises(CosmeticReleaseError, match="Duplicate visual"):
        CosmeticReleaseRegistry(doc)
    duplicate["look"]["color"] = "#ffffff"
    with pytest.raises(CosmeticReleaseError, match="Recolor"):
        CosmeticReleaseRegistry(doc)
    with pytest.raises(CosmeticReleaseError):
        registry().reserve("weekly_tournament", "2027-W99", "invalid-week")
    doc = registry().reserve("weekly_tournament", "2027-W01", "wrong-field").document
    doc["releases"][0]["placements"][0]["cosmetics"] = {"avatar_frame_id":"aurora_sigil"}
    with pytest.raises(CosmeticReleaseError, match="field mismatch"):
        CosmeticReleaseRegistry(doc)
    doc["releases"][0]["placements"][0]["cosmetics"] = {"team_emblem_id":"aurora_sigil"}
    with pytest.raises(CosmeticReleaseError, match="player-only source"):
        CosmeticReleaseRegistry(doc)


def test_season_preview_claim_and_retry_use_the_same_frozen_new_cosmetics(monkeypatch):
    service = PlayerProfileService(now_func=lambda: datetime(2026, 11, 2, 12, tzinfo=timezone.utc))
    profile = service.get_or_create("cosmetic-release-season")
    r = registry().reserve("season_road", profile.active_meta_season_id, "season-preview").publish("season-preview", now=datetime(2026,9,1,tzinfo=timezone.utc))
    monkeypatch.setattr(releases, "REGISTRY", r)
    profile.season_xp = 999999
    preview = profile.engagement_view()["reward_track"][-1]
    before_credits = profile.circuit_credits
    service.claim_season_tier(profile.player_id, 40, request_id="season-release-claim")
    receipt = profile.engagement_claim_receipts["season-release-claim"]
    assert receipt["avatar_frame_id"] == preview["avatar_frame_id"]
    assert receipt["profile_background_id"] == preview["profile_background_id"]
    assert receipt["cosmetic_release_id"] == "season-preview"
    assert receipt["avatar_frame_id"] in profile.unlocked_avatar_frame_ids
    assert receipt["profile_background_id"] in profile.unlocked_profile_background_ids
    saved = deepcopy(profile)
    service.claim_season_tier(profile.player_id, 40, request_id="season-release-claim")
    assert profile == saved and profile.circuit_credits > before_credits


def test_scheduled_team_reward_does_not_substitute_or_replay_after_50_other_grants():
    repo = InMemoryTeamRepository()
    teams = TeamService(repo)
    created = teams.create_team(player_id="cosmetic-owner", name="Kutup Denemesi", request_id="create")
    team_id = created["team_id"]
    r = registry().reserve("team_tournament", "2027-01-04", "team-january").publish("team-january", now=NOW)
    reward = r.reward("team_tournament", "2027-01-04", 1, {})
    opened = teams.grant_reward_cosmetics(team_id, reward, grant_id="team-period-first")
    assert set(opened.values()) == {reward[field] for field in releases.TEAM_FIELDS}
    for i in range(55):
        teams.grant_reward_cosmetics(team_id, {}, grant_id=f"other-{i}")
    assert teams.grant_reward_cosmetics(team_id, reward, grant_id="team-period-first") == {}
    assert teams.grant_reward_cosmetics(team_id, reward, grant_id="different-id-same-art") == {}
    actual = teams.get_team(team_id)
    assert "team-period-first" in actual["cosmetics"]["granted_reward_ids"]
    assert "aurora_sigil" in team_appearance_unlocked(actual["cosmetics"])["emblem_id"]


def test_started_period_cannot_be_replaced_and_awarded_mail_keeps_its_snapshot(monkeypatch):
    r = registry().reserve("weekly_tournament", "2026-W01", "old-week")
    with pytest.raises(CosmeticReleaseError, match="already started"):
        r.publish("old-week", now=NOW)
    from app import main as gateway
    r = registry().reserve("weekly_tournament", "2027-W01", "mail-week").publish("mail-week", now=NOW)
    monkeypatch.setattr(releases, "REGISTRY", r)
    profile = PlayerProfileService().get_or_create("cosmetic-frozen-mail")
    assert gateway._queue_competition_reward(profile, source="weekly_tournament", period_id="2027-W01", position=1,
                                            prize={"circuit_credits":100,"chest_tier":"gold","avatar_id":"weekly_champion"})
    saved = deepcopy(profile.reward_inbox)
    assert saved[0]["chest"]["cosmetic_release_id"] == "mail-week"
    monkeypatch.setattr(releases, "REGISTRY", registry())
    assert not gateway._queue_competition_reward(profile, source="weekly_tournament", period_id="2027-W01", position=1, prize={})
    assert profile.reward_inbox == saved
