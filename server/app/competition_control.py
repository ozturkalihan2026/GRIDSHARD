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
    if active and season:
        from .first_season_profile import content_ready
        if not content_ready(current, season):
            return {"active": False, "status": "waiting_for_content", "starts_at": start.isoformat().replace("+00:00", "Z")}
        if team:
            from .first_season_profile import PROFILE
            from .cosmetic_releases import REGISTRY
            from .competition_cycle import competition_cycle
            identity = competition_cycle(current, team=True)['id']
            if PROFILE.get('status') == 'published' and REGISTRY.releases.get(('team_tournament', identity), {}).get('status') != 'published':
                return {"active": False, "status": "waiting_for_content", "starts_at": start.isoformat().replace("+00:00", "Z")}
    return {"active": active, "status": "active" if active else "scheduled" if start else "waiting_for_launch",
            "starts_at": start.isoformat().replace("+00:00", "Z") if start else ""}


def minimum_participants(*, team=False):
    key = "GRIDSHARD_TEAM_MIN_TEAMS" if team else "GRIDSHARD_WEEKLY_MIN_PLAYERS"
    return max(2, int(os.environ.get(key, "4")))


def competition_eligible(player_id, *, is_bot=False):
    excluded = {p.strip() for p in os.environ.get("GRIDSHARD_UNRANKED_PLAYER_IDS", "").split(",") if p.strip()}
    excluded.add(os.environ.get("GRIDSHARD_OWNER_PLAYER_ID", "").strip())
    return not is_bot and not str(player_id).startswith(('bot_a', 'bot_b')) and str(player_id) not in excluded


def first_season_bots(moment=None, *, period_id=None, team=False):
    """S1-only participation, including historical settlement after S1 ends.

    This never changes reward eligibility or opens the independent team gate.
    """
    from datetime import timedelta
    from .first_season_profile import PROFILE, fixed_road_for
    if not fixed_road_for(PROFILE.get('season_id')):
        return False
    start = configured_start()
    current = utc(moment)
    if period_id:
        identity = str(period_id).removeprefix('gridshard_')
        try:
            if '-W' in identity:
                year, week = identity.split('-W')
                current = datetime.fromisocalendar(int(year), int(week), 1).replace(tzinfo=timezone.utc)
            else:
                current = datetime.fromisoformat(identity.replace('_', '-')).replace(tzinfo=timezone.utc)
        except ValueError:
            return False
    if not start <= current < start + timedelta(days=28):
        return False
    team_start = configured_start(team=True)
    return not team or bool(team_start and team_start <= current)


def ranking_eligible(player_id, *, is_bot=False, moment=None):
    return (first_season_bots(moment) if is_bot else competition_eligible(player_id))


def owner_account(player_id):
    return bool(player_id) and str(player_id) == os.environ.get("GRIDSHARD_OWNER_PLAYER_ID", "").strip()
