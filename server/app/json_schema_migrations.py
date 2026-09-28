"""JSON dosya depoları için sürümlü ileri/geri şema geçişleri.

Göçler ``server/json_migrations/<depo>/NNN_ad.py`` dosyalarıdır. Her dosya
``up(payload)`` ve isteğe bağlı ``down(payload)`` tanımlar; ikisi de dönüşmüş
yükü döndürür. Uygulanan göçler deponun yanındaki ``<dosya>.schema.json``
geçmişine checksum, önce/sonra SHA-256 ve anlık yedek adıyla yazılır.

Anlamlar:
- Geçmişi olmayan mevcut dosya, çerçeve öncesi (taban) biçimdedir; bütün
  göçler bekler.
- Dosya henüz yoksa kod onu güncel biçimde oluşturacağından göçler dönüşüm
  yapılmadan uygulanmış sayılır.
- Uygulanmış göç dosyası değişmişse veya kaynakta olmayan bir sürüm kayıtlıysa
  açılış durur; veri sessizce yanlış sürümle okunmaz.
- Geçmiş kayıtları hash zinciriyle bağlıdır (GRIDSHARD projesinden alındı):
  her kayıt önceki kaydın özetini taşır, elle değiştirilen kayıt açılışı durdurur.
  Zincir öncesi yazılmış ilk kayıtlar zincirin başında kabul edilir.
- Anlık yedeğin özeti göç öncesi özetle karşılaştırılır; değişmiş yedekten geri
  dönülmez ve ``check`` hata verir.
- Üretimde (``auto_apply=False``) mevcut veriyi dönüştüren göç açılışta
  uygulanmaz; operatör sunucu dururken aracı çalıştırır.
"""

from __future__ import annotations

from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import logging
import os
from pathlib import Path
import re
from tempfile import NamedTemporaryFile
from typing import Any, Callable, Mapping


MIGRATION_PATTERN = re.compile(r"^(?P<version>\d{3})_(?P<slug>[a-z0-9_]+)\.py$")
STORE_PATTERN = re.compile(r"^[a-z][a-z0-9_]*$")
HISTORY_SUFFIX = ".schema.json"
LOCK_SUFFIX = ".schema.lock"
MIGRATIONS_DIR = Path(__file__).resolve().parent.parent / "json_migrations"
KNOWN_JSON_STORES = frozenset({
    "platform_state",
    "telemetry",
    "battle_pool_presets",
    "teams",
    "identities",
    "players",
})
TOOL_HINT = "Sunucu duruyorken python tools/json_schema_migrate.py up çalıştırın."


class JsonSchemaMigrationError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class JsonMigration:
    store: str
    version: str
    name: str
    path: Path
    checksum: str
    up: Callable[[Any], Any]
    down: Callable[[Any], Any] | None


def json_store_paths(
    data_dir: Path,
    environ: Mapping[str, str] = os.environ,
    *,
    postgres: bool,
) -> dict[str, Path]:
    """main.py ile aynı ortam değişkenlerinden JSON depo yollarını üretir."""
    data_dir = Path(data_dir)
    players = Path(environ.get(
        "RELAY_PLAYER_DATA_PATH", str(data_dir / "web_test_players.json")
    ))
    paths = {
        "platform_state": Path(environ.get(
            "GRIDSHARD_PLATFORM_STATE_PATH", str(data_dir / "platform_state.json")
        )),
        "telemetry": Path(environ.get(
            "RELAY_TELEMETRY_PATH", str(data_dir / "web_test_telemetry.json")
        )),
        "battle_pool_presets": Path(environ.get(
            "RELAY_BATTLE_POOL_PRESET_PATH",
            str(players.with_name("web_test_battle_pool_presets.json")),
        )),
        "teams": Path(environ.get(
            "RELAY_TEAM_DATA_PATH", str(players.with_name("web_test_teams.json"))
        )),
    }
    if not postgres:
        # PostgreSQL varken kimlik ve oyuncu verisi SQL migration'larıyla yönetilir.
        paths["identities"] = Path(environ.get(
            "GRIDSHARD_AUTH_IDENTITY_PATH", str(data_dir / "player_identities.json")
        ))
        paths["players"] = players
    # İki depo aynı dosyayı paylaşırsa göç geçmişi ve veri birbirini ezer.
    resolved = [path.resolve() for path in paths.values()]
    if len(set(resolved)) != len(resolved):
        raise JsonSchemaMigrationError("İki JSON deposu aynı dosya yoluna ayarlanmış.")
    return paths


def history_path(store_path: Path) -> Path:
    store_path = Path(store_path)
    return store_path.with_name(store_path.name + HISTORY_SUFFIX)


def snapshot_path(store_path: Path, version: str) -> Path:
    store_path = Path(store_path)
    return store_path.with_name(f"{store_path.name}.pre-{version}.bak")


def _sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _source_checksum(path: Path) -> str:
    # Windows/Git satır sonu dönüşümü uygulanmış göçü değişmiş saymamalı.
    return _sha256_bytes(path.read_bytes().replace(b"\r\n", b"\n"))


def _file_sha256(path: Path) -> str | None:
    return _sha256_bytes(path.read_bytes()) if path.exists() else None


def _entry_digest(entry: dict) -> str:
    """Geçmiş kaydının kanonik özeti; ``entry_hash`` alanı hariç tutulur."""
    body = {key: value for key, value in entry.items() if key != "entry_hash"}
    return _sha256_bytes(json.dumps(
        body, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False,
    ).encode("utf-8"))


def _chain_head(applied: list[dict]) -> str | None:
    return _entry_digest(applied[-1]) if applied else None


def _load_module(path: Path):
    spec = importlib.util.spec_from_file_location(
        f"gridshard_json_migration_{path.parent.name}_{path.stem}", path
    )
    if spec is None or spec.loader is None:
        raise JsonSchemaMigrationError(f"Göç dosyası yüklenemedi: {path.name}.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def discover_json_migrations(directory: Path = MIGRATIONS_DIR) -> dict[str, list[JsonMigration]]:
    directory = Path(directory)
    discovered: dict[str, list[JsonMigration]] = {}
    if not directory.exists():
        return discovered
    for store_dir in sorted(path for path in directory.iterdir() if path.is_dir()):
        if store_dir.name.startswith(("_", ".")):
            continue
        if (
            not STORE_PATTERN.fullmatch(store_dir.name)
            or store_dir.name not in KNOWN_JSON_STORES
        ):
            raise JsonSchemaMigrationError(f"Bilinmeyen JSON depo adı: {store_dir.name}.")
        migrations: list[JsonMigration] = []
        seen: set[str] = set()
        for path in sorted(store_dir.glob("*.py")):
            matched = MIGRATION_PATTERN.fullmatch(path.name)
            if not matched:
                continue
            version = matched.group("version")
            if version in seen:
                raise JsonSchemaMigrationError(
                    f"{store_dir.name} deposunda yinelenen göç sürümü: {version}."
                )
            seen.add(version)
            module = _load_module(path)
            up = getattr(module, "up", None)
            down = getattr(module, "down", None)
            if not callable(up):
                raise JsonSchemaMigrationError(f"{path.name} up(payload) tanımlamalı.")
            migrations.append(JsonMigration(
                store=store_dir.name,
                version=version,
                name=path.stem,
                path=path,
                checksum=_source_checksum(path),
                up=up,
                down=down if callable(down) else None,
            ))
        if migrations:
            discovered[store_dir.name] = migrations
    return discovered


def _verify_chain(store: str, applied: list) -> None:
    chained = False
    previous: str | None = None
    for entry in applied:
        if not isinstance(entry, dict):
            raise JsonSchemaMigrationError(f"{store} şema geçmişi biçimi geçersiz.")
        if "entry_hash" not in entry:
            # Zincirden önce yazılmış kayıtlar yalnız geçmişin başında olabilir.
            if chained or "previous_hash" in entry:
                raise JsonSchemaMigrationError(f"{store} şema geçmişi zinciri bozuk.")
        elif (
            entry.get("previous_hash") != previous
            or entry["entry_hash"] != _entry_digest(entry)
        ):
            raise JsonSchemaMigrationError(
                f"{store} şema geçmişi zinciri doğrulanamadı; kayıt elle değiştirilmiş olabilir."
            )
        else:
            chained = True
        previous = _entry_digest(entry)


def _read_history_file(store: str, store_path: Path) -> dict:
    path = history_path(store_path)
    if not path.exists():
        return {"store": store, "version": None, "applied": [], "rollbacks": []}
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise JsonSchemaMigrationError(f"{store} şema geçmişi okunamadı.") from exc
    if not isinstance(payload, dict) or payload.get("store") != store:
        raise JsonSchemaMigrationError(f"{store} şema geçmişi başka bir depoya ait.")
    applied = payload.get("applied")
    rollbacks = payload.get("rollbacks", [])
    if not isinstance(applied, list) or not isinstance(rollbacks, list):
        raise JsonSchemaMigrationError(f"{store} şema geçmişi biçimi geçersiz.")
    _verify_chain(store, applied)
    if payload.get("version") != (applied[-1].get("version") if applied else None):
        raise JsonSchemaMigrationError(f"{store} şema geçmişi sürümü kayıtlarla uyuşmuyor.")
    return {**payload, "rollbacks": rollbacks}


def _read_history(store: str, store_path: Path) -> list[dict]:
    return _read_history_file(store, store_path)["applied"]


def _atomic_write_bytes(path: Path, payload: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary_name = None
    try:
        with NamedTemporaryFile(
            "wb", dir=path.parent, delete=False, suffix=".tmp",
        ) as temporary:
            temporary.write(payload)
            temporary.flush()
            os.fsync(temporary.fileno())
            temporary_name = temporary.name
        Path(temporary_name).replace(path)
    except OSError:
        if temporary_name:
            Path(temporary_name).unlink(missing_ok=True)
        raise


def _atomic_write(path: Path, text: str) -> None:
    _atomic_write_bytes(path, text.encode("utf-8"))


def _write_history(
    store: str,
    store_path: Path,
    applied: list[dict],
    rollbacks: list[dict] | None = None,
) -> None:
    if rollbacks is None:
        rollbacks = _read_history_file(store, store_path)["rollbacks"]
    current = applied[-1]["version"] if applied else None
    payload = {"store": store, "version": current, "applied": applied}
    if rollbacks:
        payload["rollbacks"] = rollbacks
    _atomic_write(
        history_path(store_path),
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
    )


def _parse_payload(store: str, raw: bytes) -> Any:
    try:
        text = raw.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise JsonSchemaMigrationError(f"{store} deposu UTF-8 değil.") from exc
    if not text.strip():
        return None
    try:
        return json.loads(text)
    except json.JSONDecodeError as exc:
        raise JsonSchemaMigrationError(f"{store} deposu geçerli JSON değil.") from exc


def _read_payload(store: str, store_path: Path) -> Any:
    try:
        raw = store_path.read_bytes()
    except OSError as exc:
        raise JsonSchemaMigrationError(f"{store} deposu okunamadı.") from exc
    return _parse_payload(store, raw)


def _write_payload(store_path: Path, payload: Any) -> None:
    # Depolar farklı girinti biçimleri kullanır; göç sonrası ilk normal yazım
    # deponun kendi biçimini geri getirir.
    _atomic_write(
        store_path,
        json.dumps(payload, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
    )


class _StoreLock:
    def __init__(self, store: str, store_path: Path):
        self.store = store
        self.path = Path(store_path).with_name(Path(store_path).name + LOCK_SUFFIX)

    def __enter__(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        try:
            descriptor = os.open(self.path, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError as exc:
            raise JsonSchemaMigrationError(
                f"{self.store} için başka bir şema geçişi sürüyor ({self.path.name}). "
                "Süreç çökmüşse depo durumunu doğrulayıp kilit dosyasını silin."
            ) from exc
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(str(os.getpid()))
        return self

    def __exit__(self, *_):
        self.path.unlink(missing_ok=True)


def _snapshot_states(store_path: Path, applied: list[dict]) -> list[dict]:
    """Uygulanmış göçlerin anlık yedeklerini göç öncesi özetle karşılaştırır."""
    states = []
    for entry in applied:
        name = entry.get("snapshot")
        if not name:
            continue
        if not isinstance(name, str) or Path(name).name != name:
            raise JsonSchemaMigrationError("Şema geçmişindeki yedek adı geçersiz.")
        snapshot = Path(store_path).with_name(name)
        digest = _file_sha256(snapshot)
        state = "missing" if digest is None else "ok" if digest == entry.get("before_sha256") else "changed"
        states.append({"version": entry.get("version"), "file": name, "state": state})
    return states


def json_store_status(
    store: str,
    store_path: Path,
    migrations: list[JsonMigration],
) -> dict:
    store_path = Path(store_path)
    history = _read_history_file(store, store_path)
    applied = history["applied"]
    known = {migration.version: migration for migration in migrations}
    recorded = {str(entry.get("version")): entry for entry in applied}
    unknown = sorted(set(recorded) - set(known))
    if unknown:
        raise JsonSchemaMigrationError(
            f"{store} geçmişinde kaynakta bulunmayan göç sürümleri var: " + ", ".join(unknown)
        )
    changed = [
        version for version, entry in recorded.items()
        if entry.get("checksum") != known[version].checksum
    ]
    if changed:
        raise JsonSchemaMigrationError(
            f"{store} için uygulanmış göç dosyası değişmiş: " + ", ".join(sorted(changed))
        )
    expected_prefix = [migration.version for migration in migrations[:len(applied)]]
    if [str(entry.get("version")) for entry in applied] != expected_prefix:
        raise JsonSchemaMigrationError(f"{store} geçmişi göç sırasıyla uyuşmuyor.")
    pending = migrations[len(applied):]
    snapshots = _snapshot_states(store_path, applied)
    return {
        "store": store,
        "path": str(store_path),
        "exists": store_path.exists(),
        "current_version": applied[-1]["version"] if applied else None,
        "latest_version": migrations[-1].version if migrations else None,
        "applied": applied,
        "pending": [
            {"version": item.version, "name": item.name, "checksum": item.checksum}
            for item in pending
        ],
        "ready": not pending,
        "snapshots": snapshots,
        "intact": all(item["state"] != "changed" for item in snapshots),
        "rollbacks": len(history["rollbacks"]),
    }


def apply_pending_json_migrations(
    store: str,
    store_path: Path,
    migrations: list[JsonMigration],
    *,
    now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
) -> dict:
    store_path = Path(store_path)
    if not migrations:
        return json_store_status(store, store_path, migrations)
    with _StoreLock(store, store_path):
        status = json_store_status(store, store_path, migrations)
        applied = list(status["applied"])
        for migration in migrations[len(applied):]:
            entry = {
                "version": migration.version,
                "name": migration.name,
                "checksum": migration.checksum,
                "applied_at": now().isoformat(),
                "transformed": False,
                "before_sha256": None,
                "after_sha256": None,
                "snapshot": None,
            }
            if store_path.exists():
                # Yedek ve dönüşüm aynı baytlardan yapılır; yedek doğrulanmadan
                # veri değiştirilmez.
                raw = store_path.read_bytes()
                before = _sha256_bytes(raw)
                snapshot = snapshot_path(store_path, migration.version)
                _atomic_write_bytes(snapshot, raw)
                if _file_sha256(snapshot) != before:
                    raise JsonSchemaMigrationError(f"{snapshot.name} yedeği doğrulanamadı.")
                payload = _parse_payload(store, raw)
                try:
                    migrated = migration.up(deepcopy(payload))
                except Exception as exc:
                    raise JsonSchemaMigrationError(
                        f"{store} {migration.name} göçü başarısız: {exc}"
                    ) from exc
                if _file_sha256(store_path) != before:
                    raise JsonSchemaMigrationError(
                        f"{store} deposu göç sırasında değişti; başka yazıcıyı durdurup yeniden deneyin."
                    )
                _write_payload(store_path, migrated)
                entry.update({
                    "transformed": True,
                    "before_sha256": before,
                    "after_sha256": _file_sha256(store_path),
                    "snapshot": snapshot.name,
                })
            entry["previous_hash"] = _chain_head(applied)
            entry["entry_hash"] = _entry_digest(entry)
            applied.append(entry)
            # Her adımdan sonra yazılır; yarıda kalan çalışma tutarlı sürümde durur.
            _write_history(store, store_path, applied)
    return json_store_status(store, store_path, migrations)


def rollback_latest_json_migration(
    store: str,
    store_path: Path,
    migrations: list[JsonMigration],
    *,
    allow_destructive: bool = False,
    now: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
) -> dict:
    if not allow_destructive:
        raise JsonSchemaMigrationError("Geri göç için açık --allow-destructive onayı gerekir.")
    store_path = Path(store_path)
    with _StoreLock(store, store_path):
        status = json_store_status(store, store_path, migrations)
        applied = list(status["applied"])
        if not applied:
            raise JsonSchemaMigrationError(f"{store} için geri alınacak göç yok.")
        entry = applied[-1]
        migration = next(item for item in migrations if item.version == entry["version"])
        method = "record_only"
        if store_path.exists():
            snapshot = store_path.with_name(entry["snapshot"]) if entry.get("snapshot") else None
            if migration.down is not None:
                payload = _read_payload(store, store_path)
                try:
                    reverted = migration.down(deepcopy(payload))
                except Exception as exc:
                    raise JsonSchemaMigrationError(
                        f"{store} {migration.name} geri göçü başarısız: {exc}"
                    ) from exc
                _write_payload(store_path, reverted)
                method = "down"
            elif (
                snapshot is not None
                and snapshot.exists()
                and _file_sha256(store_path) == entry.get("after_sha256")
            ):
                # down() yoksa yalnız göçten sonra hiç yazılmamış veri, değişmemiş
                # yedekten dönebilir.
                if _file_sha256(snapshot) != entry.get("before_sha256"):
                    raise JsonSchemaMigrationError(
                        f"{snapshot.name} yedeği göçten sonra değişmiş; geri dönüş durduruldu."
                    )
                _atomic_write_bytes(store_path, snapshot.read_bytes())
                method = "snapshot"
            else:
                raise JsonSchemaMigrationError(
                    f"{migration.name} için down(payload) yok ve depo göçten sonra "
                    "değiştiği için yedekten güvenle dönülemez."
                )
        applied.pop()
        # Geri alma, uygulanmış zincirden düşer ama iz olarak saklanır.
        rollbacks = [
            *_read_history_file(store, store_path)["rollbacks"],
            {
                "version": entry["version"],
                "name": entry.get("name"),
                "entry_hash": _entry_digest(entry),
                "method": method,
                "rolled_back_at": now().isoformat(),
                "after_sha256": _file_sha256(store_path),
            },
        ]
        _write_history(store, store_path, applied, rollbacks)
    return json_store_status(store, store_path, migrations)


def apply_json_store_migrations(
    store_paths: Mapping[str, Path],
    directory: Path = MIGRATIONS_DIR,
    *,
    auto_apply: bool = True,
) -> dict[str, dict]:
    """Açılışta çağrılır: bilinen depoların bekleyen göçlerini uygular.

    ``auto_apply=False`` (üretim) iken yalnız henüz oluşmamış depoların göçleri
    dönüşümsüz kaydedilir; mevcut veriyi dönüştürecek göç bekliyorsa açılış durur.
    """
    discovered = discover_json_migrations(directory)
    unknown = sorted(set(discovered) - set(store_paths))
    results: dict[str, dict] = {}
    for store in unknown:
        # PostgreSQL modunda kimlik/oyuncu JSON göçleri kullanılmaz.
        results[store] = {"store": store, "skipped": "depo bu çalışma modunda kullanılmıyor"}
    blocked: list[str] = []
    for store, path in store_paths.items():
        migrations = discovered.get(store, [])
        if not migrations and not history_path(path).exists():
            continue
        status = json_store_status(store, path, migrations)
        if status["pending"] and not auto_apply and Path(path).exists():
            blocked.append(store)
            results[store] = status
            continue
        results[store] = (
            apply_pending_json_migrations(store, path, migrations)
            if status["pending"] else status
        )
        for snapshot in results[store]["snapshots"]:
            if snapshot["state"] == "changed":
                # Canlı veri etkilenmez; yedekten geri dönüş ve check durur.
                logging.getLogger(__name__).warning(
                    "%s göç yedeği değişmiş: %s", store, snapshot["file"],
                )
    if blocked:
        raise JsonSchemaMigrationError(
            "JSON şema göçü bekliyor: " + ", ".join(blocked) + ". " + TOOL_HINT
        )
    return results
