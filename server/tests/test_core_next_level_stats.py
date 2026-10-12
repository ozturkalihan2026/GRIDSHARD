"""Çekirdek bilgi ekranı bir sonraki seviyenin farkını sunucunun değerlerinden yazar."""

from app.game.energy import (
    BASE_CORE_GENERATION_PER_SECOND,
    CORE_LEVEL_GENERATION_MULTIPLIER,
    CORE_RESERVE_BASE_CAPACITY,
    CORE_RESERVE_PER_LEVEL,
)
from app.meta_progression import MetaProgressionService
from app.player_profile import PlayerProfileService


def _core(profile, core_id="core_resonance"):
    view = MetaProgressionService().view(profile)
    return next(item for item in view["cores"]["types"] if item["id"] == core_id)


def test_core_view_reports_next_level_energy_values():
    profile = PlayerProfileService().get_or_create("core-next-level-player")
    core = _core(profile)

    assert core["level"] == 1
    assert core["energy_per_second"] == round(BASE_CORE_GENERATION_PER_SECOND, 2)
    assert core["energy_capacity"] == round(CORE_RESERVE_BASE_CAPACITY, 1)
    assert core["next_stats"] == {
        "energy_per_second": round(
            BASE_CORE_GENERATION_PER_SECOND * CORE_LEVEL_GENERATION_MULTIPLIER, 2
        ),
        "energy_capacity": round(CORE_RESERVE_BASE_CAPACITY + CORE_RESERVE_PER_LEVEL, 1),
    }
    assert core["next_stats"]["energy_per_second"] > core["energy_per_second"]
    assert core["next_stats"]["energy_capacity"] > core["energy_capacity"]


def test_next_level_values_are_the_values_the_upgrade_really_gives():
    profile = PlayerProfileService().get_or_create("core-next-level-upgrade-player")
    promised = _core(profile)["next_stats"]

    profile.core_upgrade_levels["core_resonance"] = 1
    upgraded = _core(profile)

    assert upgraded["level"] == 2
    assert upgraded["energy_per_second"] == promised["energy_per_second"]
    assert upgraded["energy_capacity"] == promised["energy_capacity"]


def test_core_at_max_level_has_no_next_level_values():
    profile = PlayerProfileService().get_or_create("core-next-level-max-player")
    profile.core_upgrade_levels["core_resonance"] = 14
    core = _core(profile)

    assert core["level"] == 15
    assert core["next_upgrade_cost"] is None
    assert core["next_stats"] is None
