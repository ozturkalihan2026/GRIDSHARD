from app.game.engine import BattleEngine
from app.game.models import BattleCommand, BattleState


def _running_engine():
    engine = BattleEngine(BattleState(battle_id="emoji-live"))
    for player_id in ("p1", "p2"):
        engine.add_player(player_id)
        engine.grant_module(player_id, f"{player_id}-core", "core")
        engine.set_initial_active_module(
            player_id,
            f"{player_id}-core",
            engine.board.core_position.x,
            engine.board.core_position.y,
        )
    engine.start()
    return engine


def test_selected_reward_emoji_is_broadcast_as_a_public_battle_event():
    engine = _running_engine()
    engine.state.players["p1"].selected_battle_emoji_id = "respect_signal"

    engine.enqueue_command(BattleCommand(
        "p1", "send_battle_emoji", {"emoji_id": "respect_signal"}
    ))
    engine.step()

    event = next(item for item in engine.state.events if item.type == "battle_emoji")
    assert event.data == {"player_id": "p1", "emoji_id": "respect_signal"}


def test_locked_or_spammed_battle_emoji_is_rejected():
    engine = _running_engine()
    player = engine.state.players["p1"]
    player.selected_battle_emoji_id = "respect_signal"
    engine.enqueue_command(BattleCommand(
        "p1", "send_battle_emoji", {"emoji_id": "victory_pulse"}
    ))
    engine.step()
    engine.enqueue_command(BattleCommand(
        "p1", "send_battle_emoji", {"emoji_id": "respect_signal"}
    ))
    engine.step()
    engine.enqueue_command(BattleCommand(
        "p1", "send_battle_emoji", {"emoji_id": "respect_signal"}
    ))
    engine.step()

    assert len([item for item in engine.state.events if item.type == "battle_emoji"]) == 1
    assert len([item for item in engine.state.events if item.type == "command_rejected"]) == 2
