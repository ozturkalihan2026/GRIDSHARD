import pytest
from app.game.engine import BattleEngine
from app.game.models import BattleState
from app.season_competition import daily_meta_by_id, daily_meta_catalog_view


def grant(meta,card):
    e=BattleEngine(BattleState('daily-v2'));e.add_player('a')
    e.state.player_daily_meta_ids['a']=meta
    return e.grant_module('a','unit',card)


@pytest.mark.parametrize('meta,card,field',[('damage','laser','base_damage'),('defense','shield','max_hp'),('tactics','repair','max_hp'),('core','core','max_hp')])
def test_daily_meta_applies_only_its_advertised_axis(meta,card,field):
    baseline=grant('',card).definition;boosted=grant(meta,card).definition
    assert getattr(boosted,field)==pytest.approx(round(getattr(baseline,field)*1.1,2),abs=.5)
    if meta!='damage':assert boosted.base_damage==baseline.base_damage
    assert boosted.current_cost==baseline.current_cost and boosted.cooldown_ms==baseline.cooldown_ms


def test_old_class_rolls_are_resolved_to_one_useful_tactics_meta():
    assert daily_meta_catalog_view()['dice_sides']==5
    assert daily_meta_catalog_view()['probability_per_meta']==.2
    for old in ('system','support','sabotage'):
        assert daily_meta_by_id(old)['id']=='tactics'
        assert grant(old,'emp').definition.max_hp>grant('','emp').definition.max_hp
    assert daily_meta_by_id('unknown') is None
