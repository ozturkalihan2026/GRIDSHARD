"""Opt-in product analytics, isolated from operational/game telemetry."""

from __future__ import annotations

from contextlib import contextmanager
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from threading import RLock
import time
from uuid import uuid4


RETENTION_DAYS = 30
MAX_EVENTS = 20_000
MIN_REPORT_PLAYERS = 5
SCHEMA_VERSION = 1
SCREENS = frozenset({
    "menu", "shop", "modules", "team", "events", "weekly-event", "team-event",
    "play", "profile", "avatar", "friends", "daily", "daily-rewards",
    "daily-missions", "rewards", "laboratory", "statistics", "settings",
})
EVENT_DIMENSIONS = {
    "session_started": {},
    "screen_view": {"screen": SCREENS},
    "matchmaking_started": {"mode": frozenset({"arena", "team", "friend", "training"})},
    "matchmaking_matched": {"opponent": frozenset({"human", "ai"})},
    "battle_completed": {
        "result": frozenset({"win", "loss", "draw"}),
        "mode": frozenset({"arena", "team", "friend", "training"}),
        "duration": frozenset({"under_60s", "60_179s", "180s_plus"}),
    },
    "performance_sample": {
        "screen": frozenset({"play"}),
        "fps": frozenset({"under_20", "20_29", "30_44", "45_59", "60_plus"}),
    },
}
CLIENT_EVENT_TYPES = frozenset(EVENT_DIMENSIONS) - {"battle_completed"}


class ProductAnalyticsError(ValueError):
    pass


class ProductAnalyticsStorageError(ProductAnalyticsError):
    pass


def validate_product_events(events: list) -> list[dict]:
    for event in events:
        if not isinstance(event, dict) or set(event) != {"id", "subject", "type", "at_ms", "dimensions"}:
            raise ProductAnalyticsStorageError("Analitik kaydı şeması geçersiz.")
        for key in ("id", "subject"):
            value = event[key]
            if not isinstance(value, str) or len(value) != 32 or any(char not in "0123456789abcdef" for char in value):
                raise ProductAnalyticsStorageError("Analitik kimliği geçersiz.")
        if type(event["at_ms"]) is not int or event["type"] not in EVENT_DIMENSIONS:
            raise ProductAnalyticsStorageError("Analitik olay kaydı geçersiz.")
        try:
            ProductAnalyticsService._validate(event["type"], event["dimensions"], client=False)
        except ProductAnalyticsError as exc:
            raise ProductAnalyticsStorageError("Analitik kayıt alanı geçersiz.") from exc
    return events


class ProductAnalyticsService:
    def __init__(self, path: Path, signing_key: bytes, consent_provider, *, now_func=time.time):
        self.path = Path(path)
        self._key = hmac.new(signing_key, b"gridshard:product-analytics:v1", hashlib.sha256).digest()
        self._consent_provider = consent_provider
        self._now = now_func
        self._lock = RLock()

    @contextmanager
    def _file_lock(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        lock_path = self.path.with_name(self.path.name + ".lock")
        descriptor = None
        deadline = time.monotonic() + 5
        while descriptor is None:
            try:
                descriptor = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            except FileExistsError:
                try:
                    if time.time() - lock_path.stat().st_mtime > 30:
                        lock_path.unlink(missing_ok=True)
                        continue
                except OSError:
                    pass
                if time.monotonic() >= deadline:
                    raise ProductAnalyticsStorageError("Ürün analitiği deposu meşgul.")
                time.sleep(.02)
        try:
            os.write(descriptor, f"{os.getpid()}\n".encode("ascii"))
            yield
        finally:
            os.close(descriptor)
            lock_path.unlink(missing_ok=True)

    def _subject(self, player_id: str) -> str:
        return hmac.new(self._key, player_id.encode("utf-8"), hashlib.sha256).hexdigest()[:32]

    def _read(self) -> list[dict]:
        if not self.path.exists():
            return []
        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, UnicodeError, json.JSONDecodeError) as exc:
            raise ProductAnalyticsStorageError("Ürün analitiği deposu okunamadı.") from exc
        if not isinstance(payload, dict) or payload.get("schema_version") != SCHEMA_VERSION or not isinstance(payload.get("events"), list):
            raise ProductAnalyticsStorageError("Ürün analitiği şeması geçersiz.")
        return validate_product_events(payload["events"])

    def _write(self, events: list[dict]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temporary_name = None
        try:
            with NamedTemporaryFile("w", encoding="utf-8", dir=self.path.parent, suffix=".tmp", delete=False) as temporary:
                temporary_name = temporary.name
                json.dump({"schema_version": SCHEMA_VERSION, "events": events}, temporary, ensure_ascii=False, separators=(",", ":"))
                temporary.write("\n")
                temporary.flush()
                os.fsync(temporary.fileno())
            os.replace(temporary_name, self.path)
        except OSError as exc:
            raise ProductAnalyticsStorageError("Ürün analitiği deposu yazılamadı.") from exc
        finally:
            if temporary_name is not None:
                Path(temporary_name).unlink(missing_ok=True)

    def _retained(self, events: list[dict], now_ms: int) -> list[dict]:
        cutoff = now_ms - RETENTION_DAYS * 24 * 60 * 60 * 1000
        return [event for event in events if isinstance(event, dict) and type(event.get("at_ms")) is int and cutoff <= event["at_ms"] <= now_ms][-MAX_EVENTS:]

    @staticmethod
    def _validate(event_type: str, dimensions: dict, *, client: bool) -> dict:
        if event_type not in (CLIENT_EVENT_TYPES if client else EVENT_DIMENSIONS):
            raise ProductAnalyticsError("Analitik olay türü izinli değil.")
        schema = EVENT_DIMENSIONS[event_type]
        if not isinstance(dimensions, dict) or set(dimensions) != set(schema):
            raise ProductAnalyticsError("Analitik olay alanları şemayla eşleşmiyor.")
        if any(type(dimensions[key]) is not str or dimensions[key] not in allowed for key, allowed in schema.items()):
            raise ProductAnalyticsError("Analitik olay alanı geçersiz.")
        return {key: dimensions[key] for key in schema}

    def record(self, player_id: str, event_type: str, dimensions: dict, *, request_id: str | None = None, client: bool = True) -> bool:
        # This check is on the server, not a UI-only opt-out.
        if not self._consent_provider(player_id):
            return False
        clean = self._validate(event_type, dimensions, client=client)
        if request_id is not None:
            if not isinstance(request_id, str) or len(request_id) != 32 or any(char not in "0123456789abcdef" for char in request_id):
                raise ProductAnalyticsError("Analitik istek kimliği geçersiz.")
        event_id = request_id or uuid4().hex
        now_ms = round(self._now() * 1000)
        subject = self._subject(player_id)
        with self._lock, self._file_lock():
            # An opt-out can arrive between the first consent check and the
            # storage lock. Recheck so an in-flight event cannot reappear
            # after the player's erase operation.
            if not self._consent_provider(player_id):
                return False
            original = self._read()
            events = self._retained(original, now_ms)
            if any(item.get("id") == event_id and item.get("subject") == subject for item in events):
                if len(events) != len(original):
                    self._write(events)
                return False
            events.append({"id": event_id, "subject": subject, "type": event_type, "at_ms": now_ms, "dimensions": clean})
            self._write(events[-MAX_EVENTS:])
        return True

    def events_for(self, player_id: str) -> list[dict]:
        subject = self._subject(player_id)
        with self._lock, self._file_lock():
            original = self._read()
            events = self._retained(original, round(self._now() * 1000))
            if len(events) != len(original):
                self._write(events)
            return [
                {key: value for key, value in event.items() if key != "subject"}
                for event in events if event.get("subject") == subject
            ]

    def erase_player(self, player_id: str) -> int:
        subject = self._subject(player_id)
        with self._lock, self._file_lock():
            original = self._read()
            events = self._retained(original, round(self._now() * 1000))
            remaining = [event for event in events if event.get("subject") != subject]
            if len(remaining) != len(original):
                self._write(remaining)
            return len(events) - len(remaining)

    def prune_expired(self) -> int:
        with self._lock, self._file_lock():
            original = self._read()
            retained = self._retained(original, round(self._now() * 1000))
            if len(retained) != len(original):
                self._write(retained)
            return len(original) - len(retained)


def aggregate_product_events(events: list[dict], *, now_ms: int) -> dict:
    """Aggregate only enumerated fields; never emit pseudonymous subjects."""
    cutoff = now_ms - RETENTION_DAYS * 24 * 60 * 60 * 1000
    selected = [item for item in events if isinstance(item, dict) and type(item.get("at_ms")) is int and cutoff <= item["at_ms"] <= now_ms]
    distinct_players = len({item.get("subject") for item in selected})
    if distinct_players < MIN_REPORT_PLAYERS:
        return {
            "schema_version": SCHEMA_VERSION,
            "retention_days": RETENTION_DAYS,
            "minimum_report_players": MIN_REPORT_PLAYERS,
            "suppressed": True,
            "funnel_unique_players": None,
            "battle_results": None,
            "performance_fps_buckets": None,
            "retention": None,
        }
    funnel = {}
    for event_type in ("session_started", "screen_view", "matchmaking_started", "matchmaking_matched", "battle_completed"):
        funnel[event_type] = len({item.get("subject") for item in selected if item.get("type") == event_type})
    battle_results = Counter(item.get("dimensions", {}).get("result") for item in selected if item.get("type") == "battle_completed")
    fps_buckets = Counter(item.get("dimensions", {}).get("fps") for item in selected if item.get("type") == "performance_sample")
    def disclosed_count(event_type: str, dimension: str, value: str, counts: Counter) -> int | None:
        players = {item.get("subject") for item in selected if item.get("type") == event_type and item.get("dimensions", {}).get(dimension) == value}
        return counts.get(value, 0) if len(players) >= MIN_REPORT_PLAYERS else None
    sessions = defaultdict(set)
    for item in selected:
        if item.get("type") == "session_started" and isinstance(item.get("subject"), str):
            sessions[item["subject"]].add(datetime.fromtimestamp(item["at_ms"] / 1000, timezone.utc).date())
    today = datetime.fromtimestamp(now_ms / 1000, timezone.utc).date()
    retention = {}
    for offset in (1, 7):
        eligible = [days for days in sessions.values() if min(days) <= today - timedelta(days=offset)]
        # Small groups are suppressed instead of exposing near-individual behavior.
        retention[f"d{offset}"] = None if len(eligible) < MIN_REPORT_PLAYERS else {
            "eligible": len(eligible),
            "returned": sum(min(days) + timedelta(days=offset) in days for days in eligible),
        }
    return {
        "schema_version": SCHEMA_VERSION,
        "retention_days": RETENTION_DAYS,
        "minimum_report_players": MIN_REPORT_PLAYERS,
        "suppressed": False,
        "event_count": len(selected),
        "funnel_unique_players": {key: value if value >= MIN_REPORT_PLAYERS else None for key, value in funnel.items()},
        "battle_results": {key: disclosed_count("battle_completed", "result", key, battle_results) for key in ("win", "loss", "draw")},
        "performance_fps_buckets": {key: disclosed_count("performance_sample", "fps", key, fps_buckets) for key in ("under_20", "20_29", "30_44", "45_59", "60_plus")},
        "retention": retention,
    }
