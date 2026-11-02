"""Reviewed, period-bound cosmetics. No modulo rotation or duplicate fallback.

The checked-in catalog starts unassigned: previewable, locked, and unawarded.
Publishing is an offline source operation, never an unauthenticated HTTP API.
"""
from copy import deepcopy
from hashlib import sha256
import json
from pathlib import Path
import re
from datetime import date, datetime, timezone


CATALOG_PATH = Path(__file__).resolve().parents[1] / "data/cosmetic_releases_v1.json"
PLAYER_FIELDS = {"avatar_frame_id", "profile_background_id"}
TEAM_FIELDS = {"team_emblem_id", "team_frame_id", "team_name_color_id"}
COSMETIC_FIELDS = PLAYER_FIELDS | TEAM_FIELDS | {"avatar_id", "emoji_id"}
SOURCES = {"season_road", "season_leaderboard", "weekly_tournament", "team_tournament"}


class CosmeticReleaseError(ValueError):
    pass


def fingerprint(value) -> str:
    return sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()).hexdigest()


def validate_period(source, value):
    try:
        if source in {"season_road", "season_leaderboard"}:
            if not re.fullmatch(r"gridshard_\d{4}_\d{2}_\d{2}", value):
                raise ValueError()
            date.fromisoformat(value.removeprefix("gridshard_").replace("_", "-"))
        elif source == "weekly_tournament":
            if not re.fullmatch(r"\d{4}-W\d{2}", value):
                raise ValueError()
            date.fromisocalendar(int(value[:4]), int(value[6:]), 1)
        elif source == "team_tournament":
            date.fromisoformat(value)
        else:
            raise ValueError()
    except (ValueError, TypeError) as exc:
        raise CosmeticReleaseError("Invalid period ID for reward source") from exc


class CosmeticReleaseRegistry:
    def __init__(self, document):
        self.document = deepcopy(document)
        if document.get("schema_version") != 1:
            raise CosmeticReleaseError("Unsupported cosmetic registry schema")
        self.items = {}
        designs = set()
        visuals = set()
        structures = set()
        for item in document.get("items", []):
            identity = item["id"]
            if identity in self.items or item["field"] not in PLAYER_FIELDS | TEAM_FIELDS:
                raise CosmeticReleaseError("Duplicate or unsupported cosmetic")
            # A renamed/recolored copy of the same authored motif is not new art.
            design = (item["field"], item["design_id"])
            if design in designs or not item.get("name_tr") or not item.get("name_en"):
                raise CosmeticReleaseError("Duplicate design or missing localization")
            designs.add(design)
            look = item.get("look", {})
            if (not re.fullmatch(r"[a-z][a-z0-9_]{1,63}", identity)
                or look.get("pattern") not in {"arcs", "rays", "tides"}
                or any(not re.fullmatch(r"#[0-9a-fA-F]{6}", str(look.get(k, ""))) for k in ("color", "accent"))):
                raise CosmeticReleaseError("Unsupported cosmetic rendering contract")
            if item["field"] == "team_emblem_id" and not re.fullmatch(r"[0-9., \-MmLlHhVvCcSsQqTtAaZz]+", look.get("path", "")):
                raise CosmeticReleaseError("Unsafe emblem path")
            visual = fingerprint({"field": item["field"], "look": look})
            if visual in visuals:
                raise CosmeticReleaseError("Duplicate visual under a different name")
            visuals.add(visual)
            if item["field"] != "team_name_color_id":
                structure = fingerprint({"field": item["field"], "pattern": look["pattern"], "path": look.get("path")})
                if structure in structures:
                    raise CosmeticReleaseError("Recolor of an existing design; create a new authored motif")
                structures.add(structure)
            self.items[identity] = deepcopy(item)
        self.releases = {}
        used = {}
        release_ids = set()
        for release in document.get("releases", []):
            key = (release["source"], release["period_id"])
            validate_period(*key)
            if release["source"] not in SOURCES or key in self.releases or release["id"] in release_ids:
                raise CosmeticReleaseError("Duplicate release/period or invalid source")
            if release["status"] not in {"draft", "published", "retired"} or not release.get("placements"):
                raise CosmeticReleaseError("Invalid or empty cosmetic release")
            release_ids.add(release["id"])
            slots = set()
            for placement in release["placements"]:
                if not placement.get("cosmetics"):
                    raise CosmeticReleaseError("Empty cosmetic placement")
                slot = placement["slot"]
                if not isinstance(slot, int) or not 1 <= slot <= (40 if release["source"] == "season_road" else 100) or slot in slots:
                    raise CosmeticReleaseError("Invalid or duplicate reward slot")
                slots.add(slot)
                for field, identity in placement["cosmetics"].items():
                    item = self.items.get(identity)
                    if not item or item["field"] != field:
                        raise CosmeticReleaseError("Unknown cosmetic or reward field mismatch")
                    if field in TEAM_FIELDS and release["source"] != "team_tournament":
                        raise CosmeticReleaseError("Team cosmetic assigned to a player-only source")
                    if identity in used and used[identity] != release["id"]:
                        raise CosmeticReleaseError("Cosmetic already reserved by another period; create new art")
                    if item.get("status") != "approved":
                        raise CosmeticReleaseError("Unreviewed art cannot be reserved")
                    used[identity] = release["id"]
            if release["status"] in {"published", "retired"} and release.get("content_hash") != self.release_hash(release):
                raise CosmeticReleaseError("Published reward/art changed; preserve the historical release")
            self.releases[key] = deepcopy(release)
        self.used = used
        for source, boundary in document.get("require_fresh_from", {}).items():
            validate_period(source, boundary)

    def release_hash(self, release):
        identities = {identity for p in release["placements"] for identity in p["cosmetics"].values()}
        return fingerprint({"id": release["id"], "source": release["source"], "period_id": release["period_id"],
                            "placements": release["placements"], "items": {i: self.items[i] for i in sorted(identities)}})

    def reward(self, source, period_id, slot, base):
        result = deepcopy(base)
        if period_id == "gridshard_waiting":
            return result
        release = self.releases.get((source, period_id))
        if not release or release["status"] == "draft":
            boundary = self.document.get("require_fresh_from", {}).get(source)
            if boundary and period_id >= boundary:
                raise CosmeticReleaseError("Fresh rewards missing: publish a new reviewed set before opening this period")
            return result
        # Strip the old recurring cosmetics from the whole published period.
        for field in COSMETIC_FIELDS:
            result.pop(field, None)
        for placement in release["placements"]:
            if placement["slot"] == slot:
                result.update(placement["cosmetics"])
        if source == "season_road":
            fresh = any(result.get(field) for field in PLAYER_FIELDS)
            result["reward_label_tr"] = ("Sandık ve Dönem Kozmetiği" if fresh else "Anında Sandık Ödülü") if result.get("chest_tier") else ("Modül Parçası ve Akı" if result.get("module_shards") else "Devre Kredisi ve Akı")
        result.update(cosmetic_release_id=release["id"], cosmetic_release_hash=release["content_hash"])
        return result

    def reserve(self, source, period_id, release_id):
        validate_period(source, period_id)
        if not re.fullmatch(r"[a-z][a-z0-9_-]{1,95}", release_id):
            raise CosmeticReleaseError("Invalid release ID")
        if source not in SOURCES or (source, period_id) in self.releases:
            raise CosmeticReleaseError("Unknown source or already reserved period")
        fields = sorted(TEAM_FIELDS if source == "team_tournament" else PLAYER_FIELDS)
        fresh = {}
        for field in fields:
            candidates = [item for item in self.items.values() if item["field"] == field
                          and item.get("status") == "approved" and item["id"] not in self.used]
            if not candidates:
                raise CosmeticReleaseError(f"Fresh content exhausted for {field}; create/review new art, never recycle")
            fresh[field] = candidates[0]["id"]
        slot = 40 if source == "season_road" else 1
        release = {"id": release_id, "source": source, "period_id": period_id, "status": "draft",
                   "placements": [{"slot": slot, "cosmetics": fresh}]}
        candidate = deepcopy(self.document)
        candidate.setdefault("releases", []).append(release)
        return CosmeticReleaseRegistry(candidate)

    def publish(self, release_id, *, now=None):
        candidate = deepcopy(self.document)
        release = next((r for r in candidate.get("releases", []) if r["id"] == release_id), None)
        if not release or release["status"] != "draft":
            raise CosmeticReleaseError("Only an existing draft can be published")
        period = release["period_id"]
        if release["source"] == "weekly_tournament":
            starts = date.fromisocalendar(int(period[:4]), int(period[6:]), 1)
        else:
            starts = date.fromisoformat(period.removeprefix("gridshard_").replace("_", "-"))
        current = (now or datetime.now(timezone.utc)).astimezone(timezone.utc).date()
        if starts <= current:
            raise CosmeticReleaseError("Cannot replace rewards of an already started period")
        release["status"] = "published"
        release["content_hash"] = self.release_hash(release)
        policy = candidate.setdefault("require_fresh_from", {})
        policy[release["source"]] = min(policy.get(release["source"], release["period_id"]), release["period_id"])
        return CosmeticReleaseRegistry(candidate)


REGISTRY = CosmeticReleaseRegistry(json.loads(CATALOG_PATH.read_text(encoding="utf-8")))


def period_reward(source, period_id, slot, base):
    return REGISTRY.reward(source, str(period_id), int(slot), base)


def cosmetic_options(field):
    return tuple(item["id"] for item in REGISTRY.items.values() if item["field"] == field)
