from copy import deepcopy
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app import main as gateway
from app import release_announcements as announcements
from test_inbox_dismissal import inbox  # noqa: F401

NOW = datetime(2026, 11, 13, 12, tzinfo=timezone.utc)
ID = 'preview-2-4-0-early-patch-20261113'


@pytest.fixture(autouse=True)
def popup_engine_campaign(monkeypatch):
    # The real 2.4 campaign is mail-only by user choice. Keep the reusable popup
    # engine covered with an explicit popup campaign, not a production override.
    catalog = deepcopy(announcements.CATALOG)
    catalog['announcements'][0]['delivery'] = 'popup_and_system'
    monkeypatch.setattr(announcements,'CATALOG',catalog)


def test_mail_only_campaign_is_visible_on_230_without_a_later_240_popup(inbox, monkeypatch):
    profile, profiles, _ = inbox
    monkeypatch.setattr(profiles, '_now_func', lambda: NOW)
    announcements.CATALOG['announcements'][0]['delivery'] = 'system_mail'
    for version in ('2.3.0','2.4.0'):
        monkeypatch.setattr(gateway,'VERSION',version)
        view = gateway._reward_inbox_view(profile)
        assert view['announcement'] is None
        notice = next(n for n in view['notices'] if n['notice_id']==ID)
        assert notice['kind']=='announcement' and notice['delivery']=='system_mail'
    older = deepcopy(announcements.CATALOG['announcements'][0])
    older.update(notice_id='preview-older-popup',publish_at='2026-11-03T00:00:00Z',delivery='popup_and_system')
    announcements.CATALOG['announcements'].append(older)
    assert announcements.pending_announcement(profile,'2.3.0',NOW) is None


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


@pytest.mark.parametrize('change', ['duplicate', 'language', 'timezone', 'window', 'version', 'late-publication', 'delivery', 'server-transition', 'weekly-start', 'maintenance-duration', 'maintenance-timezone', 'minimum-server'])
def test_bad_catalog_is_rejected(change):
    document = deepcopy(announcements.CATALOG)
    item = document['announcements'][0]
    if change == 'duplicate': document['announcements'].append(deepcopy(item))
    if change == 'language': item['body_en'] = ''
    if change == 'timezone': item['publish_at'] = '2026-11-04T00:00:00'
    if change == 'window': item['expires_at'] = item['publish_at']
    if change == 'version': item['target_version'] = 'bad'
    if change == 'late-publication': item['publish_at'] = '2026-11-24T00:00:00Z'
    if change == 'delivery': item['delivery'] = 'unknown'
    if change == 'server-transition': item['server_transition_on'] = '2026-11-24'
    if change == 'weekly-start': item['weekly_tournament_starts_at'] = '2026-12-01T00:00:00Z'
    if change == 'maintenance-duration': item['maintenance_duration_minutes'] = 90
    if change == 'maintenance-timezone': item['server_transition_starts_at'] = '2026-11-23T19:00:00'
    if change == 'minimum-server': item['min_server_version'] = '2.5.0'
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


def test_maintenance_uses_2200_tr_and_crosses_midnight_with_two_hours():
    item=announcements.CATALOG['announcements'][0]
    assert item['server_transition_starts_at']=='2026-11-13T19:00:00Z'
    assert item['server_transition_ends_at']=='2026-11-13T21:00:00Z'
    assert item['maintenance_duration_minutes']==120
    assert '22.00' in item['body_tr'] and '14 Kasım' in item['body_tr'] and '2 saat' in item['body_tr']


def test_post_upgrade_tournament_popup_has_its_own_ack_and_server_gate(inbox, monkeypatch):
    profile,profiles,_=inbox
    clock=datetime(2026,11,24,tzinfo=timezone.utc)
    monkeypatch.setattr(profiles,'_now_func',lambda:clock)
    profile.acknowledged_announcement_ids=(ID,)
    tour_id='preview-2-4-0-tournament-launch'
    assert announcements.pending_announcement(profile,'2.3.0',clock) is None
    publication=next(n for n in announcements.CATALOG['announcements'] if n['notice_id']==tour_id)['publish_at']
    from datetime import timedelta
    opens=announcements.instant(publication)
    assert announcements.pending_announcement(profile,'2.4.0',opens-timedelta(seconds=1)) is None
    assert announcements.pending_announcement(profile,'2.4.0',opens)['notice_id']==tour_id
    selected=announcements.pending_announcement(profile,'2.4.0',clock)
    assert selected['notice_id']==tour_id and selected['phase']=='season-preview'
    assert '30 Kasım 2026' in selected['body_tr'] and '36/24/18' in selected['body_tr']
    assert 'Takım turnuvası bu açılışla birlikte başlamayacak' in selected['body_tr']
    monkeypatch.setattr(gateway,'VERSION','2.4.0')
    assert gateway._reward_inbox_view(profile)['announcement']['notice_id']==tour_id
    gateway.acknowledge_release_announcement(profile.player_id,tour_id)
    assert gateway._reward_inbox_view(profile)['announcement'] is None
    assert set(profile.acknowledged_announcement_ids)=={ID,tour_id}
    assert announcements.pending_announcement(profile,'2.5.0',clock) is None


def test_reading_the_previous_maintenance_notice_does_not_hide_the_early_patch(inbox, monkeypatch):
    profile, profiles, _ = inbox
    monkeypatch.setattr(profiles, '_now_func', lambda: NOW)
    monkeypatch.setattr(gateway, 'VERSION', '2.3.0')
    announcements.CATALOG['announcements'][0]['delivery'] = 'system_mail'
    previous_id = 'preview-2-4-0-season-one'
    profile.seen_inbox_notice_ids = (previous_id,)
    profile.dismissed_inbox_notice_ids = (previous_id,)
    profile.acknowledged_announcement_ids = (previous_id,)
    view = gateway._reward_inbox_view(profile)
    notice = next(n for n in view['notices'] if n['notice_id'] == ID)
    assert not notice['seen']
    assert 'Zorunlu bir yama' in notice['body_tr']
    assert view['announcement'] is None  # Installed 2.3.0 uses System mail only.
