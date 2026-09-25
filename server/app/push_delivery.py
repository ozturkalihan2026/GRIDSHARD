"""FCM HTTP v1 / APNs HTTP/2 senders. Never log payloads, tokens or keys."""

from dataclasses import dataclass
from email.utils import parsedate_to_datetime
import base64
import json
import logging
import os
from pathlib import Path
import re
import time


@dataclass(frozen=True)
class DeliveryResult:
    status: str  # accepted by provider (not confirmed on device), retry, invalid, failed
    code: str
    retry_after: int = 0
    invalidated_at: int | None = None  # APNs milliseconds since Unix epoch


def _b64(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _jwt(header: dict, claims: dict, key, *, elliptic: bool = False) -> str:
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import ec, padding, utils
    message = ".".join(_b64(json.dumps(part, separators=(",", ":")).encode()) for part in (header, claims))
    if elliptic:
        der = key.sign(message.encode(), ec.ECDSA(hashes.SHA256()))
        r, s = utils.decode_dss_signature(der)
        signature = r.to_bytes(32, "big") + s.to_bytes(32, "big")
    else:
        signature = key.sign(message.encode(), padding.PKCS1v15(), hashes.SHA256())
    return f"{message}.{_b64(signature)}"


def _json(response) -> dict:
    try:
        payload = response.json()
        return payload if isinstance(payload, dict) else {}
    except (ValueError, UnicodeError):
        return {}


def _retry_after(response, now: int) -> int:
    value = response.headers.get("retry-after", "")
    try:
        return max(60, int(value))
    except (ValueError, TypeError):
        try:
            return max(60, int(parsedate_to_datetime(value).timestamp()) - now)
        except (ValueError, TypeError, OverflowError):
            return 60


class PushSender:
    """One sender per background worker; disabled by default, injectable in tests."""

    def __init__(self, *, fcm=None, apns=None, client=None, now_func=time.time):
        self.fcm = fcm
        self.apns = apns
        self.client = client
        self.now = now_func
        self._google_token = ("", 0)
        self._apple_token = ("", 0)
        self._cooldowns = {}

    @property
    def platforms(self) -> list[str]:
        return (["android"] if self.fcm else []) + (["ios"] if self.apns else [])

    @property
    def available_platforms(self) -> list[str]:
        return [platform for platform in self.platforms if self._cooldowns.get(platform, 0) <= self.now()]

    def close(self):
        if self.client is not None:
            self.client.close()

    @classmethod
    def from_environment(cls):
        if os.environ.get("GRIDSHARD_PUSH_ENABLED", "0").lower() not in {"1", "true", "on", "yes"}:
            return cls()
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.primitives.asymmetric import ec, rsa
        import httpx

        fcm = apns = None
        try:
            service_file = os.environ.get("GRIDSHARD_FCM_SERVICE_ACCOUNT_FILE", "").strip()
            if service_file:
                service = json.loads(Path(service_file).read_text(encoding="utf-8"))
                key = serialization.load_pem_private_key(service["private_key"].encode(), password=None)
                project = service["project_id"]
                if (service.get("type") != "service_account" or not isinstance(key, rsa.RSAPrivateKey)
                        or not re.fullmatch(r"[a-z0-9][a-z0-9-]{3,62}", project)
                        or not service.get("client_email")):
                    raise ValueError("Invalid FCM configuration")
                fcm = {"project": project, "email": service["client_email"], "key": key}
            key_file = os.environ.get("GRIDSHARD_APNS_PRIVATE_KEY_FILE", "").strip()
            if key_file:
                key = serialization.load_pem_private_key(Path(key_file).read_bytes(), password=None)
                team = os.environ.get("GRIDSHARD_APNS_TEAM_ID", "").strip()
                key_id = os.environ.get("GRIDSHARD_APNS_KEY_ID", "").strip()
                topic = os.environ.get("GRIDSHARD_APNS_TOPIC", "").strip()
                environment = os.environ.get("GRIDSHARD_APNS_ENVIRONMENT", "").strip()
                if (not isinstance(key, ec.EllipticCurvePrivateKey) or not isinstance(key.curve, ec.SECP256R1)
                        or not re.fullmatch(r"[A-Z0-9]{10}", team)
                        or not re.fullmatch(r"[A-Z0-9]{10}", key_id)
                        or not re.fullmatch(r"[A-Za-z0-9.-]{3,255}", topic)
                        or environment not in {"sandbox", "production"}):
                    raise ValueError("Invalid APNs configuration")
                apns = {"key": key, "team": team, "key_id": key_id, "topic": topic,
                        "host": "api.sandbox.push.apple.com" if environment == "sandbox" else "api.push.apple.com"}
            if not fcm and not apns:
                raise ValueError("No configured push adapter")
        except (OSError, ValueError, KeyError, TypeError):
            # No filenames, key material or provider responses in startup logs.
            raise ValueError("Push configuration invalid; see docs/PUSH_NOTIFICATIONS.md") from None
        # HTTP client INFO/DEBUG logging exposes APNs token paths/headers.
        logging.getLogger("httpx").setLevel(logging.WARNING)
        logging.getLogger("httpcore").setLevel(logging.WARNING)
        return cls(fcm=fcm, apns=apns, client=httpx.Client(
            http2=True, timeout=10, follow_redirects=False,
            limits=httpx.Limits(max_connections=4, max_keepalive_connections=2),
        ))

    def send(self, subscription: dict, notification: dict, *, expires_at: int) -> DeliveryResult:
        platform = subscription.get("platform")
        if platform not in self.platforms:
            return DeliveryResult("retry", "provider_disabled", 300)
        if expires_at <= int(self.now()):
            return DeliveryResult("failed", "expired")
        try:
            result = self._fcm(subscription, notification, expires_at) if platform == "android" else self._apns(subscription, notification, expires_at)
        except Exception:
            # Network/protocol failures are ambiguous: bounded retries, never
            # delete a device token, never leak an exception containing its URL.
            result = DeliveryResult("retry", "transport_error", 60)
        if result.status == "retry":
            self._cooldowns[platform] = self.now() + result.retry_after
        return result

    def _fcm(self, subscription, item, expires_at):
        now = int(self.now())
        access, expires = self._google_token
        if expires <= now + 60:
            assertion = _jwt({"alg": "RS256", "typ": "JWT"}, {
                "iss": self.fcm["email"], "scope": "https://www.googleapis.com/auth/firebase.messaging",
                "aud": "https://oauth2.googleapis.com/token", "iat": now, "exp": now + 3600,
            }, self.fcm["key"])
            response = self.client.post("https://oauth2.googleapis.com/token", data={
                "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer", "assertion": assertion,
            })
            payload = _json(response)
            if response.status_code != 200 or not payload.get("access_token"):
                return DeliveryResult("retry", "fcm_authorization", max(300, _retry_after(response, now)))
            access = payload["access_token"]
            self._google_token = (access, now + int(payload.get("expires_in", 3600)))
        now = int(self.now())
        if expires_at <= now:
            return DeliveryResult("failed", "expired")
        response = self.client.post(
            f"https://fcm.googleapis.com/v1/projects/{self.fcm['project']}/messages:send",
            headers={"Authorization": f"Bearer {access}"}, json={"message": {
                "token": subscription["token"],
                "notification": {"title": item["title"], "body": item["body"]},
                "data": {"notification_id": item["notification_id"], "deep_link": item["deep_link"], "recipient_id": item["recipient_id"]},
                "android": {"ttl": f"{max(1, expires_at - now)}s", "priority": "normal",
                            "notification": {"channel_id": "gridshard_social", "tag": item["notification_id"]}},
            }},
        )
        payload = _json(response)
        if response.status_code == 200 and payload.get("name"):
            return DeliveryResult("accepted", "fcm_accepted")
        details = payload.get("error", {}).get("details", [])
        if response.status_code == 404 and any(
            isinstance(entry, dict) and entry.get("@type") == "type.googleapis.com/google.firebase.fcm.v1.FcmError"
            and entry.get("errorCode") == "UNREGISTERED" for entry in details
        ):
            return DeliveryResult("invalid", "fcm_unregistered")
        if response.status_code in {401, 403}:
            self._google_token = ("", 0)
            return DeliveryResult("retry", "fcm_authorization", max(300, _retry_after(response, now)))
        if response.status_code in {408, 429} or response.status_code >= 500:
            return DeliveryResult("retry", "fcm_unavailable", _retry_after(response, now))
        return DeliveryResult("failed", "fcm_rejected")

    def _apns(self, subscription, item, expires_at):
        now = int(self.now())
        bearer, expires = self._apple_token
        if expires <= now:
            bearer = _jwt({"alg": "ES256", "kid": self.apns["key_id"]},
                          {"iss": self.apns["team"], "iat": now}, self.apns["key"], elliptic=True)
            self._apple_token = (bearer, now + 50 * 60)
        response = self.client.post(
            f"https://{self.apns['host']}/3/device/{subscription['token']}",
            headers={"authorization": f"bearer {bearer}", "apns-topic": self.apns["topic"],
                     "apns-push-type": "alert", "apns-priority": "10",
                     "apns-expiration": str(expires_at), "apns-collapse-id": item["notification_id"]},
            json={"aps": {"alert": {"title": item["title"], "body": item["body"]}, "sound": "default"},
                  "notification_id": item["notification_id"], "deep_link": item["deep_link"], "recipient_id": item["recipient_id"]},
        )
        if response.status_code == 200:
            return DeliveryResult("accepted", "apns_accepted")
        payload = _json(response)
        reason = payload.get("reason")
        if response.status_code == 410 and reason == "Unregistered":
            timestamp = payload.get("timestamp")
            return DeliveryResult("invalid", "apns_unregistered", invalidated_at=timestamp if type(timestamp) is int else None)
        if response.status_code == 403:
            if reason == "ExpiredProviderToken":
                self._apple_token = ("", 0)
            return DeliveryResult("retry", "apns_authorization", max(300, _retry_after(response, now)))
        if response.status_code in {408, 429} or response.status_code >= 500:
            return DeliveryResult("retry", "apns_unavailable", _retry_after(response, now))
        # BadDeviceToken can also mean an environment/topic mismatch. Keep the
        # subscription until a definitive Unregistered response or user revoke.
        return DeliveryResult("failed", "apns_rejected")
