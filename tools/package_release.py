from __future__ import annotations

import hashlib
import json
import subprocess
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
VERSION = "2.0.0-beta.27"
ARCHIVE = ROOT / f"GRIDSHARD-{VERSION}.zip"
CHECKSUM = ROOT / f"GRIDSHARD-{VERSION}.zip.sha256"
ARCHIVE_ROOT = f"GRIDSHARD-{VERSION}"

EXCLUDED_PREFIXES = (
    "server/data/",
)
EXCLUDED_NAMES = {
    ARCHIVE.name,
    CHECKSUM.name,
    "RELEASE_MANIFEST.json",
}


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
        if normalized in EXCLUDED_NAMES:
            continue
        if normalized.startswith(EXCLUDED_PREFIXES):
            continue
        path = ROOT / normalized
        if path.is_file():
            paths.append(path)
    return sorted(paths, key=lambda item: item.relative_to(ROOT).as_posix())


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> int:
    files = release_files()
    commit = subprocess.check_output(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        text=True,
    ).strip()
    manifest = {
        "project": "GRIDSHARD",
        "version": VERSION,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "source_commit": commit,
        "working_tree_changes_included": True,
        "runtime_player_and_telemetry_data_included": False,
        "file_count": len(files),
        "files": [path.relative_to(ROOT).as_posix() for path in files],
    }

    with zipfile.ZipFile(
        ARCHIVE,
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

    digest = sha256(ARCHIVE)
    CHECKSUM.write_text(f"{digest}  {ARCHIVE.name}\n", encoding="ascii")
    print(f"Paket: {ARCHIVE}")
    print(f"SHA-256: {digest}")
    print(f"Dosya: {len(files)} + RELEASE_MANIFEST.json")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
