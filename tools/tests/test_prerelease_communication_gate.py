from copy import deepcopy
from datetime import date
import json
from pathlib import Path

import pytest

from tools.release_announcements import check, CATALOG


def test_preview_dates_cannot_drift_from_the_connected_calendar():
    document = deepcopy(CATALOG)
    check(document, required='2.4.0')
    from tools.release_guard import require_prerelease_notice
    require_prerelease_notice('2.4.0', document)
    document['announcements'][0]['target_release_on'] = '2026-11-24'
    document['announcements'][0]['server_transition_on'] = '2026-11-24'
    document['announcements'][0]['server_transition_starts_at'] = '2026-11-24T19:00:00Z'
    document['announcements'][0]['server_transition_ends_at'] = '2026-11-24T21:00:00Z'
    with pytest.raises(ValueError, match='dates differ'): check(document)


def test_a_draft_cannot_satisfy_the_publication_gate():
    document = deepcopy(CATALOG)
    for item in document['announcements']:item['status'] = 'draft'
    with pytest.raises(ValueError, match='Publish reviewed'): check(document, required='2.4.0')


def test_post_release_tournament_popup_cannot_replace_prerelease_communication():
    document=deepcopy(CATALOG)
    document['announcements']=[item for item in document['announcements'] if item.get('min_server_version')=='2.4.0']
    with pytest.raises(ValueError,match='Publish reviewed'):check(document,required='2.4.0')


def test_a_coherent_but_wrong_maintenance_hour_cannot_drift_from_calendar():
    document=deepcopy(CATALOG)
    document['announcements'][0]['server_transition_starts_at']='2026-11-13T20:00:00Z'
    document['announcements'][0]['server_transition_ends_at']='2026-11-13T22:00:00Z'
    with pytest.raises(ValueError,match='window differs'):check(document,required='2.4.0')


def test_early_patch_repeats_the_full_unchanged_season_calendar_in_both_languages():
    calendar=json.loads((Path(__file__).resolve().parents[2]/'docs/planning/release_calendar_v1.json').read_text(encoding='utf-8'))
    expected=[('2026-11-30','2026-12-28'),('2026-12-28','2027-01-25'),
              ('2027-01-25','2027-02-22'),('2027-02-22','2027-03-22'),
              ('2027-03-22','2027-04-19'),('2027-04-19','2027-05-17')]
    assert [(r['season']['starts_on'],r['season']['ends_on']) for r in calendar['releases']]==expected
    months_tr={1:'Ocak',2:'Şubat',3:'Mart',4:'Nisan',5:'Mayıs',11:'Kasım',12:'Aralık'}
    months_en={1:'January',2:'February',3:'March',4:'April',5:'May',11:'November',12:'December'}
    notice=CATALOG['announcements'][0]
    for number,(start,end) in enumerate(expected,1):
        a,b=date.fromisoformat(start),date.fromisoformat(end)
        assert f'S{number}: {a.day} {months_tr[a.month]} {a.year} → {b.day} {months_tr[b.month]} {b.year}' in notice['body_tr']
        assert f'S{number}: {months_en[a.month]} {a.day}, {a.year} → {months_en[b.month]} {b.day}, {b.year}' in notice['body_en']


@pytest.mark.parametrize('version', ['2.3.1', '2.4.0', '2.4.1', '3.0.0'])
def test_release_guard_requires_a_reviewed_preview_for_each_future_version(version, capsys):
    from tools import release_guard
    with pytest.raises(SystemExit) as error:
        release_guard.require_prerelease_notice(version, {'schema_version':1, 'announcements':[]})
    assert error.value.code == 2
    assert 'ön duyurusu eksik' in capsys.readouterr().err
