"""İlk oyun deneyimi: yönetmenli ilk savaşın baştan sona betiği."""

import asyncio

import pytest

from app.arena_canon import STARTER_IDS
from app.game.heat import is_overheated
from app.game.models import BattleCommand, BattleStatus, ModuleStatus
from app.game.pvp_runner import PvPTickRunner
from app.game.pvp_session import PvPSessionError, PvPSessionService
from app.game.pvp_setup import InitialModulePlacement, PvPSetupPayload
from app.game.pvp_websocket import PvPWebSocketAdapter
from app.game.tutorial import (
    ABANDON_DISCONNECTED_SECONDS,
    STAGES,
    TUTORIAL_ENEMY_DECK,
    TUTORIAL_PLAYER_DECK,
    TutorialDirector,
    deck_supports_tutorial,
)
from app.match_accounting import (
    TUTORIAL_TRAINING_MATCH_TYPE,
    applies_to_profile_progression,
)


SESSION = "tutorial-battle"
PLAYER = "player"
BOT = "bot"


class Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self) -> float:
        return self.now


def build(deck=STARTER_IDS, clock=None):
    service = PvPSessionService(now_func=clock or Clock())
    session = service.create_session(
        SESSION,
        setup_required=True,
        auto_start_when_ready=True,
        match_type="arena_ai",
        ranked_eligible=True,
        normalized=False,
    )
    service.join(SESSION, PLAYER)
    service.join(SESSION, BOT)
    session.tutorial = TutorialDirector(session, PLAYER, BOT)
    service.submit_setup(
        SESSION,
        BOT,
        PvPSetupPayload(
            battle_pool_ids=TUTORIAL_ENEMY_DECK,
            initial_modules=(InitialModulePlacement(f"{BOT}-core", "core", 2, 1),),
        ),
    )
    service.set_ready(SESSION, BOT, True)
    service.mark_ai_player(SESSION, BOT)
    service.submit_setup(
        SESSION,
        PLAYER,
        PvPSetupPayload(
            battle_pool_ids=tuple(deck),
            initial_modules=(InitialModulePlacement("core-1", "core", 2, 1),),
        ),
    )
    service.set_ready(SESSION, PLAYER, True)
    runner = PvPTickRunner(service, PvPWebSocketAdapter(service))
    return service, session, runner


def player_modules(session, definition_id, player_id=PLAYER):
    return [
        module
        for module in session.engine.state.players[player_id].modules.values()
        if module.definition.id == definition_id and module.status == ModuleStatus.ACTIVE
    ]


def command(kind, **payload):
    return BattleCommand(player_id=PLAYER, kind=kind, payload=payload)


async def play(
    service,
    session,
    runner,
    *,
    on_stage=None,
    max_ticks=4000,
    session_id=SESSION,
    player_id=PLAYER,
):
    """Betiği bir oyuncu gibi oynar; ziyaret edilen sahneleri döndürür."""
    def send(kind, **payload):
        service.submit_command(
            session_id,
            player_id,
            BattleCommand(player_id=player_id, kind=kind, payload=payload),
        )

    visited = []
    for _ in range(max_ticks):
        if session.engine.state.status != BattleStatus.RUNNING:
            break
        view = session.tutorial.view()
        if not visited or visited[-1] != view["stage"]:
            visited.append(view["stage"])
            if on_stage is not None:
                on_stage(view)
        if view["paused"] and view["kind"] == "ack":
            send("tutorial_ack", stage=view["stage"])
        elif view["paused"] and view["kind"] == "deploy":
            send("deploy_module", definition_id=view["deploy"])
        assert await runner.run_single_tick(session_id)
    return visited


def test_directed_battle_walks_every_stage_and_the_player_wins():
    service, session, runner = build()
    seen = {}

    def on_stage(view):
        stage = view["stage"]
        if stage == "heat_bar":
            seen["laser_overheated"] = is_overheated(player_modules(session, "laser")[0])
        elif stage == "deploy_repair":
            cooler = player_modules(session, "cooler")[0]
            seen["cooler_ratio"] = cooler.hp / cooler.definition.max_hp
        elif stage == "deploy_battery":
            seen["laser_waits_for_energy"] = player_modules(session, "laser")[0].energy_waiting
        elif stage == "deploy_laser_2":
            seen["enemy_defense"] = bool(player_modules(session, "shield", BOT))
        elif stage == "finale":
            seen["lasers"] = len(player_modules(session, "laser"))
            seen["amplifier"] = bool(player_modules(session, "amplifier"))

    visited = asyncio.run(play(service, session, runner, on_stage=on_stage))

    assert visited == [stage.id for stage in STAGES]
    assert seen == {
        "laser_overheated": True,
        "cooler_ratio": pytest.approx(0.45, abs=0.11),
        "laser_waits_for_energy": True,
        "enemy_defense": True,
        "lasers": 2,
        "amplifier": True,
    }
    state = session.engine.state
    assert state.status == BattleStatus.FINISHED
    assert state.winner_player_id == PLAYER
    # Savaş saati yalnız izleme sahnelerinde akar: eğitim Devre Gerilimine girmez.
    assert state.elapsed_ms < 90_000


def test_battle_clock_stands_still_while_the_player_reads():
    service, session, runner = build()

    async def scenario():
        for _ in range(50):
            await runner.run_single_tick(SESSION)

    asyncio.run(scenario())

    assert session.tutorial.view()["stage"] == "arena"
    assert session.engine.state.tick == 0
    assert session.engine.state.status == BattleStatus.RUNNING


def test_only_the_shown_card_can_be_played_and_only_once():
    service, session, runner = build()
    engine = session.engine

    # Beklenmeyen komut protokol hatası üretmez, sessizce düşer.
    service.submit_command(SESSION, PLAYER, command("deploy_module", definition_id="laser"))
    assert engine.pending_command_count == 0

    for stage_id in ("arena", "current"):
        service.submit_command(SESSION, PLAYER, command("tutorial_ack", stage=stage_id))
    assert session.tutorial.view()["stage"] == "deploy_laser"
    service.submit_command(SESSION, PLAYER, command("deploy_module", definition_id="shield"))
    service.submit_command(SESSION, PLAYER, command("use_core_power", request_id="r1"))
    assert engine.pending_command_count == 0
    assert session.tutorial.view()["paused"] is True

    service.submit_command(SESSION, PLAYER, command("deploy_module", definition_id="laser"))
    service.submit_command(SESSION, PLAYER, command("deploy_module", definition_id="laser"))
    assert engine.pending_command_count == 1
    assert session.tutorial.view()["paused"] is False


def test_a_repeated_acknowledgement_does_not_skip_the_next_stage():
    service, session, runner = build()

    service.submit_command(SESSION, PLAYER, command("tutorial_ack", stage="arena"))
    service.submit_command(SESSION, PLAYER, command("tutorial_ack", stage="arena"))

    assert session.tutorial.view()["stage"] == "current"


def test_shown_card_is_always_affordable():
    service, session, runner = build()
    costs = {}

    def on_stage(view):
        if view["kind"] == "deploy":
            costs[view["stage"]] = session.engine.state.players[PLAYER].circuit_credits

    asyncio.run(play(service, session, runner, on_stage=on_stage))

    assert costs["deploy_laser"] >= 3
    assert all(value >= 2 for value in costs.values())


def test_deck_without_tutorial_cards_falls_back_to_a_normal_match():
    deck = ("laser", "shield", "armor", "repair", "battery", "amplifier")
    service, session, runner = build(deck=deck)

    assert session.tutorial is None
    assert service.snapshot(SESSION, PLAYER)["tutorial"] is None
    # Yönetmen çekilince hareketsizlik hükmü geri gelir.
    assert session.engine.inactivity_forfeit_ms == service.inactivity_forfeit_ms


def test_snapshot_shows_the_stage_only_to_the_player():
    service, session, runner = build()

    own = service.snapshot(SESSION, PLAYER)["tutorial"]
    assert own["stage"] == "arena" and own["paused"] is True and own["total"] == len(STAGES)
    assert service.snapshot(SESSION, BOT)["tutorial"] is None


def test_abandoned_battle_is_closed_without_a_result():
    clock = Clock()
    service, session, runner = build(clock=clock)
    finished = []
    runner.match_finished_callback = finished.append
    session.slot_for(PLAYER).connected = False

    async def scenario():
        assert await runner.run_single_tick(SESSION)
        clock.now += ABANDON_DISCONNECTED_SECONDS + 1
        assert not await runner.run_single_tick(SESSION)

    asyncio.run(scenario())

    assert finished == []
    with pytest.raises(PvPSessionError):
        service.get_session(SESSION)


# -- Eşleştirme uç noktası -----------------------------------------------------

def _reset_gateway(monkeypatch, *, ai_only):
    from app import main as gateway

    gateway.matchmaking_service._queue.clear()
    gateway.matchmaking_service._matches_by_player.clear()
    gateway.pvp_service._sessions.clear()
    gateway.player_profile_service._profiles.clear()
    gateway.player_statistics_service._statistics.clear()
    monkeypatch.setattr(gateway, "MATCHMAKING_AI_ONLY", ai_only)
    return gateway


@pytest.mark.parametrize("ai_only", [True, False])
def test_new_player_gets_a_directed_battle_when_the_client_asks(monkeypatch, ai_only):
    from fastapi.testclient import TestClient

    gateway = _reset_gateway(monkeypatch, ai_only=ai_only)

    response = TestClient(gateway.app).post(
        "/matchmaking/join",
        json={"player_id": "tutorial-new-player", "tutorial": True},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["matched"] is True and payload["opponent_type"] == "ai"
    session = gateway.pvp_service.get_session(payload["session_id"])
    assert isinstance(session.tutorial, TutorialDirector)
    assert session.tutorial.player_id == "tutorial-new-player"
    ai_player_id = next(iter(session.ai_player_ids))
    assert (
        session.engine.state.players[ai_player_id].battle_pool.module_definition_ids
        == TUTORIAL_ENEMY_DECK
    )
    # İlk savaş normal Arena maçıdır: kupa ve ödül verir, oyuncu kendi destesiyle girer.
    assert session.engine.state.match_type == "arena_ai"
    assert session.engine.state.ranked_eligible is True
    assert "tutorial_deck" not in payload


def test_plain_join_keeps_the_softened_first_match(monkeypatch):
    from fastapi.testclient import TestClient

    gateway = _reset_gateway(monkeypatch, ai_only=True)

    payload = TestClient(gateway.app).post(
        "/matchmaking/join",
        json={"player_id": "plain-new-player"},
    ).json()

    session = gateway.pvp_service.get_session(payload["session_id"])
    assert session.tutorial is None
    ai_player_id = next(iter(session.ai_player_ids))
    assert session.ai_next_decision_at_ms[ai_player_id] == gateway.FIRST_MATCH_AI_FIRST_DECISION_MS


def test_tutorial_training_deck_teaches_every_card_and_stays_off_the_books():
    assert deck_supports_tutorial(TUTORIAL_PLAYER_DECK)
    assert len(TUTORIAL_PLAYER_DECK) == 6
    assert applies_to_profile_progression(TUTORIAL_TRAINING_MATCH_TYPE) is False


@pytest.mark.parametrize("ai_only", [True, False])
def test_replaying_player_gets_a_directed_training_match(monkeypatch, ai_only):
    from fastapi.testclient import TestClient

    gateway = _reset_gateway(monkeypatch, ai_only=ai_only)
    gateway.player_statistics_service.get_or_create("veteran-player").total_matches = 3
    client = TestClient(gateway.app)

    payload = client.post(
        "/matchmaking/join",
        json={"player_id": "veteran-player", "tutorial": True},
    ).json()

    assert payload["matched"] is True and payload["opponent_type"] == "ai"
    session = gateway.pvp_service.get_session(payload["session_id"])
    assert isinstance(session.tutorial, TutorialDirector)
    assert session.engine.state.match_type == TUTORIAL_TRAINING_MATCH_TYPE
    assert session.engine.state.ranked_eligible is False
    # Oyuncu kendi destesiyle değil eğitim destesiyle girer; sunucu desteyi bildirir.
    assert payload["tutorial_deck"] == list(TUTORIAL_PLAYER_DECK)
    # Eşleşme yanıtı kaçtıysa durum sorgusu da aynı desteyi bildirir.
    status = client.get("/matchmaking/veteran-player").json()
    assert status["matched"] is True
    assert status["tutorial_deck"] == list(TUTORIAL_PLAYER_DECK)
    ai_player_id = next(iter(session.ai_player_ids))
    assert (
        session.engine.state.players[ai_player_id].battle_pool.module_definition_ids
        == TUTORIAL_ENEMY_DECK
    )
    assert session.ai_next_decision_at_ms[ai_player_id] == gateway.FIRST_MATCH_AI_FIRST_DECISION_MS


def test_experienced_player_plays_a_normal_match_without_the_tutorial_request(monkeypatch):
    from fastapi.testclient import TestClient

    gateway = _reset_gateway(monkeypatch, ai_only=True)
    gateway.player_statistics_service.get_or_create("veteran-player").total_matches = 3

    payload = TestClient(gateway.app).post(
        "/matchmaking/join",
        json={"player_id": "veteran-player"},
    ).json()

    session = gateway.pvp_service.get_session(payload["session_id"])
    assert session.tutorial is None
    assert session.engine.state.match_type == "arena_ai"
    assert "tutorial_deck" not in payload
    ai_player_id = next(iter(session.ai_player_ids))
    assert session.ai_next_decision_at_ms[ai_player_id] == 0


def test_training_match_is_won_and_leaves_the_account_untouched(monkeypatch):
    from fastapi.testclient import TestClient

    gateway = _reset_gateway(monkeypatch, ai_only=True)
    clock = Clock()
    monkeypatch.setattr(gateway.pvp_service, "now_func", clock)
    player_id = "training-veteran"
    profile = gateway.player_profile_service.get_or_create(player_id)
    profile.rating = 640
    profile.highest_rating = 700
    statistics = gateway.player_statistics_service.get_or_create(player_id)
    statistics.total_matches = 12
    statistics.wins = 7
    before = {
        "rating": profile.rating,
        "highest_rating": profile.highest_rating,
        "experience": profile.experience,
        "season_xp": profile.season_xp,
        "circuit_credits": profile.circuit_credits,
        "lifetime_stats": dict(profile.lifetime_stats),
        "chest_slots": [dict(item) for item in profile.chest_slots],
        "daily_mission_progress": dict(profile.daily_mission_progress),
    }

    payload = TestClient(gateway.app).post(
        "/matchmaking/join",
        json={"player_id": player_id, "tutorial": True},
    ).json()
    session_id = payload["session_id"]
    session = gateway.pvp_service.get_session(session_id)
    gateway.pvp_service.submit_setup(
        session_id,
        player_id,
        PvPSetupPayload(
            battle_pool_ids=tuple(payload["tutorial_deck"]),
            initial_modules=(InitialModulePlacement("core-1", "core", 2, 1),),
        ),
    )
    gateway.pvp_service.set_ready(session_id, player_id, True)
    clock.now += 3.0
    runner = PvPTickRunner(
        gateway.pvp_service,
        PvPWebSocketAdapter(gateway.pvp_service),
        match_finished_callback=gateway.process_completed_pvp_battle,
    )

    visited = asyncio.run(play(
        gateway.pvp_service, session, runner,
        session_id=session_id, player_id=player_id,
    ))

    state = session.engine.state
    assert visited == [stage.id for stage in STAGES]
    assert state.status == BattleStatus.FINISHED
    assert state.winner_player_id == player_id
    assert runner.stats_for(session_id).match_finished_callback_failures == 0
    result = gateway.player_progression_service.player_result(session_id, player_id)
    assert result["match_type"] == TUTORIAL_TRAINING_MATCH_TYPE
    assert result["match_label_tr"] == "Eğitim Savaşı"
    assert result["profile_progression_applied"] is False
    assert (result["rating_delta"], result["circuit_credits_awarded"], result["xp_awarded"]) == (0, 0, 0)
    assert result["chest_awarded"] is None
    assert {
        "rating": profile.rating,
        "highest_rating": profile.highest_rating,
        "experience": profile.experience,
        "season_xp": profile.season_xp,
        "circuit_credits": profile.circuit_credits,
        "lifetime_stats": dict(profile.lifetime_stats),
        "chest_slots": [dict(item) for item in profile.chest_slots],
        "daily_mission_progress": dict(profile.daily_mission_progress),
    } == before
    assert (statistics.total_matches, statistics.wins) == (12, 7)


def test_new_account_can_upgrade_the_laser_once():
    from app.meta_progression import MetaProgressionService, module_upgrade_cost
    from app.player_profile import PlayerProfileService

    profile = PlayerProfileService().get_or_create("starter-shard-player")
    cost = module_upgrade_cost("laser", 0)

    assert profile.module_shards["laser"] == cost["shards"] == 2
    assert profile.circuit_credits >= cost["circuit_credits"]
    receipt = MetaProgressionService().upgrade_module(profile, "laser", "first-upgrade")
    assert receipt["level_after"] == 1
    assert profile.module_shards["laser"] == 0
    # Başka hiçbir karta parça verilmez.
    assert all(count == 0 for count in profile.module_shards.values())
