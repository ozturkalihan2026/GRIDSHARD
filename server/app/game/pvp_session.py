from copy import deepcopy
from dataclasses import dataclass, field
import time
from typing import Callable

from .engine import BattleEngine
from .ai_archetypes import normalize_ai_archetype_id
from .models import BattleCommand, BattleState, BattleStatus, ModuleStatus
from .pvp_setup import (
    PvPSetupPayload,
    PvPSetupValidationError,
    validate_setup_payload,
)
from .topology import effective_port_count, module_port_directions


MAX_PVP_PLAYERS = 2

OWNER_ONLY_EVENT_TYPES = frozenset({
    "battle_pool_set",
    "circuit_credits_awarded",
    "circuit_credits_spent",
    "command_received",
    "command_rejected",
    "module_stored_energy_changed",
    "booster_offer_created",
    "booster_offer_consumed",
    "booster_selected",
    "booster_applied",
})

PRIVATE_RESULT_FIELDS = frozenset({
    "circuit_credits",
    "forfeit_credit_penalty",
    "energy_generated_total",
    "energy_consumed_total",
})


class PvPSessionError(ValueError):
    pass


@dataclass(slots=True)
class PvPPlayerSlot:
    player_id: str
    slot_index: int
    connected: bool = True
    last_command_sequence: int = 0
    acknowledged_event_cursor: int = 0
    setup_submitted: bool = False
    ready: bool = False


@dataclass(slots=True)
class PvPSession:
    session_id: str
    engine: BattleEngine
    slots: dict[str, PvPPlayerSlot] = field(default_factory=dict)
    setup_required: bool = False
    auto_start_when_ready: bool = False
    created_at: float = 0.0
    last_activity_at: float = 0.0
    finished_at: float | None = None
    ai_player_ids: set[str] = field(default_factory=set)
    ai_next_decision_at_ms: dict[str, int] = field(default_factory=dict)
    ai_archetypes: dict[str, str] = field(default_factory=dict)

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
    def __init__(
        self,
        *,
        now_func: Callable[[], float] = time.monotonic,
        waiting_ttl_seconds: float = 180.0,
        disconnected_ttl_seconds: float = 90.0,
        finished_ttl_seconds: float = 300.0,
    ):
        self._sessions: dict[str, PvPSession] = {}
        self.now_func = now_func
        self.waiting_ttl_seconds = waiting_ttl_seconds
        self.disconnected_ttl_seconds = disconnected_ttl_seconds
        self.finished_ttl_seconds = finished_ttl_seconds

    def create_session(
        self,
        session_id: str,
        *,
        setup_required: bool = False,
        auto_start_when_ready: bool = False,
        match_type: str = "ranked_pvp",
        season_id: str = "core_awakening_s0",
        ranked_eligible: bool = True,
        normalized: bool = True,
        laboratory_effects_enabled: bool = False,
    ) -> PvPSession:
        if session_id in self._sessions:
            raise PvPSessionError(
                "Aynı kimlikte PvP oturumu zaten mevcut."
            )

        normalized = bool(normalized or ranked_eligible)
        laboratory_effects_enabled = bool(
            laboratory_effects_enabled
            and not normalized
            and not ranked_eligible
        )
        engine = BattleEngine(
            BattleState(
                battle_id=session_id,
                match_type=match_type,
                season_id=season_id,
                ranked_eligible=ranked_eligible,
                normalized=normalized,
                laboratory_effects_enabled=laboratory_effects_enabled,
            )
        )
        now = self.now_func()
        session = PvPSession(
            session_id=session_id,
            engine=engine,
            setup_required=setup_required,
            auto_start_when_ready=auto_start_when_ready,
            created_at=now,
            last_activity_at=now,
        )
        self._sessions[session_id] = session
        return session

    def set_player_calibrations(
        self,
        session_id: str,
        player_id: str,
        levels: dict[str, int],
    ) -> None:
        session = self.get_session(session_id)
        session.slot_for(player_id)
        if session.engine.state.status != BattleStatus.WAITING:
            raise PvPSessionError(
                "Laboratuvar kalibrasyonları yalnız savaş başlamadan bağlanabilir."
            )
        session.engine.state.player_calibrations[player_id] = {
            str(module_id): max(0, min(3, int(level)))
            for module_id, level in levels.items()
            if int(level) > 0
        }
        self._touch(session)

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
            self._touch(session)
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
        session.engine.state.account_player_ids = tuple(sorted(session.slots))
        self._touch(session)
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
        self._touch(self.get_session(session_id))

    def mark_ai_player(
        self,
        session_id: str,
        player_id: str,
        *,
        first_decision_at_ms: int = 15_000,
        archetype_id: str = "balanced",
    ) -> None:
        session = self.get_session(session_id)
        session.slot_for(player_id)
        session.ai_player_ids.add(player_id)
        session.engine.state.account_player_ids = tuple(
            sorted(set(session.slots) - session.ai_player_ids)
        )
        session.ai_next_decision_at_ms[player_id] = max(
            0,
            int(first_decision_at_ms),
        )
        session.ai_archetypes[player_id] = normalize_ai_archetype_id(
            archetype_id
        )
        self._touch(session)

    def submit_setup(
        self,
        session_id: str,
        player_id: str,
        payload: PvPSetupPayload,
    ) -> None:
        session = self.get_session(session_id)
        slot = session.slot_for(player_id)

        if session.engine.state.status != BattleStatus.WAITING:
            raise PvPSessionError(
                "PvP kurulumu yalnızca maç başlamadan gönderilebilir."
            )

        try:
            validate_setup_payload(payload)
        except PvPSetupValidationError as exc:
            raise PvPSessionError(str(exc)) from exc

        player = session.engine.state.players[player_id]
        player.modules.clear()
        player.battle_pool = None
        slot.ready = False

        session.engine.set_battle_pool(
            player_id,
            payload.battle_pool_ids,
        )

        for placement in payload.initial_modules:
            session.engine.grant_module(
                player_id,
                placement.instance_id,
                placement.definition_id,
            )
            session.engine.set_initial_active_module(
                player_id,
                placement.instance_id,
                placement.x,
                placement.y,
                placement.direction,
            )

        active_definitions = {
            placement.definition_id
            for placement in payload.initial_modules
        }
        for definition_id in payload.battle_pool_ids:
            if definition_id in active_definitions:
                continue
            session.engine.grant_module(
                player_id,
                f"{definition_id.replace('_', '-')}-1",
                definition_id,
            )

        slot.setup_submitted = True
        self._touch(session)

    def set_ready(
        self,
        session_id: str,
        player_id: str,
        ready: bool,
    ) -> None:
        session = self.get_session(session_id)
        slot = session.slot_for(player_id)

        if session.engine.state.status != BattleStatus.WAITING:
            raise PvPSessionError(
                "Hazır durumu yalnızca maç başlamadan değiştirilebilir."
            )
        if ready and not slot.setup_submitted:
            raise PvPSessionError(
                "Oyuncu geçerli kurulum göndermeden hazır olamaz."
            )
        slot.ready = ready
        self._touch(session)

        if (
            ready
            and session.auto_start_when_ready
            and session.is_full
            and all(
                current.setup_submitted and current.ready
                for current in session.slots.values()
            )
        ):
            self.start(session_id)

    def lobby_snapshot(self, session_id: str) -> dict:
        session = self.get_session(session_id)
        return {
            "session_id": session_id,
            "status": session.engine.state.status.value,
            "setup_required": session.setup_required,
            "auto_start_when_ready": session.auto_start_when_ready,
            "player_count": len(session.slots),
            "is_full": session.is_full,
            "players": [
                {
                    "player_id": slot.player_id,
                    "slot_index": slot.slot_index,
                    "connected": slot.connected,
                    "setup_submitted": slot.setup_submitted,
                    "ready": slot.ready,
                }
                for slot in sorted(
                    session.slots.values(),
                    key=lambda current: current.slot_index,
                )
            ],
        }

    def start(self, session_id: str) -> None:
        session = self.get_session(session_id)

        if not session.is_full:
            raise PvPSessionError(
                "PvP maçı başlamadan önce iki oyuncu gerekli."
            )

        if session.setup_required:
            not_ready = [
                slot.player_id
                for slot in session.slots.values()
                if not slot.setup_submitted or not slot.ready
            ]
            if not_ready:
                raise PvPSessionError(
                    "PvP maçı için iki oyuncunun da geçerli kurulumu ve hazır durumu gerekli."
                )

        session.engine.start()
        self._touch(session)

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

        if command.kind in {"select_booster", "apply_booster"}:
            raise PvPSessionError(
                "Eski iki aşamalı güçlendirici komutları kapalı; use_booster kullanılmalıdır."
            )

        try:
            session.engine.enqueue_command(command)
        except ValueError as exc:
            raise PvPSessionError(str(exc)) from exc
        self._touch(session)

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
        self._touch(session)

    def final_result_payload(
        self,
        session_id: str,
        viewer_player_id: str,
    ) -> dict:
        session = self.get_session(session_id)
        session.slot_for(viewer_player_id)
        state = session.engine.state

        if state.status != BattleStatus.FINISHED:
            raise PvPSessionError(
                "PvP maçı henüz tamamlanmadı."
            )

        return {
            "session_id": session_id,
            "viewer_player_id": viewer_player_id,
            "status": state.status.value,
            "winner_player_id": state.winner_player_id,
            "loser_player_id": state.loser_player_id,
            "is_draw": state.is_draw,
            "finish_reason": state.finish_reason,
            "finished_at_ms": state.finished_at_ms,
            "result_summary": self._result_summary_for_viewer(
                state.result_summary,
                viewer_player_id,
            ),
        }

    def reconnect_payload(
        self,
        session_id: str,
        player_id: str,
    ) -> dict:
        session = self.get_session(session_id)
        slot = session.slot_for(player_id)
        slot.connected = True
        self._touch(session)

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
            "final_result": (
                self.final_result_payload(
                    session_id,
                    player_id,
                )
                if session.engine.state.status == BattleStatus.FINISHED
                else None
            ),
        }

    def step(self, session_id: str) -> None:
        session = self.get_session(session_id)
        session.engine.step()
        if session.engine.state.status == BattleStatus.FINISHED and session.finished_at is None:
            session.finished_at = self.now_func()

    def snapshot(
        self,
        session_id: str,
        viewer_player_id: str,
    ) -> dict:
        session = self.get_session(session_id)
        session.slot_for(viewer_player_id)
        self._touch(session)
        state = session.engine.state

        players = {}
        for player_id in sorted(state.players):
            player = state.players[player_id]
            topology = session.engine.energy_topology_for_player(player_id)
            reachable_ids = set(topology.reachable_from_generator)
            public_modules = []
            for module in sorted(
                player.modules.values(),
                key=lambda current: current.instance_id,
            ):
                if (
                    player_id != viewer_player_id
                    and module.status == ModuleStatus.RESERVE
                ):
                    continue

                required = module.energy_required_last_tick
                received = module.energy_received_last_tick
                if module.definition.energy_generation > 0:
                    power_reason = "source"
                elif module.definition.energy_consumption <= 0:
                    power_reason = "passive"
                elif "emp_disabled" in module.debuffs:
                    power_reason = "emp_disabled"
                elif "line_disrupted" in module.debuffs:
                    power_reason = "line_disrupted"
                elif module.instance_id not in reachable_ids:
                    power_reason = "port_disconnected"
                elif module.is_powered:
                    power_reason = "powered"
                else:
                    power_reason = "insufficient_supply"

                public_modules.append({
                    "instance_id": module.instance_id,
                    "definition_id": module.definition.id,
                    "name_tr": module.definition.name_tr,
                    "category": module.definition.category,
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
                    "port_count": effective_port_count(module),
                    "ports": [
                        direction.value
                        for direction in module_port_directions(
                            module,
                            session.engine.board.core_position,
                        )
                    ],
                    "is_powered": module.is_powered,
                    "power_reason": power_reason,
                    "energy_received": received,
                    "energy_required": required,
                    "energy_shortfall": max(0.0, required - received),
                    "heat": module.heat,
                    "debuffs": sorted(module.debuffs),
                    "temporary_boosters": sorted(module.temporary_boosters),
                    "calibration_level": module.calibration_level,
                    "calibration_applied": module.calibration_applied,
                })

            player_data = {
                "player_id": player_id,
                "slot_index": session.slots[player_id].slot_index,
                "connected": session.slots[player_id].connected,
                "setup_submitted": session.slots[player_id].setup_submitted,
                "ready": session.slots[player_id].ready,
                "modules": public_modules,
                "module_capacity": session.engine.module_capacity_view(
                    player_id
                ),
            }

            # Ekonomi ve teklif gibi özel bilgiler yalnızca izleyenin kendisine açılır.
            if player_id == viewer_player_id:
                player_data.update(
                    {
                        "circuit_credits": player.circuit_credits,
                        "total_circuit_credits_earned": player.total_circuit_credits_earned,
                        "forfeit_credit_penalty": player.forfeit_credit_penalty,
                        "battle_pool_ids": (
                            list(player.battle_pool.module_definition_ids)
                            if player.battle_pool is not None
                            else None
                        ),
                        "last_command_sequence": session.slots[player_id].last_command_sequence,
                        "acknowledged_event_cursor": session.slots[player_id].acknowledged_event_cursor,
                        "next_booster_offer_index": player.next_booster_offer_index,
                        "pending_booster_offer": (
                            {
                                "id": player.pending_booster_offer.id,
                                "booster_ids": list(
                                    player.pending_booster_offer.booster_ids
                                ),
                                "created_at_ms": (
                                    player.pending_booster_offer.created_at_ms
                                ),
                                "eligible_target_module_ids": {
                                    booster_id: session.engine.eligible_booster_target_ids(
                                        player_id,
                                        booster_id,
                                    )
                                    for booster_id in player.pending_booster_offer.booster_ids
                                },
                            }
                            if player.pending_booster_offer is not None
                            else None
                        ),
                    }
                )

            players[player_id] = player_data

        return {
            "session_id": session_id,
            "match_type": state.match_type,
            "match_label_tr": {
                "ranked_pvp": "Dereceli PvP",
                "unranked_ai": "Derecesiz AI",
                "local_test": "Yerel Test",
            }.get(state.match_type, state.match_type),
            "season_id": state.season_id,
            "ranked_eligible": state.ranked_eligible,
            "normalized": state.normalized,
            "laboratory_effects_enabled": state.laboratory_effects_enabled,
            "viewer_player_id": viewer_player_id,
            "status": state.status.value,
            "tick": state.tick,
            "snapshot_revision": session.snapshot_revision,
            "elapsed_ms": state.elapsed_ms,
            "winner_player_id": state.winner_player_id,
            "loser_player_id": state.loser_player_id,
            "is_draw": state.is_draw,
            "finish_reason": state.finish_reason,
            "finished_at_ms": state.finished_at_ms,
            "result_summary": self._result_summary_for_viewer(
                state.result_summary,
                viewer_player_id,
            ),
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
        self._touch(session)

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
                visible_event
                for event in events[cursor:]
                if (
                    visible_event
                    := self._event_for_viewer(
                        event,
                        viewer_player_id,
                    )
                ) is not None
            ],
        }

    @staticmethod
    def _result_summary_for_viewer(
        result_summary: dict,
        viewer_player_id: str,
    ) -> dict:
        sanitized = deepcopy(result_summary)
        for player_id, summary in sanitized.items():
            if player_id == viewer_player_id or not isinstance(summary, dict):
                continue
            for field_name in PRIVATE_RESULT_FIELDS:
                summary.pop(field_name, None)
        return sanitized

    def _event_for_viewer(
        self,
        event,
        viewer_player_id: str,
    ) -> dict | None:
        data = deepcopy(event.data)
        owner_player_id = data.get("player_id")
        if (
            event.type in OWNER_ONLY_EVENT_TYPES
            and owner_player_id != viewer_player_id
        ):
            return None

        if event.type == "battle_forfeited" and owner_player_id != viewer_player_id:
            for field_name in (
                "earned_during_battle",
                "credit_penalty",
                "remaining_circuit_credits",
            ):
                data.pop(field_name, None)

        if event.type == "battle_finished" and isinstance(data.get("summary"), dict):
            data["summary"] = self._result_summary_for_viewer(
                data["summary"],
                viewer_player_id,
            )

        return {
            "type": event.type,
            "at_ms": event.at_ms,
            "data": data,
        }

    def delete_session(self, session_id: str) -> bool:
        return self._sessions.pop(session_id, None) is not None

    def cleanup_expired_sessions(self) -> tuple[str, ...]:
        now = self.now_func()
        expired: list[str] = []
        for session_id, session in tuple(self._sessions.items()):
            status = session.engine.state.status
            if status == BattleStatus.FINISHED:
                finished_at = session.finished_at or session.last_activity_at
                should_expire = now - finished_at >= self.finished_ttl_seconds
            elif status == BattleStatus.WAITING:
                should_expire = now - session.last_activity_at >= self.waiting_ttl_seconds
            else:
                any_connected = any(slot.connected for slot in session.slots.values())
                should_expire = (
                    not any_connected
                    and now - session.last_activity_at >= self.disconnected_ttl_seconds
                )
            if should_expire:
                self._sessions.pop(session_id, None)
                expired.append(session_id)
        return tuple(expired)

    def active_session_ids(self) -> tuple[str, ...]:
        return tuple(self._sessions)

    def _touch(self, session: PvPSession) -> None:
        session.last_activity_at = self.now_func()
