"""Check the planning arithmetic that promises a demanding but completable S1."""
import importlib.util
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('season_xp_plan', ROOT / 'tools/plan_season_xp.py')
xp = importlib.util.module_from_spec(spec)
spec.loader.exec_module(xp)


def plan():
    return json.loads(xp.SOURCE.read_text(encoding='utf-8'))


def test_scarcity_and_completion_paths_use_unchanged_thresholds():
    p = plan()
    rows = {c['id']: xp.project(p, c) for c in p['projections']}
    assert xp.SEASON_REWARD_TRACK[-1]['required_xp'] == 12240
    assert rows['login_only']['season_xp'] == 0
    assert rows['four_battles_two_ads']['tier'] == 37
    assert rows['six_battles_no_ads']['tier'] == 39
    assert rows['six_battles_one_ad']['first_finish_day'] == 27
    assert rows['eight_battles_no_ads']['first_finish_day'] == 25


def test_mission_budget_is_finite_unique_and_xp_only():
    p = plan()
    missions = p['daily_extra'] + p['seasonal']
    assert len({m['id'] for m in missions}) == len(missions)
    assert sum(m['xp'] for m in p['daily_extra']) == 30
    assert sum(m['xp'] for m in p['seasonal']) == 1800
    assert not any(key in m for m in missions for key in ('flux_shards', 'circuit_credits', 'core_shards', 'module_shards'))
    six = next(c for c in p['projections'] if c['id'] == 'six_battles_one_ad')
    assert xp.project(p, six)['seasonal_xp'] == 1800


def test_ad_plan_cannot_reward_more_ads_than_played_battles():
    p = plan()
    case = dict(p['projections'][1], ads_per_day=3)
    with pytest.raises(ValueError):
        xp.project(p, case)
