"""Versioned prerelease mail and account-scoped, explicit popup acknowledgements."""
from copy import deepcopy
from datetime import date, datetime, timezone, timedelta
import json
from pathlib import Path
import re

PATH = Path(__file__).resolve().parents[1] / 'data/release_announcements_v1.json'


def version_key(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d+\.\d+\.\d+', value):
        raise ValueError('Invalid announcement version')
    return tuple(map(int, value.split('.')))


def instant(value):
    result = datetime.fromisoformat(value.replace('Z', '+00:00'))
    if result.tzinfo is None:
        raise ValueError('Announcement dates need a timezone')
    return result.astimezone(timezone.utc)


def validate(document):
    if document.get('schema_version') != 1:
        raise ValueError('Invalid announcement schema')
    ids = set()
    for item in document['announcements']:
        identity = item['notice_id']
        if not re.fullmatch(r'preview-[a-z0-9-]{1,80}', identity) or identity in ids:
            raise ValueError('Invalid/duplicate announcement identity')
        ids.add(identity)
        version_key(item['target_version'])
        if item.get('min_server_version') and version_key(item['min_server_version']) > version_key(item['target_version']):
            raise ValueError('Announcement minimum server version exceeds its target')
        if item['status'] not in {'draft', 'published', 'withdrawn'}:
            raise ValueError('Invalid announcement status')
        if item.get('delivery','popup_and_system') not in {'popup_and_system','system_mail'}:
            raise ValueError('Invalid announcement delivery channel')
        if instant(item['publish_at']) >= instant(item['expires_at']):
            raise ValueError('Invalid announcement window')
        if instant(item['publish_at']).date() > date.fromisoformat(item['target_release_on']):
            raise ValueError('Prerelease announcement cannot start after its target release date')
        if item.get('server_transition_on') and date.fromisoformat(item['server_transition_on']) != date.fromisoformat(item['target_release_on']):
            raise ValueError('Server transition must match the reviewed release target')
        if item.get('weekly_tournament_starts_at') and instant(item['weekly_tournament_starts_at']).date() != date.fromisoformat(item['season_starts_on']):
            raise ValueError('First weekly tournament must match the first-season opening')
        maintenance = ('server_transition_starts_at','server_transition_ends_at','maintenance_duration_minutes')
        if any(key in item for key in maintenance):
            if not all(key in item for key in maintenance):
                raise ValueError('Incomplete maintenance window')
            start,end = instant(item[maintenance[0]]),instant(item[maintenance[1]])
            minutes = item[maintenance[2]]
            if type(minutes) is not int or minutes<=0 or end-start!=timedelta(minutes=minutes):
                raise ValueError('Maintenance duration differs from its window')
            if start.astimezone(timezone(timedelta(hours=3))).date()!=date.fromisoformat(item['server_transition_on']):
                raise ValueError('Maintenance date differs from the Türkiye transition date')
        for language in ('tr', 'en'):
            for field in ('title', 'body'):
                text = item[f'{field}_{language}']
                if not isinstance(text, str) or not text.strip() or len(text) > 6000:
                    raise ValueError('Missing/oversized localized announcement')
        followup = [f'released_{field}_{lang}' for field in ('title', 'body') for lang in ('tr', 'en')]
        if any(key in item for key in followup) and any(
            not isinstance(item.get(key), str) or not item[key].strip() or len(item[key]) > 6000 for key in followup
        ):
            raise ValueError('Incomplete bilingual season followup')
    return document


CATALOG = validate(json.loads(PATH.read_text(encoding='utf-8')))


def can_acknowledge(notice_id, now):
    moment = now.replace(tzinfo=timezone.utc) if now.tzinfo is None else now.astimezone(timezone.utc)
    # A queued offline confirmation remains valid after the preview expires or
    # the release ships. Unknown, draft and not-yet-published IDs cannot be forged.
    return any(item['notice_id'] == notice_id and item['status'] == 'published'
               and instant(item['publish_at']) <= moment for item in CATALOG['announcements'])


def active_announcements(current_version, now, document=None):
    document = CATALOG if document is None else document
    current = version_key(current_version)
    moment = (now.replace(tzinfo=timezone.utc) if now.tzinfo is None else now.astimezone(timezone.utc))
    result = []
    for raw in sorted(document['announcements'], key=lambda i: (instant(i['publish_at']), i['notice_id'])):
        if raw['status'] != 'published' or not instant(raw['publish_at']) <= moment < instant(raw['expires_at']):
            continue
        if raw.get('min_server_version') and current < version_key(raw['min_server_version']):
            continue
        target = version_key(raw['target_version'])
        item = dict(deepcopy(raw), kind='announcement', release_date=raw['publish_at'], phase='release-preview')
        if current >= target:
            if current[:2] != target[:2] or not raw.get('released_title_tr'):
                continue
            for field in ('title', 'body'):
                for language in ('tr', 'en'): item[f'{field}_{language}'] = raw[f'released_{field}_{language}']
            item['phase'] = 'season-preview'
        result.append(item)
    return result


def pending_announcement(profile, current_version, now):
    acknowledged = set(profile.acknowledged_announcement_ids)
    # Show one current campaign, never a stack of obsolete launch popups.
    active = active_announcements(current_version, now)
    newest = active[-1] if active else None
    return newest if (newest and newest.get('delivery','popup_and_system') == 'popup_and_system'
                      and newest['notice_id'] not in acknowledged) else None
