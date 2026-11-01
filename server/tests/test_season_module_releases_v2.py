from copy import deepcopy
import pytest
from app.season_module_releases import MANIFEST, validate_season_release
from app.module_roster import MODULE_SPECS


def test_future_concepts_are_not_live_cards_or_rewards():
    ids=[m['id'] for r in MANIFEST['roadmap'] for m in r['modules']]
    assert len(ids)==len(set(ids))==4 and not set(ids).intersection(MODULE_SPECS)
    for release in MANIFEST['roadmap']:
        with pytest.raises(ValueError): validate_season_release(release)


def test_release_requires_new_card_and_all_delivery_checks():
    release=deepcopy(MANIFEST['roadmap'][0])
    release['modules'][0]['release_checks']={k:True for k in MANIFEST['policy']['release_requires']}
    assert validate_season_release(release)==('echo_relay',)
    with pytest.raises(ValueError):validate_season_release({'modules':[]})
    with pytest.raises(ValueError):validate_season_release(release,existing_ids={'echo_relay'})
