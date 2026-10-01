"""Gerçek mağaza makbuzu ve ödüllü reklam doğrulaması (Beta.72 tur 10).

- Google Play: Android Publisher API v3 ``purchases.products`` ile satın alma
  belirteci doğrulanır. Ürün teslim edilip kaydedildikten sonra belirteç
  tüketilir; hak (sezon geçişi, Savaş Premium, para birimi) sunucuda tutulduğu
  için bütün ürünler mağazada tüketilebilir kayıtlıdır.
- App Store: App Store Server API ``/inApps/v1/transactions/{id}`` ile işlem
  bilgisi alınır. İmzalı işlem (JWS) ancak x5c zinciri yapılandırılmış Apple
  kök sertifikasına kadar doğrulanırsa kabul edilir.
- AdMob: ödüllü reklam sunucu doğrulaması (SSV) geri çağrısının ECDSA imzası
  Google'ın yayımladığı doğrulama anahtarlarıyla denetlenir.
- İade/iptal bildirimleri: Google Play gerçek zamanlı geliştirici bildirimleri
  (Pub/Sub itme; Google'ın imzaladığı OIDC belirteciyle) ve App Store Server
  Notifications V2 (aynı Apple zinciriyle imzalı JWS).

Doğrulayıcılar ortam değişkenleriyle açılır. Değişken yoksa doğrulayıcı da
yoktur ve ilgili sağlayıcı reddedilir; yapılandırma hatalıysa sunucu açılmaz.
Anahtar, belirteç ve makbuz içeriği loglanmaz. Kurulum: docs/STORE_PURCHASES.md.
"""

from __future__ import annotations

import base64
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import logging
import os
from pathlib import Path
import re
import time
from urllib.parse import parse_qs, quote, urlencode


LOGGER = logging.getLogger("gridshard.store")

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher"
GOOGLE_PUBLISHER_BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications"
APP_STORE_HOSTS = {
    "production": "https://api.storekit.itunes.apple.com",
    "sandbox": "https://api.storekit-sandbox.itunes.apple.com",
}
# Apple sertifika uzantıları: işlem imzalayan yaprak ve WWDR ara sertifika.
APPLE_LEAF_OID = "1.2.840.113635.100.6.11.1"
APPLE_INTERMEDIATE_OID = "1.2.840.113635.100.6.2.1"
ADMOB_KEYS_URL = "https://www.gstatic.com/admob/reward/verifier-keys.json"
# Pub/Sub itme isteklerindeki OIDC belirtecini imzalayan Google anahtarları.
GOOGLE_OIDC_CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_OIDC_ISSUERS = frozenset({"https://accounts.google.com", "accounts.google.com"})
GOOGLE_OIDC_KEYS_TTL_SECONDS = 3600
ADMOB_KEYS_TTL_SECONDS = 24 * 3600
# SSV geri çağrısı ödülden hemen sonra gelir; eski imzalı istekler kabul edilmez.
ADMOB_CALLBACK_MAX_AGE_SECONDS = 3600


class StoreVerificationError(ValueError):
    """Makbuz reddi.

    ``retryable`` geçici durumları (mağazaya ulaşılamıyor, sunucunun mağaza
    yetkisi, bekleyen ödeme) ayırır: istemci alımı onaylamadan saklar ve
    yeniden gönderir; kalıcı retlerde Google onaylanmamış alımı iade eder.
    """

    def __init__(self, message: str, *, retryable: bool = False):
        super().__init__(message)
        self.retryable = retryable


@dataclass(frozen=True)
class VerifiedPurchase:
    provider: str
    transaction_id: str
    store_product_id: str
    environment: str
    purchase_token: str = ""
    consumed: bool = False
    # Ödeme penceresinde alıma bağlanan hesap belirteci (Google
    # obfuscatedExternalAccountId, Apple appAccountToken); mağaza imzalı
    # verisinden okunur. Sunucu bunu oyuncunun belirteciyle karşılaştırır.
    account_token: str = ""


def _b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _jwt(header: dict, claims: dict, key, *, elliptic: bool) -> str:
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import ec, padding, utils

    message = ".".join(
        _b64url(json.dumps(part, separators=(",", ":")).encode("utf-8"))
        for part in (header, claims)
    )
    if elliptic:
        der = key.sign(message.encode("ascii"), ec.ECDSA(hashes.SHA256()))
        r_value, s_value = utils.decode_dss_signature(der)
        signature = r_value.to_bytes(32, "big") + s_value.to_bytes(32, "big")
    else:
        signature = key.sign(message.encode("ascii"), padding.PKCS1v15(), hashes.SHA256())
    return f"{message}.{_b64url(signature)}"


def _json(response) -> dict:
    try:
        payload = response.json()
    except (ValueError, UnicodeError):
        return {}
    return payload if isinstance(payload, dict) else {}


def _int(value) -> int:
    try:
        return int(value or 0)
    except (TypeError, ValueError):
        return 0


def _http_client():
    import httpx

    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    return httpx.Client(timeout=10, follow_redirects=False)


class GooglePlayVerifier:
    """Android Publisher API ile tek seferlik ürün satın alma doğrulaması."""

    def __init__(self, *, package_name: str, email: str, key, client, now_func=time.time):
        self.package_name = package_name
        self.email = email
        self.key = key
        self.client = client
        self.now = now_func
        self._token = ("", 0)

    @classmethod
    def from_environment(cls, client_factory=_http_client):
        package_name = os.environ.get("GRIDSHARD_GOOGLE_PLAY_PACKAGE_NAME", "").strip()
        service_file = os.environ.get("GRIDSHARD_GOOGLE_PLAY_SERVICE_ACCOUNT_FILE", "").strip()
        if not package_name and not service_file:
            return None
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import rsa

        try:
            if not re.fullmatch(r"[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+", package_name):
                raise ValueError("package")
            service = json.loads(Path(service_file).read_text(encoding="utf-8"))
            key = serialization.load_pem_private_key(service["private_key"].encode("utf-8"), password=None)
            if (
                service.get("type") != "service_account"
                or not isinstance(key, rsa.RSAPrivateKey)
                or not service.get("client_email")
            ):
                raise ValueError("service account")
        except (OSError, ValueError, KeyError, TypeError):
            raise ValueError(
                "Google Play doğrulama yapılandırması geçersiz; docs/STORE_PURCHASES.md belgesine bakın."
            ) from None
        return cls(package_name=package_name, email=service["client_email"], key=key, client=client_factory())

    def _access_token(self) -> str:
        now = int(self.now())
        token, expires = self._token
        if token and expires > now + 60:
            return token
        assertion = _jwt(
            {"alg": "RS256", "typ": "JWT"},
            {
                "iss": self.email,
                "scope": GOOGLE_PUBLISHER_SCOPE,
                "aud": GOOGLE_TOKEN_URL,
                "iat": now,
                "exp": now + 3600,
            },
            self.key,
            elliptic=False,
        )
        response = self.client.post(GOOGLE_TOKEN_URL, data={
            "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
            "assertion": assertion,
        })
        payload = _json(response)
        if response.status_code != 200 or not payload.get("access_token"):
            raise StoreVerificationError("Google Play doğrulama yetkisi alınamadı.", retryable=True)
        self._token = (payload["access_token"], now + int(payload.get("expires_in", 3600)))
        return payload["access_token"]

    def _purchase_url(self, store_product_id: str, purchase_token: str, action: str = "") -> str:
        return (
            f"{GOOGLE_PUBLISHER_BASE}/{quote(self.package_name, safe='')}"
            f"/purchases/products/{quote(store_product_id, safe='')}"
            f"/tokens/{quote(purchase_token, safe='')}{action}"
        )

    def verify(self, store_product_id: str, purchase_token: str) -> VerifiedPurchase:
        purchase_token = str(purchase_token or "").strip()
        if not re.fullmatch(r"[A-Za-z0-9._:\-]{16,4096}", purchase_token):
            raise StoreVerificationError("Google Play satın alma belirteci geçersiz.")
        try:
            response = self.client.get(
                self._purchase_url(store_product_id, purchase_token),
                headers={"Authorization": f"Bearer {self._access_token()}"},
            )
        except StoreVerificationError:
            raise
        except Exception:
            raise StoreVerificationError(
                "Google Play doğrulamasına şu anda ulaşılamıyor.", retryable=True
            ) from None
        if response.status_code in {401, 403}:
            self._token = ("", 0)
            raise StoreVerificationError(
                "Google Play doğrulaması yetkisiz; hizmet hesabı izinlerini denetleyin.",
                retryable=True,
            )
        if response.status_code in {400, 404, 410}:
            raise StoreVerificationError("Google Play satın alması bulunamadı.")
        if response.status_code != 200:
            raise StoreVerificationError(
                "Google Play doğrulamasına şu anda ulaşılamıyor.", retryable=True
            )
        payload = _json(response)
        purchase_state = int(payload.get("purchaseState", -1))
        if purchase_state == 2:
            # Nakit gibi bekleyen ödeme: tamamlanınca istemci yeniden gönderir.
            raise StoreVerificationError(
                "Google Play ödemesi henüz tamamlanmadı; tamamlanınca ürün verilir.",
                retryable=True,
            )
        if purchase_state != 0:
            raise StoreVerificationError("Google Play satın alması tamamlanmamış ya da iptal edilmiş.")
        order_id = str(payload.get("orderId") or "").strip()
        transaction_id = order_id or "token-" + hashlib.sha256(purchase_token.encode("utf-8")).hexdigest()[:40]
        # purchaseType 0: lisans testi (gerçek ücret alınmaz).
        environment = "test" if payload.get("purchaseType") == 0 else "production"
        return VerifiedPurchase(
            provider="google_play",
            transaction_id=transaction_id,
            store_product_id=store_product_id,
            environment=environment,
            purchase_token=purchase_token,
            consumed=int(payload.get("consumptionState", 0)) == 1,
            account_token=str(payload.get("obfuscatedExternalAccountId") or "").strip().lower(),
        )

    def voided_purchases(self, start_ms: int, end_ms: int) -> list[dict]:
        """Voided Purchases API: aralıkta iade/iptal edilen tek seferlik alımlar.

        API en çok 30 gün geriye bakar ve sayfalıdır (sayfa boyu Google'ın
        varsayılanı). Ağ ya da yetki hatası geçicidir (`retryable`); mutabakat
        kontrol noktasını ilerletmez.
        """
        voided: list[dict] = []
        page_token = ""
        for _page in range(50):
            # type 0: yalnız tek seferlik ürünler (abonelik yok).
            params = {
                "startTime": str(int(start_ms)),
                "endTime": str(int(end_ms)),
                "type": "0",
            }
            if page_token:
                params["token"] = page_token
            url = (
                f"{GOOGLE_PUBLISHER_BASE}/{quote(self.package_name, safe='')}"
                f"/purchases/voidedpurchases?{urlencode(params)}"
            )
            try:
                response = self.client.get(
                    url, headers={"Authorization": f"Bearer {self._access_token()}"}
                )
            except StoreVerificationError:
                raise
            except Exception:
                raise StoreVerificationError(
                    "Google Play iade listesine şu anda ulaşılamıyor.", retryable=True
                ) from None
            if response.status_code in {401, 403}:
                self._token = ("", 0)
                raise StoreVerificationError(
                    "Google Play iade listesi yetkisiz; hizmet hesabı izinlerini denetleyin.",
                    retryable=True,
                )
            if response.status_code != 200:
                raise StoreVerificationError(
                    "Google Play iade listesine şu anda ulaşılamıyor.", retryable=True
                )
            payload = _json(response)
            for item in payload.get("voidedPurchases") or []:
                if not isinstance(item, dict):
                    continue
                voided.append({
                    "order_id": str(item.get("orderId") or "").strip(),
                    "purchase_token": str(item.get("purchaseToken") or "").strip(),
                    "voided_at_ms": _int(item.get("voidedTimeMillis")),
                    # 0 kullanıcı, 1 geliştirici, 2 Google; 0–8 iade nedeni.
                    "source": _int(item.get("voidedSource")),
                    "reason": _int(item.get("voidedReason")),
                })
            pagination = payload.get("tokenPagination")
            page_token = str((pagination if isinstance(pagination, dict) else {}).get("nextPageToken") or "")
            if not page_token:
                break
        else:
            # Kayıt kesilirse kontrol noktası ilerleyip kalan iadeler kaybolurdu.
            raise StoreVerificationError("Google Play iade listesi beklenenden uzun.", retryable=True)
        return voided

    def consume(self, verified: VerifiedPurchase) -> bool:
        """Teslim edilip kaydedilen alımı tüketir; tekrar satın almayı açar."""
        if verified.consumed:
            return True
        try:
            response = self.client.post(
                self._purchase_url(verified.store_product_id, verified.purchase_token, ":consume"),
                headers={"Authorization": f"Bearer {self._access_token()}"},
            )
        except Exception:
            LOGGER.warning("Google Play tüketimi yapılamadı; istemci yeniden deneyecek.")
            return False
        return 200 <= response.status_code < 300


class AppStoreVerifier:
    """App Store Server API ile işlem doğrulaması (StoreKit 2)."""

    def __init__(
        self,
        *,
        issuer_id: str,
        key_id: str,
        key,
        bundle_id: str,
        environment: str,
        root_certificates: list[bytes],
        client,
        now_func=time.time,
    ):
        self.issuer_id = issuer_id
        self.key_id = key_id
        self.key = key
        self.bundle_id = bundle_id
        self.environment = environment
        self.root_certificates = list(root_certificates)
        self.client = client
        self.now = now_func
        self._bearer = ("", 0)

    @classmethod
    def from_environment(cls, client_factory=_http_client):
        issuer = os.environ.get("GRIDSHARD_APP_STORE_ISSUER_ID", "").strip()
        key_id = os.environ.get("GRIDSHARD_APP_STORE_KEY_ID", "").strip()
        key_file = os.environ.get("GRIDSHARD_APP_STORE_PRIVATE_KEY_FILE", "").strip()
        bundle_id = os.environ.get("GRIDSHARD_APP_STORE_BUNDLE_ID", "").strip()
        # Boş değer (ör. .env.example kopyası) varsayılan üretim ortamıdır.
        environment = (
            os.environ.get("GRIDSHARD_APP_STORE_ENVIRONMENT", "").strip().lower()
            or "production"
        )
        roots = [
            item.strip()
            for item in os.environ.get("GRIDSHARD_APPLE_ROOT_CA_FILES", "").split(",")
            if item.strip()
        ]
        if not any((issuer, key_id, key_file, bundle_id, roots)):
            return None
        from cryptography import x509
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import ec

        try:
            if (
                not re.fullmatch(r"[0-9a-fA-F-]{36}", issuer)
                or not re.fullmatch(r"[A-Z0-9]{10}", key_id)
                or not re.fullmatch(r"[A-Za-z0-9.-]{3,255}", bundle_id)
                or environment not in APP_STORE_HOSTS
                or not roots
            ):
                raise ValueError("config")
            key = serialization.load_pem_private_key(Path(key_file).read_bytes(), password=None)
            if not isinstance(key, ec.EllipticCurvePrivateKey) or not isinstance(key.curve, ec.SECP256R1):
                raise ValueError("key")
            root_certificates = []
            for path in roots:
                raw = Path(path).read_bytes()
                certificate = (
                    x509.load_pem_x509_certificate(raw)
                    if raw.lstrip().startswith(b"-----BEGIN")
                    else x509.load_der_x509_certificate(raw)
                )
                root_certificates.append(certificate.public_bytes(serialization.Encoding.DER))
        except (OSError, ValueError, TypeError):
            raise ValueError(
                "App Store doğrulama yapılandırması geçersiz; docs/STORE_PURCHASES.md belgesine bakın."
            ) from None
        return cls(
            issuer_id=issuer,
            key_id=key_id,
            key=key,
            bundle_id=bundle_id,
            environment=environment,
            root_certificates=root_certificates,
            client=client_factory(),
        )

    def _authorization(self) -> str:
        now = int(self.now())
        token, expires = self._bearer
        if token and expires > now + 60:
            return token
        token = _jwt(
            {"alg": "ES256", "kid": self.key_id, "typ": "JWT"},
            {
                "iss": self.issuer_id,
                "iat": now,
                "exp": now + 1200,
                "aud": "appstoreconnect-v1",
                "bid": self.bundle_id,
            },
            self.key,
            elliptic=True,
        )
        self._bearer = (token, now + 1200)
        return token

    def _verified_jws_payload(self, signed: str) -> dict:
        from cryptography import x509
        from cryptography.exceptions import InvalidSignature
        from cryptography.hazmat.primitives import hashes, serialization
        from cryptography.hazmat.primitives.asymmetric import ec, utils
        from cryptography.x509.oid import ObjectIdentifier

        try:
            encoded_header, encoded_payload, encoded_signature = signed.split(".")
            header = json.loads(_b64url_decode(encoded_header))
            chain = [
                x509.load_der_x509_certificate(base64.b64decode(item))
                for item in header.get("x5c", [])
            ]
            if header.get("alg") != "ES256" or len(chain) < 3:
                raise ValueError("header")
            leaf, intermediate, root = chain[0], chain[1], chain[-1]
            if root.public_bytes(serialization.Encoding.DER) not in self.root_certificates:
                raise ValueError("root")
            now = datetime.fromtimestamp(self.now(), tz=timezone.utc)
            for certificate in (leaf, intermediate, root):
                if not certificate.not_valid_before_utc <= now <= certificate.not_valid_after_utc:
                    raise ValueError("validity")
            leaf.verify_directly_issued_by(intermediate)
            intermediate.verify_directly_issued_by(root)
            leaf.extensions.get_extension_for_oid(ObjectIdentifier(APPLE_LEAF_OID))
            intermediate.extensions.get_extension_for_oid(ObjectIdentifier(APPLE_INTERMEDIATE_OID))
            public_key = leaf.public_key()
            if not isinstance(public_key, ec.EllipticCurvePublicKey):
                raise ValueError("leaf key")
            raw_signature = _b64url_decode(encoded_signature)
            if len(raw_signature) != 64:
                raise ValueError("signature")
            public_key.verify(
                utils.encode_dss_signature(
                    int.from_bytes(raw_signature[:32], "big"),
                    int.from_bytes(raw_signature[32:], "big"),
                ),
                f"{encoded_header}.{encoded_payload}".encode("ascii"),
                ec.ECDSA(hashes.SHA256()),
            )
            payload = json.loads(_b64url_decode(encoded_payload))
        except (InvalidSignature, ValueError, TypeError, KeyError, x509.ExtensionNotFound):
            raise StoreVerificationError("App Store işlem imzası doğrulanamadı.") from None
        if not isinstance(payload, dict):
            raise StoreVerificationError("App Store işlem imzası doğrulanamadı.")
        return payload

    def _fetch_transaction(self, environment: str, transaction_id: str):
        try:
            response = self.client.get(
                f"{APP_STORE_HOSTS[environment]}/inApps/v1/transactions/{transaction_id}",
                headers={"Authorization": f"Bearer {self._authorization()}"},
            )
        except Exception:
            raise StoreVerificationError(
                "App Store doğrulamasına şu anda ulaşılamıyor.", retryable=True
            ) from None
        if response.status_code == 401:
            self._bearer = ("", 0)
            raise StoreVerificationError(
                "App Store doğrulaması yetkisiz; anahtar ayarlarını denetleyin.",
                retryable=True,
            )
        return response

    def verify(self, store_product_id: str, transaction_id: str) -> VerifiedPurchase:
        transaction_id = str(transaction_id or "").strip()
        if not re.fullmatch(r"[0-9]{1,32}", transaction_id):
            raise StoreVerificationError("App Store işlem kimliği geçersiz.")
        # Apple'ın önerisi: üretim sunucusu işlemi önce üretimde arar, yoksa
        # sandbox'ta. Uygulama incelemesi ve TestFlight alımları sandbox'tadır;
        # bunlar deneme makbuzu olarak kaydedilir (gerçek ücret alınmaz).
        environments = ("production", "sandbox") if self.environment == "production" else ("sandbox",)
        for index, environment in enumerate(environments):
            response = self._fetch_transaction(environment, transaction_id)
            if response.status_code in {400, 404} and index + 1 < len(environments):
                continue
            break
        if response.status_code in {400, 404}:
            raise StoreVerificationError("App Store işlemi bulunamadı.")
        if response.status_code != 200:
            raise StoreVerificationError(
                "App Store doğrulamasına şu anda ulaşılamıyor.", retryable=True
            )
        signed = str(_json(response).get("signedTransactionInfo") or "")
        payload = self._verified_jws_payload(signed)
        expected_environment = "Sandbox" if environment == "sandbox" else "Production"
        if (
            payload.get("bundleId") != self.bundle_id
            or payload.get("productId") != store_product_id
            or str(payload.get("transactionId")) != transaction_id
            or payload.get("environment") != expected_environment
        ):
            raise StoreVerificationError("App Store işlemi bu ürünle eşleşmiyor.")
        if payload.get("revocationDate"):
            raise StoreVerificationError("App Store işlemi iade edilmiş.")
        return VerifiedPurchase(
            provider="app_store",
            transaction_id=transaction_id,
            store_product_id=store_product_id,
            environment=environment,
            account_token=str(payload.get("appAccountToken") or "").strip().lower(),
        )

    def notification_history(self, start_ms: int, end_ms: int, *, notification_type: str) -> list[str]:
        """Get Notification History: aralıktaki seçilen türdeki bildirimlerin imzalı gövdeleri.

        Apple son 180 günü tutar; yanıt sayfalıdır. Gövdeler canlı bildirim gibi
        `verify_notification` ile doğrulanır.
        """
        host = APP_STORE_HOSTS[self.environment]
        body = {
            "startDate": int(start_ms),
            "endDate": int(end_ms),
            "notificationType": notification_type,
        }
        payloads: list[str] = []
        page_token = ""
        for _page in range(100):
            url = f"{host}/inApps/v1/notifications/history"
            if page_token:
                url += f"?paginationToken={quote(page_token, safe='')}"
            try:
                response = self.client.post(
                    url, json=body, headers={"Authorization": f"Bearer {self._authorization()}"}
                )
            except Exception:
                raise StoreVerificationError(
                    "App Store bildirim geçmişine şu anda ulaşılamıyor.", retryable=True
                ) from None
            if response.status_code == 401:
                self._bearer = ("", 0)
                raise StoreVerificationError(
                    "App Store bildirim geçmişi yetkisiz; anahtar ayarlarını denetleyin.",
                    retryable=True,
                )
            if response.status_code != 200:
                raise StoreVerificationError(
                    "App Store bildirim geçmişine şu anda ulaşılamıyor.", retryable=True
                )
            payload = _json(response)
            for item in payload.get("notificationHistory") or []:
                signed = str(item.get("signedPayload") or "") if isinstance(item, dict) else ""
                if signed:
                    payloads.append(signed)
            page_token = str(payload.get("paginationToken") or "")
            if not payload.get("hasMore") or not page_token:
                break
        else:
            # Kayıt kesilirse kontrol noktası ilerleyip kalan iadeler kaybolurdu.
            raise StoreVerificationError("App Store bildirim geçmişi beklenenden uzun.", retryable=True)
        return payloads

    def verify_notification(self, signed_payload: str) -> dict:
        """App Store Server Notifications V2 gövdesini (``signedPayload``) doğrular.

        Bildirim ve içindeki işlem aynı Apple zinciriyle imzalıdır. Başka
        uygulamaya ya da bu sunucunun kabul etmediği ortama ait bildirim hata
        değildir; ``ignored`` ile döner (Apple 200 almazsa günlerce yineler).
        """
        payload = self._verified_jws_payload(str(signed_payload or ""))
        data = payload.get("data") if isinstance(payload.get("data"), dict) else {}
        allowed_environments = (
            {"Production", "Sandbox"} if self.environment == "production" else {"Sandbox"}
        )
        view = {
            "notification_id": str(payload.get("notificationUUID") or "").strip(),
            "type": str(payload.get("notificationType") or "").strip(),
            "subtype": str(payload.get("subtype") or "").strip(),
            "signed_date": _int(payload.get("signedDate")),
            "transaction_id": "",
            "store_product_id": "",
            "account_token": "",
            "revoked": False,
            "ignored": "",
        }
        if data.get("bundleId") != self.bundle_id:
            return {**view, "ignored": "bundle"}
        if data.get("environment") not in allowed_environments:
            return {**view, "ignored": "environment"}
        signed_transaction = str(data.get("signedTransactionInfo") or "")
        if signed_transaction:
            transaction = self._verified_jws_payload(signed_transaction)
            if transaction.get("bundleId") != self.bundle_id:
                return {**view, "ignored": "bundle"}
            view.update(
                transaction_id=str(transaction.get("transactionId") or "").strip(),
                store_product_id=str(transaction.get("productId") or "").strip(),
                account_token=str(transaction.get("appAccountToken") or "").strip().lower(),
                revoked=bool(transaction.get("revocationDate")),
            )
        return view


class GooglePlayNotificationVerifier:
    """Google Play gerçek zamanlı geliştirici bildirimleri (RTDN).

    Bildirim Cloud Pub/Sub itme aboneliğiyle gelir. Abonelikte kimlik
    doğrulaması açık olmalıdır: istek, Google'ın imzaladığı OIDC belirtecini
    taşır (``aud`` yapılandırılmış hedef, ``email`` itme hizmet hesabı).
    Belirteç doğrulanmadan bildirim işlenmez.
    """

    def __init__(self, *, package_name: str, audience: str, service_account_email: str, client, now_func=time.time):
        self.package_name = package_name
        self.audience = audience
        self.service_account_email = service_account_email
        self.client = client
        self.now = now_func
        self._keys: dict[str, object] = {}
        self._keys_loaded_at = 0.0
        self._keys_refreshed_at = 0.0

    @classmethod
    def from_environment(cls, client_factory=_http_client):
        audience = os.environ.get("GRIDSHARD_GOOGLE_RTDN_AUDIENCE", "").strip()
        email = os.environ.get("GRIDSHARD_GOOGLE_RTDN_SERVICE_ACCOUNT", "").strip()
        package_name = os.environ.get("GRIDSHARD_GOOGLE_PLAY_PACKAGE_NAME", "").strip()
        if not audience and not email:
            return None
        if (
            not audience.startswith("https://")
            or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email)
            or not package_name
        ):
            raise ValueError(
                "Google Play bildirim yapılandırması geçersiz; docs/STORE_PURCHASES.md belgesine bakın."
            )
        return cls(
            package_name=package_name,
            audience=audience,
            service_account_email=email,
            client=client_factory(),
        )

    def _public_key(self, key_id: str):
        from cryptography.hazmat.primitives.asymmetric import rsa

        now = self.now()
        stale = now - self._keys_loaded_at > GOOGLE_OIDC_KEYS_TTL_SECONDS
        # Bilinmeyen anahtar kimliğinde yenileme dakikada bir kez denenir.
        unknown = key_id not in self._keys and now - self._keys_refreshed_at > 60
        if stale or unknown:
            self._keys_refreshed_at = now
            try:
                response = self.client.get(GOOGLE_OIDC_CERTS_URL)
                payload = _json(response) if response.status_code == 200 else {}
                keys = {}
                for item in payload.get("keys", []):
                    if item.get("kty") != "RSA":
                        continue
                    keys[str(item["kid"])] = rsa.RSAPublicNumbers(
                        int.from_bytes(_b64url_decode(str(item["e"])), "big"),
                        int.from_bytes(_b64url_decode(str(item["n"])), "big"),
                    ).public_key()
            except Exception:
                keys = {}
            if keys:
                self._keys = keys
                self._keys_loaded_at = now
        key = self._keys.get(key_id)
        if key is None:
            raise StoreVerificationError("Google bildirim imza anahtarı bulunamadı.")
        return key

    def _verify_token(self, authorization: str | None) -> None:
        from cryptography.exceptions import InvalidSignature
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import padding

        scheme, _, token = str(authorization or "").partition(" ")
        if scheme.lower() != "bearer" or not token.strip():
            raise StoreVerificationError("Google bildirimi kimlik belirteci taşımıyor.")
        try:
            encoded_header, encoded_claims, encoded_signature = token.strip().split(".")
            header = json.loads(_b64url_decode(encoded_header))
            claims = json.loads(_b64url_decode(encoded_claims))
            if header.get("alg") != "RS256" or not header.get("kid"):
                raise ValueError("header")
            self._public_key(str(header["kid"])).verify(
                _b64url_decode(encoded_signature),
                f"{encoded_header}.{encoded_claims}".encode("ascii"),
                padding.PKCS1v15(),
                hashes.SHA256(),
            )
        except StoreVerificationError:
            raise
        except (InvalidSignature, ValueError, TypeError, KeyError):
            raise StoreVerificationError("Google bildirim belirteci doğrulanamadı.") from None
        now = int(self.now())
        audience = claims.get("aud")
        audiences = audience if isinstance(audience, list) else [audience]
        if (
            claims.get("iss") not in GOOGLE_OIDC_ISSUERS
            or self.audience not in audiences
            or claims.get("email") != self.service_account_email
            or claims.get("email_verified") is not True
            or int(claims.get("exp", 0)) <= now
            or int(claims.get("iat", 0)) > now + 300
        ):
            raise StoreVerificationError("Google bildirim belirteci bu sunucuya ait değil.")

    def verify(self, authorization: str | None, body: bytes) -> dict:
        """İmzayı doğrular, Pub/Sub zarfını ve bildirimi çözer."""
        self._verify_token(authorization)
        try:
            envelope = json.loads(body or b"{}")
            message = envelope["message"]
            notification = json.loads(base64.b64decode(str(message["data"])))
            message_id = str(message.get("messageId") or message.get("message_id") or "").strip()
        except (ValueError, TypeError, KeyError):
            raise StoreVerificationError("Google bildirimi çözülemedi.") from None
        if not isinstance(notification, dict) or not message_id:
            raise StoreVerificationError("Google bildirimi çözülemedi.")
        ignored = "" if notification.get("packageName") == self.package_name else "package"
        voided = notification.get("voidedPurchaseNotification")
        voided = voided if isinstance(voided, dict) else {}
        return {
            "notification_id": message_id,
            "ignored": ignored,
            "test": isinstance(notification.get("testNotification"), dict),
            "voided": bool(voided),
            "order_id": str(voided.get("orderId") or "").strip(),
            "purchase_token": str(voided.get("purchaseToken") or "").strip(),
            # 1: abonelik, 2: tek seferlik ürün; 1: tam, 2: adet bazlı kısmi iade.
            "product_type": int(voided.get("productType") or 0),
            "refund_type": int(voided.get("refundType") or 0),
        }


class AdMobSsvVerifier:
    """AdMob ödüllü reklam sunucu doğrulaması (SSV) geri çağrısı."""

    def __init__(self, *, ad_unit_ids: frozenset[str], ad_units_by_platform: dict[str, str], client, now_func=time.time):
        self.ad_unit_ids = ad_unit_ids
        self.ad_units_by_platform = dict(ad_units_by_platform)
        self.client = client
        self.now = now_func
        self._keys: dict[int, object] = {}
        self._keys_loaded_at = 0.0

    @classmethod
    def from_environment(cls, client_factory=_http_client):
        if os.environ.get("GRIDSHARD_ADMOB_SSV_ENABLED", "0").strip().lower() not in {"1", "true", "yes", "on"}:
            return None
        units = {
            "android": os.environ.get("GRIDSHARD_ADMOB_REWARDED_AD_UNIT_ANDROID", "").strip(),
            "ios": os.environ.get("GRIDSHARD_ADMOB_REWARDED_AD_UNIT_IOS", "").strip(),
        }
        units = {platform: unit for platform, unit in units.items() if unit}
        if not units or not all(re.fullmatch(r"ca-app-pub-[0-9]+/[0-9]+", unit) for unit in units.values()):
            raise ValueError("AdMob yapılandırması geçersiz; docs/STORE_PURCHASES.md belgesine bakın.")
        # SSV geri çağrısındaki ad_unit yalnız sayısal birim kimliğidir.
        numeric_ids = frozenset(unit.rsplit("/", 1)[1] for unit in units.values())
        return cls(ad_unit_ids=numeric_ids, ad_units_by_platform=units, client=client_factory())

    def _public_key(self, key_id: int):
        from cryptography.hazmat.primitives import serialization

        stale = self.now() - self._keys_loaded_at > ADMOB_KEYS_TTL_SECONDS
        if stale or key_id not in self._keys:
            try:
                response = self.client.get(ADMOB_KEYS_URL)
                payload = _json(response) if response.status_code == 200 else {}
                keys = {}
                for item in payload.get("keys", []):
                    keys[int(item["keyId"])] = serialization.load_pem_public_key(str(item["pem"]).encode("ascii"))
            except Exception:
                keys = {}
            if keys:
                self._keys = keys
                self._keys_loaded_at = self.now()
        key = self._keys.get(key_id)
        if key is None:
            raise StoreVerificationError("AdMob doğrulama anahtarı bulunamadı.")
        return key

    def verify(self, raw_query: str) -> dict:
        from cryptography.exceptions import InvalidSignature
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import ec

        raw_query = str(raw_query or "")
        marker = raw_query.find("&signature=")
        if marker <= 0:
            raise StoreVerificationError("AdMob geri çağrısı imzasız.")
        message = raw_query[:marker]
        trailer = parse_qs(raw_query[marker + 1:], keep_blank_values=True)
        try:
            signature = _b64url_decode(trailer["signature"][0])
            key_id = int(trailer["key_id"][0])
        except (KeyError, IndexError, ValueError):
            raise StoreVerificationError("AdMob geri çağrısı imzasız.") from None
        try:
            self._public_key(key_id).verify(signature, message.encode("utf-8"), ec.ECDSA(hashes.SHA256()))
        except InvalidSignature:
            raise StoreVerificationError("AdMob geri çağrısının imzası geçersiz.") from None
        fields = {name: values[0] for name, values in parse_qs(message, keep_blank_values=True).items()}
        transaction_id = fields.get("transaction_id", "").strip()
        user_id = fields.get("user_id", "").strip()
        custom_data = fields.get("custom_data", "").strip()
        try:
            timestamp_ms = int(fields.get("timestamp", "0"))
        except ValueError:
            timestamp_ms = 0
        if not transaction_id or not user_id or not custom_data:
            raise StoreVerificationError("AdMob geri çağrısında oyuncu ya da savaş bilgisi yok.")
        if abs(self.now() - timestamp_ms / 1000) > ADMOB_CALLBACK_MAX_AGE_SECONDS:
            raise StoreVerificationError("AdMob geri çağrısı süresi geçmiş.")
        if self.ad_unit_ids and fields.get("ad_unit", "") not in self.ad_unit_ids:
            raise StoreVerificationError("AdMob reklam birimi tanınmıyor.")
        return {
            "transaction_id": transaction_id[:128],
            "user_id": user_id[:96],
            "battle_id": custom_data[:160],
            "ad_unit": fields.get("ad_unit", ""),
            "reward_amount": fields.get("reward_amount", ""),
            "reward_item": fields.get("reward_item", ""),
            "timestamp_ms": timestamp_ms,
        }


@dataclass
class StoreVerifiers:
    google_play: GooglePlayVerifier | None = None
    app_store: AppStoreVerifier | None = None
    admob: AdMobSsvVerifier | None = None
    google_notifications: GooglePlayNotificationVerifier | None = None

    @classmethod
    def from_environment(cls) -> "StoreVerifiers":
        return cls(
            google_play=GooglePlayVerifier.from_environment(),
            app_store=AppStoreVerifier.from_environment(),
            admob=AdMobSsvVerifier.from_environment(),
            google_notifications=GooglePlayNotificationVerifier.from_environment(),
        )

    def platform_view(self) -> dict:
        return {
            "purchase_platforms": {
                "google_play": self.google_play is not None,
                "app_store": self.app_store is not None,
            },
            "ad_platforms": {"admob": self.admob is not None},
            "ad_units": dict(self.admob.ad_units_by_platform) if self.admob else {},
        }

    def verify_purchase(self, provider: str, store_product_id: str, *, transaction_id: str, purchase_token: str) -> VerifiedPurchase:
        if provider == "google_play":
            if self.google_play is None:
                raise StoreVerificationError("Google Play makbuz doğrulaması bu sunucuda yapılandırılmadı.")
            return self.google_play.verify(store_product_id, purchase_token)
        if provider == "app_store":
            if self.app_store is None:
                raise StoreVerificationError("App Store makbuz doğrulaması bu sunucuda yapılandırılmadı.")
            return self.app_store.verify(store_product_id, transaction_id)
        raise StoreVerificationError("Bilinmeyen ödeme sağlayıcısı.")

