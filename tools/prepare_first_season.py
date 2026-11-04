"""Validate/preview the first-season draft without publishing or changing a launch date."""
import argparse
import json
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'server'))
from app.first_season_profile import PROFILE, validate_profile
from app.cosmetic_releases import REGISTRY
from app.liveops_content import content_coverage


def candidate(document=PROFILE, registry=REGISTRY):
    validate_profile(document, cosmetics=registry)
    if document['status'] == 'published':
        return registry, content_coverage(registry, cycles=1, starts_at=document['starts_at'])
    result = registry
    for index, allocation in enumerate(document['cosmetic_allocations']):
        result = result.reserve(allocation['source'], allocation['period_id'], f's1-cosmetics-{index + 1}')
        reserved = result.releases[allocation['source'], allocation['period_id']]
        if reserved['placements'] != [dict(slot=allocation['slot'], cosmetics=allocation['cosmetics'])]:
            raise ValueError('The planned one-time cosmetic allocation is unavailable; do not recycle another set')
    for index, week in enumerate(document['resource_weeks']):
        placements = [dict(slot=p['position'], cosmetics={}, resources={k:v for k,v in p.items() if k != 'position'})
                      for p in week['prizes']]
        result = result.reserve_resources(week['period_id'], f's1-resources-{index + 1}', placements)
    coverage = content_coverage(result, cycles=1, starts_at=document['starts_at'])
    if not coverage['stock_ready']:
        raise ValueError('The first-season draft exceeds available reviewed stock')
    return result, coverage


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--check', action='store_true')
    action.add_argument('--preview', action='store_true')
    args = parser.parse_args()
    registry, coverage = candidate()
    print(json.dumps(dict(profile_valid=True, published=PROFILE['status'] == 'published', production_changed=False,
        reserved_periods=len(registry.releases) - len(REGISTRY.releases), personal_items_reserved=6,
        added_common_shards=sum(p['module_shards'] for w in PROFILE['resource_weeks'] for p in w['prizes']),
        **(dict(profile=PROFILE, candidate_catalog=registry.document, coverage=coverage) if args.preview else {})),
        ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
