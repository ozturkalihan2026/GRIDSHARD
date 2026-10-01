"""Pure SERVER-2 transitions; no runtime JSON or PostgreSQL is opened."""

import pytest

from app.postgres_social_transactions import (
    SocialTransactionError, create_battle_invite_pair, mutate_friend_pair,
)


def _profile(*, friends=(), incoming=(), outgoing=(), blocked=()):
    return {
        "display_name": "unchanged",
        "meta_progression_state": {
            "friend_ids": list(friends),
            "incoming_friend_request_ids": list(incoming),
            "outgoing_friend_request_ids": list(outgoing),
            "blocked_player_ids": list(blocked),
            "circuit_credits": 123,
        },
    }


def test_request_accept_and_block_are_symmetric_without_erasing_progress():
    original_a, original_b = _profile(), _profile()
    a, b, status = mutate_friend_pair("request", "a", "b", original_a, original_b)
    assert status == "pending_request"
    assert a["meta_progression_state"]["outgoing_friend_request_ids"] == ["b"]
    assert b["meta_progression_state"]["incoming_friend_request_ids"] == ["a"]
    assert original_a["meta_progression_state"]["outgoing_friend_request_ids"] == []

    b, a, status = mutate_friend_pair("accept", "b", "a", b, a)
    assert status == "friendship"
    assert a["meta_progression_state"]["friend_ids"] == ["b"]
    assert b["meta_progression_state"]["friend_ids"] == ["a"]
    assert a["meta_progression_state"]["circuit_credits"] == 123

    a, b, status = mutate_friend_pair("block", "a", "b", a, b)
    assert status == "block"
    assert a["meta_progression_state"]["blocked_player_ids"] == ["b"]
    assert not a["meta_progression_state"]["friend_ids"]
    assert not b["meta_progression_state"]["friend_ids"]


def test_reverse_request_auto_accepts_and_repeat_does_not_duplicate():
    a = _profile(incoming=("b",))
    b = _profile(outgoing=("a",))
    a, b, status = mutate_friend_pair("request", "a", "b", a, b)
    assert status == "friendship"
    a, b, status = mutate_friend_pair("request", "a", "b", a, b)
    assert status == "already_friends"
    assert a["meta_progression_state"]["friend_ids"] == ["b"]


def test_invalid_or_blocked_relations_fail_without_input_mutation():
    a, b = _profile(blocked=("b",)), _profile()
    with pytest.raises(SocialTransactionError, match="blocked_relation"):
        mutate_friend_pair("request", "a", "b", a, b)
    with pytest.raises(SocialTransactionError, match="request_missing"):
        mutate_friend_pair("accept", "a", "b", a, b)
    assert a["meta_progression_state"]["friend_ids"] == []


def test_unblock_does_not_restore_friendship():
    a, b = _profile(friends=("b",), blocked=("b",)), _profile(friends=("a",))
    a, b, status = mutate_friend_pair("unblock", "a", "b", a, b)
    assert status == "unblock"
    assert not a["meta_progression_state"]["blocked_player_ids"]
    assert not a["meta_progression_state"]["friend_ids"]
    assert not b["meta_progression_state"]["friend_ids"]


def test_asymmetric_existing_edge_is_not_silently_repaired():
    with pytest.raises(SocialTransactionError, match="inconsistent_social_pair"):
        mutate_friend_pair("reject", "a", "b", _profile(incoming=("b",)), _profile())


@pytest.mark.parametrize("full_player", ["a", "b"])
def test_accept_rechecks_friend_limit_without_consuming_the_request(full_player):
    a, b = _profile(incoming=("b",)), _profile(outgoing=("a",))
    full = a if full_player == "a" else b
    full["meta_progression_state"]["friend_ids"] = [f"other-{i}" for i in range(100)]
    with pytest.raises(SocialTransactionError, match="friend_limit"):
        mutate_friend_pair("accept", "a", "b", a, b)
    assert a["meta_progression_state"]["incoming_friend_request_ids"] == ["b"]
    assert b["meta_progression_state"]["outgoing_friend_request_ids"] == ["a"]


@pytest.mark.parametrize("blocking_player", ["a", "b"])
def test_accept_cannot_bypass_either_players_block(blocking_player):
    a, b = _profile(incoming=("b",)), _profile(outgoing=("a",))
    (a if blocking_player == "a" else b)["meta_progression_state"]["blocked_player_ids"] = [
        "b" if blocking_player == "a" else "a"
    ]
    with pytest.raises(SocialTransactionError, match="blocked_relation"):
        mutate_friend_pair("accept", "a", "b", a, b)


@pytest.mark.parametrize("kind", ["request", "accept"])
def test_friendship_clears_crossed_requests_in_both_directions(kind):
    a, b, _ = mutate_friend_pair(
        kind, "a", "b", _profile(incoming=("b",), outgoing=("b",)),
        _profile(incoming=("a",), outgoing=("a",)),
    )
    for profile in (a, b):
        assert not profile["meta_progression_state"]["incoming_friend_request_ids"]
        assert not profile["meta_progression_state"]["outgoing_friend_request_ids"]


def test_battle_invite_copies_are_symmetric_and_reuse_pending_invite():
    a, b = _profile(friends=("b",)), _profile(friends=("a",))
    a, b, invite, created = create_battle_invite_pair("a", "b", "request-1", a, b)
    assert created is True
    assert invite["invite_id"].startswith("friend-battle-")
    assert a["meta_progression_state"]["social_battle_invites"] == b["meta_progression_state"]["social_battle_invites"]
    a, b, repeated, created = create_battle_invite_pair("a", "b", "request-2", a, b)
    assert created is False
    assert repeated == invite
    assert len(a["meta_progression_state"]["social_battle_invites"]) == 1


def test_battle_invite_requires_friendship_and_consistent_mirror():
    with pytest.raises(SocialTransactionError, match="friendship_required"):
        create_battle_invite_pair("a", "b", "request-1", _profile(), _profile())
    a, b, _, _ = create_battle_invite_pair(
        "a", "b", "request-1", _profile(friends=("b",)), _profile(friends=("a",)),
    )
    b["meta_progression_state"]["social_battle_invites"] = []
    with pytest.raises(SocialTransactionError, match="inconsistent_battle_invite"):
        create_battle_invite_pair("a", "b", "request-2", a, b)
