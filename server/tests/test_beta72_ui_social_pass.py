import pytest

from app import main as gateway
from app.meta_progression import archive_and_soft_reset_season
from app.platform_services import PlatformService
from app.player_data_store import InMemoryPlayerDataRepository
from app.player_profile import (
    PlayerProfileError,
    PlayerProfileService,
    SEASON_PREMIUM_REWARD_TRACK,
    SEASON_REWARD_TRACK,
)
from app.team_service import (
    InMemoryTeamRepository,
    TEAM_APPEARANCE_OPTIONS,
    TeamService,
    TeamServiceError,
    team_appearance,
    team_appearance_for_seed,
)


def _clear_players(*player_ids: str) -> None:
    for player_id in player_ids:
        gateway.player_profile_service._profiles.pop(player_id, None)
        gateway.player_statistics_service._statistics.pop(player_id, None)
        gateway.player_settings_service._settings.pop(player_id, None)


@pytest.fixture
def isolated_gateway(monkeypatch, tmp_path):
    repository = InMemoryPlayerDataRepository()
    monkeypatch.setattr(gateway, "player_data_repository", repository)
    monkeypatch.setattr(gateway.player_data_store_service, "repository", repository)
    monkeypatch.setattr(
        gateway,
        "platform_service",
        PlatformService(tmp_path / "platform.json", now_func=lambda: 1000),
    )
    return repository


def _befriend(left_id: str, right_id: str):
    left = gateway.player_profile_service.get_or_create(left_id)
    right = gateway.player_profile_service.get_or_create(right_id)
    left.friend_ids = (right_id,)
    right.friend_ids = (left_id,)
    return left, right


def test_premium_track_doubles_free_rewards_and_requires_an_active_pass():
    for free, premium in zip(SEASON_REWARD_TRACK, SEASON_PREMIUM_REWARD_TRACK):
        for key in ("circuit_credits", "flux_shards", "module_shards", "core_shards"):
            assert premium[key] == free[key] * 2
        assert premium["chest_count"] == (2 if free["chest_tier"] else 0)
        assert premium["avatar_id"] is None
        assert premium["avatar_frame_id"] is None

    service = PlayerProfileService()
    profile = service.get_or_create("ui72-premium")
    profile.season_xp = SEASON_REWARD_TRACK[0]["required_xp"]
    view = profile.engagement_view()
    assert view["premium_pass"]["active"] is False
    # Tur 9: ücretli geçiş 99,99 TL ile satın alınabilir (kullanıcı kararı).
    assert view["premium_pass"]["purchasable"] is True
    assert view["premium_pass"]["price_label_tr"] == "99,99 TL"
    assert view["premium_reward_track"][0]["unlocked"] is True
    assert view["premium_reward_track"][0]["claimable"] is False
    with pytest.raises(PlayerProfileError):
        service.claim_premium_season_tier("ui72-premium", 1)

    profile.season_premium_pass_season_id = profile.active_meta_season_id
    credits = profile.circuit_credits
    service.claim_premium_season_tier("ui72-premium", 1, request_id="premium-1")
    assert profile.circuit_credits == credits + SEASON_PREMIUM_REWARD_TRACK[0]["circuit_credits"]
    assert profile.claimed_premium_season_tiers == (1,)
    with pytest.raises(PlayerProfileError):
        service.claim_premium_season_tier("ui72-premium", 1)

    archive_and_soft_reset_season(profile, "ui72-next-season")
    assert profile.claimed_premium_season_tiers == ()
    assert profile.premium_pass_active() is False


def test_team_appearance_is_free_to_choose_and_validated():
    service = TeamService(InMemoryTeamRepository())
    team_id = service.create_team("owner", "Görünüm Devresi", "create-look")["team_id"]
    result = service.set_cosmetics(
        team_id=team_id,
        owner_id="owner",
        selections={"emblem_id": "crown", "frame_id": "gold", "name_color_id": "violet"},
        request_id="look-1",
    )
    assert team_appearance(result["cosmetics"]) == {
        "emblem_id": "crown",
        "frame_id": "gold",
        "name_color_id": "violet",
    }
    with pytest.raises(TeamServiceError):
        service.set_cosmetics(
            team_id=team_id,
            owner_id="owner",
            selections={"emblem_id": "dragon"},
            request_id="look-2",
        )
    with pytest.raises(TeamServiceError):
        service.set_cosmetics(
            team_id=team_id,
            owner_id="someone-else",
            selections={"emblem_id": "star"},
            request_id="look-3",
        )
    assert team_appearance(None) == {"emblem_id": "shield", "frame_id": "steel", "name_color_id": "cyan"}
    ai_look = team_appearance_for_seed("ai-team-anka")
    assert ai_look == team_appearance_for_seed("ai-team-anka")
    assert all(ai_look[key] in TEAM_APPEARANCE_OPTIONS[key] for key in ai_look)
    assert gateway.get_public_team_profile("ai-team-anka")["appearance"] == ai_look


def test_friend_battle_invite_lands_in_inbox_once_and_can_be_declined(isolated_gateway):
    challenger_id, opponent_id = "ui72-challenger", "ui72-opponent"
    _clear_players(challenger_id, opponent_id)
    try:
        challenger, _opponent = _befriend(challenger_id, opponent_id)
        gateway.create_social_battle_invite(
            challenger_id,
            gateway.SocialBattleInviteOperation(
                player_id=challenger_id, opponent_id=opponent_id, request_id="invite-1"
            ),
        )
        again = gateway.create_social_battle_invite(
            challenger_id,
            gateway.SocialBattleInviteOperation(
                player_id=challenger_id, opponent_id=opponent_id, request_id="invite-2"
            ),
        )
        assert again["replayed"] is True
        assert sum(item["status"] == "pending" for item in challenger.social_battle_invites) == 1

        inbox = gateway.get_reward_inbox(opponent_id)
        invitation = inbox["invitations"][0]
        assert invitation["kind"] == "friend_battle"
        assert invitation["incoming"] is True
        assert invitation["peer_id"] == challenger_id
        assert inbox["unread_count"] >= 1
        assert gateway.get_social_view(opponent_id)["notifications"]["battle_invites"] == 1

        declined = gateway.decline_social_battle_invite(
            opponent_id,
            invitation["invitation_id"],
            gateway.EventRegistrationOperation(player_id=opponent_id, request_id="decline-1"),
        )
        assert declined["inbox"]["invitations"] == []
        assert declined["notifications"]["battle_invites"] == 0
        assert all(item["status"] == "declined" for item in challenger.social_battle_invites)
    finally:
        _clear_players(challenger_id, opponent_id)


def test_update_notice_and_direct_messages_are_unread_until_seen(isolated_gateway):
    sender_id, recipient_id = "ui72-sender", "ui72-recipient"
    _clear_players(sender_id, recipient_id)
    try:
        _befriend(sender_id, recipient_id)
        inbox = gateway.get_reward_inbox(recipient_id)
        notice = next(item for item in inbox["notices"] if item["notice_id"] == "update-beta72")
        assert notice["seen"] is False
        seen = gateway.mark_reward_inbox_notices_seen(
            recipient_id,
            gateway.InboxNoticeSeenRequest(player_id=recipient_id, notice_ids=["update-beta72"]),
        )
        assert next(item for item in seen["notices"] if item["notice_id"] == "update-beta72")["seen"] is True
        assert seen["unread_count"] == inbox["unread_count"] - 1

        gateway.send_direct_message(
            sender_id,
            gateway.DirectMessageRequest(player_id=sender_id, recipient_id=recipient_id, text="Savaşa var mısın?"),
        )
        assert gateway.get_social_view(recipient_id)["notifications"]["unread_messages"] == 1
        cleared = gateway.mark_direct_messages_seen(
            recipient_id,
            gateway.EventRegistrationOperation(player_id=recipient_id, request_id="seen-1"),
        )
        assert cleared["notifications"]["unread_messages"] == 0
    finally:
        _clear_players(sender_id, recipient_id)


def test_public_profile_shows_the_circuit_collection(isolated_gateway):
    player_id = "ui72-honors"
    _clear_players(player_id)
    try:
        profile = gateway.player_profile_service.get_or_create(player_id)
        profile.unlocked_rank_trophy_ids = ("season_first",)
        profile.unlocked_badge_ids = ("season_champion", "season_top10")
        view = gateway.get_public_player_profile(player_id)
        assert view["honors"] == {
            "rank_trophy_ids": ["season_first"],
            "badge_ids": ["season_champion", "season_top10"],
        }
    finally:
        _clear_players(player_id)
