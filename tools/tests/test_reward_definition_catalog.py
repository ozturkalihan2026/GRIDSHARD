from copy import deepcopy
import json

import pytest

from tools import prepare_reward_definitions as tool


def test_runtime_catalog_is_compiled_from_current_policy_without_a_server_activation():
    report=tool.build()
    assert report==json.loads(tool.OUTPUT.read_text(encoding='utf-8'))
    assert len(report['definitions'])==92
    legacy=[row for row in report['definitions'] if row['id'].startswith('legacy.chest.')]
    assert len(legacy)==4 and {row['kind'] for row in legacy}=={'random'}
    candidate=[row for row in report['definitions'] if row['id'].startswith('free250.')]
    assert all(row['minimum_server_version']=='2.5.0' for row in candidate)


def test_compiler_cannot_overwrite_the_same_legacy_definition_revision(monkeypatch):
    body=deepcopy(tool.CHEST_DEFINITIONS['field_3h'])
    body['coins']=(999,999)
    monkeypatch.setitem(tool.CHEST_DEFINITIONS,'field_3h',body)
    with pytest.raises(ValueError,match='immutable'):tool.build()


def test_runtime_rollout_is_compiled_without_enabling_or_repricing_s1():
    policy=tool.economy_policy()
    assert policy==json.loads(tool.ECONOMY_OUTPUT.read_text(encoding='utf-8'))
    assert policy['minimum_server_version']=='2.5.0'
    assert policy['earliest_effective_at']=='2026-12-22T00:00:00Z'
    assert 'gridshard_2026_11_24' not in policy['approved_seasons']
    assert policy['match_rewards']['daily_flux_battle_cap']==6
