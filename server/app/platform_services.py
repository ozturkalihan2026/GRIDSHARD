"""Account, device, notification and social platform contracts.

The service owns no vendor credentials.  OAuth and push adapters are enabled
only when their environment variables are present; local development therefore
cannot accidentally pretend that a Google/Apple login or a push delivery was
completed.  Durable product state is still available through the JSON backend
used by the standalone server.
"""

from __future__ import annotations

import hashlib
import json
import os
import secrets
import threading
import time
from pathlib import Path
from tempfile import NamedTemporaryFile
from urllib.parse import urlencode


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


class PlatformService:
    VERIFICATION_TTL_SECONDS = 10 * 60
    RECOVERY_TTL_SECONDS = 15 * 60
    INVITE_TTL_SECONDS = 7 * 24 * 60 * 60

    def __init__(
        self,
        path: Path,
        *,
        now_func=time.time,
        expose_codes: bool = False,
        web_base_url: str = "https://gridshard.game",
    ):
        self.path = Path(path)
        self.now_func = now_func
        self.expose_codes = bool(expose_codes)
        self.web_base_url = web_base_url.rstrip("/")
        self._lock = threading.RLock()

    def _empty(self) -> dict:
        return {"accounts": {}, "invites": {}, "messages": [], "reports": []}

    def _read(self) -> dict:
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
        provider_env = "GRIDSHARD_EMAIL_PROVIDER" if channel == "email" else "GRIDSHARD_SMS_PROVIDER"
        response = {
            "channel": channel,
            "destination": _masked_contact(destination),
            "expires_at": now + self.VERIFICATION_TTL_SECONDS,
            "delivery_configured": bool(os.environ.get(provider_env, "").strip()),
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
        providers = {}
        for provider in ("google", "apple"):
            prefix = f"GRIDSHARD_{provider.upper()}_OAUTH"
            providers[provider] = {
                "configured": bool(
                    os.environ.get(f"{prefix}_CLIENT_ID", "").strip()
                    and os.environ.get(f"{prefix}_AUTHORIZE_URL", "").strip()
                    and os.environ.get(f"{prefix}_REDIRECT_URI", "").strip()
                )
            }
        return providers

    def start_oauth(self, player_id: str, provider: str) -> dict:
        if provider not in {"google", "apple"}:
            raise PlatformServiceError("Desteklenmeyen OAuth sağlayıcısı.")
        prefix = f"GRIDSHARD_{provider.upper()}_OAUTH"
        client_id = os.environ.get(f"{prefix}_CLIENT_ID", "").strip()
        authorize_url = os.environ.get(f"{prefix}_AUTHORIZE_URL", "").strip()
        redirect_uri = os.environ.get(f"{prefix}_REDIRECT_URI", "").strip()
        if not client_id or not authorize_url or not redirect_uri:
            return {"provider": provider, "configured": False, "authorization_url": None}
        state = secrets.token_urlsafe(24)
        with self._lock:
            data = self._read()
            account = self._account(data, player_id)
            account["oauth_states"][provider] = {
                "state_hash": self._code_hash(state),
                "expires_at": int(self.now_func()) + 600,
            }
            self._write(data)
        params = {
            "client_id": client_id, "redirect_uri": redirect_uri,
            "response_type": "code", "scope": "openid email",
            "state": state,
        }
        if provider == "apple":
            params["response_mode"] = "form_post"
        return {
            "provider": provider, "configured": True,
            "authorization_url": f"{authorize_url}?{urlencode(params)}",
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
            account["push_subscriptions"].pop(device_id, None)
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

    def subscribe_push(self, player_id: str, device_id: str, platform: str, token: str) -> dict:
        token = _clean_text(token, maximum=512, label="Push belirteci")
        with self._lock:
            data = self._read()
            account = self._account(data, player_id)
            if device_id not in account["devices"]:
                raise PlatformServiceError("Önce cihaz oturumu açılmalıdır.")
            account["push_subscriptions"][device_id] = {
                "platform": platform,
                "token": token,
                "updated_at": int(self.now_func()),
            }
            self._write(data)
        return self.notification_view(player_id)

    def queue_notification(self, player_id: str, title: str, body: str, deep_link: str = "") -> dict:
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
            self._write(data)
        return dict(item)

    def notification_view(self, player_id: str) -> dict:
        with self._lock:
            account = self._account(self._read(), player_id)
            return {
                "notifications": [dict(item) for item in account.get("notifications", [])],
                "push": {
                    "subscribed_devices": len(account.get("push_subscriptions", {})),
                    "adapter_configured": bool(os.environ.get("GRIDSHARD_PUSH_PROVIDER", "").strip()),
                },
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
                "push": {
                    "subscribed_devices": len(account.get("push_subscriptions", {})),
                    "adapter_configured": bool(os.environ.get("GRIDSHARD_PUSH_PROVIDER", "").strip()),
                },
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
