"""Çekirdek bilgi ekranı bir sonraki seviyenin farkını sunucunun değerlerinden yazar."""

from app.game.core_stats import core_max_hp
from app.meta_progression import MetaProgressionService
from app.player_profile import PlayerProfileService


def _core(profile, core_id="core_resonance"):
    view = MetaProgressionService().view(profile)
    return next(item for item in view["cores"]["types"] if item["id"] == core_id)


def test_core_view_reports_next_level_combat_values():
    profile = PlayerProfileService().get_or_create("core-next-level-player")
    core = _core(profile)

    assert core["level"] == 1
    assert core['next_stats']['max_hp'] == core_max_hp(2)
    assert core['next_stats']['max_hp'] > core['max_hp']
    assert not any('energy' in key for key in core['next_stats'])



def test_next_level_values_are_the_values_the_upgrade_really_gives():
    profile = PlayerProfileService().get_or_create("core-next-level-upgrade-player")
    promised = _core(profile)["next_stats"]

    profile.core_upgrade_levels["core_resonance"] = 1
    upgraded = _core(profile)

    assert upgraded["level"] == 2
    assert upgraded["max_hp"] == promised["max_hp"]


def test_core_at_max_level_has_no_next_level_values():
    profile = PlayerProfileService().get_or_create("core-next-level-max-player")
    profile.core_upgrade_levels["core_resonance"] = 14
    core = _core(profile)

    assert core["level"] == 15
    assert core["next_upgrade_cost"] is None
    assert core["next_stats"] is None
