"""Version-keyed system mail; persisted read/dismiss IDs survive each release."""
import json
from pathlib import Path
import re

from .version import VERSION


def update_notices(releases: list[dict], current_version: str) -> tuple[dict, ...]:
    def version_key(value):
        if not re.fullmatch(r"\d+\.\d+\.\d+", value):
            raise ValueError(f"Invalid release version: {value}")
        return tuple(map(int, value.split(".")))

    current = version_key(current_version)
    seen = set()
    notices = []
    for release in sorted(releases, key=lambda item: version_key(item["version"])):
        version = release["version"]
        if version in seen:
            raise ValueError(f"Duplicate update: {version}")
        seen.add(version)
        if not release.get("body_tr", "").strip() or not release.get("body_en", "").strip():
            raise ValueError(f"Missing update notes: {version}")
        if version_key(version) > current:
            continue
        notices.append({
            "notice_id": "update-" + version.replace(".", "-"),
            "kind": "update",
            "version": version,
            "title_tr": f"GRIDSHARD {version} güncellemesi",
            "title_en": f"GRIDSHARD {version} update",
            "body_tr": release["body_tr"],
            "body_en": release["body_en"],
            **({"release_date": release["release_date"]} if release.get("release_date") else {}),
        })
    if current_version not in seen:
        raise ValueError(f"Add system update notes for release {current_version}")
    return tuple(notices)


INBOX_UPDATE_NOTICES = update_notices(
    json.loads((Path(__file__).resolve().parents[1] / "data/game_updates.json").read_text(encoding="utf-8")),
    VERSION,
)
