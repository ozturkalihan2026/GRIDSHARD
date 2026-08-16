from dataclasses import dataclass
from typing import Any
from .models import BattleCommand

PVP_PROTOCOL_VERSION = 1
CLIENT_MESSAGE_TYPES = {"command", "ack_events", "request_snapshot", "reconnect"}
SERVER_MESSAGE_TYPES = {"snapshot", "events", "command_accepted", "reconnect_state", "error"}

class PvPProtocolError(ValueError):
    pass

@dataclass(slots=True, frozen=True)
class ClientEnvelope:
    version: int
    message_type: str
    session_id: str
    player_id: str
    request_id: str
    payload: dict[str, Any]

@dataclass(slots=True, frozen=True)
class ServerEnvelope:
    version: int
    message_type: str
    request_id: str | None
    payload: dict[str, Any]
    def to_dict(self) -> dict[str, Any]:
        return {"version": self.version, "type": self.message_type, "request_id": self.request_id, "payload": self.payload}

def _require_string(data: dict, key: str) -> str:
    value=data.get(key)
    if not isinstance(value,str) or not value:
        raise PvPProtocolError(f"`{key}` dolu metin olmalıdır.")
    return value

def parse_client_envelope(data: dict[str, Any]) -> ClientEnvelope:
    if not isinstance(data,dict):
        raise PvPProtocolError("PvP mesajı nesne olmalıdır.")
    version=data.get("version")
    if version != PVP_PROTOCOL_VERSION:
        raise PvPProtocolError("Desteklenmeyen PvP protokol sürümü.")
    message_type=_require_string(data,"type")
    if message_type not in CLIENT_MESSAGE_TYPES:
        raise PvPProtocolError("Bilinmeyen istemci PvP mesaj türü.")
    payload=data.get("payload",{})
    if not isinstance(payload,dict):
        raise PvPProtocolError("`payload` nesne olmalıdır.")
    return ClientEnvelope(version,message_type,_require_string(data,"session_id"),_require_string(data,"player_id"),_require_string(data,"request_id"),payload)

def battle_command_from_envelope(envelope: ClientEnvelope) -> tuple[int, BattleCommand]:
    if envelope.message_type != "command":
        raise PvPProtocolError("Mesaj türü `command` olmalıdır.")
    sequence=envelope.payload.get("sequence")
    if not isinstance(sequence,int) or sequence <= 0:
        raise PvPProtocolError("Komut sıra numarası pozitif tam sayı olmalıdır.")
    kind=envelope.payload.get("kind")
    if not isinstance(kind,str) or not kind:
        raise PvPProtocolError("Komut türü dolu metin olmalıdır.")
    command_payload=envelope.payload.get("command_payload",{})
    if not isinstance(command_payload,dict):
        raise PvPProtocolError("`command_payload` nesne olmalıdır.")
    return sequence, BattleCommand(player_id=envelope.player_id,kind=kind,payload=command_payload)

def event_ack_cursor_from_envelope(envelope: ClientEnvelope) -> int:
    if envelope.message_type != "ack_events":
        raise PvPProtocolError("Mesaj türü `ack_events` olmalıdır.")
    cursor=envelope.payload.get("cursor")
    if not isinstance(cursor,int) or cursor < 0:
        raise PvPProtocolError("Olay imleci negatif olmayan tam sayı olmalıdır.")
    return cursor

def server_envelope(message_type: str,payload: dict[str,Any],*,request_id: str|None=None) -> ServerEnvelope:
    if message_type not in SERVER_MESSAGE_TYPES:
        raise PvPProtocolError("Bilinmeyen sunucu PvP mesaj türü.")
    if not isinstance(payload,dict):
        raise PvPProtocolError("Sunucu mesaj payload'u nesne olmalıdır.")
    return ServerEnvelope(PVP_PROTOCOL_VERSION,message_type,request_id,payload)

def protocol_error_envelope(message: str,*,request_id: str|None=None,code: str="protocol_error") -> ServerEnvelope:
    return server_envelope("error",{"code":code,"message":message},request_id=request_id)
