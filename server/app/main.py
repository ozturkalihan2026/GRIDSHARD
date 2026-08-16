from __future__ import annotations

from uuid import uuid4
import time

from fastapi import FastAPI, HTTPException, Query, WebSocket
from fastapi.websockets import WebSocketDisconnect
from pydantic import BaseModel

from .game.pvp_session import (
    PvPSessionError,
    PvPSessionService,
)
from .game.models import Direction
from .game.pvp_setup import InitialModulePlacement, PvPSetupPayload
from .game.pvp_websocket import PvPWebSocketAdapter
from .game.pvp_runner import PvPTickRunner
from .version import VERSION
from .player_profile import (
    PlayerProfileError,
    PlayerProfileService,
)
from .player_statistics import (
    PlayerStatisticsService,
)
from .player_settings import (
    PlayerSettingsError,
    PlayerSettingsService,
)
from .matchmaking import (
    MatchmakingError,
    MatchmakingService,
)
from .player_progression import (
    PlayerProgressionService,
)
from .player_data_store import (
    InMemoryPlayerDataRepository,
    PlayerDataStoreError,
    PlayerDataStoreService,
)


app = FastAPI(
    title="Project Relay PvP Gateway",
    version=VERSION,
)

pvp_service = PvPSessionService()
pvp_websocket_adapter = PvPWebSocketAdapter(
    pvp_service,
    silent_timeout_seconds=12.0,
    grace_period_seconds=15.0,
)
player_statistics_service = PlayerStatisticsService()
player_profile_service = PlayerProfileService()
player_progression_service = PlayerProgressionService(
    player_profile_service
)

def process_completed_pvp_battle(state) -> None:
    player_statistics_service.process_finished_battle(
        state
    )
    player_progression_service.process_finished_battle(
        state
    )

pvp_tick_runner = PvPTickRunner(
    pvp_service,
    pvp_websocket_adapter,
    match_finished_callback=(
        process_completed_pvp_battle
    ),
)
player_settings_service = PlayerSettingsService()
player_data_repository = InMemoryPlayerDataRepository()
player_data_store_service = PlayerDataStoreService(
    profile_service=player_profile_service,
    statistics_service=player_statistics_service,
    settings_service=player_settings_service,
    repository=player_data_repository,
)
matchmaking_service = MatchmakingService(
    now_func=time.monotonic
)


class CreateSessionRequest(BaseModel):
    session_id: str
    auto_start_when_ready: bool = False


class JoinSessionRequest(BaseModel):
    player_id: str

class InitialModuleRequest(BaseModel):
    instance_id: str
    definition_id: str
    x: int
    y: int
    direction: Direction = Direction.UP

class SetupSessionRequest(BaseModel):
    player_id: str
    battle_pool_ids: list[str]
    initial_modules: list[InitialModuleRequest]

class ReadySessionRequest(BaseModel):
    player_id: str
    ready: bool = True


class ProfileNameRequest(BaseModel):
    display_name: str


class ProfileBattlePoolRequest(BaseModel):
    battle_pool_ids: list[str]


class MatchmakingJoinRequest(BaseModel):
    player_id: str


class PlayerSettingsRequest(BaseModel):
    sound_volume: int | None = None
    music_volume: int | None = None
    vibration_enabled: bool | None = None
    graphics_quality: str | None = None
    language: str | None = None


@app.post("/player-data/{player_id}/save")
def save_player_data(
    player_id: str,
) -> dict:
    return (
        player_data_store_service
        .save_player(player_id)
        .to_dict()
    )


@app.post("/player-data/{player_id}/load")
def load_player_data(
    player_id: str,
) -> dict:
    try:
        snapshot = (
            player_data_store_service
            .load_player(player_id)
        )
    except PlayerDataStoreError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc

    return snapshot.to_dict()


@app.delete("/player-data/{player_id}")
def delete_player_data(
    player_id: str,
) -> dict:
    return {
        "player_id": player_id,
        "deleted": (
            player_data_repository
            .delete(player_id)
        ),
    }


@app.post("/matchmaking/join")
def matchmaking_join(
    request: MatchmakingJoinRequest,
) -> dict:
    profile = (
        player_profile_service
        .get_or_create(
            request.player_id
        )
    )

    matchmaking_service.enqueue(
        request.player_id,
        rating=profile.rating,
        league_name_tr=(
            profile.league_name_tr
        ),
        level=profile.level,
    )

    match = matchmaking_service.try_match(
        request.player_id
    )

    if match is None:
        return {
            "matched": False,
            "queue": (
                matchmaking_service
                .queue_snapshot(
                    request.player_id
                )
            ),
        }

    session = pvp_service.create_session(
        match.match_id,
        setup_required=True,
        auto_start_when_ready=True,
    )
    pvp_service.join(
        session.session_id,
        match.player_a_id,
    )
    pvp_service.join(
        session.session_id,
        match.player_b_id,
    )

    return {
        "matched": True,
        "session_id": session.session_id,
        "players": [
            match.player_a_id,
            match.player_b_id,
        ],
        "rating_difference": (
            match.rating_difference
        ),
    }


@app.delete("/matchmaking/{player_id}")
def matchmaking_cancel(
    player_id: str,
) -> dict:
    return {
        "player_id": player_id,
        "cancelled": (
            matchmaking_service.cancel(
                player_id
            )
        ),
    }


@app.get("/matchmaking/{player_id}")
def matchmaking_status(
    player_id: str,
) -> dict:
    return (
        matchmaking_service
        .queue_snapshot(player_id)
    )


@app.get("/settings/{player_id}")
def get_player_settings(
    player_id: str,
) -> dict:
    return (
        player_settings_service
        .get_or_create(player_id)
        .to_view()
    )


@app.put("/settings/{player_id}")
def update_player_settings(
    player_id: str,
    request: PlayerSettingsRequest,
) -> dict:
    try:
        settings = player_settings_service.update(
            player_id,
            sound_volume=request.sound_volume,
            music_volume=request.music_volume,
            vibration_enabled=(
                request.vibration_enabled
            ),
            graphics_quality=(
                request.graphics_quality
            ),
            language=request.language,
        )
    except PlayerSettingsError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    return settings.to_view()


@app.get("/progression/battles/{battle_id}/{player_id}")
def get_battle_progression(
    battle_id: str,
    player_id: str,
) -> dict:
    result = (
        player_progression_service
        .player_result(
            battle_id,
            player_id,
        )
    )

    if result is None:
        raise HTTPException(
            status_code=404,
            detail="Maç ilerleme sonucu bulunamadı.",
        )

    return result


@app.get("/statistics/{player_id}")
def get_statistics(
    player_id: str,
) -> dict:
    return (
        player_statistics_service
        .get_or_create(player_id)
        .to_view()
    )


@app.get("/profile/{player_id}")
def get_profile(
    player_id: str,
) -> dict:
    profile = player_profile_service.get_or_create(
        player_id
    )
    return profile.to_view()


@app.put("/profile/{player_id}/display-name")
def update_profile_display_name(
    player_id: str,
    request: ProfileNameRequest,
) -> dict:
    try:
        profile = player_profile_service.set_display_name(
            player_id,
            request.display_name,
        )
    except PlayerProfileError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc
    return profile.to_view()


@app.put("/profile/{player_id}/battle-pool")
def update_profile_battle_pool(
    player_id: str,
    request: ProfileBattlePoolRequest,
) -> dict:
    try:
        profile = (
            player_profile_service
            .set_preferred_battle_pool(
                player_id,
                request.battle_pool_ids,
            )
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc
    return profile.to_view()


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "version": VERSION,
    }


@app.post("/pvp/sessions")
def create_pvp_session(
    request: CreateSessionRequest,
) -> dict:
    try:
        session = pvp_service.create_session(
            request.session_id,
            setup_required=True,
            auto_start_when_ready=request.auto_start_when_ready,
        )
    except PvPSessionError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    return {
        "session_id": session.session_id,
        "status": session.engine.state.status.value,
        "player_count": len(session.slots),
    }


@app.post("/pvp/sessions/{session_id}/join")
def join_pvp_session(
    session_id: str,
    request: JoinSessionRequest,
) -> dict:
    try:
        slot = pvp_service.join(
            session_id,
            request.player_id,
        )
    except PvPSessionError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    return {
        "session_id": session_id,
        "player_id": slot.player_id,
        "slot_index": slot.slot_index,
        "connected": slot.connected,
    }


@app.post("/pvp/sessions/{session_id}/setup")
def setup_pvp_session(
    session_id: str,
    request: SetupSessionRequest,
) -> dict:
    try:
        pvp_service.submit_setup(
            session_id,
            request.player_id,
            PvPSetupPayload(
                battle_pool_ids=tuple(request.battle_pool_ids),
                initial_modules=tuple(
                    InitialModulePlacement(
                        instance_id=item.instance_id,
                        definition_id=item.definition_id,
                        x=item.x,
                        y=item.y,
                        direction=item.direction,
                    )
                    for item in request.initial_modules
                ),
            ),
        )
    except PvPSessionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        "session_id": session_id,
        "player_id": request.player_id,
        "setup_submitted": True,
        "ready": False,
    }

@app.post("/pvp/sessions/{session_id}/ready")
async def ready_pvp_session(
    session_id: str,
    request: ReadySessionRequest,
) -> dict:
    try:
        pvp_service.set_ready(
            session_id,
            request.player_id,
            request.ready,
        )
    except PvPSessionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    await pvp_tick_runner.ensure_started(session_id)
    return {
        "session_id": session_id,
        "player_id": request.player_id,
        "ready": request.ready,
    }


@app.post("/pvp/sessions/{session_id}/start")
async def start_pvp_session(
    session_id: str,
) -> dict:
    try:
        pvp_service.start(session_id)
        session = pvp_service.get_session(
            session_id
        )
        await pvp_tick_runner.ensure_started(session_id)
    except PvPSessionError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc

    return {
        "session_id": session_id,
        "status": session.engine.state.status.value,
        "tick": session.engine.state.tick,
    }


@app.get("/pvp/sessions/{session_id}/lobby")
def pvp_lobby(session_id: str) -> dict:
    try:
        return pvp_service.lobby_snapshot(session_id)
    except PvPSessionError as exc:
        raise HTTPException(status_code=404,detail=str(exc)) from exc


@app.get("/pvp/sessions/{session_id}/result")
def pvp_result(
    session_id: str,
    player_id: str = Query(min_length=1),
) -> dict:
    try:
        result = pvp_service.final_result_payload(
            session_id,
            player_id,
        )
        result["progression"] = (
            player_progression_service
            .player_result(
                session_id,
                player_id,
            )
        )
        return result
    except PvPSessionError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc


@app.get("/pvp/sessions/{session_id}/snapshot")
def pvp_snapshot(
    session_id: str,
    player_id: str = Query(min_length=1),
) -> dict:
    try:
        return pvp_service.snapshot(
            session_id,
            player_id,
        )
    except PvPSessionError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc


@app.websocket("/ws/pvp/{session_id}")
async def pvp_websocket(
    websocket: WebSocket,
    session_id: str,
    player_id: str = Query(min_length=1),
):
    connection_id = str(uuid4())
    connected = False

    try:
        await pvp_websocket_adapter.connect(
            connection_id=connection_id,
            session_id=session_id,
            player_id=player_id,
            socket=websocket,
        )
        connected = True

        # Bağlantı açılışında güvenli reconnect durumu gönderilir.
        reconnect_payload = (
            pvp_service.reconnect_payload(
                session_id,
                player_id,
            )
        )
        await websocket.send_json(
            {
                "version": 1,
                "type": "reconnect_state",
                "request_id": "server-connect",
                "payload": reconnect_payload,
            }
        )

        while True:
            await pvp_websocket_adapter.handle_one(connection_id)
            await pvp_tick_runner.ensure_started(session_id)

    except WebSocketDisconnect:
        pass
    except PvPSessionError as exc:
        if not connected:
            await websocket.close(
                code=4404,
                reason=str(exc),
            )
    finally:
        if connected:
            try:
                await pvp_websocket_adapter.connection_lost(
                    connection_id
                )
            except PvPSessionError:
                pass
