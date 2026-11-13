"""S1 AI participation and actual-position prizes, without synthetic accounts."""
from collections import Counter
from copy import deepcopy
from datetime import datetime, timedelta, timezone

import pytest

from app import main, first_season_profile as first, cosmetic_releases
from app.arena_canon import BOTS
from app.competition_control import first_season_bots, competition_eligible
from app.season_competition import weekly_standings, first_season_ai_teams, build_events_view, WEEKLY_PRIZES
from app.team_service import TeamService, JsonTeamRepository, InMemoryTeamRepository
from app.team_tournament import build_team_tournament_view, locate_leg, player_open_leg
from test_season_entitlements import s1  # noqa: F401
from test_postgres_social_api import social_db  # noqa: F401


def bot_rows():
    return [dict(player_id=b['id'], display_name=b['display_name'], rating=b['rating'],
                 team_id=b['team_id'], team_name=b['team_name'], is_bot=True) for b in BOTS]


def wire(s1, monkeypatch, tmp_path):
    clock, service, profile, _ = s1
    teams = TeamService(JsonTeamRepository(tmp_path / 'teams.json'))
    monkeypatch.setattr(main, 'team_service', teams)
    monkeypatch.setattr(main, 'persist_player_data', lambda _: None)
    monkeypatch.setattr(main, '_leaderboard_profile_rows', bot_rows)
    return clock, service, profile, teams


def test_all_240_handles_are_unique_and_all_modules_are_in_legal_decks():
    names = [bot['display_name'] for bot in BOTS]
    assert len(names) == len({n.casefold() for n in names}) == 240
    assert all(n.isalpha() and n.casefold() != 'uç' for n in names)
    assert {'Kesici', 'Aylak', 'Çaylak'} <= set(names)
    assert set(Counter(bot['team_id'] for bot in BOTS).values()) == {20}
    assert len({bot['team_id'] for bot in BOTS}) == 12
    assert set(module for bot in BOTS for module in bot['battle_pool_ids']) == set(first.PROFILE['existing_module_ids'])


def test_bot_participation_is_published_s1_only_and_never_reward_eligibility(s1, monkeypatch):
    start = s1[0][0]
    assert not first_season_bots(start - timedelta(seconds=1))
    assert first_season_bots(start)
    assert not first_season_bots(start + timedelta(days=28))
    assert first_season_bots(period_id='2026-W49')  # readable after S1 too
    assert not first_season_bots(period_id='2026-W53')
    assert not competition_eligible(BOTS[0]['id'])
    assert not competition_eligible('any-ai', is_bot=True)
    monkeypatch.delenv('GRIDSHARD_TEAM_TOURNAMENT_STARTS_AT', raising=False)
    assert not first_season_bots(start, team=True)
    monkeypatch.setenv('GRIDSHARD_TEAM_TOURNAMENT_STARTS_AT', first.PROFILE['starts_at'])
    assert first_season_bots(start, team=True)
    document = deepcopy(first.PROFILE)
    document['status'] = 'draft'
    monkeypatch.setattr(first, 'PROFILE', document)
    assert not first_season_bots(start)


def test_seeded_weekly_activity_is_stable_and_contains_all_240_without_accounts(s1):
    players = bot_rows()
    before = deepcopy(players)
    now = s1[0][0] + timedelta(days=6, hours=23)
    rows = weekly_standings(players, now)
    assert len(rows) == 240 and all(r['is_bot'] for r in rows)
    assert rows == weekly_standings(players[::-1], now)
    assert players == before
    assert all(0 <= r['wins'] <= r['matches'] <= 36 for r in rows)
    assert rows[0]['points'] > rows[-1]['points']


@pytest.mark.parametrize('days_before', [17, 1])
def test_prelaunch_events_preview_first_week_without_saved_or_bot_standings(s1, monkeypatch, days_before):
    start = s1[0][0]
    monkeypatch.setenv('GRIDSHARD_TEAM_TOURNAMENT_STARTS_AT', first.PROFILE['starts_at'])
    current = start - timedelta(days=days_before)
    year, week, _ = current.isocalendar()
    players = bot_rows() + [dict(player_id='old-entry', display_name='Old', rating=100,
        weekly_registered_period=f'{year}-W{week:02d}', weekly_period=f'{year}-W{week:02d}',
        weekly_matches=5, weekly_wins=4, weekly_trophies_earned=20)]
    before = deepcopy(players)
    events = build_events_view(players, current)
    weekly, team = events['weekly_tournament'], events['team_tournament']
    for tournament in (weekly, team):
        assert tournament['status'] == 'waiting_for_launch'
        assert tournament['starts_at'] == first.PROFILE['starts_at']
        assert not tournament['registration_open']
        assert tournament['standings'] == []
        assert tournament['period']['starts_at'] == first.PROFILE['starts_at']
    assert weekly['participant_count'] == 0
    assert weekly['period']['ends_at'] == (start + timedelta(days=7, seconds=-1)).isoformat().replace('+00:00', 'Z')
    assert team['fixtures'] == [] and team['week'] == 1
    assert players == before
    opened = build_events_view(players, start)
    assert len(opened['weekly_tournament']['standings']) == 240
    assert len(opened['team_tournament']['standings']) == 12


def test_all_12_bot_teams_get_fixtures_only_after_independent_team_gate(s1, monkeypatch):
    start = s1[0][0]
    monkeypatch.delenv('GRIDSHARD_TEAM_TOURNAMENT_STARTS_AT', raising=False)
    assert first_season_ai_teams(bot_rows(), '2026-11-30') == {}
    monkeypatch.setenv('GRIDSHARD_TEAM_TOURNAMENT_STARTS_AT', '2026-11-30T00:00:00Z')
    teams = first_season_ai_teams(bot_rows(), '2026-11-30')
    now = start + timedelta(days=5)
    view = build_team_tournament_view('2026-11-30', now, ai_teams=teams)
    assert len(teams) == view['participant_count'] == 12
    assert len(view['standings']) == 12 and len(view['fixtures']) == 6
    assert all(not m['reward_eligible'] for row in view['standings'] for m in row['members'])
    final = build_team_tournament_view('2026-11-30', start + timedelta(days=29), ai_teams=teams)
    assert len(final['standings']) == 12  # next-season content gate does not erase history


def test_human_gets_playable_return_legs_against_canonical_bots(s1, monkeypatch):
    start = s1[0][0]
    monkeypatch.setenv('GRIDSHARD_TEAM_TOURNAMENT_STARTS_AT', '2026-11-30T00:00:00Z')
    teams = first_season_ai_teams(bot_rows(), '2026-11-30')
    registrations = {'human-team': dict(team_name='İnsan Devresi', roster=[dict(player_id='human', display_name='İnsan', rating=1000)])}
    view = build_team_tournament_view('2026-11-30', start + timedelta(days=5), ai_teams=teams, registrations=registrations)
    leg = player_open_leg(view, 'human')
    assert leg is not None
    located = locate_leg('2026-11-30', leg['leg']['leg_id'], ai_teams=teams, registrations=registrations)
    assert located is not None
    pairing = located['pairing']
    assert {pairing['home_player_id'], pairing['away_player_id']} & {b['id'] for b in BOTS}


@pytest.mark.parametrize('source,size,flag', [('weekly_tournament',3,'is_bot'), ('season_leaderboard',10,'is_bot'), ('team_tournament',3,'is_ai')])
def test_whole_bot_package_appends_once_and_survives_reload(tmp_path, source, size, flag):
    path = tmp_path / 'teams.json'
    service = TeamService(JsonTeamRepository(path))
    rows = [dict(position=i, **{flag:True}) for i in range(1,size+1)]
    prizes = [dict(position=i, circuit_credits=i*100, avatar_frame_id='fixed-frame' if i==1 else '') for i in range(1,size+1)]
    first_close = service.close_competition_period(source, 'original', rows, prizes)
    reloaded = TeamService(JsonTeamRepository(path))
    assert reloaded.close_competition_period(source,'original',[],[]) == first_close
    planned = reloaded.competition_reward_state()['deferred']
    assert len(planned) == 1 and planned[0]['prizes'] == prizes
    assert planned[0]['sequence'] == 1 and planned[0]['status'] == 'planned'
    assert planned[0]['scheduled_period_id'] is None
    reloaded.close_competition_period(source,'later',rows,prizes)
    assert [p['sequence'] for p in reloaded.competition_reward_state()['deferred']] == [1,2]


@pytest.mark.parametrize('rows,enough', [([dict(position=1,is_bot=True),dict(position=2,is_bot=False),dict(position=3,is_bot=True)],True),
                                      ([dict(position=1,is_bot=True)],True),
                                      ([dict(position=i,is_bot=True) for i in range(1,4)],False)])
def test_partial_bot_or_insufficient_ranking_does_not_requeue_a_whole_package(rows,enough):
    service = TeamService(InMemoryTeamRepository())
    service.close_competition_period('weekly_tournament','week',rows,list(WEEKLY_PRIZES),minimum_met=enough)
    assert service.competition_reward_state()['deferred'] == []


def test_mixed_weekly_keeps_human_second_in_preview_closure_and_exact_crate(s1, monkeypatch, tmp_path):
    clock, service, profile, teams = wire(s1,monkeypatch,tmp_path)
    now = clock[0] + timedelta(days=6,hours=23)
    ordered = weekly_standings(bot_rows(),now)
    by_id = {r['player_id']:r for r in bot_rows()}
    profile.weekly_tournament_period = profile.weekly_tournament_registered_period = '2026-W49'
    profile.weekly_tournament_matches = 10
    profile.weekly_tournament_wins = 5
    profile.weekly_tournament_trophies_earned = (ordered[0]['points']+ordered[-1]['points'])//2
    players = [by_id[ordered[0]['player_id']],by_id[ordered[-1]['player_id']],dict(
        player_id=profile.player_id,display_name='Gerçek',rating=profile.rating,is_bot=False,
        weekly_period='2026-W49',weekly_registered_period='2026-W49',weekly_matches=10,weekly_wins=5,
        weekly_trophies_earned=profile.weekly_tournament_trophies_earned)]
    monkeypatch.setattr(main,'_leaderboard_profile_rows',lambda:players)
    preview = build_events_view(players,now)['weekly_tournament']
    assert next(r for r in preview['standings'] if not r['is_bot'])['position'] == 2
    main._settle_first_season_rewards([profile], clock[0]+timedelta(days=7))
    assert len(profile.reward_inbox) == 1
    mail = profile.reward_inbox[0]
    assert mail['position'] == 2 and mail['chest'] == preview['prizes'][1]
    assert mail['chest']['module_shards'] == 24
    assert teams.competition_reward_state()['deferred'] == []
    # Registration can discard the counters; an old closing cannot be revised.
    profile.weekly_tournament_period = profile.weekly_tournament_registered_period = '2026-W50'
    players[-1]['weekly_registered_period'] = '2026-W50'
    main._settle_first_season_rewards([profile], clock[0]+timedelta(days=7))
    assert len(profile.reward_inbox) == 1 and profile.weekly_reward_closures['2026-W49']['position'] == 2


def test_all_bot_weeks_and_season_defer_even_without_human_registration(s1, monkeypatch,tmp_path):
    clock, service, profile, teams = wire(s1,monkeypatch,tmp_path)
    now = clock[0]+timedelta(days=28)
    main._settle_first_season_rewards([profile],now)
    first_state = teams.competition_reward_state()
    assert len(first_state['closures']) == len(first_state['deferred']) == 5
    assert not profile.reward_inbox
    assert [p['original_period_id'] for p in first_state['deferred']] == ['2026-W49','2026-W50','2026-W51','2026-W52',first.PROFILE['season_id']]
    assert first_state['deferred'][0]['prizes'][0]['module_shards'] == 36
    assert first_state['deferred'][3]['prizes'][0]['avatar_frame_id'] == 'abyss_frame'
    assert first_state['deferred'][4]['prizes'][0]['avatar_frame_id'] == 'solar_frame'
    main._settle_first_season_rewards([profile],now+timedelta(days=20))
    assert teams.competition_reward_state() == first_state


def test_human_second_in_season_archive_does_not_receive_first_place_cosmetics(s1,monkeypatch,tmp_path):
    clock, service, profile, teams = wire(s1,monkeypatch,tmp_path)
    bots=sorted(bot_rows(),key=lambda row:row['rating'])
    profile.season_archives=[dict(season_id=first.PROFILE['season_id'],final_rating=(bots[0]['rating']+bots[-1]['rating'])//2)]
    monkeypatch.setattr(main,'_leaderboard_profile_rows',lambda:[bots[0],bots[-1]])
    main._settle_first_season_rewards([profile],clock[0]+timedelta(days=28))
    mail=next(m for m in profile.reward_inbox if m['source']=='season_leaderboard')
    assert mail['position']==2 and mail['chest']['circuit_credits']==1800
    assert mail['chest'].get('avatar_frame_id')!='solar_frame'


def test_human_second_team_keeps_qualification_and_second_prize(s1,monkeypatch,tmp_path):
    clock, service, profile, teams = wire(s1,monkeypatch,tmp_path)
    monkeypatch.setenv('GRIDSHARD_TEAM_TOURNAMENT_STARTS_AT','2026-11-30T00:00:00Z')
    rows=[dict(position=1,is_ai=True,team_id='ai-first',members=[]),
          dict(position=2,is_ai=False,team_id='human',members=[dict(player_id=profile.player_id,contribution_points=4)]),
          dict(position=3,is_ai=True,team_id='ai-third',members=[])]
    monkeypatch.setattr(main,'_team_tournament_final_standings',lambda _:rows)
    main._settle_first_season_rewards([profile],clock[0]+timedelta(days=35))
    mail=next(m for m in profile.reward_inbox if m['source']=='team_tournament')
    assert mail['position']==2 and mail['chest']['circuit_credits']==950
    assert mail['chest'].get('team_emblem_id')!='aurora_sigil'
    assert not any(p['source']=='team_tournament' for p in teams.competition_reward_state()['deferred'])


def test_queue_rejects_bot_ids_even_if_a_profile_was_materialized(s1):
    _, service, _, _ = s1
    bot = service.get_or_create(BOTS[0]['id'])
    assert not main._queue_competition_reward(bot,source='weekly_tournament',period_id='2026-W49',position=1,prize=WEEKLY_PRIZES[0])
    assert not bot.reward_inbox


def test_upcoming_team_rewards_use_approved_opening_period_and_missing_content_stays_closed(s1,monkeypatch):
    from app.competition_control import launch_status
    start=s1[0][0]
    monkeypatch.setenv('GRIDSHARD_TEAM_TOURNAMENT_STARTS_AT','2026-11-30T00:00:00Z')
    view=build_events_view(bot_rows(),start-timedelta(seconds=1))['team_tournament']
    assert view['period']['id']=='2026-11-30' and not view['registration_open']
    assert view['prizes'][0]['team_emblem_id']=='aurora_sigil'
    assert launch_status(start,team=True)['active']
    assert not launch_status(start-timedelta(seconds=1),team=True)['active']
    monkeypatch.setenv('GRIDSHARD_TEAM_TOURNAMENT_STARTS_AT','2026-12-14T00:00:00Z')
    assert launch_status(start+timedelta(days=14),team=True)['status']=='waiting_for_content'
    assert build_events_view(bot_rows(),start+timedelta(days=14))['team_tournament']['prizes']==[]


def test_first_team_period_keeps_its_ai_after_season_rollover_and_defers_exact_team_set(s1, monkeypatch,tmp_path):
    clock, service, profile, teams = wire(s1,monkeypatch,tmp_path)
    monkeypatch.setenv('GRIDSHARD_TEAM_TOURNAMENT_STARTS_AT','2026-11-30T00:00:00Z')
    main._settle_first_season_rewards([profile],clock[0]+timedelta(days=35))
    state = teams.competition_reward_state()
    deferred = next(item for item in state['deferred'] if item['source']=='team_tournament')
    assert deferred['original_period_id'] == '2026-11-30'
    assert deferred['prizes'][0]['team_emblem_id'] == 'aurora_sigil'
    closed = state['closures']['team_tournament:2026-11-30']
    assert len(closed['standings']) == 12 and all(row['is_ai'] for row in closed['standings'])
    assert not profile.reward_inbox


def test_corrupt_closure_or_deferred_package_fails_closed(tmp_path):
    import json
    path=tmp_path/'teams.json'
    service=TeamService(JsonTeamRepository(path))
    service.close_competition_period('weekly_tournament','week',
        [dict(position=i,is_bot=True) for i in range(1,4)],list(WEEKLY_PRIZES))
    document=json.loads(path.read_text(encoding='utf-8'))
    document['tournaments']['_competition_rewards_v1']['deferred'][0]['prizes'][0]['circuit_credits']+=1
    path.write_text(json.dumps(document),encoding='utf-8')
    from app.team_service import TeamServiceError
    with pytest.raises(TeamServiceError,match='doğrulanamadı'):
        TeamService(JsonTeamRepository(path)).competition_reward_state()


def test_pg_closing_and_plan_tail_roll_back_together_and_reload_once(social_db,s1,monkeypatch):
    from app.postgres_team import PostgresTeamRepository
    pool, players, _, (player, _, _) = social_db
    clock = s1[0]
    repository = PostgresTeamRepository(pool)
    original = repository.load()
    monkeypatch.setattr(main,'team_service',TeamService(repository))
    monkeypatch.setattr(main,'_leaderboard_profile_rows',bot_rows)
    monkeypatch.setattr(main.player_profile_service,'_now_func',lambda:clock[0])
    before = main.team_service.competition_reward_state()
    now=clock[0]+timedelta(days=7)
    try:
        with pytest.raises(RuntimeError,match='closing failure'):
            with main._persistent_operation([player]):
                main._settle_first_season_rewards([main._team_member_profile(player)],now)
                raise RuntimeError('closing failure')
        assert TeamService(PostgresTeamRepository(pool)).competition_reward_state()==before
        with main._persistent_operation([player]):
            main._settle_first_season_rewards([main._team_member_profile(player)],now)
        after=TeamService(PostgresTeamRepository(pool)).competition_reward_state()
        assert len(after['deferred'])==len(before['deferred'])+1
        assert after['deferred'][-1]['prizes'][0]['module_shards']==36
        with main._persistent_operation([player]):
            main._settle_first_season_rewards([main._team_member_profile(player)],now)
        assert TeamService(PostgresTeamRepository(pool)).competition_reward_state()==after
        assert not main._team_member_profile(player).reward_inbox
    finally:
        current=repository.load()
        current['tournaments']=original['tournaments']
        repository.save(current)


def test_pg_mixed_winner_and_closure_roll_back_together_then_reload_exact_second_prize(social_db,s1,monkeypatch):
    from app.postgres_team import PostgresTeamRepository
    pool, players, _, (player, _, _) = social_db
    clock=s1[0]
    repository=PostgresTeamRepository(pool)
    original=repository.load()
    monkeypatch.setattr(main,'team_service',TeamService(repository))
    monkeypatch.setattr(main.player_profile_service,'_now_func',lambda:clock[0])
    ordered=weekly_standings(bot_rows(),clock[0]+timedelta(days=6,hours=23))
    by_id={r['player_id']:r for r in bot_rows()}
    points=(ordered[0]['points']+ordered[-1]['points'])//2
    with main._persistent_operation([player]):
        profile=main._team_member_profile(player)
        profile.weekly_tournament_period=profile.weekly_tournament_registered_period='2026-W49'
        profile.weekly_tournament_matches=10
        profile.weekly_tournament_wins=5
        profile.weekly_tournament_trophies_earned=points
        main.persist_player_data(player)
    human=dict(player_id=player,display_name='İnsan',rating=0,is_bot=False,weekly_period='2026-W49',
        weekly_registered_period='2026-W49',weekly_matches=10,weekly_wins=5,weekly_trophies_earned=points)
    monkeypatch.setattr(main,'_leaderboard_profile_rows',lambda:[by_id[ordered[0]['player_id']],by_id[ordered[-1]['player_id']],human])
    before=deepcopy(players.load(player).profile)
    before_state=main.team_service.competition_reward_state()
    try:
        with pytest.raises(RuntimeError,match='winner write failure'):
            with main._persistent_operation([player]):
                main._settle_first_season_rewards([main._team_member_profile(player)],clock[0]+timedelta(days=7))
                raise RuntimeError('winner write failure')
        assert players.load(player).profile==before
        assert main.team_service.competition_reward_state()==before_state
        with main._persistent_operation([player]):
            main._settle_first_season_rewards([main._team_member_profile(player)],clock[0]+timedelta(days=7))
        main.player_profile_service._profiles.clear()
        winner=main._team_member_profile(player)
        assert len(winner.reward_inbox)==1 and winner.reward_inbox[0]['position']==2
        assert winner.reward_inbox[0]['chest']['module_shards']==24
    finally:
        current=repository.load()
        current['tournaments']=original['tournaments']
        repository.save(current)
