from datetime import datetime, timedelta, timezone

from app.competition_cycle import competition_cycle, cycle_for_id
from app.team_tournament import (
    MINIMUM_REWARD_POINTS,
    build_schedule,
    build_team_tournament_view,
    locate_leg,
    participating_teams,
    player_open_leg,
    registration_open,
    tournament_calendar,
    tournament_phase,
)


# 1. döngü: 28 Eylül 2026 Pazartesi – 25 Ekim Pazar. Gün sayısı döngünün
# başından sayılır (1 = Pazartesi, 4 = Perşembe, 5 = Cuma).
PERIOD = "2026-09-28"
CYCLE_START = datetime(2026, 9, 28, tzinfo=timezone.utc)


def _moment(day, hour=12):
    return CYCLE_START + timedelta(days=day - 1, hours=hour)


def _registrations(*teams):
    return {
        team_id: {
            "team_name": team_id.upper(),
            "roster": [
                {"player_id": f"{team_id}-{index}", "display_name": f"{team_id} {index}", "rating": rating}
                for index in range(2)
            ],
        }
        for team_id, rating in teams
    }


def test_cycles_start_on_monday_and_last_four_weeks():
    cycle = competition_cycle(datetime(2026, 10, 7, tzinfo=timezone.utc))
    assert cycle["id"] == PERIOD
    assert cycle["starts_at"].weekday() == 0
    assert cycle["ends_at"] == datetime(2026, 10, 26, tzinfo=timezone.utc)
    assert competition_cycle(datetime(2026, 9, 25, tzinfo=timezone.utc))["id"] == "2026-08-31"
    assert cycle_for_id("2026-10-26")["number"] == 2
    for invalid in ("2026-10-01", "2026-10-05", "2026-10"):
        try:
            cycle_for_id(invalid)
        except ValueError:
            continue
        raise AssertionError(f"{invalid} geçersiz döngü kimliği olmalıydı")


def test_calendar_follows_monday_weeks():
    calendar = tournament_calendar(PERIOD)
    assert registration_open(PERIOD, _moment(1, 0))
    assert registration_open(PERIOD, _moment(3, 23))
    assert not registration_open(PERIOD, _moment(4, 0))
    assert tournament_phase(calendar, _moment(2)) == ("registration", 1)
    assert tournament_phase(calendar, _moment(4)) == ("paired", 1)
    assert tournament_phase(calendar, _moment(6)) == ("matches", 1)
    assert tournament_phase(calendar, _moment(9)) == ("waiting", 2)
    assert tournament_phase(calendar, _moment(11)) == ("paired", 2)
    assert tournament_phase(calendar, _moment(28)) == ("matches", 4)
    assert tournament_phase(calendar, _moment(29)) == ("finished", 4)
    assert MINIMUM_REWARD_POINTS == 4


def test_weekly_pairings_are_balanced_and_do_not_repeat():
    registrations = _registrations(("a", 1000), ("b", 990), ("c", 500), ("d", 480))
    schedule = build_schedule(PERIOD, participating_teams(registrations, {}), 3)
    week_one = {
        frozenset((fixture["home"]["team_id"], fixture["away"]["team_id"]))
        for fixture in schedule[0]["fixtures"]
    }
    assert week_one == {frozenset(("a", "b")), frozenset(("c", "d"))}
    seen = set()
    for week in schedule:
        for fixture in week["fixtures"]:
            pair = frozenset((fixture["home"]["team_id"], fixture["away"]["team_id"]))
            assert pair not in seen
            seen.add(pair)


def test_odd_team_count_rotates_the_bye():
    registrations = _registrations(("a", 1000), ("b", 900), ("c", 800))
    schedule = build_schedule(PERIOD, participating_teams(registrations, {}), 3)
    assert len({week["bye_team_id"] for week in schedule}) == 3


def test_return_leg_opens_after_first_leg_and_only_during_match_days():
    registrations = _registrations(("a", 1000), ("b", 990))
    teams = participating_teams(registrations, {})
    pairing = build_schedule(PERIOD, teams, 1)[0]["fixtures"][0]["pairings"][0]
    first_leg, return_leg = pairing["leg_ids"]

    before = build_team_tournament_view(PERIOD, _moment(4), registrations=registrations)
    assert player_open_leg(before, pairing["home_player_id"]) is None

    live = build_team_tournament_view(PERIOD, _moment(5), registrations=registrations)
    assert player_open_leg(live, pairing["home_player_id"])["leg"]["leg_id"] == first_leg

    played = build_team_tournament_view(
        PERIOD,
        _moment(6),
        registrations=registrations,
        legs={first_leg: {"winner_player_id": pairing["home_player_id"], "draw": False}},
    )
    assert player_open_leg(played, pairing["away_player_id"])["leg"]["leg_id"] == return_leg

    closed = build_team_tournament_view(PERIOD, _moment(8), registrations=registrations)
    assert closed["fixtures"][0]["member_pairings"][0]["legs"][0]["status"] == "missed"
    assert locate_leg(PERIOD, return_leg, registrations=registrations)["leg"] == 2


def test_human_team_plays_closest_rated_bots():
    registrations = {"human": {"team_name": "İnsan", "roster": [{"player_id": "h1", "display_name": "H1", "rating": 400}]}}
    ai_teams = {
        "ai": {
            "team_name": "AI",
            "roster": [
                {"player_id": "bot-low", "display_name": "Düşük", "rating": 380},
                {"player_id": "bot-high", "display_name": "Yüksek", "rating": 2400},
            ],
        }
    }
    view = build_team_tournament_view(PERIOD, _moment(5), registrations=registrations, ai_teams=ai_teams)
    pairing = view["fixtures"][0]["member_pairings"][0]
    assert {pairing["home_player_id"], pairing["away_player_id"]} == {"h1", "bot-low"}
