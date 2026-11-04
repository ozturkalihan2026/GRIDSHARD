"""The S1 budget is counted by finished matches and survives retries/rollover."""
from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path

import pytest
from fastapi import HTTPException

from app import main, season_missions as missions
from app.meta_progression import archive_and_soft_reset_season
from app.player_data_store import InMemoryPlayerDataRepository, PlayerDataStoreService
from app.player_profile import PlayerProfileError, PlayerProfileService, SEASON_REWARD_TRACK
from app.player_progression import PlayerProgressionService
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService
from test_player_progression import finished_state


@pytest.fixture
def clock(monkeypatch):
    monkeypatch.setenv('GRIDSHARD_SEASON_STARTS_AT', '2026-11-02T00:00:00Z')
    monkeypatch.delenv('GRIDSHARD_OWNER_PLAYER_ID', raising=False)
    monkeypatch.delenv('GRIDSHARD_UNRANKED_PLAYER_IDS', raising=False)
    return [datetime(2026, 11, 4, 12, tzinfo=timezone.utc)]


def battle(service, identity, *, mode='arena_ai', player='a', won=True, core=1):
    return service.record_battle_engagement(player, battle_id=identity, match_type=mode,
        season_xp_awarded=0, damage_dealt=0, circuit_actions=0, won=won, core_power_uses=core)


def claim(service, profile, identity, request='claim', day=None):
    return service.claim_season_mission(profile.player_id, identity,
        season_id=profile.active_meta_season_id,
        day_key=day if day is not None else profile.daily_mission_day if identity.startswith('daily_') else '',
        request_id=request)


def store(service, repository=None):
    return PlayerDataStoreService(profile_service=service, statistics_service=PlayerStatisticsService(),
        settings_service=PlayerSettingsService(), repository=repository or InMemoryPlayerDataRepository())


def test_runtime_matches_approved_budget_and_preserves_thresholds():
    plan = json.loads((Path(__file__).resolve().parents[2] / 'docs/planning/season-1-engagement-v1.json').read_text())
    assert [(m['id'], m['target'], m['season_xp_reward']) for m in missions.DAILY] == [
        (m['id'], m['target'], m['xp']) for m in plan['daily_extra']]
    assert [(m['id'], m['metric'], m['target'], m['season_xp_reward']) for m in missions.SEASONAL] == [
        (m['id'], m['metric'], m['target'], m['xp']) for m in plan['seasonal']]
    assert missions.ELIGIBLE_MODES == set(plan['eligible_modes'])
    assert sum(m['season_xp_reward'] for m in missions.SEASONAL) == 1800
    assert SEASON_REWARD_TRACK[-1]['required_xp'] == 12240


def test_finished_battle_integration_and_service_retry_count_once(clock):
    service = PlayerProfileService(now_func=lambda: clock[0])
    progression = PlayerProgressionService(service)
    for i in range(6):
        state = finished_state(battle_id=f'engine-{i}')
        state.match_type = 'arena_ai'
        state.result_summary['a'] = {'core_power_uses': 1}
        assert progression.process_finished_battle(state, completed_at=clock[0])
        assert not progression.process_finished_battle(state, completed_at=clock[0])
    profile = service.get_or_create('a')
    assert profile.season_mission_state['progress'] == dict(completed_battles=6, wins=6, core_uses=6, active_days=1)
    before = deepcopy(profile)
    battle(service, 'engine-0')
    assert before == profile
    wallet = (profile.circuit_credits, profile.flux_shards, dict(profile.module_shards), dict(profile.core_shards_by_type))
    xp = profile.season_xp
    assert claim(service, profile, 'daily_battles_4')['season_xp_reward'] == 15
    assert claim(service, profile, 'daily_battles_4', 'different')['season_xp_reward'] == 15
    claim(service, profile, 'daily_battles_6', 'six')
    assert profile.season_xp == xp + 30
    assert wallet == (profile.circuit_credits, profile.flux_shards, profile.module_shards, profile.core_shards_by_type)


@pytest.mark.parametrize('mode', ['friendly', 'unranked_ai', 'training', 'team_tournament', 'tutorial'])
def test_ineligible_modes_and_login_do_not_progress_new_missions(clock, mode):
    service = PlayerProfileService(now_func=lambda: clock[0])
    profile = service.get_or_create('a')
    assert not profile.season_mission_state
    battle(service, mode, mode=mode)
    assert profile.season_mission_state['progress'] == {}
    assert not any(r['completed'] for r in missions.view(profile, moment=clock[0], active=True)['seasonal_missions'])


def test_excluded_owner_and_prelaunch_profiles_have_no_new_mission_progress(clock, monkeypatch):
    service = PlayerProfileService(now_func=lambda: clock[0])
    monkeypatch.setenv('GRIDSHARD_OWNER_PLAYER_ID', 'owner')
    monkeypatch.setenv('GRIDSHARD_UNRANKED_PLAYER_IDS', 'excluded')
    for player in ('owner', 'excluded'):
        assert battle(service, player, player=player).season_mission_state['progress'] == {}
    monkeypatch.setenv('GRIDSHARD_SEASON_STARTS_AT', '2026-12-01T00:00:00Z')
    profile = battle(service, 'closed')
    assert profile.season_mission_state['progress'] == {} and profile.season_xp == 0
    with pytest.raises(PlayerProfileError, match='başlamadı'):
        claim(service, profile, 'daily_battles_4')


def test_active_day_uses_utc_and_all_seasonal_rewards_are_capped(clock):
    service = PlayerProfileService(now_func=lambda: clock[0])
    # 02:30 Istanbul is still the previous UTC day.
    clock[0] = datetime(2026, 11, 5, 2, 30, tzinfo=timezone(timedelta(hours=3)))
    for day in range(21):
        for match in range(6):
            profile = battle(service, f'{day}-{match}', core=1)
        clock[0] += timedelta(days=1)
    assert profile.season_mission_state['daily'].get('2026-11-04') == {'battles': 6}
    assert profile.season_mission_state['progress'] == dict(completed_battles=120, wins=40, core_uses=50, active_days=21)
    service.get_or_create('a')
    xp = profile.season_xp
    profile.battle_premium_season_id = profile.active_meta_season_id
    profile.season_premium_pass_season_id = profile.active_meta_season_id
    for mission in missions.SEASONAL:
        claim(service, profile, mission['id'], mission['id'])
    assert profile.season_xp == xp + 1800
    for mission in missions.SEASONAL:
        claim(service, profile, mission['id'], 'retry-' + mission['id'])
    assert profile.season_xp == xp + 1800


def test_daily_expiry_preserves_only_earned_xp_and_rejects_stale_button(clock):
    service = PlayerProfileService(now_func=lambda: clock[0])
    for i in range(4):
        profile = battle(service, f'day-{i}')
    old_day = profile.daily_mission_day
    clock[0] += timedelta(days=1)
    service.get_or_create('a')
    assert profile.season_xp == 15  # four reached, six not reached
    service.get_or_create('a')
    assert profile.season_xp == 15
    with pytest.raises(PlayerProfileError, match='dönemi'):
        claim(service, profile, 'daily_battles_4', day=old_day)
    rows = missions.view(profile, moment=clock[0], active=True)['extra_daily_missions']
    assert all(r['progress'] == 0 and not r['claimed'] for r in rows)


def test_concurrent_claims_and_request_identity_validation(clock):
    service = PlayerProfileService(now_func=lambda: clock[0])
    for i in range(6):
        profile = battle(service, str(i))
    with ThreadPoolExecutor(max_workers=4) as pool:
        receipts = list(pool.map(lambda n: claim(service, profile, 'daily_battles_4', f'parallel-{n}'), range(8)))
    assert all(r == receipts[0] for r in receipts) and profile.season_xp == 15
    before = deepcopy(profile)
    with pytest.raises(PlayerProfileError, match='farklı'):
        claim(service, profile, 'daily_battles_6', 'parallel-0')
    with pytest.raises(PlayerProfileError, match='tamamlanmadı'):
        claim(service, profile, 'season_battles_20', 'too-soon')
    with pytest.raises(PlayerProfileError, match='zorunludur'):
        claim(service, profile, 'daily_battles_6', '')
    with pytest.raises(PlayerProfileError, match='başka bir sezona'):
        service.claim_season_mission('a', 'daily_battles_6', season_id='old', day_key=profile.daily_mission_day, request_id='old')
    assert profile == before


def test_reload_preserves_progress_receipt_and_battle_dedup(clock):
    service = PlayerProfileService(now_func=lambda: clock[0])
    for i in range(6):
        profile = battle(service, str(i))
    receipt = claim(service, profile, 'daily_battles_4')
    data = store(service)
    data.save_player('a')
    replacement = PlayerProfileService(now_func=lambda: clock[0])
    store(replacement, data.repository).load_player('a')
    restored = replacement.get_or_create('a')
    assert restored.season_mission_state == profile.season_mission_state
    assert 'seen_battles' not in str(restored.to_view()['engagement'])
    assert claim(replacement, restored, 'daily_battles_4') == receipt
    battle(replacement, '0')
    assert restored.season_xp == 15 and restored.season_mission_state['progress']['completed_battles'] == 6


def test_closing_season_settles_earned_missions_into_old_archive_only(clock):
    service = PlayerProfileService(now_func=lambda: clock[0])
    for i in range(20):
        profile = battle(service, str(i))
    archive = archive_and_soft_reset_season(profile, 'next-season')
    assert archive['season_xp'] == 15 + 15 + 150 + 100 + 50
    assert archive['mission_state']['rewards']['seasonal::season_battles_20']['automatic']
    assert profile.season_xp == 0 and profile.season_mission_state == {}
    assert 'mission_state' not in profile.to_view()['season_summary']['previous']
    assert archive_and_soft_reset_season(profile, 'next-season') is None


def test_delayed_settlement_stays_on_the_terminal_utc_day(clock):
    service = PlayerProfileService(now_func=lambda: clock[0])
    completed = clock[0] - timedelta(days=1)
    with service.settlement_time(completed):
        for i in range(4):
            profile = battle(service, str(i))
    service.get_or_create('a')
    assert profile.season_xp == 15
    assert profile.season_mission_state['daily'][completed.date().isoformat()]['battles'] == 4
    assert profile.daily_mission_day == clock[0].date().isoformat()


def test_new_mission_tier_points_are_awarded_once(clock):
    service = PlayerProfileService(now_func=lambda: clock[0])
    for i in range(4):
        profile = battle(service, str(i))
    profile.season_xp = SEASON_REWARD_TRACK[0]['required_xp'] - 10
    points = profile.core_skill_points
    claim(service, profile, 'daily_battles_4')
    claim(service, profile, 'daily_battles_4', 'retry')
    assert profile.core_skill_points == points + 1


def test_claim_api_returns_verified_receipt_and_replay(clock, monkeypatch):
    service = PlayerProfileService(now_func=lambda: clock[0])
    for i in range(4):
        profile = battle(service, str(i))
    monkeypatch.setattr(main, 'RUNTIME_STRICT', False)
    monkeypatch.setattr(main, 'player_profile_service', service)
    monkeypatch.setattr(main, 'persist_player_data', lambda _: None)
    request = main.SeasonMissionClaimRequest(request_id='http', season_id=profile.active_meta_season_id,
                                             day_key=profile.daily_mission_day)
    result = main.claim_season_mission_reward('a', 'daily_battles_4', request)
    assert result['season_mission_receipt']['season_xp_reward'] == 15
    assert main.claim_season_mission_reward('a', 'daily_battles_4', request)['season_mission_receipt'] == result['season_mission_receipt']
    with pytest.raises(HTTPException) as error:
        main.claim_season_mission_reward('a', 'daily_battles_6', request)
    assert error.value.status_code == 422 and profile.season_xp == 15
