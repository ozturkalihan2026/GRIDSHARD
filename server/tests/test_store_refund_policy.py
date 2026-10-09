"""Approved Terms policy: causal deficits, manual review, replay and inbox safety."""

from contextlib import contextmanager
from copy import deepcopy

import pytest

import app.main as gateway
from app.platform_services import PlatformService, PlatformServiceError
from app.player_profile import PlayerProfileService
from app.store_catalog import PAID_PRODUCTS, restore_refunded_purchase, revoke_purchase, store_refund_message
from app.store_refund_policy import publisher_error_correction, refund_effect


NOW = "2026-10-10T00:00:00+00:00"
REVIEW = {"decision": "publisher_error_verified", "case_id": "case-1", "reviewed_by": "operator-1", "reviewed_at": NOW}


def receipt(currency="flux_shards", amount=120):
    return {
        "key": "google_play:GPA.1234-5678-9012-34567", "player_id": "refund-player",
        "provider": "google_play", "transaction_id": "GPA.1234-5678-9012-34567",
        "product_id": "flux_120", "granted": {"currency": currency, "amount": amount},
        "refunded": False,
    }


@pytest.mark.parametrize("currency", ["flux_shards", "circuit_credits"])
@pytest.mark.parametrize("balance,debit,waiver", [(300, 120, 0), (10, 10, 110), (0, 0, 120), (-50, 0, 120)])
def test_reviewed_publisher_failure_creates_no_new_deficit(currency, balance, debit, waiver):
    profile = PlayerProfileService().get_or_create("policy")
    entry = {**receipt(currency), "refund_review": REVIEW}
    setattr(profile, currency, balance)
    other_currency = "circuit_credits" if currency == "flux_shards" else "flux_shards"
    other_before = getattr(profile, other_currency)
    changes = revoke_purchase(profile, entry, now_iso=NOW)
    assert changes["amount"] == -debit
    assert changes.get("waived_amount", 0) == waiver
    assert getattr(profile, currency) == balance - debit
    assert getattr(profile, other_currency) == other_before
    effect = refund_effect(entry, changes, balance)
    restore_refunded_purchase(profile, {**entry, "refund_effect": effect}, now_iso=NOW)
    assert getattr(profile, currency) == balance  # reversal cannot re-grant waived currency


@pytest.mark.parametrize("untrusted", [{"voidedReason": 1}, {"publisher_error": True}, {
    "refund_review": {"decision": "publisher_error_verified"},
}])
def test_store_reason_and_client_style_flags_are_not_fault_evidence(untrusted):
    profile = PlayerProfileService().get_or_create("unreviewed")
    profile.flux_shards = 10
    changes = revoke_purchase(profile, {**receipt(), **untrusted}, now_iso=NOW)
    assert changes == {"currency": "flux_shards", "amount": -120, "balance": -110}


def test_later_review_restores_only_this_receipts_causal_deficit():
    entry = {**receipt(), "refunded": True, "refund_effect": {
        "currency": "flux_shards", "balance_before": 10, "balance_after": -110,
        "debited_amount": 120, "waived_amount": 0,
    }}
    correction, effect = publisher_error_correction(entry)
    assert correction == 110
    assert effect["debited_amount"] == 10 and effect["waived_amount"] == 110
    entry["refund_review"] = REVIEW
    entry["refund_effect"] = effect
    assert publisher_error_correction(entry)[0] == 0
    profile = PlayerProfileService().get_or_create("later-earn")
    profile.flux_shards = 70  # -110 + earned 70 + correction 110
    restore_refunded_purchase(profile, entry, now_iso=NOW)
    assert profile.flux_shards == 80  # original 10 + earned 70, not a second 120


def test_existing_deficit_is_not_erased_by_another_receipts_correction():
    entry = {**receipt(), "refunded": True, "refund_effect": {
        "currency": "flux_shards", "balance_before": -50, "balance_after": -170,
        "debited_amount": 120, "waived_amount": 0,
    }}
    correction, effect = publisher_error_correction(entry)
    assert correction == 120
    assert effect["balance_after"] == -50


@pytest.mark.parametrize("effect", [None, {}, {"currency": "circuit_credits"}, {
    "currency": "flux_shards", "balance_before": 10, "balance_after": -999,
    "debited_amount": 120, "waived_amount": 0,
}])
def test_missing_or_inconsistent_causal_history_requires_manual_investigation(effect):
    entry = {**receipt(), "refunded": True, "refund_effect": effect}
    with pytest.raises(ValueError, match="inceleme"):
        publisher_error_correction(entry)


@pytest.mark.parametrize("kind", ["season_pass_season_id", "battle_premium_season_id"])
def test_past_season_refund_changes_no_old_or_current_reward(kind):
    profile = PlayerProfileService().get_or_create("old-season")
    field = "season_premium_pass_season_id" if kind.startswith("season") else "battle_premium_season_id"
    setattr(profile, field, "past-season")
    entry = {**receipt(), "granted": {kind: "past-season"}}
    assert revoke_purchase(profile, entry, now_iso=NOW) == {}
    assert getattr(profile, field) == "past-season"


@pytest.mark.parametrize("language", ["tr", "en"])
@pytest.mark.parametrize("reversed_refund", [False, True])
def test_every_product_message_fits_inbox_and_never_exposes_tokens(language, reversed_refund):
    for product in PAID_PRODUCTS:
        entry = {**receipt(), "product_id": product["id"], "purchase_token": "SECRET_TOKEN", "token_sha256": "SECRET_HASH"}
        changes = {"active": reversed_refund}
        if product["kind"] == "currency":
            changes = {"currency": product["currency"], "amount": (-1 if not reversed_refund else 1) * product["amount"], "balance": -999999999999999999}
        title, body = store_refund_message(entry, reversed_refund=reversed_refund, changes=changes, language=language)
        assert len(title) <= 80 and len(body) <= 240
        assert "GPA.1234-5678-9012-34567" in body
        assert "gridshardgame@gmail.com" in body
        assert "SECRET" not in body
        if product["kind"] == "currency":
            assert str(product["amount"]) in body
            assert "999999999999999999" in body
            assert ("no cash debt" if language == "en" else "para borcu değildir") in body
    entry["transaction_id"] = "token-SECRET_HASH"
    assert "SECRET" not in store_refund_message(entry, reversed_refund=False)[1]


@pytest.fixture
def runtime(monkeypatch, tmp_path):
    ledger = PlatformService(tmp_path / "platform.json")
    entry = receipt()
    ledger.record_store_receipt(entry["key"], player_id=entry["player_id"], receipt=entry)
    profile = PlayerProfileService().get_or_create(entry["player_id"])
    profile.flux_shards = 10
    profile.purchase_receipts[entry["key"]] = deepcopy(entry)
    state = {"in_transaction": False, "fail_notification": False}
    original_queue = ledger.queue_notification

    @contextmanager
    def transaction(_player):
        before = deepcopy(ledger._read())
        balance = profile.flux_shards
        receipts_before = deepcopy(profile.purchase_receipts)
        state["in_transaction"] = True
        try:
            yield
        except BaseException:
            ledger._write(before)
            profile.flux_shards = balance
            profile.purchase_receipts = receipts_before
            raise
        finally:
            state["in_transaction"] = False

    def queue(*args, **kwargs):
        assert state["in_transaction"], "Inbox must be inside the balance/receipt transaction"
        if state["fail_notification"]:
            raise PlatformServiceError("fixture inbox failure")
        return original_queue(*args, **kwargs)

    monkeypatch.setattr(gateway, "platform_service", ledger)
    monkeypatch.setattr(gateway, "_store_economy_transaction", transaction)
    monkeypatch.setattr(gateway, "_existing_player_profile", lambda _player: profile)
    monkeypatch.setattr(gateway, "persist_player_data", lambda _player: None)
    monkeypatch.setattr(ledger, "queue_notification", queue)
    return ledger, profile, entry, state


def apply_refund(entry, event="refund-1", reverse=False):
    return gateway._apply_store_refund(provider="google_play", source="google_poll", transaction_id=entry["transaction_id"], event_id=event, reversed_refund=reverse)


def test_review_is_dry_run_by_default_and_apply_replay_is_idempotent(runtime):
    ledger, profile, entry, _ = runtime
    apply_refund(entry)
    profile.flux_shards += 70
    kwargs = {"case_id": "case-1", "reviewed_by": "operator-1"}
    result = gateway._review_store_refund_publisher_error(entry["key"], **kwargs)
    assert result == {"applied": False, "duplicate": False, "correction": 110}
    assert profile.flux_shards == -40 and not ledger.store_receipt(entry["key"]).get("refund_review")
    assert gateway._review_store_refund_publisher_error(entry["key"], **kwargs, apply=True)["applied"]
    assert profile.flux_shards == 70
    assert gateway._review_store_refund_publisher_error(entry["key"], **kwargs, apply=True)["duplicate"]
    assert profile.flux_shards == 70
    apply_refund(entry, "refund-2")
    assert profile.flux_shards == 70
    apply_refund(entry, "reversal", reverse=True)
    assert profile.flux_shards == 80
    assert len(ledger.notification_view(entry["player_id"])["notifications"]) == 3


def test_review_before_refund_and_a_reversal_never_regrant_waived_currency(runtime):
    ledger, profile, entry, _ = runtime
    gateway._review_store_refund_publisher_error(entry["key"], case_id="case-1", reviewed_by="operator-1", apply=True)
    assert apply_refund(entry)["changes"]["waived_amount"] == 110
    assert profile.flux_shards == 0
    apply_refund(entry, "reversal", reverse=True)
    assert profile.flux_shards == 10
    # A later refund takes only the same remaining 10, still not a new deficit.
    apply_refund(entry, "refund-again")
    assert profile.flux_shards == 0


def test_notification_failure_rolls_back_receipt_balance_and_event_then_retry_delivers_once(runtime):
    ledger, profile, entry, state = runtime
    state["fail_notification"] = True
    with pytest.raises(PlatformServiceError):
        apply_refund(entry)
    assert profile.flux_shards == 10
    assert ledger.store_receipt(entry["key"])["refunded"] is False
    assert not ledger.store_notification_seen("refund-1")
    state["fail_notification"] = False
    apply_refund(entry)
    apply_refund(entry)
    assert profile.flux_shards == -110
    assert len(ledger.notification_view(entry["player_id"])["notifications"]) == 1


def test_review_failure_rolls_back_correction_and_no_public_refund_review_route(runtime):
    ledger, profile, entry, state = runtime
    apply_refund(entry)
    state["fail_notification"] = True
    with pytest.raises(PlatformServiceError):
        gateway._review_store_refund_publisher_error(entry["key"], case_id="case-1", reviewed_by="operator-1", apply=True)
    assert profile.flux_shards == -110
    assert not ledger.store_receipt(entry["key"]).get("refund_review")
    assert not any("refund-review" in path or "publisher-error" in path for path in gateway.app.openapi()["paths"])


def test_invalid_review_reference_and_deleted_player_never_create_a_profile(runtime, monkeypatch):
    ledger, profile, entry, _ = runtime
    with pytest.raises(ValueError):
        gateway._review_store_refund_publisher_error(entry["key"], case_id="private@email.com", reviewed_by="operator-1", apply=True)
    monkeypatch.setattr(gateway, "_existing_player_profile", lambda _player: None)
    with pytest.raises(ValueError, match="yeniden oluşturulmadı"):
        gateway._review_store_refund_publisher_error(entry["key"], case_id="case-1", reviewed_by="operator-1", apply=True)
    assert not ledger.store_receipt(entry["key"]).get("refund_review")


def test_review_ledger_survives_service_restart(runtime):
    ledger, _, entry, _ = runtime
    gateway._review_store_refund_publisher_error(entry["key"], case_id="case-1", reviewed_by="operator-1", apply=True)
    restarted = PlatformService(ledger.path)
    assert restarted.store_receipt(entry["key"])["refund_review"]["case_id"] == "case-1"
