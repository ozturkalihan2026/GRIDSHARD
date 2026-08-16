import pytest
from app.game.pvp_protocol import PVP_PROTOCOL_VERSION,PvPProtocolError,battle_command_from_envelope,parse_client_envelope,protocol_error_envelope
from app.game.pvp_protocol_handler import PvPProtocolHandler
from app.game.pvp_session import PvPSessionService

def command_message(*,player_id="a",sequence=1,version=PVP_PROTOCOL_VERSION):
    return {"version":version,"type":"command","session_id":"match","player_id":player_id,"request_id":"req-1","payload":{"sequence":sequence,"kind":"rotate_module","command_payload":{"module_id":"x"}}}

def running_handler():
    service=PvPSessionService(); service.create_session("match"); service.join("match","a"); service.join("match","b"); service.start("match")
    return PvPProtocolHandler(service),service

def test_protocol_rejects_wrong_version():
    with pytest.raises(PvPProtocolError): parse_client_envelope(command_message(version=999))

def test_protocol_rejects_unknown_client_type():
    m=command_message(); m["type"]="hack"
    with pytest.raises(PvPProtocolError): parse_client_envelope(m)

def test_command_envelope_builds_authenticated_battle_command():
    e=parse_client_envelope(command_message()); s,c=battle_command_from_envelope(e)
    assert s==1 and c.player_id=="a" and c.kind=="rotate_module"

def test_handler_rejects_identity_mismatch():
    h,_=running_handler(); r=h.handle(command_message(player_id="b"),authenticated_player_id="a")
    assert r["type"]=="error" and r["request_id"]=="req-1"

def test_handler_accepts_monotonic_command_envelope():
    h,_=running_handler(); r=h.handle(command_message(sequence=1),authenticated_player_id="a")
    assert r["version"]==PVP_PROTOCOL_VERSION and r["type"]=="command_accepted" and r["payload"]["sequence"]==1

def test_handler_turns_duplicate_sequence_into_error():
    h,_=running_handler(); h.handle(command_message(sequence=5),authenticated_player_id="a"); r=h.handle(command_message(sequence=5),authenticated_player_id="a")
    assert r["type"]=="error"

def test_snapshot_message_is_viewer_scoped():
    h,_=running_handler(); r=h.handle({"version":PVP_PROTOCOL_VERSION,"type":"request_snapshot","session_id":"match","player_id":"a","request_id":"snap-1","payload":{}},authenticated_player_id="a")
    assert r["type"]=="snapshot" and r["payload"]["viewer_player_id"]=="a"

def test_reconnect_message_returns_reconnect_state():
    h,s=running_handler(); s.disconnect("match","a"); r=h.handle({"version":PVP_PROTOCOL_VERSION,"type":"reconnect","session_id":"match","player_id":"a","request_id":"re-1","payload":{}},authenticated_player_id="a")
    assert r["type"]=="reconnect_state" and r["payload"]["snapshot"]["viewer_player_id"]=="a"

def test_error_envelope_is_versioned():
    e=protocol_error_envelope("hata",request_id="x").to_dict(); assert e["version"]==PVP_PROTOCOL_VERSION and e["type"]=="error" and e["request_id"]=="x"
