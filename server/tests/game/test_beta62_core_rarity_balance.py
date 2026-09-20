import pytest

from app.game.catalog import get_module_definition
from app.game.core_balance import (
    CORE_RARITY_PROFILES,
    core_rarity_profile,
)
from app.game.energy import process_energy_tick
from app.game.engine import BattleEngine
from app.game.models import BattleState, ModuleStatus, Position


def _powered_player(core_type: str):
    engine = BattleEngine(BattleState(battle_id=f"core-rarity-{core_type}"))
    player = engine.add_player("player")
    core = engine.grant_module("player", "core", "core")
    core.status = ModuleStatus.ACTIVE
    core.position = Position(2, 1)
    player.core_type = core_type
    return player


def test_core_rarity_curve_improves_all_axes_in_order():
    profiles = [
        CORE_RARITY_PROFILES[rarity]
        for rarity in ("common", "rare", "epic", "legendary")
    ]
    for axis in ("hp", "effect", "energy", "charge"):
        values = [profile[axis] for profile in profiles]
        assert values == sorted(values)
        assert values[0] < values[-1]


def test_legendary_core_generates_more_energy_than_common_core():
    common = process_energy_tick(_powered_player("core_resonance"))
    legendary = process_energy_tick(_powered_player("core_phoenix"))

    assert legendary.generated > common.generated
    assert legendary.generated / common.generated == pytest.approx(core_rarity_profile(
        "core_phoenix"
    )["energy"])


def test_core_hp_profile_scales_from_canonical_core_without_mutating_catalog():
    base = get_module_definition("core")
    legendary_hp = round(
        base.max_hp * core_rarity_profile("core_quantum")["hp"]
    )

    assert legendary_hp > base.max_hp
    assert get_module_definition("core").max_hp == base.max_hp
