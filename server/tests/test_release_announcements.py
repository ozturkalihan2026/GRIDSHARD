from copy import deepcopy
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app import main as gateway
from app import release_announcements as announcements
from test_inbox_dismissal import inbox  # noqa: F401

NOW = datetime(2026, 11, 5, tzinfo=timezone.utc)
ID = 'preview-2-4-0-season-one'


def test_publication_window_and_release_cutoff_do_not_open_a_season():
    document = deepcopy(announcements.CATALOG)
    assert announcements.active_announcements('2.3.0', NOW, document)[0]['notice_id'] == ID
    released = announcements.active_announcements('2.4.0', NOW, document)[0]
    assert released['phase'] == 'season-preview' and released['notice_id'] == ID
    assert released['title_tr'] == document['announcements'][0]['released_title_tr']
    assert not announcements.active_announcements('2.5.0', NOW, document)
    basic = deepcopy(document)
    basic['announcements'][0] = {k:v for k,v in basic['announcements'][0].items() if not k.startswith('released_')}
    assert not announcements.active_announcements('2.4.0', NOW, basic)
    assert not announcements.active_announcements('2.3.0', datetime(2026, 11, 3, tzinfo=timezone.utc), document)
    assert not announcements.active_announcements('2.3.0', datetime(2026, 11, 30, tzinfo=timezone.utc), document)
    document['announcements'][0]['status'] = 'draft'
    assert not announcements.active_announcements('2.3.0', NOW, document)
    assert announcements.can_acknowledge(ID, datetime(2026, 12, 1, tzinfo=timezone.utc))
    assert not announcements.can_acknowledge(ID, datetime(2026, 11, 3, tzinfo=timezone.utc))
    assert not announcements.can_acknowledge('unknown', NOW)


@pytest.mark.parametrize('change', ['duplicate', 'language', 'timezone', 'window', 'version'])
def test_bad_catalog_is_rejected(change):
    document = deepcopy(announcements.CATALOG)
    item = document['announcements'][0]
    if change == 'duplicate': document['announcements'].append(deepcopy(item))
    if change == 'language': item['body_en'] = ''
    if change == 'timezone': item['publish_at'] = '2026-11-04T00:00:00'
    if change == 'window': item['expires_at'] = item['publish_at']
    if change == 'version': item['target_version'] = 'bad'
    with pytest.raises(ValueError): announcements.validate(document)


def test_ack_survives_reload_is_per_account_and_inbox_read_is_independent(inbox, monkeypatch):
    profile, profiles, repository = inbox
    monkeypatch.setattr(profiles, '_now_func', lambda: NOW)
    monkeypatch.setattr(gateway, 'VERSION', '2.3.0')
    profile.seen_inbox_notice_ids = (ID,)
    profile.dismissed_inbox_notice_ids = (ID,)
    assert gateway._reward_inbox_view(profile)['announcement']['notice_id'] == ID
    first = gateway.acknowledge_release_announcement(profile.player_id, ID)
    assert first['announcement'] is None
    assert gateway.acknowledge_release_announcement(profile.player_id, ID)['announcement'] is None
    assert profile.acknowledged_announcement_ids == (ID,)
    profiles._profiles.clear()
    gateway.player_data_store_service.load_player(profile.player_id)
    restored = profiles.get(profile.player_id)
    assert gateway._reward_inbox_view(restored)['announcement'] is None
    assert announcements.pending_announcement(restored, '2.4.0', NOW) is None
    assert profiles.get_or_create('another-announcement-account').acknowledged_announcement_ids == ()
    assert gateway._reward_inbox_view(profiles.get('another-announcement-account'))['announcement']['notice_id'] == ID
    document = deepcopy(announcements.CATALOG)
    document['announcements'][0]['notice_id'] = 'preview-2-5-0-fixture'
    monkeypatch.setattr(announcements, 'CATALOG', document)
    assert announcements.pending_announcement(restored, '2.3.0', NOW)['notice_id'] == 'preview-2-5-0-fixture'


def test_ack_keeps_system_mail_and_protected_routes_reject_other_accounts(inbox, monkeypatch):
    profile, profiles, _ = inbox
    monkeypatch.setattr(profiles, '_now_func', lambda: NOW)
    monkeypatch.setattr(gateway, 'VERSION', '2.3.0')
    monkeypatch.setenv('GRIDSHARD_AUTH_REQUIRED', '1')
    from app.auth import ParticipantAuthService, JsonIdentityRepository
    from tempfile import TemporaryDirectory
    from pathlib import Path
    with TemporaryDirectory() as directory:
        auth = ParticipantAuthService(JsonIdentityRepository(Path(directory)/'identities.json'), b'isolated-announcement-auth-key-longer-than-32')
        monkeypatch.setattr(gateway, 'participant_auth_service', auth)
        session = auth.register_or_login('different-player', 'f' * 40)
        with TestClient(gateway.app) as client:
            route = f'/profile/{profile.player_id}/release-announcements/{ID}/acknowledge'
            assert client.post(route).status_code == 401
            assert client.post(route, headers={'Authorization':'Bearer '+session['access_token']}).status_code == 403
    gateway.acknowledge_release_announcement(profile.player_id, ID)
    notice = next(i for i in gateway._inbox_notices(profile) if i['notice_id'] == ID)
    assert notice['seen'] and notice['kind'] == 'announcement'
