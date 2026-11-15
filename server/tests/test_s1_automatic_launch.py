"""Actual Tuesday S1 calendar, unattended closing and manual S2 intermission."""
from copy import deepcopy
from datetime import datetime, timedelta, timezone

import pytest

from app import main, first_season_profile as first, cosmetic_releases, player_profile
from app.competition_control import launch_status, first_season_bots
from app.competition_cycle import weekly_cycle
from app.cosmetic_releases import CosmeticReleaseRegistry, fingerprint
from app.player_profile import PlayerProfileService, SEASON_REWARD_TRACK
from app.player_data_store import JsonFilePlayerDataRepository, PlayerDataStoreService
from app.player_statistics import PlayerStatisticsService
from app.player_settings import PlayerSettingsService
from app.team_service import TeamService, JsonTeamRepository
from app.season_competition import build_events_view
from test_postgres_social_api import social_db  # noqa: F401
from test_season_entitlements import s1  # noqa: F401


@pytest.fixture
def automatic_s1(monkeypatch, tmp_path):
    document = deepcopy(first.PROFILE)
    start = datetime.fromisoformat(document['starts_at'].replace('Z', '+00:00'))
    assert start == datetime(2026, 11, 24, tzinfo=timezone.utc)
    registry = CosmeticReleaseRegistry(cosmetic_releases.REGISTRY.document)
    for index, allocation in enumerate(document['cosmetic_allocations']):
        identity = f'automatic-s1-cosmetic-{index}'
        registry = registry.reserve(allocation['source'], allocation['period_id'], identity)
        registry = registry.publish(identity, now=start - timedelta(days=10))
    for index, week in enumerate(document['resource_weeks']):
        identity = f'automatic-s1-resource-{index}'
        placements = [dict(slot=p['position'], cosmetics={}, resources={k:v for k,v in p.items() if k != 'position'}) for p in week['prizes']]
        registry = registry.reserve_resources(week['period_id'], identity, placements)
        registry = registry.publish(identity, now=start - timedelta(days=10))
    document.update(status='published', release_checks={key:True for key in document['release_checks']})
    document['content_hash'] = fingerprint(document)
    monkeypatch.setattr(first, 'PROFILE', document)
    monkeypatch.setattr(first, 'REGISTRY', registry)
    monkeypatch.setattr(cosmetic_releases, 'REGISTRY', registry)
    monkeypatch.setenv('GRIDSHARD_SEASON_STARTS_AT', document['starts_at'])
    monkeypatch.setenv('GRIDSHARD_TEAM_TOURNAMENT_STARTS_AT', document['starts_at'])
    monkeypatch.setenv('GRIDSHARD_SEASON_AUTO_CYCLES', '1')
    monkeypatch.delenv('GRIDSHARD_OWNER_PLAYER_ID', raising=False)
    clock = [start]
    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return clock[0] if tz else clock[0].replace(tzinfo=None)
    monkeypatch.setattr(main, 'datetime', Clock)
    descriptor = player_profile.season_descriptor
    monkeypatch.setattr(main, 'season_descriptor', lambda moment=None: descriptor(moment or clock[0]))
    profiles = PlayerProfileService(now_func=lambda:clock[0])
    repository = JsonFilePlayerDataRepository(tmp_path / 'players.json')
    store = PlayerDataStoreService(profile_service=profiles, statistics_service=PlayerStatisticsService(),
        settings_service=PlayerSettingsService(), repository=repository)
    teams = TeamService(JsonTeamRepository(tmp_path / 'teams.json'))
    monkeypatch.setattr(main, 'player_profile_service', profiles)
    monkeypatch.setattr(main, 'player_data_repository', repository)
    monkeypatch.setattr(main, 'player_data_store_service', store)
    monkeypatch.setattr(main, 'team_service', teams)
    monkeypatch.setattr(main, 'RUNTIME_STRICT', False)
    monkeypatch.setattr(main, 'persist_player_data', store.save_player)
    return clock, profiles, store, teams


def test_24_november_opening_four_full_weeks_and_manual_intermission(automatic_s1):
    clock, _, _, _ = automatic_s1
    start = clock[0]
    assert not launch_status(start - timedelta(microseconds=1))['active']
    assert launch_status(start)['active'] and launch_status(start, team=True)['active']
    for index in range(4):
        week = weekly_cycle(start + timedelta(days=index * 7, hours=12))
        assert week['starts_at'] == start + timedelta(days=index * 7)
        assert week['ends_at'] == start + timedelta(days=(index + 1) * 7)
        assert first_season_bots(period_id=week['id'])
        assert weekly_cycle(week['ends_at'] - timedelta(microseconds=1))['id'] == week['id']
        assert weekly_cycle(week['ends_at'])['id'] != week['id']
    end = start + timedelta(days=28)
    assert launch_status(end - timedelta(microseconds=1))['active']
    for current in (end, end + timedelta(days=6), end + timedelta(days=60)):
        assert launch_status(current)['intermission']
        assert not launch_status(current, team=True)['active']
        assert not first_season_bots(current)
    view = build_events_view([], end)
    assert not view['weekly_tournament']['registration_open']
    assert view['weekly_tournament']['standings'] == []


def test_offline_player_earns_exactly_once_and_unclaimed_road_survives_closing_and_reload(automatic_s1):
    clock, profiles, store, teams = automatic_s1
    start = clock[0]
    human = profiles.get_or_create('offline-human')
    human.rating = 50000
    human.season_xp = SEASON_REWARD_TRACK[4]['required_xp']
    profiles.get_or_create(human.player_id)
    human.weekly_tournament_period = human.weekly_tournament_registered_period = '2026-W48'
    human.weekly_tournament_matches = 10
    human.weekly_tournament_wins = 10
    human.weekly_tournament_trophies_earned = 10000
    store.save_player(human.player_id)
    profiles._profiles.clear()  # No online player or HTTP endpoint drives the job.
    clock[0] = start + timedelta(days=7)
    main._scheduled_first_season_pass()
    winner = profiles.get(human.player_id)
    week_mail = next(m for m in winner.reward_inbox if m['source'] == 'weekly_tournament')
    assert week_mail['position'] == 1 and week_mail['chest']['module_shards'] == 36
    first_close = deepcopy(teams.competition_reward_state())
    main._scheduled_first_season_pass()
    assert teams.competition_reward_state() == first_close
    assert len(winner.reward_inbox) == 1
    clock[0] = start + timedelta(days=28)
    profiles._profiles.clear()
    main._scheduled_first_season_pass()
    final = deepcopy(teams.competition_reward_state())
    assert len(final['closures']) == 6  # Four weekly, one season, one team.
    assert len(final['deferred']) == 4  # Three all-bot weeks and the all-bot team period.
    winner = profiles.get(human.player_id)
    assert winner.active_meta_season_id == 'gridshard_waiting'
    assert winner.season_archives[-1]['season_id'] == first.PROFILE['season_id']
    assert next(m for m in winner.reward_inbox if m['source'] == 'season_leaderboard')['position'] == 1
    assert any(m['source'] == 'season_road' for m in winner.reward_inbox)
    mails = deepcopy(winner.reward_inbox)
    profiles._profiles.clear()
    main._scheduled_first_season_pass()
    store.load_player(human.player_id)
    assert profiles.get(human.player_id).reward_inbox == mails
    assert teams.competition_reward_state() == final


def test_collected_and_pruned_competition_mail_cannot_be_recreated(automatic_s1):
    _, profiles, _, _ = automatic_s1
    human = profiles.get_or_create('claimed-human')
    identity = 'weekly_tournament:2026-W48:claimed-human'
    human.reward_inbox_receipts['old-collection'] = {'message_id':identity}
    assert not main._queue_competition_reward(human, source='weekly_tournament', period_id='2026-W48', position=1, prize={})
    assert not human.reward_inbox


def test_pg_scheduled_closure_rolls_back_then_recovers_and_reloads_once(social_db, s1, monkeypatch):
    from app.postgres_team import PostgresTeamRepository
    pool, players, _, ids = social_db
    clock = s1[0]
    clock[0] += timedelta(days=7)
    class Clock(datetime):
        @classmethod
        def now(cls, tz=None):
            return clock[0]
    monkeypatch.setattr(main, 'datetime', Clock)
    monkeypatch.setattr(main.player_profile_service, '_now_func', lambda:clock[0])
    repository = PostgresTeamRepository(pool)
    original = repository.load()
    monkeypatch.setattr(main, 'team_service', TeamService(repository))
    before = deepcopy(main.team_service.competition_reward_state())
    snapshots = {p:deepcopy(players.load(p).profile) for p in ids}
    settle = main._settle_first_season_rewards
    def interrupted(*args):
        settle(*args)
        raise RuntimeError('scheduled transaction interruption')
    monkeypatch.setattr(main, '_settle_first_season_rewards', interrupted)
    try:
        with pytest.raises(RuntimeError, match='transaction interruption'):
            main._scheduled_first_season_pass()
        assert main.team_service.competition_reward_state() == before
        assert {p:players.load(p).profile for p in ids} == snapshots
        monkeypatch.setattr(main, '_settle_first_season_rewards', settle)
        main._scheduled_first_season_pass()
        completed = deepcopy(main.team_service.competition_reward_state())
        assert len(completed['closures']) == len(before['closures']) + 1
        assert len(completed['deferred']) == len(before['deferred']) + 1
        monkeypatch.setattr(main, 'team_service', TeamService(PostgresTeamRepository(pool)))
        main.player_profile_service._profiles.clear()
        main._scheduled_first_season_pass()
        assert main.team_service.competition_reward_state() == completed
    finally:
        payload = repository.load()
        payload['tournaments'] = original['tournaments']
        repository.save(payload)
