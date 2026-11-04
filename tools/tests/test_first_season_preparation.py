"""Offline draft output is reviewable; it cannot publish or consume live stock."""
from copy import deepcopy
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('first_season_preparation', ROOT / 'tools/prepare_first_season.py')
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)


def test_candidate_uses_exactly_three_unique_pairs_and_three_resource_weeks_without_mutation():
    before = deepcopy(tool.REGISTRY.document)
    profile = deepcopy(tool.PROFILE)
    registry, coverage = tool.candidate(profile, tool.REGISTRY)
    assert registry.document != before and tool.REGISTRY.document == before and tool.PROFILE == profile
    assert coverage['stock_ready'] and not coverage['publication_ready'] and not coverage['production_changed']
    assert len(registry.used) == 6 and len(registry.releases) == 6
    assert all(r['status'] == 'draft' for r in registry.releases.values())
    assert sum(r.get('reward_kind') == 'resource_only' for r in registry.releases.values()) == 3
    assert not any(tool.REGISTRY.items[i]['field'].startswith('team_') for i in registry.used)
