"""Validate prerelease communication, or print a draft for editorial review."""
import argparse
from copy import deepcopy
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'server'))
from app.release_announcements import CATALOG, validate, version_key, instant


def check(document=CATALOG, required=None):
    validate(document)
    calendar = json.loads((ROOT/'docs/planning/release_calendar_v1.json').read_text(encoding='utf-8'))
    releases = {r['version']:r for r in calendar['releases']}
    for item in document['announcements']:
        if item['target_version'] in releases:
            release = releases[item['target_version']]
            if (item['target_release_on'] != release['target_release_on']
                    or item['season_starts_on'] != release['season']['starts_on']):
                raise ValueError('Announcement dates differ from the release calendar')
            if item.get('server_transition_on') and item['server_transition_on'] != release['target_release_on']:
                raise ValueError('Server transition differs from the release calendar')
            if item.get('server_transition_starts_at'):
                maintenance=release.get('server_transition')
                if (not maintenance or instant(item['server_transition_starts_at'])!=instant(maintenance['starts_at'])
                        or instant(item['server_transition_ends_at'])!=instant(maintenance['ends_at'])
                        or item['maintenance_duration_minutes']!=maintenance['duration_minutes']):
                    raise ValueError('Announcement maintenance window differs from the calendar')
    if required and not any(i['target_version'] == required and i['status'] == 'published'
                           and (not i.get('min_server_version') or version_key(i['min_server_version']) < version_key(required))
                           for i in document['announcements']):
        raise ValueError('Publish reviewed bilingual prerelease communication before the release gate')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--check', action='store_true')
    action.add_argument('--draft', metavar='VERSION')
    parser.add_argument('--require', metavar='VERSION')
    parser.add_argument('--release-on', metavar='YYYY-MM-DD')
    args = parser.parse_args()
    if args.check:
        check(required=args.require)
        print(json.dumps({'valid':True, 'campaigns':len(CATALOG['announcements']), 'production_changed':False}))
    else:
        version_key(args.draft)
        item = deepcopy(CATALOG['announcements'][0])
        item = {key:value for key,value in item.items() if not key.startswith('released_')}
        for key in ('server_transition_on','weekly_tournament_starts_at','server_transition_starts_at',
                    'server_transition_ends_at','maintenance_duration_minutes','min_server_version'):
            item.pop(key,None)  # These dates belong to the reviewed 2.4 campaign.
        calendar = json.loads((ROOT/'docs/planning/release_calendar_v1.json').read_text(encoding='utf-8'))
        release = next((r for r in calendar['releases'] if r['version'] == args.draft), None)
        if release is None:
            if not args.release_on: parser.error('An unplanned patch/major draft needs --release-on YYYY-MM-DD')
            release = {'target_release_on':args.release_on, 'season':{'starts_on':None}}
        item.update(notice_id='preview-'+args.draft.replace('.', '-'), target_version=args.draft, status='draft', delivery='popup_and_system',
                    target_release_on=release['target_release_on'], season_starts_on=release['season']['starts_on'])
        launch = datetime.fromisoformat(release['target_release_on']).replace(tzinfo=timezone.utc)
        item.update(publish_at=(launch-timedelta(days=7)).isoformat(), expires_at=launch.isoformat())
        for lang in ('tr', 'en'):
            item['title_'+lang] = ''; item['body_'+lang] = ''
        print(json.dumps(item, ensure_ascii=False, indent=2))


if __name__ == '__main__': main()
