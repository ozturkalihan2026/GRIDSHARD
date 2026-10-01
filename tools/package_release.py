from __future__ import annotations

import argparse
import fnmatch
import hashlib
import json
import subprocess
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VERSION = "2.1.0-beta.72"
PACKAGE_LABEL = "signatures-social"
ARCHIVE_ROOT = f"GRIDSHARD-{VERSION}-{PACKAGE_LABEL}"

EXCLUDED_RUNTIME_PATTERNS = (
    "server/data/.auth_signing_key",
    "server/data/player_identities.json",
    "server/data/web_test_players.json*",
    "server/data/web_test_telemetry.json*",
    "server/data/web_test_battle_pool_presets.json*",
    "server/data/*.schema.json",
    "server/data/*.schema.lock",
    "server/data/*.pre-*.bak",
    "server/data/platform_state.json*",
    "server/data/*.lock",
)
EXCLUDED_NAMES = {"RELEASE_MANIFEST.json"}
STATIC_SERVER_DATA_FILES = {
    "server/data/arena_bot_profiles_v1.json",
    "server/data/arena_progression_v1.json",
}
GENERATED_ROOT_PATTERNS = (
    "GRIDSHARD-*.zip",
    "GRIDSHARD-*.zip.sha256",
)

PRIVATE_OR_GENERATED_PREFIXES = (
    "qa_reports/", "test-results/", "playwright-report/", "artifacts/",
    ".mobile-debug/", ".venv/", "node_modules/", "dist/", "build/", "secrets/",
)
PRIVATE_FILE_PATTERNS = (
    "*.key", "*.pem", "*.p8", "*.p12", "*.pfx", "*.keystore", "*.jks",
    "*firebase-adminsdk*.json", "google-services.json", "GoogleService-Info.plist", ".env*",
    ".auth_signing_key", "auth_signing_key", "database_url", "postgres_password",
)


def is_release_input(normalized: str) -> bool:
    # A package built on Linux must not admit Windows-style casing variants of
    # private files/directories. These names are never source inputs.
    normalized = normalized.replace("\\", "/").casefold()
    basename = normalized.rsplit("/", 1)[-1]
    if normalized.startswith(PRIVATE_OR_GENERATED_PREFIXES):
        return False
    if any(fnmatch.fnmatchcase(basename, pattern.casefold()) for pattern in PRIVATE_FILE_PATTERNS):
        return False
    if normalized in {name.casefold() for name in EXCLUDED_NAMES} or is_generated_root_artifact(normalized):
        return False
    if normalized.startswith("server/data/") and normalized not in STATIC_SERVER_DATA_FILES:
        return False
    return not any(fnmatch.fnmatch(normalized, pattern) for pattern in EXCLUDED_RUNTIME_PATTERNS)


def is_generated_root_artifact(normalized: str) -> bool:
    return "/" not in normalized and any(
        fnmatch.fnmatchcase(normalized.casefold(), pattern.casefold())
        for pattern in GENERATED_ROOT_PATTERNS
    )


def release_files() -> list[Path]:
    output = subprocess.check_output(
        [
            "git",
            "ls-files",
            "--cached",
            "--others",
            "--exclude-standard",
            "-z",
        ],
        cwd=ROOT,
    )
    paths: list[Path] = []
    for raw in output.decode("utf-8").split("\0"):
        if not raw:
            continue
        normalized = raw.replace("\\", "/")
        # Runtime state and secrets are never release inputs, even when a new
        # filename is accidentally tracked or the ignore rules drift.
        if not is_release_input(normalized):
            continue
        path = ROOT / normalized
        # Do not follow a tracked link/junction to files outside this checkout,
        # or to a private runtime path disguised by a harmless archive name.
        resolved = path.resolve()
        if path.is_symlink() or not resolved.is_relative_to(ROOT.resolve()):
            raise ValueError(f"Release input is not a regular checkout path: {normalized}")
        if not is_release_input(resolved.relative_to(ROOT.resolve()).as_posix()):
            raise ValueError(f"Release input resolves to a private path: {normalized}")
        if path.is_file():
            paths.append(path)
    return sorted(paths, key=lambda item: item.relative_to(ROOT).as_posix())


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main(output_dir: Path | None = None) -> int:
    release_dir = (output_dir or ROOT).resolve()
    release_dir.mkdir(parents=True, exist_ok=True)
    archive = release_dir / f"GRIDSHARD-{VERSION}-{PACKAGE_LABEL}.zip"
    checksum = release_dir / f"GRIDSHARD-{VERSION}-{PACKAGE_LABEL}.zip.sha256"
    files = release_files()
    commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        text=True,
    ).strip()
    manifest = {
        "project": "GRIDSHARD",
        "version": VERSION,
        "package_label": PACKAGE_LABEL,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source_commit": commit,
        "working_tree_changes_included": True,
        "runtime_player_and_telemetry_data_included": False,
        "file_count": len(files),
        "files": [path.relative_to(ROOT).as_posix() for path in files],
    }

    with zipfile.ZipFile(
        archive,
        "w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
    ) as package:
        for path in files:
            relative = path.relative_to(ROOT).as_posix()
            package.write(path, f"{ARCHIVE_ROOT}/{relative}")
        package.writestr(
            f"{ARCHIVE_ROOT}/RELEASE_MANIFEST.json",
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        )

    digest = sha256(archive)
    checksum.write_text(f"{digest}  {archive.name}\n", encoding="ascii")
    print(f"Paket: {archive}")
    print(f"SHA-256: {digest}")
    print(f"Dosya: {len(files)} + RELEASE_MANIFEST.json")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="GRIDSHARD tam kaynak paketini üretir.")
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=ROOT,
        help="ZIP ve SHA-256 dosyalarının yazılacağı klasör.",
    )
    args = parser.parse_args()
    raise SystemExit(main(args.output_dir))
