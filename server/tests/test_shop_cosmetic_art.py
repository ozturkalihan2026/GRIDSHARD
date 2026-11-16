"""Authored native shop art cannot become season stock or unlock ownership."""
from copy import deepcopy
import json
from hashlib import sha256
from pathlib import Path

import pytest

from app import cosmetic_releases as art
from app.player_profile import PlayerProfileService, PlayerProfileError
from app.liveops_content import content_coverage


def document():
    return json.loads(art.CATALOG_PATH.read_text(encoding='utf-8'))


def test_four_distinct_artworks_have_real_sources_and_remain_unassigned_and_locked():
    registry = art.CosmeticReleaseRegistry(document())
    rows = [r for r in registry.items.values() if r.get('inventory_pool') == 'shop']
    assert len(rows) == 4 and len({r['design_id'] for r in rows}) == 4
    assert all(r['status']=='approved' for r in rows)
    assert len({r['look']['asset']['sha256'] for r in rows}) == 4
    assert {r['look']['pattern'] for r in rows} == set(art.AUTHORED_SHOP_PATTERNS)
    assert not registry.used and not registry.releases
    service = PlayerProfileService(); profile = service.get_or_create('shop-art-unowned')
    before = deepcopy(profile)
    for row in rows:
        with pytest.raises(PlayerProfileError):
            service.set_cosmetics(profile.player_id, **{row['field']:row['id']})
    assert profile == before


@pytest.mark.parametrize('mutation', ['pool', 'field', 'path', 'hash', 'missing', 'recolor'])
def test_invalid_or_reused_native_shop_art_fails_closed(mutation):
    data = document(); row = next(r for r in data['items'] if r.get('inventory_pool') == 'shop')
    if mutation == 'pool': row['inventory_pool'] = 'competition'
    if mutation == 'field': row['field'] = 'team_frame_id'
    if mutation == 'path': row['look']['asset']['path'] = '../outside.svg'
    if mutation == 'hash': row['look']['asset']['sha256'] = '0'*64
    if mutation == 'missing': del row['look']['asset']
    if mutation == 'recolor':
        copy = deepcopy(row);copy.update(id='renamed_shop',design_id='renamed_shop_v1');copy['look']['color']='#ffffff';data['items'].append(copy)
    with pytest.raises(art.CosmeticReleaseError): art.CosmeticReleaseRegistry(data)


def test_shop_stock_does_not_reduce_season_shortfall_or_get_reserved_as_a_reward():
    registry = art.CosmeticReleaseRegistry(document())
    competition = deepcopy(registry.document)
    competition['items'] = [r for r in competition['items'] if r.get('inventory_pool') != 'shop']
    competition['themes'] = [r for r in competition['themes'] if r['id'] not in {'dockyard','workshop'}]
    old = art.CosmeticReleaseRegistry(competition)
    report, baseline = content_coverage(registry), content_coverage(old)
    assert report['content_tasks'] == baseline['content_tasks']
    assert registry.reserve('weekly_tournament','2027-W01','no-shop-art').used == old.reserve('weekly_tournament','2027-W01','no-shop-art').used


def test_owned_art_selects_and_public_profile_exposes_only_selected_appearance(monkeypatch):
    from app import main as gateway
    service = PlayerProfileService(); profile = service.get_or_create('shop-art-owned')
    frame, background = 'workshop_shelf_frame', 'workshop_bay_background'
    profile.unlocked_avatar_frame_ids += (frame,)
    profile.unlocked_profile_background_ids += (background,)
    service.set_cosmetics(profile.player_id,avatar_frame_id=frame,profile_background_id=background)
    monkeypatch.setattr(gateway,'player_profile_service',service)
    public = gateway._public_player_profile_view(profile.player_id)
    assert public['avatar']['selected_avatar_frame_id'] == frame
    assert public['avatar']['selected_profile_background_id'] == background
    assert 'unlocked_avatar_frame_ids' not in public['avatar']
    assert not public['visibility']['settings']


@pytest.mark.parametrize('injection', ['<script>alert(1)</script>', '<image href="https://invalid.example/art.png"/>'])
def test_even_a_matching_hash_cannot_authorize_active_or_external_svg(tmp_path, monkeypatch, injection):
    data = document()
    root = Path(__file__).resolve().parents[2] / 'client'
    for row in data['items']:
        if row.get('inventory_pool') != 'shop': continue
        asset = row['look']['asset']; target = tmp_path / asset['path']
        target.parent.mkdir(parents=True, exist_ok=True)
        raw = (root / asset['path']).read_bytes()
        if row['id'] == 'dockyard_latch_frame':
            raw = raw.replace(b'</svg>', injection.encode()+b'</svg>')
            asset['sha256'] = sha256(raw).hexdigest()
        target.write_bytes(raw)
    monkeypatch.setenv('GRIDSHARD_CLIENT_DIR', str(tmp_path))
    with pytest.raises(art.CosmeticReleaseError,match='Unsafe authored cosmetic SVG'):
        art.CosmeticReleaseRegistry(data)
