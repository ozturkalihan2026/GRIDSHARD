"""Owned in-memory mailbox fixtures; never touch live purchases/players."""
from copy import deepcopy
from datetime import datetime, timezone

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app import main as gateway
UPDATE_NOTICE_ID = gateway.INBOX_UPDATE_NOTICES[-1]["notice_id"]
from app.auth import JsonIdentityRepository, ParticipantAuthService
from app.player_data_store import InMemoryPlayerDataRepository
from app.player_profile import PlayerProfileService
from app.reward_delivery import mailbox_messages, queue_purchase_notice

STAMP = "2026-10-13T18:00:00+00:00"


@pytest.fixture
def inbox(monkeypatch):
    profiles = PlayerProfileService(now_func=lambda: datetime(2026, 10, 13, tzinfo=timezone.utc))
    repository = InMemoryPlayerDataRepository()
    monkeypatch.setattr(gateway, "player_profile_service", profiles)
    monkeypatch.setattr(gateway.player_data_store_service, "profile_service", profiles)
    monkeypatch.setattr(gateway.player_data_store_service, "repository", repository)
    monkeypatch.setattr(gateway, "player_data_repository", repository)
    monkeypatch.setattr(gateway, "_events_view", lambda: {})
    profile = profiles.get_or_create("inbox-delete-fixture")
    profile.purchase_receipts["preserved"] = {"product_id": "flux_120", "private_key": "not-a-real-receipt"}
    for index in range(25):
        queue_purchase_notice(profile, {"key": f"test-order-{index}", "request_id": f"test-{index}", "purchased_at": STAMP},
                              product_name=f"Test {index}", product_id="fixture")
    return profile, profiles, repository


def request(profile, category="purchase", **options):
    return gateway.InboxDismissRequest(player_id=profile.player_id, category=category, **options)


def dismiss(profile, category="purchase", **options):
    return gateway.dismiss_reward_inbox_messages(profile.player_id, request(profile, category, **options))


def test_single_delete_is_idempotent_and_never_erases_purchase_or_wallet(inbox):
    profile, _, _ = inbox
    before = (deepcopy(profile.reward_inbox), deepcopy(profile.purchase_receipts), profile.circuit_credits, profile.flux_shards)
    identity = mailbox_messages(profile)[1][0]["notice_id"]
    result = dismiss(profile, notice_ids=[identity])
    assert identity not in [item["notice_id"] for item in result["purchases"]]
    assert len(result["purchases"]) == 20  # an older row takes the freed visible slot
    assert dismiss(profile, notice_ids=[identity])["changed_notice_ids"] == []
    assert (profile.reward_inbox, profile.purchase_receipts, profile.circuit_credits, profile.flux_shards) == before
    restored = dismiss(profile, notice_ids=[identity], restore=True)
    assert restored["purchases"][0]["notice_id"] == identity


def test_bulk_clears_the_whole_category_not_only_the_visible_twenty(inbox):
    profile, _, _ = inbox
    result = dismiss(profile, all_in_category=True)
    assert len(result["changed_notice_ids"]) == 25
    assert result["purchases"] == []
    assert result["notices"]
    assert len(profile.reward_inbox) == 25
    restored = dismiss(profile, notice_ids=result["changed_notice_ids"], restore=True)
    assert len(restored["purchases"]) == 20


def test_system_delete_survives_reload_and_undo_does_not_reset_seen(inbox):
    profile, profiles, _ = inbox
    profile.seen_inbox_notice_ids = (UPDATE_NOTICE_ID,)
    result = dismiss(profile, "system", notice_ids=[UPDATE_NOTICE_ID])
    assert result["notices"] == [] and result["purchases"]
    profiles._profiles.clear()
    gateway.player_data_store_service.load_player(profile.player_id)
    restored = profiles.get(profile.player_id)
    assert restored.dismissed_inbox_notice_ids == (UPDATE_NOTICE_ID,)
    assert gateway._inbox_notices(restored) == []
    result = dismiss(restored, "system", notice_ids=[UPDATE_NOTICE_ID], restore=True)
    assert result["notices"][0]["seen"] is True


def test_bulk_undo_does_not_restore_an_earlier_single_deletion(inbox):
    profile, _, _ = inbox
    identity = mailbox_messages(profile)[1][0]["notice_id"]
    dismiss(profile, notice_ids=[identity])
    bulk = dismiss(profile, all_in_category=True)
    assert len(bulk["changed_notice_ids"]) == 24
    assert identity not in bulk["changed_notice_ids"]
    restored = dismiss(profile, notice_ids=bulk["changed_notice_ids"], restore=True)
    assert identity not in [item["notice_id"] for item in restored["purchases"]]
    assert profile.dismissed_inbox_notice_ids == (identity,)


@pytest.mark.parametrize("category", ["battle", "reward", "other"])
def test_actionable_rewards_and_invitations_cannot_be_bulk_deleted(inbox, category):
    profile, _, _ = inbox
    with pytest.raises(HTTPException) as caught:
        dismiss(profile, category, all_in_category=True)
    assert caught.value.status_code == 422
    assert not profile.dismissed_inbox_notice_ids


def test_unknown_or_cross_category_id_is_atomic_and_other_player_is_forbidden(inbox):
    profile, _, _ = inbox
    identity = mailbox_messages(profile)[1][0]["notice_id"]
    for ids in [[identity, "foreign"], [UPDATE_NOTICE_ID]]:
        with pytest.raises(HTTPException) as caught:
            dismiss(profile, notice_ids=ids)
        assert caught.value.status_code == 404
        assert not profile.dismissed_inbox_notice_ids
    with pytest.raises(HTTPException) as caught:
        gateway.dismiss_reward_inbox_messages(profile.player_id, gateway.InboxDismissRequest(
            player_id="not-the-owner", category="system", all_in_category=True))
    assert caught.value.status_code == 403


def test_invalid_bulk_restore_and_oversized_explicit_batch_are_rejected(inbox):
    profile, _, _ = inbox
    with pytest.raises(HTTPException) as caught:
        dismiss(profile, all_in_category=True, restore=True)
    assert caught.value.status_code == 422
    with pytest.raises(ValidationError):
        request(profile, notice_ids=["x"] * 201)


def test_http_endpoint_requires_own_signed_identity(inbox, monkeypatch, tmp_path):
    profile, _, _ = inbox
    service = ParticipantAuthService(JsonIdentityRepository(tmp_path / "identities.json"), b"inbox-test-key-longer-than-thirty-two-bytes")
    monkeypatch.setattr(gateway, "participant_auth_service", service)
    monkeypatch.setenv("GRIDSHARD_AUTH_REQUIRED", "1")
    token = service.register_or_login(profile.player_id, "f" * 40)["access_token"]
    client = TestClient(gateway.app)
    path = f"/profile/{profile.player_id}/reward-inbox/messages/dismiss"
    body = {"player_id": profile.player_id, "category": "system", "all_in_category": True}
    assert client.post(path, json=body).status_code == 401
    headers = {"authorization": f"Bearer {token}"}
    assert client.post(path.replace(profile.player_id, "another-player"), json=body, headers=headers).status_code == 403
    assert client.post(path, json=body, headers=headers).status_code == 200


def test_invitation_timestamp_is_carried_without_inventing_legacy_dates(inbox):
    profile, _, _ = inbox
    profile.social_battle_invites.append({"invite_id": "test-invite", "opponent_id": profile.player_id,
        "challenger_id": "peer", "challenger_name": "Peer", "status": "pending", "created_at": STAMP})
    assert gateway._inbox_invitations(profile)[0]["created_at"] == STAMP
    profile.social_battle_invites[0].pop("created_at")
    assert gateway._inbox_invitations(profile)[0]["created_at"] is None
