import pytest
from app.game.battle_pool import default_battle_pool
from app.game.models import Direction
from app.game.pvp_session import PvPSessionError, PvPSessionService
from app.game.pvp_setup import InitialModulePlacement, PvPSetupPayload

def valid_payload(player_id="a"):
    pool = default_battle_pool()
    return PvPSetupPayload(
        battle_pool_ids=pool.module_definition_ids,
        initial_modules=(
            InitialModulePlacement(f"{player_id}-core","core",2,2),
            InitialModulePlacement(f"{player_id}-gen","generator",2,3,Direction.UP),
            InitialModulePlacement(f"{player_id}-splitter","splitter",2,1,Direction.DOWN),
            InitialModulePlacement(f"{player_id}-laser","laser",1,1,Direction.RIGHT),
        ),
    )

def strict_session():
    service = PvPSessionService()
    session = service.create_session("match", setup_required=True)
    service.join("match","a")
    service.join("match","b")
    return service, session

def test_strict_session_cannot_start_without_setups():
    service,_=strict_session()
    with pytest.raises(PvPSessionError):
        service.start("match")

def test_valid_setup_installs_exact_18_pool():
    service,session=strict_session()
    service.submit_setup("match","a",valid_payload("a"))
    player=session.engine.state.players["a"]
    assert len(player.battle_pool.module_definition_ids)==18
    assert session.slots["a"].setup_submitted is True
    assert session.slots["a"].ready is False

def test_setup_creates_four_active_and_fifteen_reserve_modules():
    service,session=strict_session()
    service.submit_setup("match","a",valid_payload("a"))
    player=session.engine.state.players["a"]
    active=[m for m in player.modules.values() if m.status.value=="active"]
    reserve=[m for m in player.modules.values() if m.status.value=="reserve"]
    assert len(active)==4
    assert len(reserve)==15

def test_player_cannot_ready_before_setup():
    service,_=strict_session()
    with pytest.raises(PvPSessionError):
        service.set_ready("match","a",True)

def test_two_valid_ready_players_can_start():
    service,session=strict_session()
    for player in ("a","b"):
        service.submit_setup("match",player,valid_payload(player))
        service.set_ready("match",player,True)
    service.start("match")
    assert session.engine.state.status.value=="running"

def test_invalid_pool_size_is_rejected():
    service,_=strict_session()
    payload=valid_payload("a")
    invalid=PvPSetupPayload(
        battle_pool_ids=payload.battle_pool_ids[:-1],
        initial_modules=payload.initial_modules,
    )
    with pytest.raises(PvPSessionError):
        service.submit_setup("match","a",invalid)

def test_snapshot_hides_opponent_pool_but_shows_ready_summary():
    service,_=strict_session()
    for player in ("a","b"):
        service.submit_setup("match",player,valid_payload(player))
    service.set_ready("match","a",True)
    snap=service.snapshot("match","a")
    assert snap["players"]["a"]["ready"] is True
    assert snap["players"]["b"]["ready"] is False
    assert len(snap["players"]["a"]["battle_pool_ids"])==18
    assert "battle_pool_ids" not in snap["players"]["b"]
