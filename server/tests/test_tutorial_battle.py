"""İlk oyun deneyimi: yönetmenli ilk savaşın baştan sona betiği."""

import asyncio

import pytest

from app.arena_canon import STARTER_IDS
from app.game.models import BattleCommand, BattleStatus, ModuleStatus
from app.game.pvp_runner import PvPTickRunner
from app.game.pvp_session import PvPSessionError, PvPSessionService
from app.game.pvp_setup import InitialModulePlacement, PvPSetupPayload
from app.game.pvp_websocket import PvPWebSocketAdapter
from app.game.tutorial import (
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



def test_five_short_stages_never_pause_the_battle():
    service,session,runner=build()
    assert len(STAGES)==5
    director=session.tutorial
    assert not director.waiting and director.before_tick(0)
    before=session.engine.state.elapsed_ms
    session.engine.step()
    assert session.engine.state.elapsed_ms>before
    assert director.view()['paused'] is False
    assert director.view()['skippable'] is True


def test_any_deck_card_is_allowed_without_a_tutorial_quota():
    service,session,runner=build()
    director=session.tutorial
    for card in STARTER_IDS:
        assert director.handle_command(command('deploy_module',definition_id=card))
    assert director.handle_command(command('use_core_power',request_id='power'))
    assert director.handle_command(command('forfeit_battle'))


def test_skip_releases_the_director_without_finishing_the_match():
    service,session,runner=build()
    assert not session.tutorial.handle_command(command('tutorial_ack',stage='deploy_laser'))
    assert session.tutorial is None
    assert session.engine.state.status==BattleStatus.RUNNING


def test_cues_end_after_twenty_four_seconds_and_keep_normal_placement_rules():
    service,session,runner=build()
    for _ in range(240):
        session.engine.step()
        if session.tutorial:session.tutorial.after_tick()
    assert session.tutorial is None
    enemy=player_modules(session,'laser',BOT)
    assert len(enemy)==1
    assert enemy[0].position!=session.engine.board.core_position
    assert session.engine.state.status==BattleStatus.RUNNING


def test_both_sides_use_the_same_six_active_starter_cards():
    assert TUTORIAL_PLAYER_DECK==TUTORIAL_ENEMY_DECK==tuple(STARTER_IDS)
    assert deck_supports_tutorial(STARTER_IDS)
    assert not deck_supports_tutorial(('shield','armor','repair'))


def test_training_is_not_a_progression_match():
    assert not applies_to_profile_progression(TUTORIAL_TRAINING_MATCH_TYPE)


def test_new_account_can_upgrade_the_laser_once():
    from app.meta_progression import MetaProgressionService, module_upgrade_cost
    from app.player_profile import PlayerProfileService
    profile=PlayerProfileService().get_or_create('starter-shard-v2')
    assert profile.module_shards['laser']==module_upgrade_cost('laser',0)['shards']==2
    receipt=MetaProgressionService().upgrade_module(profile,'laser','first')
    assert receipt['level_after']==1 and profile.module_shards['laser']==0
