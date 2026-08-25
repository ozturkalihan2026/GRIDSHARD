from app.game.engine import BattleEngine
from app.game.models import (
    BattleCommand,
    BattleState,
    BattleStatus,
    PlayerBattleState,
)
from app.game.pvp_session import PvPSessionError, PvPSessionService
from app.player_profile import PlayerProfileService
from app.player_progression import PlayerProgressionService
from app.player_statistics import PlayerStatisticsService


def _booster_engine() -> BattleEngine:
    engine = BattleEngine(BattleState(battle_id="beta35-booster"))
    engine.add_player("p1")
    for instance_id, definition_id in (
        ("core-1", "core"),
        ("generator-1", "generator"),
        ("laser-1", "laser"),
        ("shield-1", "shield"),
    ):
        engine.grant_module("p1", instance_id, definition_id)
    engine.set_initial_active_module("p1", "core-1", 2, 2)
    engine.set_initial_active_module("p1", "generator-1", 2, 3)
    engine.set_initial_active_module("p1", "laser-1", 3, 3)
    engine.set_initial_active_module("p1", "shield-1", 3, 2)
    engine.start()
    while engine.state.elapsed_ms < 30_000:
        engine.step()
    return engine


def _command(engine: BattleEngine, kind: str, payload: dict) -> None:
    engine.enqueue_command(BattleCommand("p1", kind, payload))
    engine.step()


def test_atomic_booster_consumes_exact_offer_once() -> None:
    engine = _booster_engine()
    player = engine.state.players["p1"]
    offer_id = player.pending_booster_offer.id

    payload = {
        "offer_id": offer_id,
        "booster_id": "overcharge_chip",
        "target_module_id": "laser-1",
    }
    _command(engine, "use_booster", payload)

    assert player.pending_booster_offer is None
    assert player.next_booster_offer_index == 1
    assert offer_id in player.consumed_booster_offer_ids
    assert "overcharge_chip" in player.modules["laser-1"].temporary_boosters

    applied_count = sum(
        event.type == "booster_applied"
        and event.data.get("booster_id") == "overcharge_chip"
        for event in engine.state.events
    )
    _command(engine, "use_booster", payload)
    assert sum(
        event.type == "booster_applied"
        and event.data.get("booster_id") == "overcharge_chip"
        for event in engine.state.events
    ) == applied_count
    assert engine.state.events[-1].type == "command_rejected"


def test_ineffective_booster_targets_keep_offer() -> None:
    engine = _booster_engine()
    player = engine.state.players["p1"]
    offer_id = player.pending_booster_offer.id

    _command(engine, "use_booster", {
        "offer_id": offer_id,
        "booster_id": "emergency_repair",
        "target_module_id": "shield-1",
    })
    assert player.pending_booster_offer.id == offer_id
    assert player.next_booster_offer_index == 0

    _command(engine, "use_booster", {
        "offer_id": offer_id,
        "booster_id": "dual_port_adapter",
        "target_module_id": "core-1",
    })
    assert player.pending_booster_offer.id == offer_id
    assert player.next_booster_offer_index == 0


def test_snapshot_exposes_server_approved_eligible_targets() -> None:
    service = PvPSessionService()
    session = service.create_session("beta35-snapshot")
    service.join(session.session_id, "p1")
    engine = session.engine
    for instance_id, definition_id in (
        ("core-1", "core"),
        ("generator-1", "generator"),
        ("laser-1", "laser"),
        ("shield-1", "shield"),
    ):
        engine.grant_module("p1", instance_id, definition_id)
    engine.set_initial_active_module("p1", "core-1", 2, 2)
    engine.set_initial_active_module("p1", "generator-1", 2, 3)
    engine.set_initial_active_module("p1", "laser-1", 3, 3)
    engine.set_initial_active_module("p1", "shield-1", 3, 2)
    engine.start()
    while engine.state.elapsed_ms < 30_000:
        engine.step()

    offer = service.snapshot(session.session_id, "p1")["players"]["p1"][
        "pending_booster_offer"
    ]
    eligible = offer["eligible_target_module_ids"]
    assert eligible["overcharge_chip"] == ["laser-1"]
    assert "shield-1" not in eligible["emergency_repair"]
    assert "core-1" not in eligible["dual_port_adapter"]


def test_public_session_rejects_legacy_two_step_booster_commands() -> None:
    service = PvPSessionService()
    session = service.create_session("beta35-public")
    service.join(session.session_id, "p1")
    session.engine.start()
    try:
        service.submit_command(
            session.session_id,
            "p1",
            BattleCommand("p1", "select_booster", {"booster_id": "emergency_repair"}),
        )
    except PvPSessionError as exc:
        assert "use_booster" in str(exc)
    else:
        raise AssertionError("Eski iki aşamalı güçlendirici komutu kabul edilmemeliydi.")


def _finished_state(match_type: str, ranked_eligible: bool) -> BattleState:
    return BattleState(
        battle_id=f"beta35-{match_type}",
        match_type=match_type,
        ranked_eligible=ranked_eligible,
        account_player_ids=("human",),
        status=BattleStatus.FINISHED,
        players={
            "human": PlayerBattleState(player_id="human"),
            "ai": PlayerBattleState(player_id="ai"),
        },
        winner_player_id="human",
        loser_player_id="ai",
        finished_at_ms=72_000,
        result_summary={
            "human": {"damage_dealt": 500},
            "ai": {"damage_dealt": 100},
        },
    )


def test_ai_match_is_unranked_reduced_reward_and_account_scoped() -> None:
    profiles = PlayerProfileService()
    profile = profiles.get_or_create("human")
    profile.season_xp = 90
    progression = PlayerProgressionService(profiles)
    statistics = PlayerStatisticsService()
    state = _finished_state("unranked_ai", False)

    progression.process_finished_battle(state)
    statistics.process_finished_battle(state)
    result = progression.player_result(state.battle_id, "human")

    assert result["rating_delta"] == 0
    assert result["xp_awarded"] == 60
    assert result["match_label_tr"] == "Derecesiz AI"
    assert result["tier_advanced"]["tier_after"] == 1
    assert progression.player_result(state.battle_id, "ai") is None
    assert statistics.get_or_create("human").to_view()["unranked_ai_matches"] == 1
    assert "ai" not in statistics._statistics


def test_ranked_pvp_remains_rating_eligible_and_separately_counted() -> None:
    profiles = PlayerProfileService()
    progression = PlayerProgressionService(profiles)
    statistics = PlayerStatisticsService()
    state = _finished_state("ranked_pvp", True)

    progression.process_finished_battle(state)
    statistics.process_finished_battle(state)
    result = progression.player_result(state.battle_id, "human")

    assert result["rating_delta"] == 20
    assert result["xp_awarded"] == 120
    assert result["match_label_tr"] == "Dereceli PvP"
    assert statistics.get_or_create("human").to_view()["ranked_matches"] == 1
