"""Account, device, notification and social platform contracts.

The service owns no vendor credentials.  OAuth and push adapters are enabled
only when their environment variables are present; local development therefore
cannot accidentally pretend that a Google/Apple login or a push delivery was
completed.  Durable product state is still available through the JSON backend
used by the standalone server.
"""

from __future__ import annotations

import hashlib
import base64
import json
import os
import secrets
import smtplib
import ssl
import re
import time
from email.message import EmailMessage
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.parse import urlencode
from urllib.error import HTTPError, URLError
from urllib.request import Request as UrlRequest, urlopen

from .json_schema_migrations import assert_supported_schema
from .platform_storage_lock import PlatformStorageLock
from .push_delivery import PushSender
from .push_outbox import PushOutbox


class PlatformServiceError(ValueError):
    pass


def _clean_text(value: object, *, maximum: int, label: str) -> str:
    clean = " ".join(str(value or "").strip().split())
    if not clean or len(clean) > maximum:
        raise PlatformServiceError(f"{label} 1-{maximum} karakter olmalıdır.")
    return clean


def _masked_contact(value: str) -> str:
    if "@" in value:
        local, domain = value.split("@", 1)
        return f"{local[:2]}***@{domain}"
    return f"***{value[-4:]}" if len(value) > 4 else "***"


class PlatformService(PushOutbox):
    VERIFICATION_TTL_SECONDS = 10 * 60
    RECOVERY_TTL_SECONDS = 15 * 60
    INVITE_TTL_SECONDS = 7 * 24 * 60 * 60
    GOOGLE_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
    GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo"
    APPLE_AUTHORIZE_URL = "https://appleid.apple.com/auth/authorize"
    APPLE_TOKEN_URL = "https://appleid.apple.com/auth/token"
    APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"
    APPLE_ISSUER = "https://appleid.apple.com"
    OAUTH_EXCHANGE_TTL_SECONDS = 5 * 60

    def __init__(
        self,
        path: Path,
        *,
        now_func=time.time,
        expose_codes: bool = False,
        web_base_url: str = "https://gridshard.game",
        http_open=urlopen,
        push_sender=None,
    ):
        self.path = Path(path)
        self.now_func = now_func
        self.expose_codes = bool(expose_codes)
        self.web_base_url = web_base_url.rstrip("/")
        self.http_open = http_open
        self._lock = PlatformStorageLock(self.path)
        self.push_sender = push_sender if push_sender is not None else PushSender()

    def _empty(self) -> dict:
        return {
            "accounts": {},
            "invites": {},
            "messages": [],
            "reports": [],
            "oauth_exchanges": {},
        }

    def _read(self) -> dict:
        assert_supported_schema(self.path, "platform", dict)
        if not self.path.exists():
            return self._empty()
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise PlatformServiceError("Platform veri deposu okunamadı.") from exc
        if not isinstance(data, dict):
            raise PlatformServiceError("Platform veri deposu biçimi geçersiz.")
        base = self._empty()
        base.update(data)
        return base

    def _write(self, data: dict) -> None:
        assert_supported_schema(self.path, "platform", dict)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary_name = None
        try:
            with NamedTemporaryFile(
                "w", encoding="utf-8", dir=self.path.parent,
                delete=False, suffix=".tmp",
            ) as temporary:
                json.dump(data, temporary, ensure_ascii=False, indent=2, sort_keys=True)
                temporary.flush()
                os.fsync(temporary.fileno())
                temporary_name = temporary.name
            Path(temporary_name).replace(self.path)
        except OSError as exc:
            if temporary_name:
                Path(temporary_name).unlink(missing_ok=True)
            raise PlatformServiceError("Platform veri deposu yazılamadı.") from exc

    def _account(self, data: dict, player_id: str) -> dict:
        return data["accounts"].setdefault(player_id, {
            "contacts": {}, "pending_verifications": {}, "oauth_links": {},
            "oauth_states": {}, "recovery": {}, "devices": {},
            "revoked_token_ids": [], "push_subscriptions": {},
            "notifications": [], "blocked_player_ids": [],
        })

    @staticmethod
    def _code_hash(code: str) -> str:
        return hashlib.sha256(str(code).encode("utf-8")).hexdigest()

    @staticmethod
    def _truthy_environment(name: str, default: str = "0") -> bool:
        return os.environ.get(name, default).strip().lower() in {
            "1", "true", "yes", "on",
        }

    def _email_delivery_configured(self) -> bool:
        return (
            os.environ.get("GRIDSHARD_EMAIL_PROVIDER", "").strip().lower() == "smtp"
            and bool(os.environ.get("GRIDSHARD_SMTP_HOST", "").strip())
            and bool(os.environ.get("GRIDSHARD_SMTP_FROM", "").strip())
        )

    def _deliver_verification_email(self, destination: str, code: str) -> None:
        host = os.environ.get("GRIDSHARD_SMTP_HOST", "").strip()
        sender = os.environ.get("GRIDSHARD_SMTP_FROM", "").strip()
        if not self._email_delivery_configured():
            raise PlatformServiceError("E-posta teslim sağlayıcısı yapılandırılmadı.")
        try:
            port = int(os.environ.get("GRIDSHARD_SMTP_PORT", "587"))
        except ValueError as exc:
            raise PlatformServiceError("SMTP portu geçersiz.") from exc

        message = EmailMessage()
        message["Subject"] = "GRIDSHARD doğrulama kodu"
        message["From"] = sender
        message["To"] = destination
        message.set_content(
            "GRIDSHARD doğrulama kodun: "
            f"{code}\n\nKod {self.VERIFICATION_TTL_SECONDS // 60} dakika geçerlidir."
        )
        username = os.environ.get("GRIDSHARD_SMTP_USERNAME", "").strip()
        password = os.environ.get("GRIDSHARD_SMTP_PASSWORD", "")
        try:
            with smtplib.SMTP(host, port, timeout=12) as client:
                client.ehlo()
                if self._truthy_environment("GRIDSHARD_SMTP_STARTTLS", "1"):
                    client.starttls(context=ssl.create_default_context())
                    client.ehlo()
                if username:
                    if not password:
                        raise PlatformServiceError("SMTP parolası yapılandırılmadı.")
                    client.login(username, password)
                client.send_message(message)
        except PlatformServiceError:
            raise
        except (OSError, smtplib.SMTPException) as exc:
            raise PlatformServiceError("Doğrulama e-postası gönderilemedi.") from exc

    def request_verification(self, player_id: str, channel: str, destination: str) -> dict:
        if channel not in {"email", "phone"}:
            raise PlatformServiceError("Doğrulama kanalı email veya phone olmalıdır.")
        destination = _clean_text(destination, maximum=180, label="İletişim adresi")
        code = f"{secrets.randbelow(1_000_000):06d}"
        now = int(self.now_func())
        with self._lock:
            data = self._read()
            account = self._account(data, player_id)
            account["pending_verifications"][channel] = {
                "destination": destination,
                "code_hash": self._code_hash(code),
                "expires_at": now + self.VERIFICATION_TTL_SECONDS,
                "attempts": 0,
            }
            self._write(data)
        if channel == "email" and self._email_delivery_configured():
            self._deliver_verification_email(destination, code)
            delivery_configured = True
        elif channel == "phone":
            delivery_configured = bool(
                os.environ.get("GRIDSHARD_SMS_PROVIDER", "").strip()
            )
        else:
            delivery_configured = False
        response = {
            "channel": channel,
            "destination": _masked_contact(destination),
            "expires_at": now + self.VERIFICATION_TTL_SECONDS,
            "delivery_configured": delivery_configured,
        }
        if self.expose_codes:
            response["development_code"] = code
        return response

    def confirm_verification(self, player_id: str, channel: str, code: str) -> dict:
        now = int(self.now_func())
        with self._lock:
            data = self._read()
            account = self._account(data, player_id)
            pending = account["pending_verifications"].get(channel)
            if not pending or int(pending.get("expires_at", 0)) <= now:
                raise PlatformServiceError("Doğrulama kodu yok veya süresi dolmuş.")
            pending["attempts"] = int(pending.get("attempts", 0)) + 1
            if pending["attempts"] > 5:
                account["pending_verifications"].pop(channel, None)
                self._write(data)
                raise PlatformServiceError("Doğrulama deneme sınırı aşıldı.")
            if not secrets.compare_digest(pending["code_hash"], self._code_hash(code)):
                self._write(data)
                raise PlatformServiceError("Doğrulama kodu geçersiz.")
            account["contacts"][channel] = {
                "value": pending["destination"], "verified_at": now,
            }
            account["pending_verifications"].pop(channel, None)
            self._write(data)
        return {"channel": channel, "verified": True, "verified_at": now}

    def oauth_status(self) -> dict:
        google = self._oauth_configuration("google")
        apple = self._oauth_configuration("apple")
        return {
            "google": {
                "configured": bool(
                    google["client_id"]
                    and google["client_secret"]
                    and google["redirect_uri"]
                )
            },
            "apple": {
                "configured": bool(
                    apple["client_id"]
                    and apple["redirect_uri"]
                    and apple["authorize_url"]
                    and apple["token_url"]
                    and apple["jwks_url"]
                    and (
                        apple["client_secret"]
                        or (
                            apple["team_id"]
                            and apple["key_id"]
                            and (
                                apple["private_key"]
                                or apple["private_key_file"]
                            )
                        )
                    )
                )
            },
        }

    def _oauth_configuration(self, provider: str) -> dict:
        prefix = f"GRIDSHARD_{provider.upper()}_OAUTH"
        return {
            "client_id": os.environ.get(f"{prefix}_CLIENT_ID", "").strip(),
            "client_secret": os.environ.get(f"{prefix}_CLIENT_SECRET", "").strip(),
            "authorize_url": (
                os.environ.get(f"{prefix}_AUTHORIZE_URL", "").strip()
                or (
                    self.GOOGLE_AUTHORIZE_URL
                    if provider == "google"
                    else self.APPLE_AUTHORIZE_URL
                )
            ),
            "token_url": (
                os.environ.get(f"{prefix}_TOKEN_URL", "").strip()
                or (
                    self.GOOGLE_TOKEN_URL
                    if provider == "google"
                    else self.APPLE_TOKEN_URL
                )
            ),
            "userinfo_url": (
                os.environ.get(f"{prefix}_USERINFO_URL", "").strip()
                or (self.GOOGLE_USERINFO_URL if provider == "google" else "")
            ),
            "jwks_url": (
                os.environ.get(f"{prefix}_JWKS_URL", "").strip()
                or (self.APPLE_JWKS_URL if provider == "apple" else "")
            ),
            "issuer": (
                os.environ.get(f"{prefix}_ISSUER", "").strip()
                or (self.APPLE_ISSUER if provider == "apple" else "")
            ),
            "team_id": os.environ.get(f"{prefix}_TEAM_ID", "").strip(),
            "key_id": os.environ.get(f"{prefix}_KEY_ID", "").strip(),
            "private_key": os.environ.get(f"{prefix}_PRIVATE_KEY", "").strip(),
            "private_key_file": os.environ.get(
                f"{prefix}_PRIVATE_KEY_FILE", ""
            ).strip(),
            "redirect_uri": os.environ.get(f"{prefix}_REDIRECT_URI", "").strip(),
        }

    def start_oauth(
        self,
        player_id: str,
        provider: str,
        *,
        mode: str = "link",
    ) -> dict:
        if provider not in {"google", "apple"}:
            raise PlatformServiceError("Desteklenmeyen OAuth sağlayıcısı.")
        if mode not in {"link", "login"}:
            raise PlatformServiceError("OAuth işlemi link veya login olmalıdır.")
        config = self._oauth_configuration(provider)
        if not self.oauth_status()[provider]["configured"]:
            return {"provider": provider, "configured": False, "authorization_url": None}
        state = secrets.token_urlsafe(24)
        nonce = secrets.token_urlsafe(24) if provider == "apple" else ""
        with self._lock:
            data = self._read()
            account = self._account(data, player_id)
            account["oauth_states"][provider] = {
                "state_hash": self._code_hash(state),
                "expires_at": int(self.now_func()) + 600,
                "mode": mode,
                "nonce_hash": self._code_hash(nonce) if nonce else "",
            }
            self._write(data)
        params = {
            "client_id": config["client_id"], "redirect_uri": config["redirect_uri"],
            "response_type": "code",
            "scope": "openid email profile" if provider == "google" else "name email",
            "state": state,
        }
        if provider == "google":
            params["prompt"] = "select_account"
        if provider == "apple":
            params["response_mode"] = "form_post"
            params["nonce"] = nonce
        return {
            "provider": provider, "configured": True,
            "authorization_url": f"{config['authorize_url']}?{urlencode(params)}",
        }

    def _request_oauth_json(
        self,
        request: UrlRequest,
        *,
        provider: str = "OAuth",
    ) -> dict:
        try:
            with self.http_open(request, timeout=12) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            raise PlatformServiceError(
                f"{provider.title()} hesap bağlantısı tamamlanamadı."
            ) from exc
        if not isinstance(payload, dict):
            raise PlatformServiceError(f"{provider.title()} yanıtı geçersiz.")
        return payload

    @staticmethod
    def _b64url_decode(value: str) -> bytes:
        return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))

    @staticmethod
    def _b64url_encode(value: bytes) -> str:
        return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")

    def _apple_private_key(self, config: dict) -> bytes:
        configured = str(config.get("private_key", "")).replace("\\n", "\n")
        if configured:
            return configured.encode("utf-8")
        path = str(config.get("private_key_file", "")).strip()
        if not path:
            raise PlatformServiceError("Apple özel anahtarı yapılandırılmadı.")
        try:
            return Path(path).read_bytes()
        except OSError as exc:
            raise PlatformServiceError("Apple özel anahtarı okunamadı.") from exc

    def _apple_client_secret(self, config: dict) -> str:
        configured = str(config.get("client_secret", "")).strip()
        if configured:
            return configured
        try:
            from cryptography.hazmat.primitives import hashes, serialization
            from cryptography.hazmat.primitives.asymmetric import ec
            from cryptography.hazmat.primitives.asymmetric.utils import (
                decode_dss_signature,
            )
            private_key = serialization.load_pem_private_key(
                self._apple_private_key(config),
                password=None,
            )
            if not isinstance(private_key, ec.EllipticCurvePrivateKey):
                raise TypeError("Apple anahtarı EC türünde değil.")
            now = int(self.now_func())
            header = {"alg": "ES256", "kid": config["key_id"]}
            claims = {
                "iss": config["team_id"],
                "iat": now,
                "exp": now + 86400 * 30,
                "aud": self.APPLE_ISSUER,
                "sub": config["client_id"],
            }
            encoded_header = self._b64url_encode(json.dumps(
                header, separators=(",", ":"), sort_keys=True
            ).encode("utf-8"))
            encoded_claims = self._b64url_encode(json.dumps(
                claims, separators=(",", ":"), sort_keys=True
            ).encode("utf-8"))
            signing_input = f"{encoded_header}.{encoded_claims}".encode("ascii")
            der_signature = private_key.sign(
                signing_input,
                ec.ECDSA(hashes.SHA256()),
            )
            r_value, s_value = decode_dss_signature(der_signature)
            signature = r_value.to_bytes(32, "big") + s_value.to_bytes(32, "big")
            return f"{encoded_header}.{encoded_claims}.{self._b64url_encode(signature)}"
        except PlatformServiceError:
            raise
        except (ImportError, TypeError, ValueError, KeyError) as exc:
            raise PlatformServiceError("Apple istemci sırrı imzalanamadı.") from exc

    def _verify_apple_identity_token(
        self,
        token: str,
        config: dict,
        nonce_hash: str,
    ) -> dict:
        try:
            from cryptography.exceptions import InvalidSignature
            from cryptography.hazmat.primitives import hashes
            from cryptography.hazmat.primitives.asymmetric import padding, rsa
        except ImportError as exc:
            raise PlatformServiceError(
                "Apple kimlik doğrulama kitaplığı kurulu değil."
            ) from exc
        try:
            encoded_header, encoded_claims, encoded_signature = token.split(".")
            header = json.loads(self._b64url_decode(encoded_header))
            claims = json.loads(self._b64url_decode(encoded_claims))
            if header.get("alg") != "RS256" or not header.get("kid"):
                raise ValueError("Apple JWT başlığı geçersiz.")
            keys = self._request_oauth_json(
                UrlRequest(config["jwks_url"], method="GET"),
                provider="apple",
            ).get("keys", [])
            jwk = next(
                (item for item in keys if item.get("kid") == header["kid"]),
                None,
            )
            if not jwk or jwk.get("kty") != "RSA":
                raise ValueError("Apple imzalama anahtarı bulunamadı.")
            public_key = rsa.RSAPublicNumbers(
                int.from_bytes(self._b64url_decode(jwk["e"]), "big"),
                int.from_bytes(self._b64url_decode(jwk["n"]), "big"),
            ).public_key()
            public_key.verify(
                self._b64url_decode(encoded_signature),
                f"{encoded_header}.{encoded_claims}".encode("ascii"),
                padding.PKCS1v15(),
                hashes.SHA256(),
            )
            now = int(self.now_func())
            audience = claims.get("aud")
            audiences = audience if isinstance(audience, list) else [audience]
            if (
                claims.get("iss") != config["issuer"]
                or config["client_id"] not in audiences
                or int(claims.get("exp", 0)) <= now
                or int(claims.get("iat", 0)) > now + 60
            ):
                raise ValueError("Apple JWT talepleri geçersiz.")
            nonce = str(claims.get("nonce", ""))
            if not nonce or not secrets.compare_digest(
                self._code_hash(nonce), nonce_hash
            ):
                raise ValueError("Apple OAuth nonce değeri geçersiz.")
            return claims
        except PlatformServiceError:
            raise
        except (InvalidSignature, KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise PlatformServiceError("Apple kimlik belirteci doğrulanamadı.") from exc

    def complete_oauth(self, provider: str, state: str, code: str) -> dict:
        if provider not in {"google", "apple"}:
            raise PlatformServiceError("Desteklenmeyen OAuth dönüş sağlayıcısı.")
        state = _clean_text(state, maximum=256, label="OAuth durumu")
        code = _clean_text(code, maximum=2048, label="OAuth kodu")
        config = self._oauth_configuration(provider)
        if not self.oauth_status()[provider]["configured"]:
            raise PlatformServiceError(
                f"{provider.title()} OAuth sağlayıcısı yapılandırılmadı."
            )

        now = int(self.now_func())
        player_id = None
        pending_state = None
        with self._lock:
            data = self._read()
            for candidate_id, account in data.get("accounts", {}).items():
                pending = account.get("oauth_states", {}).get(provider)
                if (
                    pending
                    and int(pending.get("expires_at", 0)) > now
                    and secrets.compare_digest(
                        str(pending.get("state_hash", "")), self._code_hash(state)
                    )
                ):
                    player_id = candidate_id
                    pending_state = dict(pending)
                    account["oauth_states"].pop(provider, None)
                    break
            if player_id is None:
                raise PlatformServiceError("OAuth oturumu yok veya süresi dolmuş.")
            self._write(data)

        client_secret = (
            config["client_secret"]
            if provider == "google"
            else self._apple_client_secret(config)
        )
        token_payload = self._request_oauth_json(UrlRequest(
            config["token_url"],
            data=urlencode({
                "client_id": config["client_id"],
                "client_secret": client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": config["redirect_uri"],
            }).encode("utf-8"),
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        ), provider=provider)
        if provider == "google":
            access_token = str(token_payload.get("access_token", "")).strip()
            if not access_token:
                raise PlatformServiceError("Google erişim belirteci alınamadı.")
            userinfo = self._request_oauth_json(UrlRequest(
                config["userinfo_url"],
                headers={"Authorization": f"Bearer {access_token}"},
                method="GET",
            ), provider=provider)
        else:
            identity_token = str(token_payload.get("id_token", "")).strip()
            if not identity_token:
                raise PlatformServiceError("Apple kimlik belirteci alınamadı.")
            userinfo = self._verify_apple_identity_token(
                identity_token,
                config,
                str((pending_state or {}).get("nonce_hash", "")),
            )
        subject = str(userinfo.get("sub", "")).strip()
        email = str(userinfo.get("email", "")).strip()
        email_verified = userinfo.get("email_verified") in {True, "true", "True", 1}
        if not subject or (email and not email_verified):
            raise PlatformServiceError(
                f"{provider.title()} hesabı doğrulanamadı."
            )

        with self._lock:
            data = self._read()
            linked_owner = None
            for candidate_id, candidate in data.get("accounts", {}).items():
                linked = candidate.get("oauth_links", {}).get(provider, {})
                if linked.get("subject") == subject:
                    linked_owner = candidate_id
                    if not email:
                        email = str(linked.get("email", "")).strip()
                    break
            mode = str((pending_state or {}).get("mode", "link"))
            if linked_owner and linked_owner != player_id and mode != "login":
                raise PlatformServiceError(
                    f"{provider.title()} hesabı başka bir oyuncuya bağlı."
                )
            target_player_id = linked_owner or player_id
            if not email or not email_verified:
                existing = self._account(data, target_player_id).get(
                    "oauth_links", {}
                ).get(provider, {})
                email = str(existing.get("email", "")).strip()
                if not email:
                    raise PlatformServiceError(
                        f"{provider.title()} hesabının doğrulanmış e-postası alınamadı."
                    )
            account = self._account(data, target_player_id)
            account["oauth_links"][provider] = {
                "subject": subject,
                "email": email,
                "linked_at": now,
            }
            account["contacts"]["email"] = {
                "value": email,
                "verified_at": now,
            }
            exchange = None
            if mode == "login":
                exchange = secrets.token_urlsafe(32)
                exchanges = data.setdefault("oauth_exchanges", {})
                exchanges[self._code_hash(exchange)] = {
                    "player_id": target_player_id,
                    "provider": provider,
                    "expires_at": now + self.OAUTH_EXCHANGE_TTL_SECONDS,
                }
                data["oauth_exchanges"] = {
                    key: value
                    for key, value in exchanges.items()
                    if int(value.get("expires_at", 0)) > now
                }
            self._write(data)
        result = {
            "provider": provider,
            "player_id": target_player_id,
            "linked": True,
        }
        if exchange:
            result["exchange"] = exchange
        return result

    def consume_oauth_exchange(self, exchange: str) -> dict:
        exchange = _clean_text(exchange, maximum=256, label="OAuth değişim kodu")
        exchange_hash = self._code_hash(exchange)
        now = int(self.now_func())
        with self._lock:
            data = self._read()
            pending = data.setdefault("oauth_exchanges", {}).pop(
                exchange_hash, None
            )
            self._write(data)
        if not pending or int(pending.get("expires_at", 0)) <= now:
            raise PlatformServiceError("OAuth değişim kodu yok veya süresi dolmuş.")
        return {
            "player_id": str(pending["player_id"]),
            "provider": str(pending["provider"]),
        }

    def register_device(
        self, player_id: str, device_id: str, device_name: str,
        platform: str, token_id: str, expires_at: int,
    ) -> dict:
        device_id = _clean_text(device_id, maximum=96, label="Cihaz kimliği")
        device_name = _clean_text(device_name or "Bilinmeyen cihaz", maximum=80, label="Cihaz adı")
        platform = _clean_text(platform or "web", maximum=24, label="Platform")
        with self._lock:
            data = self._read()
            account = self._account(data, player_id)
            device = account["devices"].setdefault(device_id, {"token_ids": []})
            device.update({
                "device_id": device_id, "name": device_name,
                "platform": platform, "last_seen_at": int(self.now_func()),
            })
            device["token_ids"] = [
                item for item in device.get("token_ids", [])
                if int(item.get("expires_at", 0)) > int(self.now_func())
            ][-9:] + [{"token_id": token_id, "expires_at": int(expires_at)}]
            self._write(data)
        return self.account_view(player_id)

    def revoke_device(self, player_id: str, device_id: str) -> dict:
        with self._lock:
            data = self._read()
            account = self._account(data, player_id)
            device = account["devices"].pop(device_id, None)
            if device is None:
                raise PlatformServiceError("Cihaz oturumu bulunamadı.")
            revoked = set(account.get("revoked_token_ids", []))
            revoked.update(item["token_id"] for item in device.get("token_ids", []))
            account["revoked_token_ids"] = sorted(revoked)[-200:]
            self._cancel_device_push(account, device_id)
            self._write(data)
        return self.account_view(player_id)

    def token_is_revoked(self, player_id: str, token_id: str) -> bool:
        with self._lock:
            account = self._read()["accounts"].get(player_id, {})
            return token_id in account.get("revoked_token_ids", [])

    def request_recovery(self, identifier: str) -> dict:
        identifier = _clean_text(identifier, maximum=180, label="Kurtarma adresi")
        now = int(self.now_func())
        code = f"{secrets.randbelow(1_000_000):06d}"
        matched_player = None
        with self._lock:
            data = self._read()
            for player_id, account in data["accounts"].items():
                if any(contact.get("value") == identifier for contact in account.get("contacts", {}).values()):
                    matched_player = player_id
                    account["recovery"] = {
                        "code_hash": self._code_hash(code),
                        "expires_at": now + self.RECOVERY_TTL_SECONDS,
                    }
                    break
            if matched_player:
                self._write(data)
        response = {"accepted": True, "expires_at": now + self.RECOVERY_TTL_SECONDS}
        if self.expose_codes and matched_player:
            response.update({"development_code": code, "development_player_id": matched_player})
        return response

    def confirm_recovery(self, player_id: str, code: str) -> bool:
        with self._lock:
            data = self._read()
            account = self._account(data, player_id)
            recovery = account.get("recovery") or {}
            valid = (
                int(recovery.get("expires_at", 0)) > int(self.now_func())
                and secrets.compare_digest(
                    str(recovery.get("code_hash", "")), self._code_hash(code)
                )
            )
            if not valid:
                raise PlatformServiceError("Kurtarma kodu geçersiz veya süresi dolmuş.")
            account["recovery"] = {}
            self._write(data)
        return True

    def subscribe_push(self, player_id: str, device_id: str, platform: str, token: str, *, token_id=None) -> dict:
        if platform not in {"android", "ios"}:
            raise PlatformServiceError("Bildirimler yalnız Android ve iOS uygulamasında kullanılabilir.")
        token = str(token or "").strip()
        pattern = r"[A-Za-z0-9_:\-]{16,4096}" if platform == "android" else r"(?:[a-fA-F0-9]{2}){16,128}"
        if not re.fullmatch(pattern, token):
            raise PlatformServiceError("Bildirim cihaz belirteci geçersiz.")
        if platform == "ios":
            token = token.lower()
        with self._lock:
            data = self._read()
            account = self._account(data, player_id)
            self._require_push_device(account, device_id, token_id)
            self._prune_push(account, int(self.now_func()))
            subscriptions = account["push_subscriptions"]
            if device_id not in subscriptions and len(subscriptions) >= 10:
                raise PlatformServiceError("En fazla 10 cihazda bildirim açılabilir.")
            # A native installation token belongs to one account/device. On an
            # account switch, don't send the former account's notifications.
            for other_account in data["accounts"].values():
                for other_id, other_sub in list(other_account.get("push_subscriptions", {}).items()):
                    if (other_account is not account or other_id != device_id) and other_sub.get("token") == token:
                        self._cancel_device_push(other_account, other_id)
            previous = subscriptions.get(device_id, {})
            same_token = previous.get("token") == token and previous.get("platform") == platform
            subscriptions[device_id] = {
                "platform": platform,
                "token": token,
                "updated_at": int(self.now_func()),
                "registered_at_ms": int(self.now_func() * 1000),
                "revision": previous.get("revision") if same_token and previous.get("revision") else secrets.token_urlsafe(16),
            }
            self._write(data)
        return self.notification_view(player_id)

    def _require_push_device(self, account, device_id, token_id):
        device = account.get("devices", {}).get(device_id)
        if not device:
            raise PlatformServiceError("Önce cihaz oturumu açılmalıdır.")
        if token_id is not None and not any(
            item.get("token_id") == token_id and item.get("expires_at", 0) > self.now_func()
            for item in device.get("token_ids", [])
        ):
            raise PlatformServiceError("Bildirim işlemi yalnız bu cihazın oturumundan yapılabilir.")

    def unsubscribe_push(self, player_id, device_id, *, token_id=None):
        with self._lock:
            data = self._read()
            account = self._account(data, player_id)
            self._require_push_device(account, device_id, token_id)
            self._cancel_device_push(account, device_id)
            self._write(data)
        return self.notification_view(player_id)

    def queue_notification(self, player_id: str, title: str, body: str, deep_link: str = "", *, source_player_id=None) -> dict:
        item = {
            "notification_id": secrets.token_urlsafe(10),
            "title": _clean_text(title, maximum=80, label="Bildirim başlığı"),
            "body": _clean_text(body, maximum=240, label="Bildirim metni"),
            "deep_link": str(deep_link or ""),
            "created_at": int(self.now_func()), "read": False,
        }
        with self._lock:
            data = self._read()
            account = self._account(data, player_id)
            account["notifications"] = (account.get("notifications", []) + [item])[-100:]
            self._enqueue_push(account, item, source_player_id)
            self._write(data)
        return dict(item)

    def notification_view(self, player_id: str) -> dict:
        with self._lock:
            account = self._account(self._read(), player_id)
            return {
                "notifications": [dict(item) for item in account.get("notifications", [])],
                "push": self._push_view(account),
            }

    def create_invite(self, player_id: str) -> dict:
        code = secrets.token_hex(4).upper()
        now = int(self.now_func())
        item = {
            "code": code, "inviter_id": player_id, "created_at": now,
            "expires_at": now + self.INVITE_TTL_SECONDS,
            "uses": 0,
        }
        with self._lock:
            data = self._read()
            data["invites"][code] = item
            self._write(data)
        deep_link = f"gridshard://invite/{code}"
        return {
            **item, "deep_link": deep_link,
            "web_link": f"{self.web_base_url}/invite/{code}",
            "qr_payload": deep_link,
        }

    def accept_invite(self, player_id: str, code: str) -> dict:
        code = str(code or "").strip().upper()
        with self._lock:
            data = self._read()
            item = data["invites"].get(code)
            if not item or int(item.get("expires_at", 0)) <= int(self.now_func()):
                raise PlatformServiceError("Davet kodu geçersiz veya süresi dolmuş.")
            if item["inviter_id"] == player_id:
                raise PlatformServiceError("Kendi davet kodunu kullanamazsın.")
            item["uses"] = int(item.get("uses", 0)) + 1
            self._write(data)
            return {"inviter_id": item["inviter_id"], "code": code, "accepted": True}

    def send_message(self, sender_id: str, recipient_id: str, text: str) -> dict:
        item = {
            "message_id": secrets.token_urlsafe(10),
            "sender_id": sender_id, "recipient_id": recipient_id,
            "text": _clean_text(text, maximum=500, label="Mesaj"),
            "sent_at": int(self.now_func()),
        }
        with self._lock:
            data = self._read()
            data["messages"] = (data.get("messages", []) + [item])[-2000:]
            self._write(data)
        return dict(item)

    def messages(self, player_id: str, peer_id: str | None = None) -> list[dict]:
        with self._lock:
            rows = [
                dict(item) for item in self._read().get("messages", [])
                if player_id in {item.get("sender_id"), item.get("recipient_id")}
                and (not peer_id or peer_id in {item.get("sender_id"), item.get("recipient_id")})
            ]
        return rows[-100:]

    def set_block(self, player_id: str, target_id: str, blocked: bool) -> list[str]:
        with self._lock:
            data = self._read()
            account = self._account(data, player_id)
            values = set(account.get("blocked_player_ids", []))
            (values.add if blocked else values.discard)(target_id)
            account["blocked_player_ids"] = sorted(values)
            self._write(data)
        return sorted(values)

    def is_blocked(self, player_id: str, target_id: str) -> bool:
        with self._lock:
            data = self._read()
            return (
                target_id in self._account(data, player_id).get("blocked_player_ids", [])
                or player_id in self._account(data, target_id).get("blocked_player_ids", [])
            )

    def report(self, reporter_id: str, target_id: str, reason: str, detail: str) -> dict:
        item = {
            "report_id": secrets.token_urlsafe(10), "reporter_id": reporter_id,
            "target_id": target_id,
            "reason": _clean_text(reason, maximum=40, label="Şikâyet nedeni"),
            "detail": str(detail or "").strip()[:500],
            "created_at": int(self.now_func()), "status": "queued",
        }
        with self._lock:
            data = self._read()
            data["reports"] = (data.get("reports", []) + [item])[-2000:]
            self._write(data)
        return {key: item[key] for key in ("report_id", "created_at", "status")}

    def account_view(self, player_id: str) -> dict:
        with self._lock:
            account = self._account(self._read(), player_id)
            return {
                "player_id": player_id,
                "contacts": {
                    channel: {
                        "masked": _masked_contact(contact["value"]),
                        "verified_at": contact["verified_at"],
                    }
                    for channel, contact in account.get("contacts", {}).items()
                },
                "oauth": {
                    provider: {"linked": provider in account.get("oauth_links", {}), **status}
                    for provider, status in self.oauth_status().items()
                },
                "devices": [
                    {key: value for key, value in device.items() if key != "token_ids"}
                    for device in account.get("devices", {}).values()
                ],
                "push": self._push_view(account),
            }

    def export_data(self, player_id: str) -> dict:
        with self._lock:
            data = self._read()
            account = self._account(data, player_id)
            safe_account = {
                "contacts": account.get("contacts", {}),
                "oauth_providers": sorted(account.get("oauth_links", {})),
                "devices": [
                    {key: value for key, value in device.items() if key != "token_ids"}
                    for device in account.get("devices", {}).values()
                ],
                "notifications": account.get("notifications", []),
                "blocked_player_ids": account.get("blocked_player_ids", []),
            }
            messages = [
                item for item in data.get("messages", [])
                if player_id in {item.get("sender_id"), item.get("recipient_id")}
            ]
            return {"account": safe_account, "messages": messages}

    def erase(self, player_id: str) -> None:
        with self._lock:
            data = self._read()
            data["accounts"].pop(player_id, None)
            data["invites"] = {
                code: item for code, item in data["invites"].items()
                if item.get("inviter_id") != player_id
            }
            data["messages"] = [
                item for item in data.get("messages", [])
                if player_id not in {item.get("sender_id"), item.get("recipient_id")}
            ]
            for report in data.get("reports", []):
                if report.get("reporter_id") == player_id:
                    report["reporter_id"] = "deleted-player"
            self._write(data)
