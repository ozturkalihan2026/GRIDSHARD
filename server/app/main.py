from __future__ import annotations

from uuid import uuid4
import time
import os
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException, Query, WebSocket
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
    JsonFilePlayerDataRepository,
    PlayerDataStoreError,
    PlayerDataStoreService,
)
from .telemetry import (
    InMemoryTelemetryService,
    JsonFileTelemetryRepository,
    TelemetryError,
    TelemetryEvent,
)
from .web_test import (
    build_web_test_readiness,
)
from .web_test_metrics import (
    WebTestKpiService,
)
from .release_check import (
    build_release_check,
)
from .build_manifest import (
    build_manifest,
)
from .web_test_rc_report import (
    build_rc_report,
)
from .web_test_operation_readiness import (
    build_operation_readiness,
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
DEFAULT_TELEMETRY_PATH = (
    Path(__file__).resolve()
    .parent.parent
    / "data"
    / "web_test_telemetry.json"
)
TELEMETRY_PATH = Path(
    os.environ.get(
        "RELAY_TELEMETRY_PATH",
        str(DEFAULT_TELEMETRY_PATH),
    )
)
TELEMETRY_MAX_EVENTS = int(
    os.environ.get(
        "RELAY_TELEMETRY_MAX_EVENTS",
        "50000",
    )
)
telemetry_repository = (
    JsonFileTelemetryRepository(
        TELEMETRY_PATH,
        max_events=
            TELEMETRY_MAX_EVENTS,
    )
)
telemetry_service = InMemoryTelemetryService(
    repository=telemetry_repository
)
web_test_kpi_service = WebTestKpiService(
    telemetry_service
)

def process_completed_pvp_battle(state) -> None:
    player_statistics_service.process_finished_battle(
        state
    )
    player_progression_service.process_finished_battle(
        state
    )
    telemetry_service.ingest_finished_battle(
        state
    )

    for player_id in state.players:
        persist_player_data(
            player_id
        )

pvp_tick_runner = PvPTickRunner(
    pvp_service,
    pvp_websocket_adapter,
    match_finished_callback=(
        process_completed_pvp_battle
    ),
)
player_settings_service = PlayerSettingsService()

DEFAULT_PLAYER_DATA_PATH = (
    Path(__file__).resolve()
    .parent.parent
    / "data"
    / "web_test_players.json"
)
PLAYER_DATA_PATH = Path(
    os.environ.get(
        "RELAY_PLAYER_DATA_PATH",
        str(DEFAULT_PLAYER_DATA_PATH),
    )
)

player_data_repository = (
    JsonFilePlayerDataRepository(
        PLAYER_DATA_PATH
    )
)
player_data_store_service = PlayerDataStoreService(
    profile_service=player_profile_service,
    statistics_service=player_statistics_service,
    settings_service=player_settings_service,
    repository=player_data_repository,
)
matchmaking_service = MatchmakingService(
    now_func=time.monotonic
)


def persist_player_data(
    player_id: str,
) -> None:
    player_data_store_service.save_player(
        player_id
    )


def player_data_persistence_health() -> dict:
    return (
        player_data_repository
        .health()
    )


def telemetry_persistence_health() -> dict:
    return (
        telemetry_repository
        .health()
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


class TelemetryEventRequest(BaseModel):
    event_id: str
    event_type: str
    timestamp_ms: int
    player_id: str | None = None
    session_id: str | None = None
    metadata: dict | None = None


class PlayerSettingsRequest(BaseModel):
    sound_volume: int | None = None
    music_volume: int | None = None
    vibration_enabled: bool | None = None
    graphics_quality: str | None = None
    language: str | None = None


@app.post("/telemetry/events")
def record_telemetry_event(
    request: TelemetryEventRequest,
) -> dict:
    try:
        accepted = telemetry_service.record(
            TelemetryEvent(
                event_id=request.event_id,
                event_type=request.event_type,
                timestamp_ms=request.timestamp_ms,
                player_id=request.player_id,
                session_id=request.session_id,
                metadata=dict(request.metadata or {}),
            )
        )
    except TelemetryError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    return {
        "accepted": accepted,
        "duplicate": not accepted,
    }


@app.get("/telemetry/events")
def get_telemetry_events(
    player_id: str | None = None,
    session_id: str | None = None,
    event_type: str | None = None,
) -> dict:
    return {
        "events": telemetry_service.events(
            player_id=player_id,
            session_id=session_id,
            event_type=event_type,
        )
    }


@app.get("/telemetry/kpis")
def get_telemetry_kpis(
    player_id: str | None = None,
) -> dict:
    return (
        web_test_kpi_service
        .snapshot(
            player_id=player_id
        )
    )


@app.get("/telemetry/summary")
def get_telemetry_summary(
    player_id: str | None = None,
    session_id: str | None = None,
) -> dict:
    return telemetry_service.summary(
        player_id=player_id,
        session_id=session_id,
    )


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
    existing_match = (
        matchmaking_service
        .matched_pair_for(
            request.player_id
        )
    )
    if existing_match is not None:
        return {
            "matched": True,
            "session_id": (
                existing_match.match_id
            ),
            "players": [
                existing_match.player_a_id,
                existing_match.player_b_id,
            ],
            "rating_difference": (
                existing_match
                .rating_difference
            ),
        }

    profile = (
        player_profile_service
        .get_or_create(
            request.player_id
        )
    )

    queue_entry = matchmaking_service.enqueue(
        request.player_id,
        rating=profile.rating,
        league_name_tr=(
            profile.league_name_tr
        ),
        level=profile.level,
    )

    telemetry_service.record_now(
        event_id=(
            f"server:matchmaking:"
            f"{request.player_id}:"
            f"{round(queue_entry.joined_at * 1000)}"
        ),
        event_type="matchmaking_started",
        player_id=request.player_id,
        metadata={
            "rating": profile.rating,
            "league_name_tr": profile.league_name_tr,
            "level": profile.level,
        },
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

    for matched_player_id in (
        match.player_a_id,
        match.player_b_id,
    ):
        telemetry_service.record_now(
            event_id=(
                f"server:{session.session_id}:"
                f"matchmaking_matched:"
                f"{matched_player_id}"
            ),
            event_type="matchmaking_matched",
            player_id=matched_player_id,
            session_id=session.session_id,
            metadata={
                "rating_difference": match.rating_difference,
            },
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

    persist_player_data(
        player_id
    )
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


@app.get("/post-match/{battle_id}/{player_id}")
def get_post_match_sync(
    battle_id: str,
    player_id: str,
) -> dict:
    progression = (
        player_progression_service
        .player_result(
            battle_id,
            player_id,
        )
    )
    if progression is None:
        raise HTTPException(
            status_code=404,
            detail="Maç sonu ilerleme sonucu bulunamadı.",
        )

    return {
        "battle_id": battle_id,
        "player_id": player_id,
        "progression": progression,
        "profile": (
            player_profile_service
            .get_or_create(
                player_id
            )
            .to_view()
        ),
        "statistics": (
            player_statistics_service
            .get_or_create(
                player_id
            )
            .to_view()
        ),
    }


@app.get("/statistics/{player_id}")
def get_statistics(
    player_id: str,
) -> dict:
    return (
        player_statistics_service
        .get_or_create(player_id)
        .to_view()
    )


@app.post("/participants/{player_id}/bootstrap")
def bootstrap_test_participant(
    player_id: str,
) -> dict:
    player_already_loaded = (
        player_id
        in player_profile_service._profiles
        or player_id
        in player_statistics_service._statistics
        or player_id
        in player_settings_service._settings
    )

    stored_snapshot = None

    if not player_already_loaded:
        stored_snapshot = (
            player_data_repository
            .load(player_id)
        )

        if stored_snapshot is not None:
            (
                player_data_store_service
                .load_player(
                    player_id
                )
            )

    profile = (
        player_profile_service
        .get_or_create(
            player_id
        )
    )
    statistics = (
        player_statistics_service
        .get_or_create(
            player_id
        )
    )
    settings = (
        player_settings_service
        .get_or_create(
            player_id
        )
    )

    if (
        stored_snapshot is None
        or player_already_loaded
    ):
        persist_player_data(
            player_id
        )

    return {
        "player_id": player_id,
        "identity": {
            "kind":
                "web_test_participant",
            "player_id":
                player_id,
        },
        "profile": profile.to_view(),
        "statistics":
            statistics.to_view(),
        "settings":
            settings.to_view(),
    }


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
    persist_player_data(
        player_id
    )
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
    persist_player_data(
        player_id
    )
    return profile.to_view()


@app.get("/health")
def health() -> dict:
    player_persistence = (
        player_data_persistence_health()
    )
    telemetry_persistence = (
        telemetry_persistence_health()
    )
    readiness = build_web_test_readiness(
        version=VERSION,
        telemetry_service=telemetry_service,
        persistence_ready=bool(
            player_persistence["ready"]
        ),
        telemetry_persistence_ready=bool(
            telemetry_persistence["ready"]
        ),
    )

    return {
        "status":
            (
                "ok"
                if readiness.ready
                else "degraded"
            ),
        "version": VERSION,
        "persistence": {
            "player_data":
                player_persistence,
            "telemetry":
                telemetry_persistence,
        },
        "web_test": readiness.to_dict(),
    }


@app.get("/web-test/data-health")
def web_test_data_health() -> dict:
    player_data = (
        player_data_persistence_health()
    )
    telemetry = (
        telemetry_persistence_health()
    )

    player_backup = dict(
        player_data.get(
            "backup",
            {},
        )
    )
    telemetry_backup = dict(
        telemetry.get(
            "backup",
            {},
        )
    )

    return {
        "ready": bool(
            player_data.get(
                "ready"
            )
            and telemetry.get(
                "ready"
            )
        ),
        "player_data": {
            "state":
                player_data.get(
                    "state"
                ),
            "ready":
                bool(
                    player_data.get(
                        "ready"
                    )
                ),
            "player_count":
                int(
                    player_data.get(
                        "player_count",
                        0,
                    )
                ),
            "backup_available":
                bool(
                    player_backup.get(
                        "available"
                    )
                ),
            "backup_ready":
                bool(
                    player_backup.get(
                        "ready"
                    )
                ),
        },
        "telemetry": {
            "state":
                telemetry.get(
                    "state"
                ),
            "ready":
                bool(
                    telemetry.get(
                        "ready"
                    )
                ),
            "event_count":
                int(
                    telemetry.get(
                        "event_count",
                        0,
                    )
                ),
            "retention_limit":
                int(
                    telemetry.get(
                        "retention_limit",
                        TELEMETRY_MAX_EVENTS,
                    )
                ),
            "retention_active":
                bool(
                    telemetry.get(
                        "retention_active"
                    )
                ),
            "backup_available":
                bool(
                    telemetry_backup.get(
                        "available"
                    )
                ),
            "backup_ready":
                bool(
                    telemetry_backup.get(
                        "ready"
                    )
                ),
        },
    }


@app.get("/web-test/operation-readiness")
def web_test_operation_readiness() -> dict:
    player_data = (
        player_data_persistence_health()
    )
    telemetry = (
        telemetry_persistence_health()
    )

    data_health = web_test_data_health()

    manifest = build_manifest(
        version=VERSION,
        telemetry_service=telemetry_service,
        persistence_ready=bool(
            player_data["ready"]
        ),
        telemetry_persistence_ready=bool(
            telemetry["ready"]
        ),
    )

    rc_report = build_rc_report(
        version=VERSION,
        telemetry_service=telemetry_service,
        persistence_ready=bool(
            player_data["ready"]
        ),
        telemetry_persistence_ready=bool(
            telemetry["ready"]
        ),
    )

    return build_operation_readiness(
        manifest=manifest,
        data_health=data_health,
        rc_report=rc_report,
    )


@app.get("/web-test/status")
def web_test_status() -> dict:
    player_persistence = (
        player_data_persistence_health()
    )
    telemetry_persistence = (
        telemetry_persistence_health()
    )
    return build_web_test_readiness(
        version=VERSION,
        telemetry_service=telemetry_service,
        persistence_ready=bool(
            player_persistence["ready"]
        ),
        telemetry_persistence_ready=bool(
            telemetry_persistence["ready"]
        ),
    ).to_dict()


@app.get("/web-test/release-check")
def web_test_release_check() -> dict:
    player_persistence = (
        player_data_persistence_health()
    )
    telemetry_persistence = (
        telemetry_persistence_health()
    )
    return build_release_check(
        version=VERSION,
        telemetry_service=telemetry_service,
        persistence_ready=bool(
            player_persistence["ready"]
        ),
        telemetry_persistence_ready=bool(
            telemetry_persistence["ready"]
        ),
    ).to_dict()


@app.get("/web-test/manifest")
def web_test_manifest() -> dict:
    player_persistence = (
        player_data_persistence_health()
    )
    telemetry_persistence = (
        telemetry_persistence_health()
    )
    return build_manifest(
        version=VERSION,
        telemetry_service=telemetry_service,
        persistence_ready=bool(
            player_persistence["ready"]
        ),
        telemetry_persistence_ready=bool(
            telemetry_persistence["ready"]
        ),
    )


@app.get("/web-test/rc-report")
def web_test_rc_report() -> dict:
    player_persistence = (
        player_data_persistence_health()
    )
    telemetry_persistence = (
        telemetry_persistence_health()
    )
    return build_rc_report(
        version=VERSION,
        telemetry_service=telemetry_service,
        persistence_ready=bool(
            player_persistence["ready"]
        ),
        telemetry_persistence_ready=bool(
            telemetry_persistence["ready"]
        ),
    )


@app.post("/web-test/telemetry/restore-backup")
def restore_web_test_telemetry_backup(
    x_relay_admin_token: str | None = Header(
        default=None,
    ),
) -> dict:
    expected_token = os.environ.get(
        "RELAY_WEB_TEST_ADMIN_TOKEN"
    )

    if not expected_token:
        raise HTTPException(
            status_code=503,
            detail=(
                "Web test veri kurtarma yönetici anahtarı yapılandırılmamış."
            ),
        )

    if (
        not x_relay_admin_token
        or x_relay_admin_token
        != expected_token
    ):
        raise HTTPException(
            status_code=403,
            detail="Web test telemetri kurtarma yetkisi reddedildi.",
        )

    before = (
        telemetry_persistence_health()
    )

    if before["ready"]:
        raise HTTPException(
            status_code=409,
            detail=(
                "Kalıcı telemetri zaten sağlıklı; restore uygulanmadı."
            ),
        )

    backup = before.get(
        "backup",
        {},
    )
    if not backup.get(
        "ready",
        False,
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Kullanılabilir sağlam telemetri yedeği bulunamadı."
            ),
        )

    if not telemetry_repository.restore_backup():
        raise HTTPException(
            status_code=409,
            detail="Telemetri yedeği geri yüklenemedi.",
        )

    event_count = (
        telemetry_service
        .reload_from_repository()
    )

    after = (
        telemetry_persistence_health()
    )
    if not after["ready"]:
        raise HTTPException(
            status_code=500,
            detail=(
                "Telemetri yedeği geri yüklendi ancak health doğrulanamadı."
            ),
        )

    kpis = (
        web_test_kpi_service
        .snapshot()
    )

    return {
        "restored": True,
        "event_count": event_count,
        "before": before,
        "after": after,
        "kpis": kpis,
    }


@app.post("/web-test/persistence/restore-backup")
def restore_web_test_persistence_backup(
    x_relay_admin_token: str | None = Header(
        default=None,
    ),
) -> dict:
    expected_token = os.environ.get(
        "RELAY_WEB_TEST_ADMIN_TOKEN"
    )

    if not expected_token:
        raise HTTPException(
            status_code=503,
            detail=(
                "Web test veri kurtarma yönetici anahtarı yapılandırılmamış."
            ),
        )

    if (
        not x_relay_admin_token
        or x_relay_admin_token
        != expected_token
    ):
        raise HTTPException(
            status_code=403,
            detail="Web test veri kurtarma yetkisi reddedildi.",
        )

    before = (
        player_data_persistence_health()
    )

    if before["ready"]:
        raise HTTPException(
            status_code=409,
            detail=(
                "Kalıcı oyuncu verisi zaten sağlıklı; restore uygulanmadı."
            ),
        )

    backup = before.get(
        "backup",
        {},
    )
    if not backup.get(
        "ready",
        False,
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Kullanılabilir sağlam oyuncu veri yedeği bulunamadı."
            ),
        )

    restored = (
        player_data_repository
        .restore_backup()
    )
    if not restored:
        raise HTTPException(
            status_code=409,
            detail="Oyuncu veri yedeği geri yüklenemedi.",
        )

    after = (
        player_data_persistence_health()
    )
    if not after["ready"]:
        raise HTTPException(
            status_code=500,
            detail=(
                "Yedek geri yüklendi ancak persistence health doğrulanamadı."
            ),
        )

    # Eski bozuk süreç state'i yeni sağlam dosyayı gölgelememeli.
    player_profile_service._profiles.clear()
    player_statistics_service._statistics.clear()
    player_settings_service._settings.clear()

    return {
        "restored": True,
        "before": before,
        "after": after,
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
