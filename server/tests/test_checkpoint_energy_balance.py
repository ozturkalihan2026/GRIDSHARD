from app.game.energy import process_energy_tick, spend_action_energy
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


def test_overload_is_paid_by_visible_waits_not_hidden_circuit_penalties():
    moderate = _energy_player(("laser", "shield", "repair"))
    severe = _energy_player((
        "quantum_cannon",
        "quantum_cannon",
        "quantum_cannon",
        "quantum_cannon",
        "quantum_cannon",
        "quantum_cannon",
    ))

    assert moderate.energy_load_ratio < 1.0
    assert severe.energy_load_ratio > 1.0
    # Devre çapında gizli hız/hasar cezası taşıyan alan yok.
    for player in (moderate, severe):
        assert not hasattr(player, "energy_speed_multiplier")
        assert not hasattr(player, "energy_damage_multiplier")

    # Ağır yığın rezervi hızla tüketir; sıradaki atış görünür biçimde bekler.
    cannons = [
        module for module in severe.modules.values()
        if module.definition.id == "quantum_cannon"
    ]
    results = [spend_action_energy(severe, cannon) for cannon in cannons]
    assert not all(result.success for result in results)
    assert any(cannon.energy_waiting for cannon in cannons)
