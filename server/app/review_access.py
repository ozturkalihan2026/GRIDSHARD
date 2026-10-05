"""Opt-in Play reviewer account. No shared auth bypass or client-side entitlement."""
from __future__ import annotations

import asyncio
from collections import deque
from contextlib import nullcontext
from dataclasses import dataclass
import hashlib
import hmac
import json
from pathlib import Path
import re
import secrets
from threading import RLock
import time

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from .auth import AuthenticationError
from .player_profile import SEASON_PREMIUM_REWARD_TRACK

MARKER_KEY = "__play_review__"  # Kept in devices JSONB, supported by BOTH repositories.
PASSWORD_ITERATIONS = 600_000
DENIED = "Review access is unavailable or the credentials are incorrect."


@dataclass(frozen=True)
class ReviewConfig:
    username: str
    player_id: str
    owner_id: str
    salt: str
    verifier: str

    @property
    def version(self):
        return hashlib.sha256(f"{self.salt}:{self.verifier}".encode()).hexdigest()

    def verify(self, username, password):
        # Always do the same password work, even for an incorrect username.
        candidate = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(self.salt), PASSWORD_ITERATIONS).hex()
        return hmac.compare_digest(candidate, self.verifier) & hmac.compare_digest(username.encode(), self.username.encode())


def new_review_config():
    """Operator tool only; caller must protect the returned ONE-TIME plaintext."""
    password = secrets.token_urlsafe(32)
    salt = secrets.token_hex(32)
    config = {
        "schema_version": 1,
        "username": f"PlayReview-{secrets.token_hex(6)}",
        "player_id": f"review-{secrets.token_hex(16)}",
        "owner_id": secrets.token_hex(32),
        "salt": salt,
        "verifier": hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), PASSWORD_ITERATIONS).hex(),
    }
    return config, password


def parse_review_config(value):
    keys = {"schema_version", "username", "player_id", "owner_id", "salt", "verifier"}
    if not isinstance(value, dict) or set(value) != keys or value["schema_version"] != 1:
        raise ValueError("Invalid review configuration.")
    patterns = {
        "username": r"PlayReview-[0-9a-f]{12}", "player_id": r"review-[0-9a-f]{32}",
        "owner_id": r"[0-9a-f]{64}", "salt": r"[0-9a-f]{64}", "verifier": r"[0-9a-f]{64}",
    }
    if any(not isinstance(value[key], str) or not re.fullmatch(pattern, value[key]) for key, pattern in patterns.items()):
        raise ValueError("Invalid review configuration.")
    return ReviewConfig(**{key: value[key] for key in keys - {"schema_version"}})


def load_review_config(environ):
    filename = environ.get("GRIDSHARD_PLAY_REVIEW_CONFIG_FILE", "").strip()
    if not filename:
        return None  # Disabled by default; no anonymous demo endpoint.
    try:
        path = Path(filename)
        if not path.is_absolute():
            raise ValueError("Absolute file path required.")
        with path.open("rb") as handle:
            raw = handle.read(4097)
        if len(raw) > 4096:
            raise ValueError("Oversized configuration.")
        return parse_review_config(json.loads(raw))
    except (OSError, ValueError, TypeError) as exc:
        # Fail startup closed; never echo file contents or a credential.
        raise RuntimeError("Play review configuration is unreadable or invalid.") from exc


class ReviewLoginRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str = Field(min_length=1, max_length=100)
    password: str = Field(min_length=1, max_length=100)
    device_secret: str = Field(min_length=32, max_length=128)
    device_id: str = Field(min_length=1, max_length=96)
    device_name: str = Field(default="GRIDSHARD review device", max_length=100)
    platform: str = Field(default="android", pattern=r"^(android|ios|web)$")


class ReviewAccessService:
    def __init__(self, config, auth, platform, profiles, profile_exists, persist,
                 operation=lambda player_id: nullcontext(), now=time.time):
        self.config, self.auth, self.platform, self.profiles = config, auth, platform, profiles
        self.profile_exists, self.persist, self.operation, self.now = profile_exists, persist, operation, now
        self._lock = RLock()
        self._attempts = deque()

    def allow_attempt(self, ip):
        # Per-process SINGLE-worker limit, independent of spoofed bearer headers.
        # A global bound also prevents unbounded attacker-controlled IP storage.
        with self._lock:
            now = self.now()
            while self._attempts and self._attempts[0][0] <= now - 60:
                self._attempts.popleft()
            if len(self._attempts) >= 40 or sum(entry[1] == ip for entry in self._attempts) >= 5:
                return False
            self._attempts.append((now, ip))
            return True

    def _marker(self, record):
        return (record or {}).get("devices", {}).get(MARKER_KEY)

    def _owned(self, player_id, marker):
        config = self.config
        return bool(config and player_id == config.player_id and isinstance(marker, dict)
                    and hmac.compare_digest(str(marker.get("owner_id", "")), config.owner_id))

    def assert_device_allowed(self, player_id, device_id):
        if not player_id.startswith("review-"):
            return False
        record = self.auth.repository.get(player_id)
        marker = self._marker(record)
        if marker is None:
            if self.config and player_id == self.config.player_id and record is None:
                raise AuthenticationError(DENIED)  # Reserved ID cannot be claimed through guest registration.
            return False
        if not self._owned(player_id, marker) or marker.get("authorized_devices", {}).get(device_id) != self.config.version:
            raise AuthenticationError(DENIED)
        return True

    def assert_identity_allowed(self, identity):
        if not identity.player_id.startswith("review-"):
            return
        marker = self._marker(self.auth.repository.get(identity.player_id))
        if marker is None:
            return
        token = marker.get("tokens", {}).get(identity.token_id, {})
        if not self._owned(identity.player_id, marker) or token.get("version") != self.config.version:
            raise AuthenticationError(DENIED)

    def _grant_review_content(self, player_id, *, refill=False):
        profile = self.profiles.get_or_create(player_id, display_name=f"PlayReview-{player_id[-8:]}")
        profile.season_premium_pass_season_id = profile.active_meta_season_id
        profile.battle_premium_season_id = profile.active_meta_season_id
        # All premium tiers are inspectable/claimable, without changing trophies.
        profile.season_xp = max(profile.season_xp, max(item["required_xp"] for item in SEASON_PREMIUM_REWARD_TRACK))
        if refill:
            # Demonstrate the content currency packs buy, NOT fabricated payment receipts.
            profile.flux_shards = max(profile.flux_shards, 1050)
            profile.circuit_credits = max(profile.circuit_credits, 9000)
        self.persist(player_id)

    def assert_external_login_allowed(self, player_id):
        if not player_id.startswith("review-"):
            return
        if self._marker(self.auth.repository.get(player_id)) is not None:
            raise AuthenticationError("Review accounts use review sign-in, not personal provider linking.")

    def record_session(self, player_id, device_id, result, *, refill=False):
        if not player_id.startswith("review-"):
            return
        record = self.auth.repository.get(player_id)
        marker = self._marker(record)
        if marker is None:
            return  # An ordinary account: absolutely no grants or markers.
        if not self._owned(player_id, marker):
            raise AuthenticationError(DENIED)
        identity = self.auth.verify_access_token(result["access_token"])
        tokens = {key: value for key, value in marker.get("tokens", {}).items()
                  if value.get("expires_at", 0) > self.now() and value.get("version") == self.config.version}
        if len(tokens) >= 128:
            # Bounded session ledger; existing devices can re-authenticate normally.
            tokens.pop(next(iter(tokens)))
        tokens[identity.token_id] = {"version": self.config.version, "expires_at": identity.expires_at}
        authorized = {key: value for key, value in marker.get("authorized_devices", {}).items()
                      if value == self.config.version}
        authorized[device_id] = self.config.version
        record["devices"][MARKER_KEY] = {"owner_id": self.config.owner_id, "tokens": tokens, "authorized_devices": authorized}
        self.auth.repository.update(player_id, record)
        self._grant_review_content(player_id, refill=refill)

    def login(self, request):
        config = self.config
        try:
            valid = config and config.verify(request.username, request.password)
        except UnicodeError:
            valid = False
        if not valid:
            raise AuthenticationError(DENIED)
        if request.device_id != request.device_id.strip() or request.device_id.startswith("__"):
            raise AuthenticationError(DENIED)
        # Use the same persistent lock/transaction as ordinary auth, with a fixed
        # SERVER-selected player ID. No client-supplied target, scope or grant.
        with self.operation(config.player_id):
            record = self.auth.repository.get(config.player_id)
            if record is None:
                if self.profile_exists(config.player_id):
                    raise AuthenticationError(DENIED)
            elif not self._owned(config.player_id, self._marker(record)):
                raise AuthenticationError(DENIED)  # Never promote an existing unmarked account.
            # 128 device proofs plus the one private marker entry.
            if record is not None and request.device_id not in record["devices"] and len(record["devices"]) >= 129:
                raise AuthenticationError(DENIED)
            result = self.auth.authorize_device(config.player_id, request.device_secret, request.device_id)
            if record is None:
                record = self.auth.repository.get(config.player_id)
                record["devices"][MARKER_KEY] = {"owner_id": config.owner_id}
                self.auth.repository.update(config.player_id, record)
            self.record_session(config.player_id, request.device_id, result, refill=True)
            identity = self.auth.verify_access_token(result["access_token"])
            self.platform.register_device(config.player_id, request.device_id, request.device_name,
                                          request.platform, identity.token_id, identity.expires_at)
            return {**result, "device_id": request.device_id, "review_access": True}


def review_access_router(service_getter):
    router = APIRouter()

    @router.post("/auth/review-session")
    async def review_session(request: Request):
        service = service_getter()
        if not service.allow_attempt(request.client.host if request.client else "unknown"):
            raise HTTPException(429, "Too many review sign-in attempts. Try again in one minute.", headers={"Retry-After": "60"})
        if service.config is None:
            raise HTTPException(404, DENIED)
        # No secret-bearing Pydantic validation errors, nor unchecked large body.
        body = bytearray()
        try:
            async for chunk in request.stream():
                body.extend(chunk)
                if len(body) > 4096:
                    raise HTTPException(413, "Review sign-in request is too large.")
            payload = ReviewLoginRequest.model_validate(json.loads(body))
        except (ValueError, UnicodeError, ValidationError):
            raise HTTPException(422, "Invalid review sign-in request.") from None
        try:
            result = await asyncio.to_thread(service.login, payload)
            return JSONResponse(result, headers={"Cache-Control": "no-store"})
        except AuthenticationError:
            raise HTTPException(401, DENIED) from None

    return router
