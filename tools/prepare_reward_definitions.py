"""Compile reviewed reward inputs into a runtime catalog; never activate 2.5.0."""
import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT/'server'))
from app.meta_progression import CHEST_DEFINITIONS
from app.player_profile import LOGIN_PERIOD_REWARDS, SEASON_REWARD_TRACK
from app.reward_definitions import RewardCatalog, seal, _version
from app.version import VERSION

OUTPUT = ROOT/'server/data/reward_definitions_v1.json'
ECONOMY_OUTPUT = ROOT/'server/data/free_economy_rewards_v1.json'


def economy_policy():
    policy=json.loads((ROOT/'docs/planning/free-economy-250-v1.json').read_text(encoding='utf-8'))
    calendar=json.loads((ROOT/'docs/planning/release_calendar_v1.json').read_text(encoding='utf-8'))
    release=next(r for r in calendar['releases'] if r['version']=='2.5.0')
    manifest=json.loads((ROOT/'server/data/season_module_releases_v2.json').read_text(encoding='utf-8'))
    progression=json.loads((ROOT/'docs/planning/free-economy-250-progression-v1.json').read_text(encoding='utf-8'))
    seasons=[r['season_id'] for r in manifest['roadmap']
             if r.get('status')=='published' and r.get('free_economy_revision')==1 and r.get('season_number',0)>1]
    return dict(schema_version=1,minimum_server_version='2.5.0',
        earliest_effective_at=release['server_transition_policy']['not_before'],approved_seasons=seasons,
        match_rewards=policy['match_rewards'],engineer_choice=dict(revision=1,**progression['choice_crate_candidate']))


def build():
    policy = json.loads((ROOT/'docs/planning/free-economy-250-v1.json').read_text(encoding='utf-8'))
    rows = [seal(identity='legacy.chest.'+identity, revision=1, kind='random', payload=body)
            for identity,body in CHEST_DEFINITIONS.items()]
    for group in ('daily_orders', 'daily_extra_orders', 'seasonal_orders'):
        rows.extend(seal(identity=f'free250.{group}.{identity}', revision=1, kind='fixed', payload=reward,
            minimum_server_version='2.5.0') for identity,reward in policy[group].items())
    for group, source, key in (('login', LOGIN_PERIOD_REWARDS, 'day'), ('season_road', SEASON_REWARD_TRACK, 'tier')):
        multiplier = policy['login_multiplier' if group=='login' else 'free_season_road_multiplier']
        rows.extend(seal(identity=f'free250.{group}.{r[key]}.currency', revision=1, kind='fixed',
            payload={currency:r[currency]*multiplier[currency] for currency in ('circuit_credits','flux_shards')},
            minimum_server_version='2.5.0') for r in source)
    document = dict(schema_version=1, definitions=rows)
    RewardCatalog(document)
    if OUTPUT.exists():
        previous=json.loads(OUTPUT.read_text(encoding='utf-8'))
        RewardCatalog(previous)
        current={(row['id'],row['revision']):row for row in rows}
        for row in previous['definitions']:
            if _version(row['minimum_server_version']) > _version(VERSION):
                continue  # Unreleased 2.5 planning rows have never created rights.
            replacement=current.get((row['id'],row['revision']))
            if replacement is None or replacement['content_hash']!=row['content_hash']:
                raise ValueError('Published reward definition is immutable; retain it and add a new revision')
    return document


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    action=parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--write',action='store_true')
    action.add_argument('--check',action='store_true')
    args=parser.parse_args()
    report=build()
    expected=json.dumps(report,ensure_ascii=False,indent=2)+'\n'
    if args.write:OUTPUT.write_text(expected,encoding='utf-8')
    elif not OUTPUT.exists() or OUTPUT.read_text(encoding='utf-8')!=expected:
        raise ValueError('Reward catalog differs; review and run tools/prepare_reward_definitions.py --write')
    economy_expected=json.dumps(economy_policy(),ensure_ascii=False,indent=2)+'\n'
    if args.write:ECONOMY_OUTPUT.write_text(economy_expected,encoding='utf-8')
    elif not ECONOMY_OUTPUT.exists() or ECONOMY_OUTPUT.read_text(encoding='utf-8')!=economy_expected:
        raise ValueError('Free economy rollout policy differs; review and run --write')
    print(json.dumps(dict(definitions=len(report['definitions']),legacy_chests=4,activation_changed=False)))


if __name__=='__main__':main()
