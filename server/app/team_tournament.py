"""Takımlar Arası Turnuva: takvim, eşleşme, rövanşlı maçlar ve sıralama.

Turnuva sezonla aynı dört haftalık döngüyü kullanır (competition_cycle.py):
dönem Pazartesi 00:00 UTC'de başlar ve dört ISO haftası sürer. Dönem kimliği
döngünün başlangıç tarihidir (ör. ``2026-09-28``).

- Kayıt yalnız 1. haftanın Pazartesi–Çarşamba günlerinde açıktır. Kaydı takım
  lideri yapar; kadro kayıt anında sabitlenir. Süre dolunca kayıt alınmaz.
- Her hafta Perşembe eşleşmeler açıklanır: yakın güçteki ve o dönem henüz
  karşılaşmamış takımlar eşleşir. Takım sayısı tekse, en az bay geçmiş
  takımlardan (önce AI takımları, sonra en zayıf) biri o hafta bay geçer.
- Her hafta Cuma, Cumartesi ve Pazar eşleşen oyuncular rövanşlı iki maç
  oynar; rövanş ilk maç oynandıktan sonra açılır.
- Galibiyet 1, mağlubiyet 0 puandır; kupa, deneyim ve istatistik değişmez.
- 4. haftanın Pazar günü bitince turnuva biter. İlk üç takımın en az 4 puan
  katkı veren bütün oyuncuları ödül alır.

Modül saf hesaplama yapar: kayıtları ve oynanan maç ayaklarını dışarıdan
alır ve aynı girdiyle her çağrıda aynı eşleşmeleri üretir. Böylece geçmiş
haftaların eşleşmeleri dönem boyunca değişmez.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import hashlib

from .competition_cycle import competition_cycle, cycle_for_id


TOURNAMENT_WEEKS = 4
DAYS_PER_WEEK = 7
REGISTRATION_DAYS = 3
PAIRING_DAY = 4
FIRST_MATCH_DAY = 5
LEGS_PER_PAIRING = 2
MINIMUM_REWARD_POINTS = 4
# AI takımları birbirine karşı beş kişilik kadroyla (takım ortalamasına en
# yakın beş bot) oynar; insan takımına karşı her üyeye en yakın kupalı bot çıkar.
AI_LINEUP_SIZE = 5
SESSION_PREFIX = "team-event-"

RULES_TR = (
    "Turnuva dört haftalık dönemlerle Pazartesi başlar. Kayıt ilk haftanın "
    "Pazartesi–Çarşamba günlerinde açıktır ve yalnız takım lideri yapar; kadro "
    "kayıtta sabitlenir. Her Perşembe yakın güçteki ve o dönem karşılaşmamış "
    "takımlar eşleşir. Cuma–Pazar eşleşen oyuncular rövanşlı iki maç oynar. "
    "Galibiyet 1, mağlubiyet 0 puandır; kupa değişmez. 4. hafta bitince ilk üç "
    "takımın en az 4 puan katkı veren oyuncuları ödül alır."
)


def _iso(moment: datetime) -> str:
    return moment.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def _utc(moment: datetime | None) -> datetime:
    value = moment or datetime.now(timezone.utc)
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _stable_fraction(key: str) -> float:
    digest = hashlib.sha256(key.encode("utf-8")).hexdigest()[:12]
    return int(digest, 16) / float(16 ** 12)


def period_id_for(moment: datetime | None = None) -> str:
    return competition_cycle(_utc(moment))["id"]


def period_id_of_leg(leg_id: str) -> str:
    """Maç ayağı kimliğinin dönem kısmı (``2026-09-28-w1-…`` → ``2026-09-28``)."""
    return str(leg_id).split("-w", 1)[0]


def tournament_calendar(period_id: str) -> dict:
    cycle = cycle_for_id(period_id)
    start = cycle["starts_at"]
    weeks = []
    for week in range(1, TOURNAMENT_WEEKS + 1):
        week_start = start + timedelta(days=DAYS_PER_WEEK * (week - 1))
        weeks.append({
            "week": week,
            "starts_at": week_start,
            "pairing_at": week_start + timedelta(days=PAIRING_DAY - 1),
            "matches_open_at": week_start + timedelta(days=FIRST_MATCH_DAY - 1),
            "matches_close_at": week_start + timedelta(days=DAYS_PER_WEEK),
        })
    return {
        "period_id": period_id,
        "starts_at": start,
        "period_ends_at": cycle["ends_at"] - timedelta(seconds=1),
        "registration_opens_at": start,
        "registration_closes_at": start + timedelta(days=REGISTRATION_DAYS),
        "weeks": weeks,
        "ends_at": weeks[-1]["matches_close_at"],
    }


def tournament_phase(calendar: dict, moment: datetime | None = None) -> tuple[str, int]:
    """(evre, hafta): registration, waiting, paired, matches veya finished."""
    current = _utc(moment)
    if current >= calendar["ends_at"]:
        return "finished", TOURNAMENT_WEEKS
    if current < calendar["registration_closes_at"]:
        return "registration", 1
    for week in calendar["weeks"]:
        if current < week["matches_close_at"]:
            if current < week["pairing_at"]:
                return "waiting", week["week"]
            if current < week["matches_open_at"]:
                return "paired", week["week"]
            return "matches", week["week"]
    return "finished", TOURNAMENT_WEEKS


def registration_open(period_id: str, moment: datetime | None = None) -> bool:
    calendar = tournament_calendar(period_id)
    current = _utc(moment)
    return calendar["registration_opens_at"] <= current < calendar["registration_closes_at"]


def _roster_entry(member: dict) -> dict:
    player_id = str(member.get("player_id") or "")
    return {
        "player_id": player_id,
        "display_name": str(member.get("display_name") or player_id or "Oyuncu"),
        "rating": max(0, int(member.get("rating", 0) or 0)),
    }


def _strength(roster: list[dict]) -> int:
    if not roster:
        return 0
    return round(sum(member["rating"] for member in roster) / len(roster))


def participating_teams(registrations: dict, ai_teams: dict) -> list[dict]:
    """Kayıtlı insan takımları ve her dönem kendiliğinden katılan AI takımları."""
    teams = []
    for is_ai, source in ((False, registrations), (True, ai_teams)):
        for team_id, record in (source or {}).items():
            roster = [
                entry
                for entry in (_roster_entry(member) for member in record.get("roster") or [])
                if entry["player_id"]
            ]
            if not roster:
                continue
            teams.append({
                "team_id": str(team_id),
                "team_name": str(record.get("team_name") or "Takım"),
                "is_ai": is_ai,
                "roster": roster,
                "strength": _strength(roster),
            })
    teams.sort(key=lambda team: team["team_id"])
    return teams


def _pair_key(left: str, right: str) -> tuple[str, str]:
    return (left, right) if left < right else (right, left)


def _repair_repeats(pairs: list[list[dict]], history: set) -> None:
    """Daha önce karşılaşmış bir çifti başka bir çiftle eş değiştirerek ayırır."""
    for index in range(len(pairs)):
        first, second = pairs[index]
        if _pair_key(first["team_id"], second["team_id"]) not in history:
            continue
        best = None
        for other_index, other in enumerate(pairs):
            if other_index == index:
                continue
            for swap in (0, 1):
                left = (first, other[swap])
                right = (second, other[1 - swap])
                if any(_pair_key(a["team_id"], b["team_id"]) in history for a, b in (left, right)):
                    continue
                cost = (
                    abs(left[0]["strength"] - left[1]["strength"])
                    + abs(right[0]["strength"] - right[1]["strength"])
                )
                if best is None or cost < best[0]:
                    best = (cost, other_index, swap)
        if best is None:
            continue
        _, other_index, swap = best
        other = pairs[other_index]
        pairs[index] = [first, other[swap]]
        pairs[other_index] = [second, other[1 - swap]]


def _pair_week(
    teams: list[dict],
    history: set,
    bye_counts: dict,
    home_counts: dict,
) -> tuple[list[tuple[dict, dict]], dict | None]:
    ordered = sorted(teams, key=lambda team: (-team["strength"], team["team_id"]))
    bye = None
    if len(ordered) % 2:
        # Bay önce AI takımlarına düşer; oyuncular maçsız hafta geçirmez.
        bye = min(
            ordered,
            key=lambda team: (
                bye_counts.get(team["team_id"], 0),
                not team["is_ai"],
                team["strength"],
                team["team_id"],
            ),
        )
        ordered = [team for team in ordered if team is not bye]
    remaining = list(ordered)
    pairs: list[list[dict]] = []
    while len(remaining) >= 2:
        first = remaining.pop(0)
        second = min(
            remaining,
            key=lambda team: (
                _pair_key(first["team_id"], team["team_id"]) in history,
                abs(first["strength"] - team["strength"]),
                team["team_id"],
            ),
        )
        remaining.remove(second)
        pairs.append([first, second])
    _repair_repeats(pairs, history)
    result = []
    for first, second in pairs:
        # Ev sahibi bu dönem daha az ev sahipliği yapmış takımdır; eşitse güçlü olan.
        if (
            (home_counts.get(second["team_id"], 0), -second["strength"], second["team_id"])
            < (home_counts.get(first["team_id"], 0), -first["strength"], first["team_id"])
        ):
            first, second = second, first
        result.append((first, second))
    return result, bye


def _by_rating(roster: list[dict]) -> list[dict]:
    return sorted(roster, key=lambda member: (-member["rating"], member["player_id"]))


def _ai_lineup(roster: list[dict]) -> list[dict]:
    ordered = _by_rating(roster)
    if len(ordered) <= AI_LINEUP_SIZE:
        return ordered
    start = max(0, min(len(ordered) - AI_LINEUP_SIZE, len(ordered) // 2 - AI_LINEUP_SIZE // 2))
    return ordered[start:start + AI_LINEUP_SIZE]


def _closest_bots(humans: list[dict], bots: list[dict]) -> list[tuple[dict, dict]]:
    available = _by_rating(bots)
    couples = []
    for human in _by_rating(humans):
        if not available:
            break
        bot = min(available, key=lambda item: (abs(item["rating"] - human["rating"]), item["player_id"]))
        available.remove(bot)
        couples.append((human, bot))
    return couples


def _member_pairings(home: dict, away: dict, fixture_id: str) -> list[dict]:
    if home["is_ai"] and away["is_ai"]:
        couples = list(zip(_ai_lineup(home["roster"]), _ai_lineup(away["roster"])))
    elif away["is_ai"]:
        couples = _closest_bots(home["roster"], away["roster"])
    elif home["is_ai"]:
        couples = [(bot, human) for human, bot in _closest_bots(away["roster"], home["roster"])]
    else:
        couples = list(zip(_by_rating(home["roster"]), _by_rating(away["roster"])))
    pairings = []
    for index, (left, right) in enumerate(couples, start=1):
        pairing_id = f"{fixture_id}-p{index}"
        pairings.append({
            "pairing_id": pairing_id,
            "home_player_id": left["player_id"],
            "home_player_name": left["display_name"],
            "home_rating": left["rating"],
            "away_player_id": right["player_id"],
            "away_player_name": right["display_name"],
            "away_rating": right["rating"],
            "rating_difference": abs(left["rating"] - right["rating"]),
            "leg_ids": [f"{pairing_id}-l{leg}" for leg in range(1, LEGS_PER_PAIRING + 1)],
        })
    return pairings


def build_schedule(period_id: str, teams: list[dict], weeks: int) -> list[dict]:
    """1. haftadan istenen haftaya kadar eşleşmeler; geçmiş haftalar hep aynıdır."""
    history: set = set()
    bye_counts: dict = {}
    home_counts: dict = {}
    schedule = []
    for week in range(1, max(0, min(weeks, TOURNAMENT_WEEKS)) + 1):
        pairs, bye = _pair_week(teams, history, bye_counts, home_counts)
        fixtures = []
        for home, away in pairs:
            history.add(_pair_key(home["team_id"], away["team_id"]))
            home_counts[home["team_id"]] = home_counts.get(home["team_id"], 0) + 1
            fixture_id = f"{period_id}-w{week}-{home['team_id']}-{away['team_id']}"
            fixtures.append({
                "fixture_id": fixture_id,
                "week": week,
                "home": home,
                "away": away,
                "pairings": _member_pairings(home, away, fixture_id),
            })
        if bye is not None:
            bye_counts[bye["team_id"]] = bye_counts.get(bye["team_id"], 0) + 1
        schedule.append({
            "week": week,
            "fixtures": fixtures,
            "bye_team_id": bye["team_id"] if bye is not None else None,
        })
    return schedule


def paired_week_count(calendar: dict, moment: datetime | None = None) -> int:
    current = _utc(moment)
    return sum(1 for week in calendar["weeks"] if current >= week["pairing_at"])


def _simulated_leg(pairing: dict, leg_id: str, leg_number: int, week: dict, moment: datetime) -> dict | None:
    """AI–AI maçı: kupa farkına göre ağırlıklı, sabit tohumlu sonuç.

    İlk maç Cumartesi, rövanş Pazar gününün başında açıklanır.
    """
    if moment < week["matches_open_at"] + timedelta(days=leg_number):
        return None
    expected_home = 1 / (1 + 10 ** ((pairing["away_rating"] - pairing["home_rating"]) / 400))
    home_wins = _stable_fraction(f"{leg_id}:ai-leg") < expected_home
    winner, loser = (
        (pairing["home_player_id"], pairing["away_player_id"])
        if home_wins
        else (pairing["away_player_id"], pairing["home_player_id"])
    )
    return {"winner_player_id": winner, "loser_player_id": loser, "draw": False, "simulated": True}


def _leg_result(fixture: dict, pairing: dict, leg_number: int, legs: dict, week: dict, moment: datetime) -> dict | None:
    leg_id = pairing["leg_ids"][leg_number - 1]
    recorded = legs.get(leg_id)
    if recorded:
        return recorded
    if fixture["home"]["is_ai"] and fixture["away"]["is_ai"]:
        return _simulated_leg(pairing, leg_id, leg_number, week, moment)
    return None


def _leg_views(fixture: dict, pairing: dict, legs: dict, week: dict, moment: datetime) -> list[dict]:
    views = []
    previous_played = True
    for leg_number, leg_id in enumerate(pairing["leg_ids"], start=1):
        result = _leg_result(fixture, pairing, leg_number, legs, week, moment)
        if result:
            status = "played"
        elif moment < week["matches_open_at"]:
            status = "upcoming"
        elif moment >= week["matches_close_at"]:
            status = "missed"
        else:
            status = "open" if previous_played else "locked"
        views.append({
            "leg": leg_number,
            "leg_id": leg_id,
            "battle_session_id": f"{SESSION_PREFIX}{leg_id}",
            "status": status,
            "winner_player_id": (result or {}).get("winner_player_id"),
            "draw": bool((result or {}).get("draw")),
        })
        previous_played = bool(result)
    return views


def _team_rows(teams: list[dict], schedule: list[dict], calendar: dict, legs: dict, moment: datetime) -> list[dict]:
    rows: dict[str, dict] = {}
    for team in teams:
        rows[team["team_id"]] = {
            "team_id": team["team_id"],
            "team_name": team["team_name"],
            "is_ai": team["is_ai"],
            "strength": team["strength"],
            "points": 0,
            "matches": 0,
            "members": {
                member["player_id"]: {
                    "player_id": member["player_id"],
                    "display_name": member["display_name"],
                    "rating": member["rating"],
                    "matches": 0,
                    "wins": 0,
                    "contribution_points": 0,
                }
                for member in ([] if team["is_ai"] else team["roster"])
            },
        }
    weeks_by_number = {week["week"]: week for week in calendar["weeks"]}
    for scheduled in schedule:
        week = weeks_by_number[scheduled["week"]]
        for fixture in scheduled["fixtures"]:
            for pairing in fixture["pairings"]:
                for leg_number in range(1, LEGS_PER_PAIRING + 1):
                    result = _leg_result(fixture, pairing, leg_number, legs, week, moment)
                    if not result:
                        continue
                    for side in ("home", "away"):
                        row = rows[fixture[side]["team_id"]]
                        player_id = pairing[f"{side}_player_id"]
                        member = row["members"].setdefault(player_id, {
                            "player_id": player_id,
                            "display_name": pairing[f"{side}_player_name"],
                            "rating": pairing[f"{side}_rating"],
                            "matches": 0,
                            "wins": 0,
                            "contribution_points": 0,
                        })
                        member["matches"] += 1
                        row["matches"] += 1
                        if not result.get("draw") and result.get("winner_player_id") == player_id:
                            member["wins"] += 1
                            member["contribution_points"] += 1
                            row["points"] += 1
    ordered = []
    for row in rows.values():
        members = sorted(
            row["members"].values(),
            key=lambda member: (-member["contribution_points"], -member["rating"], member["display_name"].casefold()),
        )
        for member in members:
            member["reward_eligible"] = member["contribution_points"] >= MINIMUM_REWARD_POINTS
        ordered.append({
            **row,
            "members": members,
            "member_count": len(members),
            "qualified_member_count": sum(member["reward_eligible"] for member in members),
        })
    ordered.sort(key=lambda row: (-row["points"], -row["qualified_member_count"], row["team_name"].casefold(), row["team_id"]))
    for position, row in enumerate(ordered, start=1):
        row["position"] = position
    return ordered


def _fixture_view(fixture: dict, week: dict, legs: dict, moment: datetime) -> dict:
    status = (
        "upcoming"
        if moment < week["matches_open_at"]
        else "live"
        if moment < week["matches_close_at"]
        else "completed"
    )
    pairings = []
    score = {"home": 0, "away": 0}
    for pairing in fixture["pairings"]:
        leg_views = _leg_views(fixture, pairing, legs, week, moment)
        for leg in leg_views:
            if leg["status"] != "played" or leg["draw"]:
                continue
            if leg["winner_player_id"] == pairing["home_player_id"]:
                score["home"] += 1
            elif leg["winner_player_id"] == pairing["away_player_id"]:
                score["away"] += 1
        pairings.append({
            "pairing_id": pairing["pairing_id"],
            "home_player_id": pairing["home_player_id"],
            "home_player_name": pairing["home_player_name"],
            "away_player_id": pairing["away_player_id"],
            "away_player_name": pairing["away_player_name"],
            "rating_difference": pairing["rating_difference"],
            "legs": leg_views,
        })
    return {
        "fixture_id": fixture["fixture_id"],
        "week": fixture["week"],
        "home_team_id": fixture["home"]["team_id"],
        "home_team_name": fixture["home"]["team_name"],
        "home_is_ai": fixture["home"]["is_ai"],
        "away_team_id": fixture["away"]["team_id"],
        "away_team_name": fixture["away"]["team_name"],
        "away_is_ai": fixture["away"]["is_ai"],
        "home_points": score["home"],
        "away_points": score["away"],
        "member_pairings": pairings,
        "matches_per_player": LEGS_PER_PAIRING,
        "pairing_at": _iso(week["pairing_at"]),
        "matches_open_at": _iso(week["matches_open_at"]),
        "matches_close_at": _iso(week["matches_close_at"]),
        "status": status,
    }


def build_team_tournament_view(
    period_id: str,
    moment: datetime | None,
    *,
    registrations: dict | None = None,
    ai_teams: dict | None = None,
    legs: dict | None = None,
) -> dict:
    current = _utc(moment)
    calendar = tournament_calendar(period_id)
    phase, week_number = tournament_phase(calendar, current)
    teams = participating_teams(registrations or {}, ai_teams or {})
    schedule = build_schedule(period_id, teams, paired_week_count(calendar, current))
    recorded_legs = dict(legs or {})
    standings = _team_rows(teams, schedule, calendar, recorded_legs, current)
    latest = schedule[-1] if schedule else None
    latest_week = calendar["weeks"][latest["week"] - 1] if latest else None
    fixtures = [
        _fixture_view(fixture, latest_week, recorded_legs, current)
        for fixture in (latest["fixtures"] if latest else [])
    ]
    week = calendar["weeks"][week_number - 1]
    next_milestone = None
    if phase == "registration":
        next_milestone = {"kind": "registration_close", "at": _iso(calendar["registration_closes_at"])}
    elif phase == "waiting":
        next_milestone = {"kind": "pairing", "at": _iso(week["pairing_at"])}
    elif phase == "paired":
        next_milestone = {"kind": "matches", "at": _iso(week["matches_open_at"])}
    elif phase == "matches":
        next_milestone = {"kind": "matches_close", "at": _iso(week["matches_close_at"])}
    return {
        "name_tr": "Takımlar Arası Turnuva",
        "period": {
            "id": period_id,
            "starts_at": _iso(calendar["starts_at"]),
            "ends_at": _iso(calendar["period_ends_at"]),
        },
        "calendar": {
            "registration_opens_at": _iso(calendar["registration_opens_at"]),
            "registration_closes_at": _iso(calendar["registration_closes_at"]),
            "ends_at": _iso(calendar["ends_at"]),
            "weeks": [
                {
                    "week": item["week"],
                    "starts_at": _iso(item["starts_at"]),
                    "pairing_at": _iso(item["pairing_at"]),
                    "matches_open_at": _iso(item["matches_open_at"]),
                    "matches_close_at": _iso(item["matches_close_at"]),
                }
                for item in calendar["weeks"]
            ],
        },
        "phase": phase,
        "week": week_number,
        "weeks_total": TOURNAMENT_WEEKS,
        "registration_open": phase == "registration",
        "next_milestone": next_milestone,
        "rules_tr": RULES_TR,
        "registration_fee": 0,
        "minimum_reward_points": MINIMUM_REWARD_POINTS,
        "legs_per_pairing": LEGS_PER_PAIRING,
        "registered_team_ids": sorted(str(team_id) for team_id in (registrations or {})),
        "bye_team_id": latest["bye_team_id"] if latest else None,
        "schedule_status": fixtures[0]["status"] if fixtures else "upcoming",
        "standings": standings,
        "fixtures": fixtures,
    }


def locate_leg(
    period_id: str,
    leg_id: str,
    *,
    registrations: dict | None = None,
    ai_teams: dict | None = None,
) -> dict | None:
    """Bir maç ayağının fikstürünü, eşleşmesini ve hafta takvimini bulur."""
    prefix = f"{period_id}-w"
    if not str(leg_id).startswith(prefix):
        return None
    try:
        week_number = int(str(leg_id)[len(prefix):].split("-", 1)[0])
    except ValueError:
        return None
    if not 1 <= week_number <= TOURNAMENT_WEEKS:
        return None
    calendar = tournament_calendar(period_id)
    teams = participating_teams(registrations or {}, ai_teams or {})
    schedule = build_schedule(period_id, teams, week_number)
    if len(schedule) < week_number:
        return None
    for fixture in schedule[week_number - 1]["fixtures"]:
        for pairing in fixture["pairings"]:
            if leg_id in pairing["leg_ids"]:
                return {
                    "fixture": fixture,
                    "pairing": pairing,
                    "leg": pairing["leg_ids"].index(leg_id) + 1,
                    "week": calendar["weeks"][week_number - 1],
                }
    return None


def player_open_leg(view: dict, player_id: str, fixture_id: str | None = None) -> dict | None:
    """Oyuncunun şimdi oynayabileceği maç ayağı (ilk maç, sonra rövanş)."""
    for fixture in view.get("fixtures", []):
        if fixture_id and fixture.get("fixture_id") != fixture_id:
            continue
        for pairing in fixture.get("member_pairings", []):
            if player_id not in {pairing.get("home_player_id"), pairing.get("away_player_id")}:
                continue
            for leg in pairing.get("legs", []):
                if leg.get("status") == "open":
                    return {"fixture": fixture, "pairing": pairing, "leg": leg}
    return None
