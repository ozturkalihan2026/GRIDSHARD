from app.game.energy import process_energy_tick
from app.game.engine import BattleEngine
from app.game.models import BattleState


def _energy_player(module_ids):
    engine = BattleEngine(BattleState(battle_id="checkpoint-energy-load"))
    engine.add_player("player")
    engine.grant_module("player", "core", "core")
    engine.set_initial_active_module("player", "core", 2, 1)
    positions = ((0, 0), (1, 0), (2, 0), (3, 0), (4, 0), (1, 1))
    for index, definition_id in enumerate(module_ids):
        instance_id = f"module-{index}"
        engine.grant_module("player", instance_id, definition_id)
        engine.set_initial_active_module("player", instance_id, *positions[index])
    player = engine.state.players["player"]
    player.energy_stock = 0
    process_energy_tick(player)
    return player


def test_severe_overload_never_restores_full_attack_damage():
    moderate = _energy_player(("quantum_cannon", "railgun", "pulse_cannon"))
    severe = _energy_player((
        "quantum_cannon",
        "quantum_cannon",
        "quantum_cannon",
        "quantum_cannon",
        "quantum_cannon",
        "quantum_cannon",
    ))

    assert 1.4 < moderate.energy_load_ratio < 1.6
    assert moderate.energy_damage_multiplier == 0.9
    assert severe.energy_load_ratio > 1.6
    assert severe.energy_speed_multiplier == 0.6
    assert severe.energy_damage_multiplier == 0.75
    assert severe.energy_damage_multiplier < moderate.energy_damage_multiplier
