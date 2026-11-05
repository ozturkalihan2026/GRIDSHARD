from copy import deepcopy

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
    document['announcements'][0]['server_transition_starts_at']='2026-11-23T20:00:00Z'
    document['announcements'][0]['server_transition_ends_at']='2026-11-23T22:00:00Z'
    with pytest.raises(ValueError,match='window differs'):check(document,required='2.4.0')


@pytest.mark.parametrize('version', ['2.3.1', '2.4.0', '2.4.1', '3.0.0'])
def test_release_guard_requires_a_reviewed_preview_for_each_future_version(version, capsys):
    from tools import release_guard
    with pytest.raises(SystemExit) as error:
        release_guard.require_prerelease_notice(version, {'schema_version':1, 'announcements':[]})
    assert error.value.code == 2
    assert 'ön duyurusu eksik' in capsys.readouterr().err
