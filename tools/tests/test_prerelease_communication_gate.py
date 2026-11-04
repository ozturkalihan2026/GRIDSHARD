from copy import deepcopy

import pytest

from tools.release_announcements import check, CATALOG


def test_preview_dates_cannot_drift_from_the_connected_calendar():
    document = deepcopy(CATALOG)
    check(document, required='2.4.0')
    from tools.release_guard import require_prerelease_notice
    require_prerelease_notice('2.4.0', document)
    document['announcements'][0]['target_release_on'] = '2026-11-24'
    with pytest.raises(ValueError, match='dates differ'): check(document)


def test_a_draft_cannot_satisfy_the_publication_gate():
    document = deepcopy(CATALOG)
    document['announcements'][0]['status'] = 'draft'
    with pytest.raises(ValueError, match='Publish reviewed'): check(document, required='2.4.0')


@pytest.mark.parametrize('version', ['2.3.1', '2.4.0', '2.4.1', '3.0.0'])
def test_release_guard_requires_a_reviewed_preview_for_each_future_version(version, capsys):
    from tools import release_guard
    with pytest.raises(SystemExit) as error:
        release_guard.require_prerelease_notice(version, {'schema_version':1, 'announcements':[]})
    assert error.value.code == 2
    assert 'ön duyurusu eksik' in capsys.readouterr().err
