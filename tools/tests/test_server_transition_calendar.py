from copy import deepcopy
import json

import pytest

from tools import release_calendar as calendar


def document():
    return json.loads(calendar.SOURCE.read_text(encoding='utf-8'))


def test_preparation_target_does_not_allow_server_transition_during_s1():
    value = document()
    calendar.validate(value)
    release = next(r for r in value['releases'] if r['version'] == '2.5.0')
    policy = release['server_transition_policy']
    assert policy['after_season_number'] == 1
    assert policy['not_before'] == '2026-12-22T00:00:00Z'
    assert policy['exact_window_status'] == 'not_scheduled'
    assert '03.00 TR' in calendar.transition_policy_summary(release)
    assert 'paket hazırlığı; canlı S1 sonrası' in calendar.render(value, value['releases'])


@pytest.mark.parametrize('mutation', [
    {'not_before':'2026-12-21T00:00:00Z'},
    {'requires_closeout_acceptance':False},
    {'exact_window_status':'scheduled'},
])
def test_unreviewed_or_premature_transition_policy_is_rejected(monkeypatch, mutation):
    value = document()
    backlog = json.loads((calendar.ROOT/'docs/planning/gridshard_development_backlog_v1.json').read_text(encoding='utf-8'))
    next(r for r in value['releases'] if r['version']=='2.5.0')['server_transition_policy'].update(mutation)
    next(r for r in backlog['release_plan'] if r['version']=='2.5.0')['server_transition_policy'].update(mutation)
    original = calendar.json.loads
    monkeypatch.setattr(calendar.json,'loads',lambda *args,**kwargs:deepcopy(backlog))
    with pytest.raises(ValueError, match='must follow accepted season closeout'):
        calendar.validate(value)
    monkeypatch.setattr(calendar.json,'loads',original)
