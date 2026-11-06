"""Offline draft output is reviewable; it cannot publish or consume live stock."""
from copy import deepcopy
import importlib.util
import json
import hashlib
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
    assert len(registry.used) == 9 and len(registry.releases) == 7
    assert all(r['status'] == 'draft' for r in registry.releases.values())
    assert sum(r.get('reward_kind') == 'resource_only' for r in registry.releases.values()) == 3
    assert sum(tool.REGISTRY.items[i]['field'].startswith('team_') for i in registry.used) == 3


def test_review_bundle_pins_six_items_and_all_hashes_without_publishing(tmp_path):
    before=deepcopy(tool.REGISTRY.document)
    report=tool.write_bundle(tmp_path/'bundle')
    assert tool.REGISTRY.document==before and tool.PROFILE['status']=='draft'
    assert not report['production_changed'] and not report['season_activated']
    assert report['reserved_periods']==7 and report['unique_personal_items']==6 and report['added_common_shards']==234
    assert report['release_checks']['android_acceptance'] is False
    assert report['unique_team_items'] == 3
    for name,checksum in report['files'].items():
        assert hashlib.sha256((tmp_path/'bundle'/name).read_bytes()).hexdigest()==checksum
    catalog=json.loads((tmp_path/'bundle/candidate_cosmetic_releases_v1.json').read_text(encoding='utf-8'))
    assert len(catalog['releases'])==7 and all(r['status']=='draft' for r in catalog['releases'])
