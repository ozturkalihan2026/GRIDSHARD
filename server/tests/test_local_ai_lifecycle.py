import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app import main
from app.game.battle_pool import default_battle_pool
from app.game.pvp_runner import PvPTickRunner
from app.game.pvp_session import PvPSessionService


@pytest.fixture
def isolated_local_ai(monkeypatch):
    service = PvPSessionService()
    runner = PvPTickRunner(service, SimpleNamespace())
    monkeypatch.setattr(main, "pvp_service", service)
    monkeypatch.setattr(main, "pvp_tick_runner", runner)
    monkeypatch.setattr(main, "attach_player_progression_to_session", lambda *_: None)
    monkeypatch.setattr(main, "player_profile_service", SimpleNamespace(
        get_or_create=lambda _: SimpleNamespace(display_name="Lifecycle test")))
    return service, runner


@pytest.mark.parametrize("stage", ["join", "submit_setup", "progression", "response"])
def test_failed_local_setup_releases_session_and_runner(isolated_local_ai, monkeypatch, stage):
    service, runner = isolated_local_ai
    def fail(*_args, **_kwargs):
        raise ValueError("injected setup failure")
    if stage == "progression":
        monkeypatch.setattr(main, "attach_player_progression_to_session", fail)
    elif stage == "response":
        monkeypatch.setattr(main, "_local_ai_snapshot_envelope", fail)
        async def start(session_id):
            runner._stats[session_id] = runner.stats_for(session_id)
            runner._tasks[session_id] = asyncio.create_task(asyncio.sleep(100))
        monkeypatch.setattr(runner, "ensure_started", start)
    else:
        monkeypatch.setattr(service, stage, fail)
    request = main.LocalAiBattleStartRequest(player_id="owner",
        battle_pool_ids=list(default_battle_pool().module_definition_ids))
    with pytest.raises(HTTPException) as error:
        asyncio.run(main.create_local_ai_session(request))
    assert error.value.status_code == 422
    assert service._sessions == {}
    assert runner._tasks == {} and runner._stats == {}


@pytest.mark.parametrize("error_type", [RuntimeError, asyncio.CancelledError])
def test_unexpected_error_and_cancellation_also_cleanup(isolated_local_ai, monkeypatch, error_type):
    service, runner = isolated_local_ai
    def fail(*_args, **_kwargs):
        raise error_type()
    monkeypatch.setattr(service, "join", fail)
    request = main.LocalAiBattleStartRequest(player_id="owner",
        battle_pool_ids=list(default_battle_pool().module_definition_ids))
    with pytest.raises(error_type):
        asyncio.run(main.create_local_ai_session(request))
    assert not service._sessions and not runner._tasks


def test_only_local_owner_can_abandon_and_retries_are_idempotent(isolated_local_ai):
    service, runner = isolated_local_ai
    session = service.create_session("local-ai-case", match_type="local_test")
    service.join(session.session_id, "owner")
    service.join(session.session_id, "ai")
    session.ai_player_ids.add("ai")
    for player in ("stranger", "ai"):
        with pytest.raises(HTTPException) as error:
            asyncio.run(main.abandon_local_ai_session(session.session_id, player))
        assert error.value.status_code == 403
        assert session.session_id in service._sessions
    runner.stats_for(session.session_id)
    assert asyncio.run(main.abandon_local_ai_session(session.session_id, "owner"))["closed"]
    assert asyncio.run(main.abandon_local_ai_session(session.session_id, "owner"))["closed"]
    assert not service._sessions and not runner._stats


def test_ranked_match_cannot_be_deleted_through_local_endpoint(isolated_local_ai):
    service, _ = isolated_local_ai
    session = service.create_session("local-ai-ranked", match_type="ranked_pvp")
    service.join(session.session_id, "owner")
    with pytest.raises(HTTPException) as error:
        asyncio.run(main.abandon_local_ai_session(session.session_id, "owner"))
    assert error.value.status_code == 403
    assert session.session_id in service._sessions
