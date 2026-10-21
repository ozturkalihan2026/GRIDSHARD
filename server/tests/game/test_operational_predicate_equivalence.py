"""Guard a hot-path optimization without changing sabotage/battle rules."""
from itertools import combinations, product
from types import SimpleNamespace

import pytest

from app.game import energy, engine as engine_module, operations
from app.game.engine import BattleEngine
from app.game.models import BattleState, TimedModuleEffect
from app.game.simulation import DEFAULT_SIMULATION_LAYOUTS, _install_layout


def reference_predicate(module):
    return any(key in module.debuffs for key in operations.DISABLING_SABOTAGE_DEBUFF_IDS)


EFFECT_KEYS = (*sorted(operations.DISABLING_SABOTAGE_DEBUFF_IDS), "unrelated_slow")
SUBSETS = [subset for count in range(len(EFFECT_KEYS) + 1) for subset in combinations(EFFECT_KEYS, count)]


@pytest.mark.parametrize("keys", SUBSETS)
def test_predicate_matches_reference_and_observes_mutations(keys):
    module = SimpleNamespace(debuffs=dict.fromkeys(keys))
    assert operations.has_disabling_sabotage(module) == reference_predicate(module)
    for key in EFFECT_KEYS:
        module.debuffs[key] = None
        assert operations.has_disabling_sabotage(module) == reference_predicate(module)
        del module.debuffs[key]
        assert operations.has_disabling_sabotage(module) == reference_predicate(module)


def simulate(layout_a, layout_b):
    engine = BattleEngine(BattleState(battle_id="predicate-equivalence"))
    for player, layout in (("a", layout_a), ("b", layout_b)):
        engine.add_player(player)
        _install_layout(engine, player, layout)
    engine.start()
    for tick in range(1800):
        if engine.state.status.value == "finished":
            break
        # Exercise expiry/cleanse interactions as well as natural EMP/jammer.
        if tick in (5, 25, 45, 65):
            key = EFFECT_KEYS[(tick - 5) // 20]
            for player in engine.state.players.values():
                module = player.modules[f"{player.player_id}-laser"]
                module.debuffs[key] = TimedModuleEffect(
                    id=key, name_tr="Test", expires_at_ms=engine.state.elapsed_ms + 500,
                )
        engine.step()
    # Mirror matches can remain alive at the bounded 1800-tick cutoff. Their
    # complete running state is compared too, without forcing a game outcome.
    return engine.state


@pytest.mark.parametrize("layouts", list(product(DEFAULT_SIMULATION_LAYOUTS, repeat=2)),
                         ids=lambda pair: f"{pair[0].id}-{pair[1].id}")
def test_battle_state_and_all_events_equal_reference(layouts, monkeypatch):
    optimized = simulate(*layouts)
    monkeypatch.setattr(operations, "has_disabling_sabotage", reference_predicate)
    monkeypatch.setattr(energy, "has_disabling_sabotage", reference_predicate)
    monkeypatch.setattr(engine_module, "has_disabling_sabotage", reference_predicate)
    reference = simulate(*layouts)
    # Includes result, resources, HP/heat, cooldowns, debuffs and the event log;
    # comparing only the winner would miss a subtly altered intermediate rule.
    assert optimized == reference
