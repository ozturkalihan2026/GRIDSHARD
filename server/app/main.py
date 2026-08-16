from __future__ import annotations

from uuid import uuid4

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
pvp_tick_runner = PvPTickRunner(
    pvp_service,
    pvp_websocket_adapter,
    match_finished_callback=(
        player_statistics_service
        .process_finished_battle
    ),
)
player_profile_service = PlayerProfileService()


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
        return pvp_service.final_result_payload(
            session_id,
            player_id,
        )
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
