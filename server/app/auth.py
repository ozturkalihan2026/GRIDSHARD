from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Callable


PLAYER_ID_MAX_LENGTH = 72
DEVICE_SECRET_MIN_LENGTH = 32
PBKDF2_ITERATIONS = 310_000


class AuthenticationError(ValueError):
    """Raised when a participant identity or access token is invalid."""


def _b64url_encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    try:
        return base64.urlsafe_b64decode(value + padding)
    except (ValueError, TypeError) as exc:
        raise AuthenticationError("Kimlik belirteci çözümlenemedi.") from exc


def validate_player_id(player_id: str) -> str:
    value = str(player_id or "").strip()
    if not (3 <= len(value) <= PLAYER_ID_MAX_LENGTH):
        raise AuthenticationError("Oyuncu kimliği 3-72 karakter olmalıdır.")
    if not value[0].isalnum() or any(
        not (character.isalnum() or character in "_-.")
        for character in value
    ):
        raise AuthenticationError("Oyuncu kimliği geçersiz karakter içeriyor.")
    return value


@dataclass(frozen=True, slots=True)
class AuthenticatedIdentity:
    player_id: str
    expires_at: int
    token_id: str


class JsonIdentityRepository:
    """Stores only salted device-secret verifiers, never the device secret."""

    def __init__(self, path: Path):
        self.path = Path(path)
        self._lock = threading.RLock()

    def get(self, player_id: str) -> dict | None:
        with self._lock:
            return self._read_all().get(player_id)

    def create(self, player_id: str, record: dict) -> None:
        with self._lock:
            identities = self._read_all()
            if player_id in identities:
                raise AuthenticationError("Oyuncu kimliği zaten kayıtlı.")
            identities[player_id] = dict(record)
            self._write_all(identities)

    def _read_all(self) -> dict[str, dict]:
        if not self.path.exists():
            return {}
        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            raise AuthenticationError("Kimlik deposu okunamadı.") from exc
        if not isinstance(payload, dict):
            raise AuthenticationError("Kimlik deposu biçimi geçersiz.")
        return {
            str(player_id): dict(record)
            for player_id, record in payload.items()
            if isinstance(record, dict)
        }

    def _write_all(self, identities: dict[str, dict]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary_name: str | None = None
        try:
            with NamedTemporaryFile(
                "w",
                encoding="utf-8",
                dir=self.path.parent,
                delete=False,
                suffix=".tmp",
            ) as temporary:
                json.dump(
                    identities,
                    temporary,
                    ensure_ascii=False,
                    indent=2,
                    sort_keys=True,
                )
                temporary.flush()
                os.fsync(temporary.fileno())
                temporary_name = temporary.name
            Path(temporary_name).replace(self.path)
        except OSError as exc:
            if temporary_name:
                Path(temporary_name).unlink(missing_ok=True)
            raise AuthenticationError("Kimlik deposu yazılamadı.") from exc


class ParticipantAuthService:
    def __init__(
        self,
        repository: JsonIdentityRepository,
        signing_key: bytes,
        *,
        now_func: Callable[[], float] = time.time,
        access_token_ttl_seconds: int = 3600,
    ):
        if len(signing_key) < 32:
            raise ValueError("Kimlik imzalama anahtarı en az 32 bayt olmalıdır.")
        self.repository = repository
        self.signing_key = signing_key
        self.now_func = now_func
        self.access_token_ttl_seconds = max(60, int(access_token_ttl_seconds))

    def register_or_login(self, player_id: str, device_secret: str) -> dict:
        player_id = validate_player_id(player_id)
        device_secret = str(device_secret or "")
        if len(device_secret) < DEVICE_SECRET_MIN_LENGTH:
            raise AuthenticationError("Cihaz sırrı en az 32 karakter olmalıdır.")

        record = self.repository.get(player_id)
        if record is None:
            salt = secrets.token_bytes(16)
            verifier = self._device_secret_verifier(device_secret, salt)
            self.repository.create(
                player_id,
                {
                    "salt": _b64url_encode(salt),
                    "verifier": _b64url_encode(verifier),
                    "created_at": int(self.now_func()),
                },
            )
        else:
            try:
                salt = _b64url_decode(str(record["salt"]))
                expected = _b64url_decode(str(record["verifier"]))
            except (KeyError, TypeError) as exc:
                raise AuthenticationError("Oyuncu kimliği kaydı bozuk.") from exc
            actual = self._device_secret_verifier(device_secret, salt)
            if not hmac.compare_digest(actual, expected):
                raise AuthenticationError("Oyuncu kimliği doğrulanamadı.")

        token, expires_at = self.issue_access_token(player_id)
        return {
            "player_id": player_id,
            "access_token": token,
            "token_type": "bearer",
            "expires_at": expires_at,
        }

    def issue_access_token(self, player_id: str) -> tuple[str, int]:
        player_id = validate_player_id(player_id)
        issued_at = int(self.now_func())
        expires_at = issued_at + self.access_token_ttl_seconds
        header = {"alg": "HS256", "typ": "GRIDSHARD"}
        payload = {
            "sub": player_id,
            "iat": issued_at,
            "exp": expires_at,
            "jti": secrets.token_urlsafe(12),
            "ver": 1,
        }
        encoded_header = _b64url_encode(
            json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8")
        )
        encoded_payload = _b64url_encode(
            json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        )
        signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
        signature = hmac.new(
            self.signing_key,
            signing_input,
            hashlib.sha256,
        ).digest()
        return f"{encoded_header}.{encoded_payload}.{_b64url_encode(signature)}", expires_at

    def verify_access_token(self, token: str) -> AuthenticatedIdentity:
        parts = str(token or "").split(".")
        if len(parts) != 3:
            raise AuthenticationError("Kimlik belirteci biçimi geçersiz.")
        encoded_header, encoded_payload, encoded_signature = parts
        signing_input = f"{encoded_header}.{encoded_payload}".encode("ascii")
        expected = hmac.new(
            self.signing_key,
            signing_input,
            hashlib.sha256,
        ).digest()
        actual = _b64url_decode(encoded_signature)
        if not hmac.compare_digest(actual, expected):
            raise AuthenticationError("Kimlik belirteci imzası geçersiz.")
        try:
            header = json.loads(_b64url_decode(encoded_header))
            payload = json.loads(_b64url_decode(encoded_payload))
            player_id = validate_player_id(payload["sub"])
            expires_at = int(payload["exp"])
            token_id = str(payload["jti"])
        except (KeyError, TypeError, ValueError, json.JSONDecodeError) as exc:
            raise AuthenticationError("Kimlik belirteci içeriği geçersiz.") from exc
        if header != {"alg": "HS256", "typ": "GRIDSHARD"}:
            raise AuthenticationError("Kimlik belirteci başlığı geçersiz.")
        if expires_at <= int(self.now_func()):
            raise AuthenticationError("Kimlik belirtecinin süresi doldu.")
        return AuthenticatedIdentity(
            player_id=player_id,
            expires_at=expires_at,
            token_id=token_id,
        )

    @staticmethod
    def bearer_token(authorization: str | None) -> str:
        scheme, separator, value = str(authorization or "").partition(" ")
        if separator != " " or scheme.lower() != "bearer" or not value.strip():
            raise AuthenticationError("Bearer kimlik belirteci gerekli.")
        return value.strip()

    @staticmethod
    def _device_secret_verifier(device_secret: str, salt: bytes) -> bytes:
        return hashlib.pbkdf2_hmac(
            "sha256",
            device_secret.encode("utf-8"),
            salt,
            PBKDF2_ITERATIONS,
        )


def load_or_create_signing_key(path: Path) -> bytes:
    configured = os.environ.get("GRIDSHARD_AUTH_SIGNING_KEY", "").strip()
    if configured:
        value = configured.encode("utf-8")
        if len(value) < 32:
            raise RuntimeError("GRIDSHARD_AUTH_SIGNING_KEY en az 32 karakter olmalıdır.")
        return value

    path = Path(path)
    if path.exists():
        try:
            return _b64url_decode(path.read_text(encoding="ascii").strip())
        except (OSError, AuthenticationError) as exc:
            raise RuntimeError("Yerel kimlik imzalama anahtarı okunamadı.") from exc

    path.parent.mkdir(parents=True, exist_ok=True)
    key = secrets.token_bytes(48)
    temporary_path: Path | None = None
    try:
        with NamedTemporaryFile(
            "w",
            encoding="ascii",
            dir=path.parent,
            delete=False,
            suffix=".tmp",
        ) as temporary:
            temporary.write(_b64url_encode(key))
            temporary.flush()
            os.fsync(temporary.fileno())
            temporary_path = Path(temporary.name)
        temporary_path.replace(path)
    except OSError as exc:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)
        raise RuntimeError("Yerel kimlik imzalama anahtarı oluşturulamadı.") from exc
    return key
