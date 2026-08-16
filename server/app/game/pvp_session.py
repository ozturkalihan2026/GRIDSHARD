from dataclasses import dataclass, field

from .engine import BattleEngine
from .models import BattleCommand, BattleState, BattleStatus


MAX_PVP_PLAYERS = 2


class PvPSessionError(ValueError):
    pass


@dataclass(slots=True)
class PvPPlayerSlot:
    player_id: str
    slot_index: int
    connected: bool = True
    last_command_sequence: int = 0
    acknowledged_event_cursor: int = 0


@dataclass(slots=True)
class PvPSession:
    session_id: str
    engine: BattleEngine
    slots: dict[str, PvPPlayerSlot] = field(default_factory=dict)

    @property
    def is_full(self) -> bool:
        return len(self.slots) == MAX_PVP_PLAYERS

    @property
    def snapshot_revision(self) -> int:
        return self.engine.state.tick

    def slot_for(self, player_id: str) -> PvPPlayerSlot:
        try:
            return self.slots[player_id]
        except KeyError as exc:
            raise PvPSessionError(
                "Oyuncu bu PvP oturumuna kayıtlı değil."
            ) from exc


class PvPSessionService:
    def __init__(self):
        self._sessions: dict[str, PvPSession] = {}

    def create_session(self, session_id: str) -> PvPSession:
        if session_id in self._sessions:
            raise PvPSessionError(
                "Aynı kimlikte PvP oturumu zaten mevcut."
            )

        engine = BattleEngine(
            BattleState(battle_id=session_id)
        )
        session = PvPSession(
            session_id=session_id,
            engine=engine,
        )
        self._sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> PvPSession:
        try:
            return self._sessions[session_id]
        except KeyError as exc:
            raise PvPSessionError(
                "PvP oturumu bulunamadı."
            ) from exc

    def join(
        self,
        session_id: str,
        player_id: str,
    ) -> PvPPlayerSlot:
        session = self.get_session(session_id)

        if player_id in session.slots:
            slot = session.slots[player_id]
            slot.connected = True
            return slot

        if session.is_full:
            raise PvPSessionError(
                "PvP oturumu iki oyuncu ile dolu."
            )

        slot = PvPPlayerSlot(
            player_id=player_id,
            slot_index=len(session.slots),
            connected=True,
        )
        session.slots[player_id] = slot
        session.engine.add_player(player_id)
        return slot

    def disconnect(
        self,
        session_id: str,
        player_id: str,
    ) -> None:
        slot = self.get_session(session_id).slot_for(
            player_id
        )
        slot.connected = False

    def start(self, session_id: str) -> None:
        session = self.get_session(session_id)

        if not session.is_full:
            raise PvPSessionError(
                "PvP maçı başlamadan önce iki oyuncu gerekli."
            )

        session.engine.start()

    def submit_command(
        self,
        session_id: str,
        authenticated_player_id: str,
        command: BattleCommand,
    ) -> None:
        session = self.get_session(session_id)
        session.slot_for(authenticated_player_id)

        if command.player_id != authenticated_player_id:
            raise PvPSessionError(
                "Oyuncu başka bir oyuncu adına komut gönderemez."
            )

        if session.engine.state.status != BattleStatus.RUNNING:
            raise PvPSessionError(
                "Komut yalnızca çalışan PvP maçına gönderilebilir."
            )

        session.engine.enqueue_command(command)

    def submit_sequenced_command(
        self,
        session_id: str,
        authenticated_player_id: str,
        sequence: int,
        command: BattleCommand,
    ) -> None:
        session = self.get_session(session_id)
        slot = session.slot_for(authenticated_player_id)

        if sequence <= slot.last_command_sequence:
            raise PvPSessionError(
                "Eski veya tekrarlı PvP komut sıra numarası."
            )

        self.submit_command(
            session_id,
            authenticated_player_id,
            command,
        )
        slot.last_command_sequence = sequence

    def acknowledge_events(
        self,
        session_id: str,
        player_id: str,
        cursor: int,
    ) -> None:
        session = self.get_session(session_id)
        slot = session.slot_for(player_id)

        if cursor < slot.acknowledged_event_cursor:
            raise PvPSessionError(
                "Olay onay imleci geriye alınamaz."
            )
        if cursor > len(session.engine.state.events):
            raise PvPSessionError(
                "Olay onay imleci mevcut olay sayısını aşamaz."
            )

        slot.acknowledged_event_cursor = cursor

    def reconnect_payload(
        self,
        session_id: str,
        player_id: str,
    ) -> dict:
        session = self.get_session(session_id)
        slot = session.slot_for(player_id)
        slot.connected = True

        snapshot = self.snapshot(
            session_id,
            player_id,
        )
        event_page = self.events_since(
            session_id,
            player_id,
            slot.acknowledged_event_cursor,
        )

        return {
            "snapshot_revision": session.snapshot_revision,
            "snapshot": snapshot,
            "events": event_page["events"],
            "event_cursor": event_page["cursor"],
            "last_command_sequence": slot.last_command_sequence,
            "acknowledged_event_cursor": slot.acknowledged_event_cursor,
        }

    def step(self, session_id: str) -> None:
        self.get_session(session_id).engine.step()

    def snapshot(
        self,
        session_id: str,
        viewer_player_id: str,
    ) -> dict:
        session = self.get_session(session_id)
        session.slot_for(viewer_player_id)
        state = session.engine.state

        players = {}
        for player_id in sorted(state.players):
            player = state.players[player_id]
            public_modules = [
                {
                    "instance_id": module.instance_id,
                    "definition_id": module.definition.id,
                    "name_tr": module.definition.name_tr,
                    "status": module.status.value,
                    "hp": module.hp,
                    "max_hp": module.definition.max_hp,
                    "x": (
                        module.position.x
                        if module.position is not None
                        else None
                    ),
                    "y": (
                        module.position.y
                        if module.position is not None
                        else None
                    ),
                    "direction": module.direction.value,
                    "is_powered": module.is_powered,
                    "heat": module.heat,
                }
                for module in sorted(
                    player.modules.values(),
                    key=lambda current: current.instance_id,
                )
            ]

            player_data = {
                "player_id": player_id,
                "slot_index": session.slots[player_id].slot_index,
                "connected": session.slots[player_id].connected,
                "modules": public_modules,
            }

            # Ekonomi ve teklif gibi özel bilgiler yalnızca izleyenin kendisine açılır.
            if player_id == viewer_player_id:
                player_data.update(
                    {
                        "circuit_credits": player.circuit_credits,
                        "last_command_sequence": session.slots[player_id].last_command_sequence,
                        "acknowledged_event_cursor": session.slots[player_id].acknowledged_event_cursor,
                        "pending_booster_offer": (
                            {
                                "id": player.pending_booster_offer.id,
                                "booster_ids": list(
                                    player.pending_booster_offer.booster_ids
                                ),
                                "created_at_ms": (
                                    player.pending_booster_offer.created_at_ms
                                ),
                            }
                            if player.pending_booster_offer is not None
                            else None
                        ),
                    }
                )

            players[player_id] = player_data

        return {
            "session_id": session_id,
            "viewer_player_id": viewer_player_id,
            "status": state.status.value,
            "tick": state.tick,
            "snapshot_revision": session.snapshot_revision,
            "elapsed_ms": state.elapsed_ms,
            "winner_player_id": state.winner_player_id,
            "is_draw": state.is_draw,
            "finish_reason": state.finish_reason,
            "players": players,
        }

    def events_since(
        self,
        session_id: str,
        viewer_player_id: str,
        cursor: int = 0,
    ) -> dict:
        session = self.get_session(session_id)
        session.slot_for(viewer_player_id)

        if cursor < 0:
            raise PvPSessionError(
                "Olay imleci negatif olamaz."
            )

        events = session.engine.state.events
        return {
            "from_cursor": cursor,
            "cursor": len(events),
            "snapshot_revision": session.snapshot_revision,
            "events": [
                {
                    "type": event.type,
                    "at_ms": event.at_ms,
                    "data": event.data,
                }
                for event in events[cursor:]
            ],
        }
