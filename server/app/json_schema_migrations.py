"""Versioned, non-destructive schema adoption for the seven JSON repositories.

The schema sidecar is authoritative and contains its append-only migration
journal.  Keeping it separate from the payload preserves both object and list
root formats and allows an existing server to read legacy (version 0) data.
"""

from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Iterator


SCHEMA_FORMAT = "gridshard-json-schema"
CURRENT_VERSION = 1
ADOPTION_CHECKSUM = hashlib.sha256(
    b"001_adopt_existing_json_without_payload_rewrite:v1"
).hexdigest()


class JsonSchemaMigrationError(ValueError):
    pass


@dataclass(frozen=True, slots=True)
class JsonStoreSpec:
    name: str
    path: Path
    root_type: type


def schema_path(path: Path) -> Path:
    return path.with_name(path.name + ".schema.json")


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _canonical(value: dict) -> bytes:
    return json.dumps(
        value, ensure_ascii=False, sort_keys=True, separators=(",", ":"),
        allow_nan=False,
    ).encode("utf-8")


def _read_metadata(spec: JsonStoreSpec) -> dict:
    sidecar = schema_path(spec.path)
    root_kind = "object" if spec.root_type is dict else "array" if spec.root_type is list else None
    if root_kind is None:
        raise JsonSchemaMigrationError(f"Desteklenmeyen JSON veri kökü: {spec.name}")
    if not sidecar.exists():
        return {"format": SCHEMA_FORMAT, "store": spec.name, "root_kind": root_kind, "version": 0, "journal": []}
    try:
        metadata = json.loads(sidecar.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise JsonSchemaMigrationError(f"Şema kaydı okunamadı: {sidecar}") from exc
    if (
        not isinstance(metadata, dict)
        or metadata.get("format") != SCHEMA_FORMAT
        or metadata.get("store") != spec.name
        or metadata.get("root_kind") != root_kind
    ):
        raise JsonSchemaMigrationError(f"Şema kaydı bu depoya ait değil: {sidecar}")
    version = metadata.get("version")
    journal = metadata.get("journal")
    if type(version) is not int or version < 0 or version > CURRENT_VERSION or not isinstance(journal, list):
        raise JsonSchemaMigrationError(f"Desteklenmeyen JSON şema sürümü: {sidecar}")
    prior_version = 0
    prior_hash = None
    for sequence, entry in enumerate(journal, start=1):
        if not isinstance(entry, dict):
            raise JsonSchemaMigrationError(f"Bozuk migration günlüğü: {sidecar}")
        body = {key: value for key, value in entry.items() if key != "entry_hash"}
        if (
            entry.get("sequence") != sequence
            or entry.get("store") != spec.name
            or entry.get("from_version") != prior_version
            or entry.get("to_version") not in (0, 1)
            or abs(entry["to_version"] - prior_version) != 1
            or entry.get("step_checksum") != ADOPTION_CHECKSUM
            or entry.get("previous_hash") != prior_hash
            or entry.get("entry_hash") != _sha256(_canonical(body))
        ):
            raise JsonSchemaMigrationError(f"Migration günlüğü doğrulanamadı: {sidecar}")
        prior_version = entry["to_version"]
        prior_hash = entry["entry_hash"]
    if prior_version != version or (version > 0 and not journal):
        raise JsonSchemaMigrationError(f"Şema sürümü migration günlüğüyle uyuşmuyor: {sidecar}")
    return metadata


def assert_supported_schema(path: Path, store: str, root_type: type) -> int:
    """Reject unknown/tampered sidecars before repositories read or write data."""
    return _read_metadata(JsonStoreSpec(store, Path(path), root_type))["version"]


def _payload_info(spec: JsonStoreSpec) -> tuple[bytes | None, str | None]:
    if not spec.path.exists():
        return None, None
    try:
        raw = spec.path.read_bytes()
        payload = json.loads(raw.decode("utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        raise JsonSchemaMigrationError(f"JSON veri dosyası okunamadı: {spec.path}") from exc
    if not isinstance(payload, spec.root_type):
        raise JsonSchemaMigrationError(f"JSON veri kökü yanlış türde: {spec.path}")
    return raw, _sha256(raw)


def migration_status(spec: JsonStoreSpec) -> dict:
    metadata = _read_metadata(spec)
    _, payload_hash = _payload_info(spec)
    for entry in metadata["journal"]:
        backup_name = entry.get("backup")
        if backup_name is None:
            continue
        if not isinstance(backup_name, str) or Path(backup_name).name != backup_name:
            raise JsonSchemaMigrationError(f"Migration yedek yolu geçersiz: {spec.path}")
        backup = spec.path.with_name(backup_name)
        try:
            backup_hash = _sha256(backup.read_bytes())
        except OSError as exc:
            raise JsonSchemaMigrationError(f"Migration yedeği okunamadı: {backup}") from exc
        if backup_hash != entry.get("payload_sha256"):
            raise JsonSchemaMigrationError(f"Migration yedeği değişmiş: {backup}")
    if payload_hash is None and any(entry.get("backup") for entry in metadata["journal"]):
        raise JsonSchemaMigrationError(f"Migration sonrası JSON veri dosyası kaybolmuş: {spec.path}")
    return {
        "store": spec.name,
        "path": str(spec.path),
        "exists": payload_hash is not None,
        "schema_version": metadata["version"],
        "latest_version": CURRENT_VERSION,
        "pending": metadata["version"] < CURRENT_VERSION,
        "journal_entries": len(metadata["journal"]),
        "payload_sha256": payload_hash,
    }


@contextmanager
def _migration_lock(path: Path) -> Iterator[None]:
    path.parent.mkdir(parents=True, exist_ok=True)
    lock_path = path.with_name(path.name + ".schema.lock")
    try:
        descriptor = os.open(lock_path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    except FileExistsError as exc:
        raise JsonSchemaMigrationError(f"JSON migration zaten çalışıyor: {lock_path}") from exc
    try:
        os.write(descriptor, f"{os.getpid()}\n".encode("ascii"))
        yield
    finally:
        os.close(descriptor)
        lock_path.unlink(missing_ok=True)


def _atomic_metadata_write(spec: JsonStoreSpec, metadata: dict) -> None:
    sidecar = schema_path(spec.path)
    temporary_name: str | None = None
    try:
        with NamedTemporaryFile("wb", dir=sidecar.parent, prefix=sidecar.name + ".", suffix=".tmp", delete=False) as temporary:
            temporary_name = temporary.name
            temporary.write(_canonical(metadata) + b"\n")
            temporary.flush()
            os.fsync(temporary.fileno())
        os.replace(temporary_name, sidecar)
    finally:
        if temporary_name is not None:
            Path(temporary_name).unlink(missing_ok=True)


def _journal_entry(spec: JsonStoreSpec, metadata: dict, target: int, payload_hash: str | None, backup: str | None) -> dict:
    journal = metadata["journal"]
    entry = {
        "sequence": len(journal) + 1,
        "store": spec.name,
        "from_version": metadata["version"],
        "to_version": target,
        "step_checksum": ADOPTION_CHECKSUM,
        "payload_sha256": payload_hash,
        "backup": backup,
        "applied_at": datetime.now(timezone.utc).isoformat(),
        "previous_hash": journal[-1]["entry_hash"] if journal else None,
    }
    entry["entry_hash"] = _sha256(_canonical(entry))
    return entry


def _backup_before_adoption(spec: JsonStoreSpec, raw: bytes | None, payload_hash: str | None) -> str | None:
    if raw is None or payload_hash is None:
        return None
    backup = spec.path.with_name(f"{spec.path.name}.schema-v0-{payload_hash[:16]}.bak")
    if backup.exists():
        if _sha256(backup.read_bytes()) != payload_hash:
            raise JsonSchemaMigrationError(f"Migration yedeği değişmiş: {backup}")
        return backup.name
    try:
        with backup.open("xb") as handle:
            handle.write(raw)
            handle.flush()
            os.fsync(handle.fileno())
    except OSError as exc:
        raise JsonSchemaMigrationError(f"Migration yedeği oluşturulamadı: {backup}") from exc
    return backup.name


def apply_pending_migration(spec: JsonStoreSpec) -> dict:
    """v0→v1 records the existing layout without rewriting player data."""
    with _migration_lock(spec.path):
        metadata = _read_metadata(spec)
        raw, payload_hash = _payload_info(spec)
        if metadata["version"] == CURRENT_VERSION:
            return migration_status(spec)
        backup = _backup_before_adoption(spec, raw, payload_hash)
        _, current_hash = _payload_info(spec)
        if current_hash != payload_hash:
            raise JsonSchemaMigrationError(f"Migration sırasında JSON veri dosyası değişti: {spec.path}")
        next_metadata = {**metadata, "version": CURRENT_VERSION, "journal": [
            *metadata["journal"], _journal_entry(spec, metadata, CURRENT_VERSION, payload_hash, backup),
        ]}
        _atomic_metadata_write(spec, next_metadata)
        return migration_status(spec)


def rollback_latest_migration(spec: JsonStoreSpec, *, allow_destructive: bool = False) -> dict:
    if not allow_destructive:
        raise JsonSchemaMigrationError("Geri migration için açık --allow-destructive onayı gerekir.")
    with _migration_lock(spec.path):
        metadata = _read_metadata(spec)
        if metadata["version"] != CURRENT_VERSION:
            raise JsonSchemaMigrationError(f"Geri alınacak migration yok: {spec.name}")
        _, payload_hash = _payload_info(spec)
        # v1 only records the same payload layout. Never restore a stale
        # snapshot over progress that players made after adoption.
        next_metadata = {**metadata, "version": 0, "journal": [
            *metadata["journal"], _journal_entry(spec, metadata, 0, payload_hash, None),
        ]}
        _atomic_metadata_write(spec, next_metadata)
        return migration_status(spec)
