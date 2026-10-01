"""Beta.72 tur 16: iade mutabakatı.

İade bildirimi kaçırılırsa iadeler Google Play Voided Purchases API ve App Store
bildirim geçmişinden okunur. Ağ yoktur: mağaza uçları sahte HTTP istemcisiyle,
mutabakattaki doğrulayıcılar sahte nesnelerle taklit edilir.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
from types import SimpleNamespace
from urllib.parse import parse_qs, urlsplit

import pytest
from cryptography.hazmat.primitives.asymmetric import ec, rsa

from app.platform_services import PlatformService
from app.store_catalog import store_account_token
from app.store_reconciliation import END_MARGIN_MS, LOOKBACK_MS, OVERLAP_MS, StoreReconciler
from app.store_verification import (
    AppStoreVerifier,
    GooglePlayVerifier,
    StoreVerificationError,
    VerifiedPurchase,
)

NOW = 1_790_000_000.0
NOW_MS = int(NOW * 1000)


class FakeResponse:
    def __init__(self, status_code: int, payload: dict | None = None):
        self.status_code = status_code
        self._payload = payload or {}
        self.headers = {}

    def json(self):
        return self._payload


class FakeClient:
    def __init__(self, handler):
        self.handler = handler
        self.calls = []

    def get(self, url, **kwargs):
        self.calls.append(("GET", url, kwargs.get("json")))
        return self.handler("GET", url, kwargs.get("json"))

    def post(self, url, **kwargs):
        self.calls.append(("POST", url, kwargs.get("json")))
        return self.handler("POST", url, kwargs.get("json"))


# --- Mağaza uçları ---------------------------------------------------------------

def _google(handler):
    def with_token(method, url, body):
        if "oauth2.googleapis.com/token" in url:
            return FakeResponse(200, {"access_token": "token", "expires_in": 3600})
        return handler(method, url, body)

    client = FakeClient(with_token)
    verifier = GooglePlayVerifier(
        package_name="com.gridshard.app",
        email="store@example.iam.gserviceaccount.com",
        key=rsa.generate_private_key(public_exponent=65537, key_size=2048),
        client=client,
        now_func=lambda: NOW,
    )
    return verifier, client


def test_google_voided_purchases_are_read_page_by_page():
    def handler(_method, url, _body):
        if "token" not in parse_qs(urlsplit(url).query):
            return FakeResponse(200, {
                "voidedPurchases": [{
                    "orderId": "GPA.v-1",
                    "purchaseToken": "tok-1",
                    "voidedTimeMillis": "1789990000000",
                    "voidedSource": 0,
                    "voidedReason": 1,
                }],
                "tokenPagination": {"nextPageToken": "page-2"},
            })
        return FakeResponse(200, {"voidedPurchases": [
            {"orderId": "GPA.v-2", "purchaseToken": "tok-2", "voidedTimeMillis": "bozuk"},
        ]})

    verifier, client = _google(handler)
    voided = verifier.voided_purchases(NOW_MS - 1000, NOW_MS)
    assert [item["order_id"] for item in voided] == ["GPA.v-1", "GPA.v-2"]
    assert voided[0]["voided_at_ms"] == 1_789_990_000_000
    assert voided[0]["reason"] == 1
    assert voided[1]["voided_at_ms"] == 0
    urls = [url for _method, url, _body in client.calls if "voidedpurchases" in url]
    assert all("/applications/com.gridshard.app/purchases/voidedpurchases?" in url for url in urls)
    first, second = (parse_qs(urlsplit(url).query) for url in urls)
    assert first["startTime"] == [str(NOW_MS - 1000)]
    assert first["endTime"] == [str(NOW_MS)]
    # Yalnız tek seferlik ürünler; abonelik yok.
    assert first["type"] == ["0"]
    assert second["token"] == ["page-2"]


@pytest.mark.parametrize("status", [401, 403, 429, 500])
def test_google_voided_purchase_errors_are_retryable(status):
    verifier, _client = _google(lambda *_args: FakeResponse(status))
    with pytest.raises(StoreVerificationError) as error:
        verifier.voided_purchases(NOW_MS - 1000, NOW_MS)
    assert error.value.retryable is True


def test_store_history_is_never_truncated_silently():
    # Sayfa sınırında kesilen liste kontrol noktasını ilerletip kalan iadeleri
    # kaybettirirdi; hata olarak döner, pencere yeniden okunur.
    verifier, _client = _google(lambda *_args: FakeResponse(200, {
        "voidedPurchases": [], "tokenPagination": {"nextPageToken": "again"},
    }))
    with pytest.raises(StoreVerificationError, match="beklenenden uzun"):
        verifier.voided_purchases(NOW_MS - 1000, NOW_MS)
    apple, _client = _app_store(lambda *_args: FakeResponse(200, {
        "notificationHistory": [], "hasMore": True, "paginationToken": "again",
    }))
    with pytest.raises(StoreVerificationError, match="beklenenden uzun"):
        apple.notification_history(NOW_MS - 1000, NOW_MS, notification_type="REFUND")


def _app_store(handler):
    client = FakeClient(handler)
    verifier = AppStoreVerifier(
        issuer_id="12345678-1234-1234-1234-123456789012",
        key_id="ABCDEFGHIJ",
        key=ec.generate_private_key(ec.SECP256R1()),
        bundle_id="com.gridshard.app",
        environment="production",
        root_certificates=[],
        client=client,
        now_func=lambda: NOW,
    )
    return verifier, client


def test_app_store_notification_history_is_read_page_by_page():
    def handler(_method, url, _body):
        if "paginationToken=" not in url:
            return FakeResponse(200, {
                "notificationHistory": [{"signedPayload": "jws-1", "sendAttempts": []}],
                "hasMore": True,
                "paginationToken": "p2",
            })
        return FakeResponse(200, {"notificationHistory": [{"signedPayload": "jws-2"}], "hasMore": False})

    verifier, client = _app_store(handler)
    assert verifier.notification_history(NOW_MS - 1000, NOW_MS, notification_type="REFUND") == ["jws-1", "jws-2"]
    (first_method, first_url, first_body), (_method, second_url, second_body) = client.calls
    assert first_method == "POST"
    assert first_url == "https://api.storekit.itunes.apple.com/inApps/v1/notifications/history"
    assert second_url == first_url + "?paginationToken=p2"
    assert first_body == second_body == {
        "startDate": NOW_MS - 1000,
        "endDate": NOW_MS,
        "notificationType": "REFUND",
    }


@pytest.mark.parametrize("status", [401, 429, 500])
def test_app_store_history_errors_are_retryable(status):
    verifier, _client = _app_store(lambda *_args: FakeResponse(status))
    with pytest.raises(StoreVerificationError) as error:
        verifier.notification_history(NOW_MS - 1000, NOW_MS, notification_type="REFUND")
    assert error.value.retryable is True


# --- Mutabakat ---------------------------------------------------------------------

class _FakeGoogleStore:
    def __init__(self, voided=(), error=None):
        self.voided = [dict(item) for item in voided]
        self.error = error
        self.windows = []

    def voided_purchases(self, start_ms, end_ms):
        self.windows.append((start_ms, end_ms))
        if self.error is not None:
            raise self.error
        return [dict(item) for item in self.voided]


class _FakeAppStore:
    """Bildirim geçmişi imzalı gövde yerine JSON taşır; doğrulama onu çözer."""

    def __init__(self, notifications=()):
        self.notifications = [dict(item) for item in notifications]
        self.windows = []

    def notification_history(self, start_ms, end_ms, *, notification_type):
        self.windows.append((start_ms, end_ms, notification_type))
        return [json.dumps(item) for item in self.notifications if item["type"] == notification_type]

    def verify_notification(self, signed):
        view = json.loads(signed)
        if view.get("forged"):
            raise StoreVerificationError("App Store işlem imzası doğrulanamadı.")
        return {
            "subtype": "",
            "store_product_id": "",
            "account_token": "",
            "revoked": view["type"] == "REFUND",
            "ignored": "",
            **view,
        }


def _apple_view(uuid, kind, transaction_id, signed_date, **extra):
    return {
        "notification_id": uuid,
        "type": kind,
        "transaction_id": transaction_id,
        "signed_date": signed_date,
        **extra,
    }


class _Clock:
    def __init__(self, now):
        self.now = now

    def __call__(self):
        return self.now


def _reconciler(tmp_path, *, google=None, app_store=None, clock=None):
    state = PlatformService(tmp_path / "platform.json", now_func=lambda: NOW)
    handled = {"google": [], "apple": []}

    def handle_google(item):
        handled["google"].append(item["order_id"])
        return {"ok": True, "changed": True}

    def handle_apple(view, *, source):
        handled["apple"].append((view["notification_id"], source))
        return {"ok": True, "changed": True}

    reconciler = StoreReconciler(
        verifiers=lambda: SimpleNamespace(google_play=google, app_store=app_store),
        state=state,
        handle_google_voided=handle_google,
        handle_app_store_notification=handle_apple,
        now_func=clock or (lambda: NOW),
    )
    return reconciler, state, handled


def test_reconciliation_window_starts_from_the_checkpoint_with_overlap(tmp_path):
    clock = _Clock(NOW)
    google = _FakeGoogleStore([{"order_id": "GPA.w-1", "purchase_token": "tok-w1", "voided_at_ms": NOW_MS - 5000}])
    reconciler, state, handled = _reconciler(tmp_path, google=google, clock=clock)
    assert reconciler.enabled() is True
    report = reconciler.run_once()
    assert report["google_play"]["ok"] is True
    assert report["google_play"]["applied"] == 1
    # İlk koşu: Google'ın 30 günlük sınırının içinde kalan en uzun pencere.
    assert google.windows[0] == (NOW_MS - LOOKBACK_MS, NOW_MS - END_MARGIN_MS)
    assert state.store_reconciliation_checkpoint("google_play") == NOW_MS - END_MARGIN_MS
    assert handled["google"] == ["GPA.w-1"]
    clock.now = NOW + 1800
    reconciler.run_once()
    # Sonraki koşu kontrol noktasından örtüşerek başlar.
    assert google.windows[1] == (
        NOW_MS - END_MARGIN_MS - OVERLAP_MS,
        NOW_MS + 1_800_000 - END_MARGIN_MS,
    )
    assert state.store_reconciliation_checkpoint("google_play") == NOW_MS + 1_800_000 - END_MARGIN_MS
    # Sağlık görünümü yalnız son koşunun zamanını ve sonucunu verir.
    assert reconciler.last_runs() == {"google_play": {
        "ok": True,
        "at": datetime.fromtimestamp(NOW + 1800, tz=timezone.utc).isoformat(),
    }}


def test_failed_reconciliation_keeps_the_checkpoint(tmp_path):
    google = _FakeGoogleStore(error=StoreVerificationError(
        "Google Play iade listesine şu anda ulaşılamıyor.", retryable=True
    ))
    reconciler, state, _handled = _reconciler(tmp_path, google=google)
    report = reconciler.run_once()
    assert report["google_play"]["ok"] is False
    assert "ulaşılamıyor" in report["google_play"]["error"]
    assert state.store_reconciliation_checkpoint("google_play") == 0
    assert reconciler.last_runs()["google_play"]["ok"] is False
    # Aynı pencere sonraki koşuda yeniden okunur.
    google.error = None
    assert reconciler.run_once()["google_play"]["ok"] is True
    assert google.windows[0] == google.windows[1]
    assert state.store_reconciliation_checkpoint("google_play") == NOW_MS - END_MARGIN_MS


def test_handler_failure_and_shutdown_do_not_advance_the_checkpoint(tmp_path):
    google = _FakeGoogleStore([{"order_id": "GPA.s-1", "purchase_token": "", "voided_at_ms": 1}])
    reconciler, state, handled = _reconciler(tmp_path, google=google)

    def broken(_item):
        raise OSError("disk")

    healthy = reconciler.handle_google_voided
    reconciler.handle_google_voided = broken
    report = reconciler.run_once()["google_play"]
    assert report["ok"] is False
    assert report["error"] == "OSError"
    reconciler.handle_google_voided = healthy
    # Sunucu kapanıyor: kayıt işlenmeden durur.
    assert reconciler.run_once(should_stop=lambda: True)["google_play"]["error"] == "stopped"
    assert handled["google"] == []
    assert state.store_reconciliation_checkpoint("google_play") == 0


def test_app_store_history_applies_only_the_latest_notification_per_transaction(tmp_path):
    app_store = _FakeAppStore([
        _apple_view("uuid-refund", "REFUND", "2000000001", 1_000),
        _apple_view("uuid-reversed", "REFUND_REVERSED", "2000000001", 2_000),
        _apple_view("uuid-only", "REFUND", "2000000002", 1_500),
        _apple_view("uuid-other-app", "REFUND", "2000000003", 1_600, ignored="bundle"),
    ])
    reconciler, _state, handled = _reconciler(tmp_path, app_store=app_store)
    report = reconciler.run_once()
    assert report["app_store"]["ok"] is True
    assert report["app_store"]["seen"] == 4
    # İade geri çevrildiyse ürün önce alınıp sonra geri verilmez; imza zamanı sırası.
    assert handled["apple"] == [
        ("uuid-only", "app_store_history"),
        ("uuid-reversed", "app_store_history"),
    ]
    assert sorted(window[2] for window in app_store.windows) == ["REFUND", "REFUND_REVERSED"]


def test_unverified_app_store_history_does_not_advance_checkpoint(tmp_path):
    app_store = _FakeAppStore([
        _apple_view("uuid-forged", "REFUND", "2000000004", 1_700, forged=True),
    ])
    reconciler, state, handled = _reconciler(tmp_path, app_store=app_store)
    report = reconciler.run_once()
    assert report["app_store"]["ok"] is False
    assert state.store_reconciliation_checkpoint("app_store") == 0
    assert handled["apple"] == []


def test_platform_state_keeps_newest_refund_event_and_checkpoint(tmp_path):
    platform = PlatformService(tmp_path / "platform.json", now_func=lambda: NOW)
    platform.record_store_receipt(
        "app_store:1", player_id="p-1", receipt={"provider": "app_store", "transaction_id": "1"}
    )
    platform.mark_store_receipt_refunded("app_store:1", refunded=True, source="a", at="t1", event_at_ms=2_000)
    platform.mark_store_receipt_refunded("app_store:1", refunded=True, source="b", at="t2", event_at_ms=1_000)
    entry = platform.store_receipt("app_store:1")
    assert entry["refund_event_at_ms"] == 2_000
    # İade geçmişine yalnız durum değişimi yazılır.
    assert [item["source"] for item in entry["refund_history"]] == ["a"]
    assert platform.store_reconciliation_checkpoint("google_play") == 0
    platform.record_store_reconciliation("google_play", checkpoint_ms=5_000, at="x", seen=3, applied=1)
    platform.record_store_reconciliation("google_play", checkpoint_ms=4_000, at="y", seen=0, applied=0)
    assert platform.store_reconciliation_checkpoint("google_play") == 5_000
    assert platform.store_reconciliation_checkpoint("app_store") == 0


# --- Sunucu (uç noktalar ve gerçek işleyiciler) ---------------------------------

class _StubVerifiers:
    admob = None
    google_notifications = None

    def __init__(self, verified):
        self.verified = verified
        self.google_play = None
        self.app_store = None

    def verify_purchase(self, provider, store_product_id, *, transaction_id, purchase_token):
        return self.verified

    def platform_view(self):
        return {
            "purchase_platforms": {"google_play": True, "app_store": True},
            "ad_platforms": {"admob": False},
            "ad_units": {},
        }


def test_missed_google_refund_is_applied_once_by_reconciliation(monkeypatch):
    from fastapi.testclient import TestClient

    from app import main as gateway

    client = TestClient(gateway.app)
    player = "reconcile-google"
    purchase_token = "tok_" + "m" * 40
    stub = _StubVerifiers(VerifiedPurchase(
        provider="google_play",
        transaction_id="GPA.missed-1",
        store_product_id="gridshard.flux_1050",
        environment="production",
        purchase_token=purchase_token,
        account_token=store_account_token(player),
    ))
    monkeypatch.setattr(gateway, "STORE_VERIFIERS", stub)
    assert client.post(f"/store/{player}/purchases", json={
        "product_id": "flux_1050",
        "provider": "google_play",
        "transaction_id": "GPA.missed-1",
        "purchase_token": purchase_token,
    }).status_code == 200
    profile = gateway.player_profile_service.get(player)
    after_purchase = profile.flux_shards

    # RTDN hiç gelmedi; iade Google'ın iptal edilen alımlar listesinde.
    stub.google_play = _FakeGoogleStore([{
        "order_id": "GPA.missed-1",
        "purchase_token": purchase_token,
        "voided_at_ms": NOW_MS,
        "source": 0,
        "reason": 1,
    }])
    report = gateway.store_reconciler.run_once()
    assert report["google_play"]["ok"] is True
    assert report["google_play"]["applied"] == 1
    assert profile.flux_shards == after_purchase - 1050
    # Örtüşen pencere aynı kaydı yeniden okur; ikinci kez düşülmez.
    assert gateway.store_reconciler.run_once()["google_play"]["applied"] == 0
    assert profile.flux_shards == after_purchase - 1050
    entry = gateway.platform_service.store_receipt("google_play:GPA.missed-1")
    assert entry["refunded"] is True
    assert entry["refund_history"][-1]["source"] == "google_voided_purchases"


def test_app_store_refunds_follow_the_newest_notification(monkeypatch):
    from fastapi.testclient import TestClient

    from app import main as gateway

    client = TestClient(gateway.app)
    player = "reconcile-apple"
    stub = _StubVerifiers(None)
    monkeypatch.setattr(gateway, "STORE_VERIFIERS", stub)

    def buy(transaction_id):
        stub.verified = VerifiedPurchase(
            provider="app_store",
            transaction_id=transaction_id,
            store_product_id="gridshard.credits_9000",
            environment="production",
            account_token=store_account_token(player),
        )
        assert client.post(f"/store/{player}/purchases", json={
            "product_id": "credits_9000",
            "provider": "app_store",
            "transaction_id": transaction_id,
        }).status_code == 200

    buy("2000000777")
    buy("2000000778")
    profile = gateway.player_profile_service.get(player)
    credits = profile.circuit_credits

    # Canlı uç: iadenin geri çevrilmesi önce geldi, eski REFUND yeniden
    # denemeyle sonra. Eski bildirim ürünü yeniden almaz.
    refund = _apple_view("uuid-r-777", "REFUND", "2000000777", NOW_MS)
    reversed_refund = _apple_view("uuid-rr-777", "REFUND_REVERSED", "2000000777", NOW_MS + 60_000)
    stub.app_store = _FakeAppStore([refund, reversed_refund])
    first = client.post("/billing/app-store/notifications", json={"signedPayload": json.dumps(reversed_refund)})
    assert first.json()["changed"] is False
    late = client.post("/billing/app-store/notifications", json={"signedPayload": json.dumps(refund)})
    assert late.json()["stale"] is True
    assert profile.circuit_credits == credits

    # Mutabakat aynı kayıtları okur: ikisi de işlenmiş, oyuncu ürününü korur.
    report = gateway.store_reconciler.run_once()
    assert report["app_store"]["ok"] is True
    assert report["app_store"]["applied"] == 0
    assert profile.circuit_credits == credits

    # Hiç gelmeyen REFUND geçmişten uygulanır; sonra gelen geri çevirme ürünü geri verir.
    missed = _apple_view("uuid-r-778", "REFUND", "2000000778", NOW_MS + 120_000)
    stub.app_store = _FakeAppStore([refund, reversed_refund, missed])
    assert gateway.store_reconciler.run_once()["app_store"]["applied"] == 1
    assert profile.circuit_credits == credits - 9000
    assert gateway.platform_service.store_receipt("app_store:2000000778")["refund_history"][-1]["source"] == (
        "app_store_history"
    )
    stub.app_store = _FakeAppStore([
        refund,
        reversed_refund,
        missed,
        _apple_view("uuid-rr-778", "REFUND_REVERSED", "2000000778", NOW_MS + 180_000),
    ])
    assert gateway.store_reconciler.run_once()["app_store"]["applied"] == 1
    assert profile.circuit_credits == credits


def test_reconciliation_interval_is_parsed_from_the_environment(monkeypatch):
    from app import main as gateway

    for raw, expected in (("", 1800.0), ("0", 0.0), ("-5", 0.0), ("60", 300.0), ("3600", 3600.0)):
        monkeypatch.setenv("GRIDSHARD_STORE_RECONCILE_INTERVAL_SECONDS", raw)
        assert gateway._store_reconcile_interval_seconds() == expected
    monkeypatch.setenv("GRIDSHARD_STORE_RECONCILE_INTERVAL_SECONDS", "yarım saat")
    with pytest.raises(RuntimeError):
        gateway._store_reconcile_interval_seconds()

