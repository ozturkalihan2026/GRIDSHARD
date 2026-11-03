"""Offline content capacity checks. A calendar report never opens a competition.

Source adapters are registered in code. Editing JSON cannot implement a shop,
grant cosmetics, or activate a planned mode. Existing cosmetics default to the
competition pool; a future shop must use its own authored inventory.
"""
from __future__ import annotations

from collections import Counter
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path

from .competition_cycle import CYCLE_LENGTH
from .cosmetic_releases import PLAYER_FIELDS, TEAM_FIELDS, SOURCES, INVENTORY_POOLS


SOURCES_PATH = Path(__file__).resolve().parents[1] / "data/liveops_content_sources_v1.json"
# This must match the existing period_reward/reserve adapters. Planned channels
# deliberately have no runtime implementation and cannot pass a stock gate.
SUPPORTED = {
    "season_road": ("season", "competition", PLAYER_FIELDS),
    "season_leaderboard": ("season", "competition", PLAYER_FIELDS),
    "weekly_tournament": ("iso_week", "competition", PLAYER_FIELDS),
    "team_tournament": ("team_cycle", "competition", TEAM_FIELDS),
}
PLANNED = {
    "shop_collection": ("manual", "shop", PLAYER_FIELDS),
    "daily_trial": ("manual", "daily_trial", PLAYER_FIELDS),
}


class ContentPlanError(ValueError):
    pass


class ContentSourceRegistry:
    def __init__(self, document):
        if (not isinstance(document, dict) or type(document.get("schema_version")) is not int
                or document.get("schema_version") != 1 or not isinstance(document.get("sources"), list)):
            raise ContentPlanError("Unsupported content source schema")
        if set(SUPPORTED) != SOURCES:
            raise ContentPlanError("Period adapters and content sources differ")
        self.sources = {}
        for entry in document.get("sources", []):
            if not isinstance(entry, dict):
                raise ContentPlanError("Invalid content source")
            identity = entry.get("id")
            if not isinstance(identity, str):
                raise ContentPlanError("Invalid content source identity")
            known = SUPPORTED if identity in SUPPORTED else PLANNED
            if identity not in known or identity in self.sources:
                raise ContentPlanError("Unknown or duplicate source; implement its adapter in code first")
            schedule, pool, fields = known[identity]
            state = "supported" if identity in SUPPORTED else "planned"
            amounts = entry.get("cosmetics_per_period")
            if (set(entry) != {"id", "state", "schedule", "stock_pool", "cosmetics_per_period"}
                    or entry.get("state") != state or entry.get("schedule") != schedule
                    or entry.get("stock_pool") != pool
                    or not isinstance(amounts, dict) or set(amounts) != fields
                    or any(type(value) is not int or value != 1 for value in amounts.values())):
                raise ContentPlanError("Source contract differs from its code adapter")
            self.sources[identity] = deepcopy(entry)
        if set(self.sources) != set(SUPPORTED) | set(PLANNED):
            raise ContentPlanError("Missing content source contract")

    def require_supported(self, source):
        if source not in SUPPORTED:
            raise ContentPlanError("Source has no runtime adapter; a JSON entry cannot enable it")
        return deepcopy(self.sources[source])


def load_sources():
    return ContentSourceRegistry(json.loads(SOURCES_PATH.read_text(encoding="utf-8")))


def _moment(value):
    try:
        moment = datetime.fromisoformat(value.replace("Z", "+00:00")) if isinstance(value, str) else value
        if not isinstance(moment, datetime) or moment.tzinfo is None or moment.utcoffset() is None:
            raise ValueError()
        return moment.astimezone(timezone.utc)
    except (TypeError, ValueError, AttributeError) as exc:
        raise ContentPlanError("Calendar start must include a UTC offset") from exc


def calendar_periods(*, starts_at, cycles, team_starts_at=None):
    """Distinct periods intersecting [start, end); independent team anchor.

    A mid-week launch includes the partial ISO week used by the current weekly
    tournament. The shared week at two adjacent season boundaries is counted
    once across the whole horizon, rather than twice or silently discarded.
    """
    if type(cycles) is not int or not 1 <= cycles <= 12:
        raise ContentPlanError("Cycles must be between 1 and 12")
    start = _moment(starts_at)
    try:
        end = start + CYCLE_LENGTH * cycles
    except OverflowError as exc:
        raise ContentPlanError("Calendar horizon exceeds the supported date range") from exc
    if team_starts_at is not None and _moment(team_starts_at) < start:
        raise ContentPlanError("First team launch cannot precede the first season launch")
    season_ids = ["gridshard_" + (start + CYCLE_LENGTH * i).strftime("%Y_%m_%d") for i in range(cycles)]
    week = (start - timedelta(days=start.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    weeks = []
    while week < end:
        iso_year, iso_week, _ = week.isocalendar()
        weeks.append(f"{iso_year}-W{iso_week:02d}")
        week += timedelta(days=7)
    teams = []
    if team_starts_at is not None:
        cursor = _moment(team_starts_at)
        while cursor < end:
            teams.append(cursor.date().isoformat())
            cursor += CYCLE_LENGTH
    return {"season_road": season_ids, "season_leaderboard": list(season_ids),
            "weekly_tournament": weeks, "team_tournament": teams}


def content_coverage(cosmetics, *, sources=None, cycles=2, starts_at=None,
                     team_starts_at=None, extra_periods=None):
    sources = sources or load_sources()
    if type(cycles) is not int or not 1 <= cycles <= 12:
        raise ContentPlanError("Cycles must be between 1 and 12")
    if team_starts_at is not None and starts_at is None:
        raise ContentPlanError("A team calendar requires a season calendar")
    periods = (calendar_periods(starts_at=starts_at, cycles=cycles, team_starts_at=team_starts_at)
               if starts_at is not None else {})
    counts = ({key: len(value) for key, value in periods.items()} if periods else
              {"season_road": cycles, "season_leaderboard": cycles,
               "weekly_tournament": cycles * (CYCLE_LENGTH.days // 7), "team_tournament": cycles})
    for source, count in (extra_periods or {}).items():
        if source not in PLANNED or type(count) is not int or not 1 <= count <= 100:
            raise ContentPlanError("Extra periods require a known planned source and a count from 1 to 100")
        counts[source] = count

    available = Counter()
    for item in cosmetics.items.values():
        pool = item.get("inventory_pool", "competition")
        if pool not in INVENTORY_POOLS:
            raise ContentPlanError("Cosmetic references an unknown stock pool")
        if item.get("status") == "approved" and item["id"] not in cosmetics.used:
            available[pool, item["field"]] += 1
    # Never count already-used art as free stock, including draft reservations.
    # Only reservations for this exact calendar count toward its own demand.
    for (source, period), release in cosmetics.releases.items():
        contract = sources.require_supported(source)
        for placement in release["placements"]:
            for field, identity in placement["cosmetics"].items():
                item = cosmetics.items[identity]
                if item.get("inventory_pool", "competition") != contract["stock_pool"]:
                    raise ContentPlanError("Reserved cosmetic belongs to a different channel pool")

    required, assigned = Counter(), Counter()
    source_rows = []
    for source, count in counts.items():
        contract = sources.sources[source]
        row_assigned = {}
        for field, amount in contract["cosmetics_per_period"].items():
            key = (contract["stock_pool"], field)
            required[key] += amount * count
            # A larger authored placement cannot cancel another period's need.
            covered = 0
            for period in periods.get(source, ()):
                release = cosmetics.releases.get((source, period))
                if release and any(field in p["cosmetics"] for p in release["placements"]):
                    covered += amount
            assigned[key] += covered
            row_assigned[field] = covered
        source_rows.append({"source": source, "state": contract["state"], "stock_pool": contract["stock_pool"],
                            "period_count": count, "period_ids": periods.get(source),
                            "cosmetics_per_period": dict(contract["cosmetics_per_period"]), "reserved_for_calendar": row_assigned})
    tasks = [{"stock_pool": pool, "field": field, "required": total,
              "reserved_for_calendar": assigned[pool, field], "ready_unassigned": available[pool, field],
              "create_and_review": max(0, total - assigned[pool, field] - available[pool, field])}
             for (pool, field), total in sorted(required.items())]
    unsupported = sorted(source for source, count in counts.items() if count and source not in SUPPORTED)
    return {"cycles": cycles, "calendar_bound": starts_at is not None, "production_changed": False,
            "publication_ready": False, "stock_ready": not unsupported and not any(t["create_and_review"] for t in tasks),
            "unimplemented_sources": unsupported, "sources": source_rows, "content_tasks": tasks}
