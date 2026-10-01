"""Mağaza iade mutabakatı (Beta.72 tur 16).

İade bildirimleri (Google Play RTDN, App Store Server Notifications V2)
kaçırılırsa iade edilen alımın ürünü oyuncuda kalırdı: sunucu mağazanın
yeniden deneme süresinden (birkaç gün) uzun kapalı kaldıysa, bildirim adresi
ya da imza ayarı yanlışsa. Bu yedek denetim mağazaların geçmiş kayıtlarını
düzenli okur:

- Google Play: Voided Purchases API (iade/iptal edilen tek seferlik alımlar).
- App Store: Get Notification History (``REFUND`` ve ``REFUND_REVERSED``).
  Gövdeler canlı bildirim gibi imza zinciriyle doğrulanır.

Kayıtlar canlı bildirimlerle aynı işleyiciden geçer; makbuz defteri ve işlenmiş
bildirim listesi aynı iadenin iki kez uygulanmasını önler. Apple'da aynı işlemin
birden çok kaydı varsa yalnız en yenisi uygulanır (iade geri çevrildiyse ürün
önce alınıp sonra geri verilmez). Her sağlayıcının kontrol noktası (son başarılı
pencerenin sonu) platform durumunda tutulur; sonraki pencere örtüşerek oradan
başlar. Hata olursa kontrol noktası ilerlemez, pencere sonraki koşuda yeniden
okunur. Belirteç ve makbuz içeriği loglanmaz. Kurulum: docs/STORE_PURCHASES.md.
"""

from __future__ import annotations

from datetime import datetime, timezone
import logging
import time

from .store_verification import StoreVerificationError


LOGGER = logging.getLogger("gridshard.store")

DAY_MS = 24 * 3600 * 1000
# İlk koşuda ve uzun kesintiden sonra en çok bu kadar geriye bakılır. Google
# 30 günden eski başlangıcı reddeder (Apple 180 gün tutar); saat farkına pay.
LOOKBACK_MS = 29 * DAY_MS
# Mağaza kaydı gecikebilir; pencereler örtüşür, tekrar okunan kayıt atlanır.
OVERLAP_MS = 6 * 3600 * 1000
# Google gelecekteki bitiş zamanını reddeder; sunucu saati ileride olabilir.
END_MARGIN_MS = 2 * 60 * 1000
APP_STORE_REFUND_TYPES = ("REFUND", "REFUND_REVERSED")


class ReconciliationStopped(Exception):
    """Sunucu kapanıyor; pencere yarıda bırakılır, kontrol noktası ilerlemez."""


def _iso(ms: int) -> str:
    return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).isoformat()


class StoreReconciler:
    """Kaçırılan iade bildirimlerini mağaza geçmişinden tamamlar.

    ``verifiers`` o anki ``StoreVerifiers`` nesnesini döndüren çağrılabilirdir
    (testler doğrulayıcıyı çalışırken değiştirir). ``state`` kontrol noktalarını
    tutar (``PlatformService``). İşleyiciler canlı bildirim uçlarıyla aynıdır:
    ``handle_google_voided(kayıt)`` ve ``handle_app_store_notification(görünüm,
    source=...)``; ikisi de ``changed`` alanı olan sözlük döndürür.
    """

    def __init__(
        self,
        *,
        verifiers,
        state,
        handle_google_voided,
        handle_app_store_notification,
        now_func=time.time,
    ):
        self._verifiers = verifiers
        self.state = state
        self.handle_google_voided = handle_google_voided
        self.handle_app_store_notification = handle_app_store_notification
        self.now = now_func
        self.last_report: dict = {}

    def enabled(self) -> bool:
        verifiers = self._verifiers()
        return verifiers.google_play is not None or verifiers.app_store is not None

    def last_runs(self) -> dict:
        """Sağlık görünümü: sağlayıcı başına son koşunun zamanı ve sonucu."""
        return {
            provider: {"ok": bool(result.get("ok")), "at": result.get("at", "")}
            for provider, result in self.last_report.items()
        }

    def run_once(self, *, should_stop=lambda: False) -> dict:
        verifiers = self._verifiers()
        report = {}
        for provider, verifier, reconcile in (
            ("google_play", verifiers.google_play, self._reconcile_google),
            ("app_store", verifiers.app_store, self._reconcile_app_store),
        ):
            if verifier is not None:
                report[provider] = self._run_provider(provider, verifier, reconcile, should_stop)
        self.last_report = report
        return report

    def _run_provider(self, provider: str, verifier, reconcile, should_stop) -> dict:
        """Tek sağlayıcının penceresini işler; hata yükseltmez, sonucu döndürür."""
        now_ms = int(self.now() * 1000)
        end_ms = now_ms - END_MARGIN_MS
        result = {"ok": False, "at": _iso(now_ms), "end_ms": end_ms, "seen": 0, "applied": 0}
        try:
            start_ms = now_ms - LOOKBACK_MS
            checkpoint = self.state.store_reconciliation_checkpoint(provider)
            if checkpoint:
                start_ms = max(start_ms, checkpoint - OVERLAP_MS)
            result["start_ms"] = start_ms
            if start_ms >= end_ms:
                # Saat geri alındıysa: okunacak yeni aralık yok.
                return {**result, "ok": True}
            seen, applied = reconcile(verifier, start_ms, end_ms, should_stop)
            # Kontrol noktası yalnız pencerenin bütün kayıtları işlenince ilerler.
            if should_stop():
                raise ReconciliationStopped()
            self.state.record_store_reconciliation(
                provider, checkpoint_ms=end_ms, at=result["at"], seen=seen, applied=applied
            )
        except ReconciliationStopped:
            return {**result, "error": "stopped"}
        except StoreVerificationError as exc:
            # Mağaza hata iletileri belirteç ya da makbuz taşımaz.
            LOGGER.warning("Store refund reconciliation failed (%s): %s", provider, exc)
            return {**result, "error": str(exc)}
        except Exception as exc:
            LOGGER.warning(
                "Store refund reconciliation failed (%s): %s", provider, type(exc).__name__
            )
            return {**result, "error": type(exc).__name__}
        if applied:
            LOGGER.info(
                "Store refund reconciliation applied %d missed refund change(s) (%s)",
                applied,
                provider,
            )
        return {**result, "ok": True, "seen": seen, "applied": applied}

    def _reconcile_google(self, verifier, start_ms: int, end_ms: int, should_stop) -> tuple[int, int]:
        voided = verifier.voided_purchases(start_ms, end_ms)
        applied = 0
        for item in sorted(voided, key=lambda entry: entry.get("voided_at_ms", 0)):
            if should_stop():
                raise ReconciliationStopped()
            if not item.get("order_id") and not item.get("purchase_token"):
                continue
            applied += bool(self.handle_google_voided(item).get("changed"))
        return len(voided), applied

    def _reconcile_app_store(self, verifier, start_ms: int, end_ms: int, should_stop) -> tuple[int, int]:
        latest: dict[str, dict] = {}
        seen = 0
        for kind in APP_STORE_REFUND_TYPES:
            for signed in verifier.notification_history(start_ms, end_ms, notification_type=kind):
                if should_stop():
                    raise ReconciliationStopped()
                seen += 1
                try:
                    view = verifier.verify_notification(signed)
                except StoreVerificationError:
                    # Do not advance the checkpoint past an unverified refund.
                    LOGGER.warning("App Store notification history item failed verification")
                    raise
                transaction_id = view.get("transaction_id")
                if view.get("ignored") or not transaction_id or view.get("type") not in APP_STORE_REFUND_TYPES:
                    continue
                current = latest.get(transaction_id)
                if current is None or view.get("signed_date", 0) >= current.get("signed_date", 0):
                    latest[transaction_id] = view
        applied = 0
        for view in sorted(latest.values(), key=lambda item: item.get("signed_date", 0)):
            if should_stop():
                raise ReconciliationStopped()
            result = self.handle_app_store_notification(view, source="app_store_history")
            applied += bool(result.get("changed"))
        return seen, applied

