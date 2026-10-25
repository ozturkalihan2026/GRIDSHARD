"""Operator-controlled production start. An empty date always means closed."""
from datetime import datetime, timezone
import os


def utc(moment=None):
    value = moment or datetime.now(timezone.utc)
    return (value.replace(tzinfo=timezone.utc) if value.tzinfo is None else value.astimezone(timezone.utc))


def configured_start(*, team=False):
    key = "GRIDSHARD_TEAM_TOURNAMENT_STARTS_AT" if team else "GRIDSHARD_SEASON_STARTS_AT"
    raw = os.environ.get(key, "").strip()
    if not raw:
        return None
    value = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    if value.tzinfo is None:
        raise ValueError(f"{key} must include a UTC offset")
    return utc(value)


def launch_status(moment=None, *, team=False):
    current = utc(moment)
    start = configured_start(team=team)
    season = configured_start()
    active = bool(start and current >= start and (not team or (season and current >= season)))
    return {"active": active, "status": "active" if active else "scheduled" if start else "waiting_for_launch",
            "starts_at": start.isoformat().replace("+00:00", "Z") if start else ""}


def minimum_participants(*, team=False):
    key = "GRIDSHARD_TEAM_MIN_TEAMS" if team else "GRIDSHARD_WEEKLY_MIN_PLAYERS"
    return max(2, int(os.environ.get(key, "4")))


def competition_eligible(player_id, *, is_bot=False):
    excluded = {p.strip() for p in os.environ.get("GRIDSHARD_UNRANKED_PLAYER_IDS", "").split(",") if p.strip()}
    excluded.add(os.environ.get("GRIDSHARD_OWNER_PLAYER_ID", "").strip())
    return not is_bot and str(player_id) not in excluded


def owner_account(player_id):
    return bool(player_id) and str(player_id) == os.environ.get("GRIDSHARD_OWNER_PLAYER_ID", "").strip()
