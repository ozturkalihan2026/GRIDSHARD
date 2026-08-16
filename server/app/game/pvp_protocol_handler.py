from .pvp_protocol import (
    battle_command_from_envelope,
    event_ack_cursor_from_envelope,
    parse_client_envelope,
    protocol_error_envelope,
    ready_value_from_envelope,
    server_envelope,
    setup_payload_from_envelope,
)
from .pvp_session import PvPSessionError,PvPSessionService

class PvPProtocolHandler:
    def __init__(self,service: PvPSessionService):
        self.service=service

    def handle(self,raw_message: dict,authenticated_player_id: str) -> dict:
        request_id=None
        try:
            envelope=parse_client_envelope(raw_message)
            request_id=envelope.request_id
            if envelope.player_id!=authenticated_player_id:
                raise PvPSessionError(
                    "Mesaj oyuncu kimliği doğrulanmış kimlikle eşleşmiyor."
                )
            if envelope.message_type=="command":
                sequence,command=battle_command_from_envelope(envelope)
                self.service.submit_sequenced_command(
                    envelope.session_id,authenticated_player_id,sequence,command
                )
                return server_envelope(
                    "command_accepted",{"sequence":sequence},request_id=request_id
                ).to_dict()
            if envelope.message_type=="ack_events":
                cursor=event_ack_cursor_from_envelope(envelope)
                self.service.acknowledge_events(
                    envelope.session_id,authenticated_player_id,cursor
                )
                return server_envelope(
                    "events",
                    self.service.events_since(
                        envelope.session_id,authenticated_player_id,cursor
                    ),
                    request_id=request_id,
                ).to_dict()
            if envelope.message_type=="submit_setup":
                self.service.submit_setup(
                    envelope.session_id,
                    authenticated_player_id,
                    setup_payload_from_envelope(envelope),
                )
                return server_envelope(
                    "setup_accepted",
                    self.service.lobby_snapshot(envelope.session_id),
                    request_id=request_id,
                ).to_dict()
            if envelope.message_type=="set_ready":
                self.service.set_ready(
                    envelope.session_id,
                    authenticated_player_id,
                    ready_value_from_envelope(envelope),
                )
                return server_envelope(
                    "ready_state",
                    self.service.lobby_snapshot(envelope.session_id),
                    request_id=request_id,
                ).to_dict()
            if envelope.message_type=="request_lobby":
                return server_envelope(
                    "lobby_state",
                    self.service.lobby_snapshot(envelope.session_id),
                    request_id=request_id,
                ).to_dict()
            if envelope.message_type=="request_snapshot":
                return server_envelope(
                    "snapshot",
                    self.service.snapshot(
                        envelope.session_id,authenticated_player_id
                    ),
                    request_id=request_id,
                ).to_dict()
            if envelope.message_type=="reconnect":
                return server_envelope(
                    "reconnect_state",
                    self.service.reconnect_payload(
                        envelope.session_id,authenticated_player_id
                    ),
                    request_id=request_id,
                ).to_dict()
            raise PvPSessionError("Desteklenmeyen PvP mesajı.")
        except (ValueError,PvPSessionError) as exc:
            return protocol_error_envelope(
                str(exc),request_id=request_id
            ).to_dict()
