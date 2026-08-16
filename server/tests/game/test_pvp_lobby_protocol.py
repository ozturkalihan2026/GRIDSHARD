from app.game.battle_pool import default_battle_pool
from app.game.pvp_protocol_handler import PvPProtocolHandler
from app.game.pvp_session import PvPSessionService

def setup_message(player):
    return {
        "version":1,"type":"submit_setup","session_id":"match",
        "player_id":player,"request_id":f"s-{player}",
        "payload":{
            "battle_pool_ids":list(default_battle_pool().module_definition_ids),
            "initial_modules":[
                {"instance_id":f"{player}-core","definition_id":"core","x":2,"y":2,"direction":"up"},
                {"instance_id":f"{player}-gen","definition_id":"generator","x":2,"y":3,"direction":"up"},
                {"instance_id":f"{player}-splitter","definition_id":"splitter","x":2,"y":1,"direction":"down"},
                {"instance_id":f"{player}-laser","definition_id":"laser","x":1,"y":1,"direction":"right"},
            ],
        },
    }

def ready_message(player):
    return {
        "version":1,"type":"set_ready","session_id":"match",
        "player_id":player,"request_id":f"r-{player}",
        "payload":{"ready":True},
    }

def build(auto=False):
    s=PvPSessionService()
    s.create_session("match",setup_required=True,auto_start_when_ready=auto)
    s.join("match","a"); s.join("match","b")
    return PvPProtocolHandler(s),s

def test_submit_setup_protocol_message():
    h,s=build()
    r=h.handle(setup_message("a"),"a")
    assert r["type"]=="setup_accepted"
    assert r["payload"]["players"][0]["setup_submitted"] is True

def test_set_ready_protocol_message():
    h,s=build()
    h.handle(setup_message("a"),"a")
    r=h.handle(ready_message("a"),"a")
    assert r["type"]=="ready_state"
    assert r["payload"]["players"][0]["ready"] is True

def test_request_lobby_protocol_message():
    h,s=build()
    r=h.handle({
        "version":1,"type":"request_lobby","session_id":"match",
        "player_id":"a","request_id":"l","payload":{}
    },"a")
    assert r["type"]=="lobby_state"
    assert r["payload"]["player_count"]==2

def test_auto_start_when_both_ready():
    h,s=build(auto=True)
    for p in ("a","b"):
        h.handle(setup_message(p),p)
        h.handle(ready_message(p),p)
    assert s.get_session("match").engine.state.status.value=="running"

def test_auto_start_not_with_one_ready():
    h,s=build(auto=True)
    h.handle(setup_message("a"),"a")
    h.handle(ready_message("a"),"a")
    assert s.get_session("match").engine.state.status.value=="waiting"
