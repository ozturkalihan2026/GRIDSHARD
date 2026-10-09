"""Store notification decisions are idempotent and retry unmatched receipts."""

from contextlib import nullcontext

import pytest
from fastapi import HTTPException

import app.main as gateway


class _Ledger:
    def __init__(self):
        self.receipt = {
            "key": "google_play:order-1",
            "player_id": "player-1",
            "provider": "google_play",
            "refunded": False,
        }
        self.notifications = set()

    def find_store_receipt(self, provider, *, transaction_id="", purchase_token=""):
        if provider == "google_play" and transaction_id == "order-1":
            return dict(self.receipt)
        return None

    def store_notification_seen(self, event_id):
        return event_id in self.notifications

    def remember_store_notification(self, event_id):
        self.notifications.add(event_id)

    def mark_store_receipt_refunded(self, _key, *, refunded, source, at, event_at_ms=0, refund_effect=None):
        self.receipt["refunded"] = refunded
        if event_at_ms:
            self.receipt["refund_event_at_ms"] = event_at_ms

    def queue_notification(self, *_args):
        pass


def test_refund_marks_notification_only_after_matching_receipt(monkeypatch):
    ledger = _Ledger()
    profile = object()
    writes = []
    monkeypatch.setattr(gateway, "platform_service", ledger)
    monkeypatch.setattr(gateway, "_store_economy_transaction", lambda _player: nullcontext())
    monkeypatch.setattr(gateway, "_existing_player_profile", lambda _player: profile)
    monkeypatch.setattr(gateway, "revoke_purchase", lambda *_args, **_kwargs: {"revoked": True})
    monkeypatch.setattr(gateway, "persist_player_data", lambda player: writes.append(player))
    monkeypatch.setattr(gateway, "store_refund_message", lambda *_args, **_kwargs: ("title", "body"))

    first = gateway._apply_store_refund(
        provider="google_play", source="test", transaction_id="order-1", event_id="google:event-1",
    )
    assert first["changed"] is True
    assert ledger.receipt["refunded"] is True
    assert ledger.notifications == {"google:event-1"}
    assert writes == ["player-1"]

    again = gateway._apply_store_refund(
        provider="google_play", source="test", transaction_id="order-1", event_id="google:event-1",
    )
    assert again["duplicate"] is True
    assert writes == ["player-1"]

    missing = gateway._apply_store_refund(
        provider="google_play", source="test", transaction_id="unknown", event_id="google:missing",
    )
    assert missing == {"matched": False}
    assert "google:missing" not in ledger.notifications


def test_unmatched_provider_callback_requests_retry(monkeypatch):
    monkeypatch.setattr(gateway, "_apply_store_refund", lambda **_kwargs: {"matched": False})
    monkeypatch.setattr(gateway.platform_service, "store_notification_seen", lambda _event: False)
    with pytest.raises(HTTPException) as failure:
        gateway._handle_google_store_notification({
            "ignored": None,
            "voided": True,
            "test": False,
            "notification_id": "event-1",
            "order_id": "unknown",
            "purchase_token": "token",
        })
    assert failure.value.status_code == 503


def test_older_apple_refund_cannot_reverse_a_newer_reversal(monkeypatch):
    ledger = _Ledger()
    ledger.receipt["provider"] = "app_store"
    monkeypatch.setattr(ledger, "find_store_receipt", lambda *_args, **_kwargs: dict(ledger.receipt))
    monkeypatch.setattr(gateway, "platform_service", ledger)
    monkeypatch.setattr(gateway, "_store_economy_transaction", lambda _player: nullcontext())
    monkeypatch.setattr(gateway, "_existing_player_profile", lambda _player: object())
    monkeypatch.setattr(gateway, "revoke_purchase", lambda *_args, **_kwargs: {})
    monkeypatch.setattr(gateway, "restore_refunded_purchase", lambda *_args, **_kwargs: {})
    monkeypatch.setattr(gateway, "persist_player_data", lambda _player: None)
    monkeypatch.setattr(gateway, "store_refund_message", lambda *_args, **_kwargs: ("title", "body"))

    kwargs = {"provider": "app_store", "source": "test", "transaction_id": "order-1"}
    assert gateway._apply_store_refund(**kwargs, event_id="apple:refund", event_at_ms=100)["changed"]
    assert gateway._apply_store_refund(**kwargs, event_id="apple:reversal", event_at_ms=200, reversed_refund=True)["changed"]
    stale = gateway._apply_store_refund(**kwargs, event_id="apple:late-refund", event_at_ms=150)
    assert stale["stale"] is True
    assert ledger.receipt["refunded"] is False
    assert ledger.receipt["refund_event_at_ms"] == 200
