"""Offline draft output is reviewable; it cannot publish or consume live stock."""
from copy import deepcopy
import importlib.util
import json
import hashlib
from pathlib import Path
import pytest


ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('first_season_preparation', ROOT / 'tools/prepare_first_season.py')
tool = importlib.util.module_from_spec(spec)
spec.loader.exec_module(tool)

from app.cosmetic_releases import CosmeticReleaseRegistry
from app.liveops_content import ContentPlanError, content_coverage


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
    assert coverage['reward_profile'] == 'first_season'
    assert sum(t['required'] for t in coverage['content_tasks']) == 9
    assert sum(t['reserved_for_calendar'] for t in coverage['content_tasks']) == 9
    team = next(r for r in coverage['sources'] if r['source'] == 'team_tournament')
    assert team['period_ids'] == ['2026-12-07']
    assert sum(team['reserved_for_calendar'].values()) == 3


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


def test_first_season_requires_its_independent_team_anchor_and_exact_resource_packages():
    registry, _ = tool.candidate()
    with pytest.raises(ContentPlanError, match='independent team calendar'):
        content_coverage(registry, cycles=1, starts_at=tool.PROFILE['starts_at'], first_season_profile=tool.PROFILE)
    document = deepcopy(registry.document)
    week = next(r for r in document['releases'] if r.get('reward_kind') == 'resource_only')
    week['placements'][0]['resources']['module_shards'] += 1
    report = content_coverage(CosmeticReleaseRegistry(document), cycles=1, starts_at=tool.PROFILE['starts_at'],
        team_starts_at=tool._team_start(tool.PROFILE), first_season_profile=tool.PROFILE)
    assert not report['stock_ready']
    assert 'weekly_tournament:' + week['period_id'] in report['missing_profile_periods']


def test_missing_team_set_cannot_pass_with_unassigned_stock_and_full_profile_has_no_resource_fallback():
    registry, _ = tool.candidate()
    document = deepcopy(registry.document)
    document['releases'] = [r for r in document['releases'] if r['source'] != 'team_tournament']
    report = content_coverage(CosmeticReleaseRegistry(document), cycles=1, starts_at=tool.PROFILE['starts_at'],
        team_starts_at=tool._team_start(tool.PROFILE), first_season_profile=tool.PROFILE)
    assert not report['stock_ready'] and report['missing_profile_periods'] == ['team_tournament:2026-12-07']
    full = content_coverage(registry, cycles=1, starts_at=tool.PROFILE['starts_at'], team_starts_at=tool._team_start(tool.PROFILE))
    assert full['reward_profile'] == 'full_cosmetic'
    assert sum(t['required'] for t in full['content_tasks']) == 15
    assert not full['stock_ready']


def test_stock_audit_preserves_future_shortfall_and_closed_sources_without_mutation():
    before = deepcopy(tool.REGISTRY.document)
    report = tool.stock_audit()
    assert report['stock_ready'] and not report['production_changed'] and not report['publication_ready']
    assert len(report['allocations']) == 7
    assert report['resource_totals'] == dict(circuit_credits=7140, flux_shards=525, module_shards=234)
    assert not report['next_two_cycles_after_s1']['stock_ready']
    assert sum(t['create_and_review'] for t in report['full_cosmetic_two_cycle_baseline']['content_tasks']) == 18
    assert sum(t['create_and_review'] for t in report['next_two_cycles_after_s1']['content_tasks']) == 24
    assert {r['id'] for r in report['source_contracts'] if r['state'] == 'planned'} == {'shop_collection', 'daily_trial'}
    assert tool.REGISTRY.document == before


def test_stock_evidence_is_identical_on_lf_and_crlf_checkouts(tmp_path, monkeypatch):
    expected = tool.stock_audit()
    for relative in tool.AUDIT_SOURCES:
        target = tmp_path / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes((tool.ROOT / relative).read_bytes().replace(b'\r\n', b'\n').replace(b'\n', b'\r\n'))
    monkeypatch.setattr(tool, 'ROOT', tmp_path)
    assert tool.stock_audit() == expected


def test_ci_stock_gate_rejects_stale_evidence(tmp_path, monkeypatch):
    monkeypatch.setattr(tool, 'AUDIT_JSON', tmp_path / 'audit.json')
    monkeypatch.setattr(tool, 'AUDIT_MD', tmp_path / 'audit.md')
    monkeypatch.setattr('sys.argv', ['prepare_first_season.py', '--audit-write'])
    tool.main()
    monkeypatch.setattr('sys.argv', ['prepare_first_season.py', '--audit-check'])
    tool.main()
    tool.AUDIT_JSON.write_text('{}\n', encoding='utf-8')
    with pytest.raises(SystemExit, match='Stock evidence is stale'):
        tool.main()
