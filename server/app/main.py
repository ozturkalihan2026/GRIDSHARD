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
from .game.catalog_view import (
    build_module_catalog_view,
)
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
from .web_test_static import (
    NoCacheStaticFiles,
)
from .web_test_metrics import (
    WebTestKpiService,
)
from .release_check import (
    build_release_check,
)
from .balance_change_plan import (
    build_balance_change_plan,
)
from .balance_simulation import (
    BalanceSimulationError,
    run_balance_simulation,
)
from .balance_regression import (
    BalanceRegressionError,
    is_structural_regression_area,
    run_balance_regression,
)
from .balance_change_drafts import (
    BalanceChangeDraftError,
    BalanceChangeDraftService,
    JsonBalanceChangeDraftRepository,
    build_human_review_queue,
)
from .battle_pool_presets import (
    BattlePoolPresetError,
    BattlePoolPresetService,
    JsonBattlePoolPresetRepository,
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
from .web_test_go_no_go import (
    build_go_no_go,
)
from .web_test_rc_candidate import (
    build_rc_candidate_summary,
)
from .web_test_launch import (
    build_launch_snapshot,
)
from .web_test_checklist import (
    build_first_run_checklist,
)
from .web_test_preflight import (
    build_preflight_report,
)
from .web_test_run_consistency import (
    build_run_started_consistency,
)
from .web_test_operation_status import (
    build_operation_status,
)
from .web_test_stability import (
    build_operation_stability,
)
from .web_test_monitoring import (
    build_monitoring_summary,
)
from .web_test_post_run import (
    build_post_run_report,
)
from .web_test_feedback import (
    build_feedback_summary,
    normalize_feedback_note,
    validate_feedback_rating,
)
from .web_test_findings import (
    build_beta_findings,
)
from .web_test_review import (
    build_review_candidates,
)
from .manual_battle_report import (
    build_manual_battle_report,
)
from .web_test_run import (
    build_operation_history_summary,
    build_operation_transition_summary,
    build_stability_history_summary,
    build_test_run_catalog,
    build_test_run_go_no_go,
    build_test_run_summary,
    compare_test_runs,
)


app = FastAPI(
    title="GRIDSHARD PvP Gateway",
    version=VERSION,
)

CLIENT_DIR = (
    Path(__file__).resolve()
    .parents[2]
    / "client"
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
WEB_TEST_RUN_ID = os.environ.get(
    "RELAY_WEB_TEST_RUN_ID",
    "web-test-beta.13",
).strip() or "web-test-beta.13"

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
DEFAULT_BATTLE_POOL_PRESET_PATH = (
    PLAYER_DATA_PATH.with_name(
        "web_test_battle_pool_presets.json"
    )
)
BATTLE_POOL_PRESET_PATH = Path(
    os.environ.get(
        "RELAY_BATTLE_POOL_PRESET_PATH",
        str(
            DEFAULT_BATTLE_POOL_PRESET_PATH
        ),
    )
)
battle_pool_preset_repository = (
    JsonBattlePoolPresetRepository(
        BATTLE_POOL_PRESET_PATH
    )
)
battle_pool_preset_service = (
    BattlePoolPresetService(
        battle_pool_preset_repository
    )
)

DEFAULT_BALANCE_CHANGE_DRAFT_PATH = (
    PLAYER_DATA_PATH.with_name(
        "web_test_balance_change_drafts.json"
    )
)
BALANCE_CHANGE_DRAFT_PATH = Path(
    os.environ.get(
        "RELAY_BALANCE_CHANGE_DRAFT_PATH",
        str(
            DEFAULT_BALANCE_CHANGE_DRAFT_PATH
        ),
    )
)
balance_change_draft_repository = (
    JsonBalanceChangeDraftRepository(
        BALANCE_CHANGE_DRAFT_PATH
    )
)
balance_change_draft_service = (
    BalanceChangeDraftService(
        balance_change_draft_repository
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


class BattlePoolPresetRequest(BaseModel):
    name: str
    battle_pool_ids: list[str]


class BattlePoolPresetRenameRequest(BaseModel):
    old_name: str
    new_name: str


class BattlePoolPresetMetaRequest(BaseModel):
    favorite: bool | None = None
    mark_used: bool = False


class BalanceChangeDraftItemRequest(BaseModel):
    area: str
    before_value: float | int | str | None = None
    proposed_value: float | int | str | None = None
    approved: bool = False
    simulation_status: str = "pending"
    regression_status: str = "pending"


class BalanceSimulationRequest(BaseModel):
    area: str


class MatchmakingJoinRequest(BaseModel):
    player_id: str


class WebTestSessionAuditRequest(BaseModel):
    player_id: str
    matchmaking_started_at_ms: int


class WebTestSessionAuditBindRequest(BaseModel):
    audit_event_id: str
    session_id: str


class WebTestSessionAuditFinishRequest(BaseModel):
    audit_event_id: str
    session_id: str


class WebTestLaunchAttemptRequest(BaseModel):
    player_id: str
    attempted_at_ms: int


class WebTestRunStartRequest(BaseModel):
    test_run_id: str


class WebTestRunFinishRequest(BaseModel):
    test_run_id: str


class WebTestFeedbackRequest(BaseModel):
    test_run_id: str
    submitted_at_ms: int
    usability: int
    connection: int
    battle_balance: int
    module_booster_balance: int
    note: str | None = None


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
    sound_muted: bool | None = None
    music_muted: bool | None = None
    vibration_enabled: bool | None = None
    graphics_quality: str | None = None
    language: str | None = None


@app.post("/web-test/audit/session-start")
def record_web_test_session_start_audit(
    request: WebTestSessionAuditRequest,
) -> dict:
    player_persistence = (
        player_data_persistence_health()
    )
    telemetry_persistence = (
        telemetry_persistence_health()
    )

    manifest = build_manifest(
        version=VERSION,
        telemetry_service=telemetry_service,
        persistence_ready=bool(
            player_persistence["ready"]
        ),
        telemetry_persistence_ready=bool(
            telemetry_persistence["ready"]
        ),
        test_run_id=
            WEB_TEST_RUN_ID,
    )

    data_health = web_test_data_health()
    rc_report = build_rc_report(
        version=VERSION,
        telemetry_service=telemetry_service,
        persistence_ready=bool(
            player_persistence["ready"]
        ),
        telemetry_persistence_ready=bool(
            telemetry_persistence["ready"]
        ),
        test_run_id=
            WEB_TEST_RUN_ID,
    )
    operation = build_operation_readiness(
        manifest=manifest,
        data_health=data_health,
        rc_report=rc_report,
    )

    event_id = (
        "web-test-audit-"
        + request.player_id
        + "-"
        + str(
            request.matchmaking_started_at_ms
        )
    )

    accepted = telemetry_service.record(
        TelemetryEvent(
            event_id=event_id,
            event_type=
                "web_test_session_started",
            timestamp_ms=
                request.matchmaking_started_at_ms,
            player_id=
                request.player_id,
            metadata={
                "build":
                    manifest[
                        "web_test_build"
                    ],
                "server_version":
                    manifest[
                        "server_version"
                    ],
                "pvp_protocol_version":
                    manifest[
                        "pvp_protocol_version"
                    ],
                "operation_ready":
                    operation[
                        "ready"
                    ],
                "release_ready":
                    manifest[
                        "release_ready"
                    ],
                "player_data_ready":
                    data_health[
                        "player_data"
                    ][
                        "ready"
                    ],
                "telemetry_ready":
                    data_health[
                        "telemetry"
                    ][
                        "ready"
                    ],
                "retention_limit":
                    data_health[
                        "telemetry"
                    ][
                        "retention_limit"
                    ],
                "test_run_id":
                    WEB_TEST_RUN_ID,
            },
        )
    )

    return {
        "accepted": accepted,
        "duplicate":
            not accepted,
        "audit_event_id":
            event_id,
        "test_run_id":
            WEB_TEST_RUN_ID,
    }


@app.post("/web-test/audit/session-bind")
def bind_web_test_session_audit(
    request: WebTestSessionAuditBindRequest,
) -> dict:
    source = None

    for event in telemetry_service.events(
        event_type=
            "web_test_session_started",
    ):
        if (
            event["event_id"]
            == request.audit_event_id
        ):
            source = event
            break

    if source is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Bağlanacak Web test audit başlangıç kaydı bulunamadı."
            ),
        )

    bound_event_id = (
        request.audit_event_id
        + "-bound-"
        + request.session_id
    )

    accepted = telemetry_service.record(
        TelemetryEvent(
            event_id=
                bound_event_id,
            event_type=
                "web_test_session_bound",
            timestamp_ms=
                int(
                    time.time()
                    * 1000
                ),
            player_id=
                source.get(
                    "player_id"
                ),
            session_id=
                request.session_id,
            metadata={
                "audit_event_id":
                    request.audit_event_id,
                "test_run_id":
                    source.get(
                        "metadata",
                        {},
                    ).get(
                        "test_run_id",
                        WEB_TEST_RUN_ID,
                    ),
            },
        )
    )

    return {
        "accepted": accepted,
        "duplicate":
            not accepted,
        "bound_event_id":
            bound_event_id,
        "session_id":
            request.session_id,
    }


@app.post("/web-test/audit/session-finish")
def finish_web_test_session_audit(
    request: WebTestSessionAuditFinishRequest,
) -> dict:
    bound = None

    for event in telemetry_service.events(
        event_type=
            "web_test_session_bound",
    ):
        if (
            event["metadata"].get(
                "audit_event_id"
            )
            == request.audit_event_id
            and event["session_id"]
            == request.session_id
        ):
            bound = event
            break

    if bound is None:
        raise HTTPException(
            status_code=404,
            detail=(
                "Tamamlanacak Web test audit-session bağı bulunamadı."
            ),
        )

    finished_event_id = (
        request.audit_event_id
        + "-finished-"
        + request.session_id
    )

    accepted = telemetry_service.record(
        TelemetryEvent(
            event_id=
                finished_event_id,
            event_type=
                "web_test_session_finished",
            timestamp_ms=
                int(
                    time.time()
                    * 1000
                ),
            player_id=
                bound.get(
                    "player_id"
                ),
            session_id=
                request.session_id,
            metadata={
                "audit_event_id":
                    request.audit_event_id,
                "technical_completed":
                    True,
                "test_run_id":
                    bound.get(
                        "metadata",
                        {},
                    ).get(
                        "test_run_id",
                        WEB_TEST_RUN_ID,
                    ),
            },
        )
    )

    return {
        "accepted": accepted,
        "duplicate":
            not accepted,
        "finished_event_id":
            finished_event_id,
        "session_id":
            request.session_id,
    }


@app.post("/web-test/audit/launch-attempt")
def record_web_test_launch_attempt(
    request: WebTestLaunchAttemptRequest,
) -> dict:
    launch = (
        web_test_launch_readiness()
    )

    event_id = (
        "web-test-launch-"
        + request.player_id
        + "-"
        + str(
            request.attempted_at_ms
        )
    )

    accepted = telemetry_service.record(
        TelemetryEvent(
            event_id=
                event_id,
            event_type=
                "web_test_launch_attempted",
            timestamp_ms=
                request.attempted_at_ms,
            player_id=
                request.player_id,
            metadata={
                "test_run_id":
                    WEB_TEST_RUN_ID,
                "launch_ready":
                    bool(
                        launch[
                            "launch_ready"
                        ]
                    ),
                "failed_checks":
                    list(
                        launch[
                            "failed_checks"
                        ]
                    ),
            },
        )
    )

    return {
        "accepted":
            accepted,
        "duplicate":
            not accepted,
        "launch_ready":
            bool(
                launch[
                    "launch_ready"
                ]
            ),
        "failed_checks":
            list(
                launch[
                    "failed_checks"
                ]
            ),
        "test_run_id":
            WEB_TEST_RUN_ID,
    }


@app.post("/web-test/audit/checklist-snapshot")
def record_web_test_checklist_snapshot() -> dict:
    checklist = (
        web_test_first_run_checklist()
    )
    timestamp_ms = int(
        time.time()
        * 1000
    )
    event_id = (
        "web-test-checklist-"
        + WEB_TEST_RUN_ID
        + "-"
        + str(timestamp_ms)
    )

    accepted = telemetry_service.record(
        TelemetryEvent(
            event_id=event_id,
            event_type=
                "web_test_checklist_snapshot",
            timestamp_ms=
                timestamp_ms,
            metadata={
                "test_run_id":
                    WEB_TEST_RUN_ID,
                "checklist_ready":
                    bool(
                        checklist[
                            "ready"
                        ]
                    ),
                "failed_checks":
                    list(
                        checklist[
                            "failed_checks"
                        ]
                    ),
                "note_count":
                    len(
                        checklist[
                            "notes"
                        ]
                    ),
            },
        )
    )

    return {
        "accepted":
            accepted,
        "test_run_id":
            WEB_TEST_RUN_ID,
        "checklist_ready":
            bool(
                checklist[
                    "ready"
                ]
            ),
        "failed_checks":
            list(
                checklist[
                    "failed_checks"
                ]
            ),
        "note_count":
            len(
                checklist[
                    "notes"
                ]
            ),
    }


@app.post("/web-test/audit/preflight-snapshot")
def record_web_test_preflight_snapshot() -> dict:
    preflight = (
        web_test_preflight()
    )
    timestamp_ms = int(
        time.time()
        * 1000
    )
    event_id = (
        "web-test-preflight-"
        + WEB_TEST_RUN_ID
        + "-"
        + str(timestamp_ms)
    )

    operational = (
        preflight.get(
            "operational_kpis",
            {},
        )
    )

    accepted = telemetry_service.record(
        TelemetryEvent(
            event_id=event_id,
            event_type=
                "web_test_preflight_snapshot",
            timestamp_ms=
                timestamp_ms,
            metadata={
                "test_run_id":
                    WEB_TEST_RUN_ID,
                "preflight_ready":
                    bool(
                        preflight[
                            "preflight_ready"
                        ]
                    ),
                "failed_checks":
                    list(
                        preflight[
                            "failed_checks"
                        ]
                    ),
                "checklist_snapshots":
                    int(
                        operational.get(
                            "checklist_snapshots",
                            0,
                        )
                    ),
                "launch_attempts":
                    int(
                        operational.get(
                            "launch_attempts",
                            0,
                        )
                    ),
            },
        )
    )

    return {
        "accepted":accepted,
        "test_run_id":
            WEB_TEST_RUN_ID,
        "preflight_ready":
            bool(
                preflight[
                    "preflight_ready"
                ]
            ),
        "failed_checks":
            list(
                preflight[
                    "failed_checks"
                ]
            ),
    }


@app.post("/web-test/test-run/start")
def start_web_test_run(
    request: WebTestRunStartRequest,
) -> dict:
    if (
        request.test_run_id
        != WEB_TEST_RUN_ID
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "İstenen test koşusu aktif Web test koşusuyla eşleşmiyor."
            ),
        )

    preflight = (
        web_test_preflight()
    )

    if not preflight.get(
        "preflight_ready"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Gerçek Web testi preflight hazır olmadan başlatılamaz."
            ),
        )

    event_id = (
        "web-test-run-started-"
        + WEB_TEST_RUN_ID
    )

    accepted = telemetry_service.record(
        TelemetryEvent(
            event_id=event_id,
            event_type=
                "web_test_run_started",
            timestamp_ms=
                int(
                    time.time()
                    * 1000
                ),
            metadata={
                "test_run_id":
                    WEB_TEST_RUN_ID,
                "preflight_ready":
                    True,
                "build":
                    "web-test-beta.13",
            },
        )
    )

    return {
        "started":True,
        "accepted":
            accepted,
        "duplicate":
            not accepted,
        "test_run_id":
            WEB_TEST_RUN_ID,
        "build":
            "web-test-beta.13",
    }


@app.post("/web-test/test-run/finish")
def finish_web_test_run(
    request: WebTestRunFinishRequest,
) -> dict:
    if (
        request.test_run_id
        != WEB_TEST_RUN_ID
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "İstenen test koşusu aktif Web test koşusuyla eşleşmiyor."
            ),
        )

    status = web_test_run_status()

    if not status.get("started"):
        raise HTTPException(
            status_code=409,
            detail=(
                "Başlatılmamış Web test koşusu tamamlanamaz."
            ),
        )

    # Final gözlem snapshot'larını koşu bitmeden kaydet.
    record_web_test_operation_snapshot()
    record_web_test_stability_snapshot()

    event_id = (
        "web-test-run-finished-"
        + WEB_TEST_RUN_ID
    )

    accepted = telemetry_service.record(
        TelemetryEvent(
            event_id=event_id,
            event_type=
                "web_test_run_finished",
            timestamp_ms=
                int(
                    time.time()
                    * 1000
                ),
            metadata={
                "test_run_id":
                    WEB_TEST_RUN_ID,
                "build":
                    "web-test-beta.13",
            },
        )
    )

    return {
        "finished":True,
        "accepted":
            accepted,
        "duplicate":
            not accepted,
        "test_run_id":
            WEB_TEST_RUN_ID,
        "build":
            "web-test-beta.13",
    }


@app.post("/web-test/feedback")
def submit_web_test_feedback(
    request: WebTestFeedbackRequest,
) -> dict:
    if (
        request.test_run_id
        != WEB_TEST_RUN_ID
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Geri bildirim aktif Web test koşusuyla eşleşmiyor."
            ),
        )

    status = web_test_run_status()

    if not status.get(
        "finished"
    ):
        raise HTTPException(
            status_code=409,
            detail=(
                "Geri bildirim yalnızca tamamlanmış Web test koşusu için gönderilebilir."
            ),
        )

    try:
        usability = (
            validate_feedback_rating(
                request.usability,
                field_name=
                    "Kullanılabilirlik",
            )
        )
        connection = (
            validate_feedback_rating(
                request.connection,
                field_name=
                    "Bağlantı deneyimi",
            )
        )
        battle_balance = (
            validate_feedback_rating(
                request.battle_balance,
                field_name=
                    "Savaş dengesi",
            )
        )
        module_booster_balance = (
            validate_feedback_rating(
                request.module_booster_balance,
                field_name=
                    "Modül/güçlendirici dengesi",
            )
        )
        note = normalize_feedback_note(
            request.note
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    event_id = (
        "web-test-feedback-"
        + WEB_TEST_RUN_ID
        + "-"
        + str(
            request.submitted_at_ms
        )
    )

    accepted = telemetry_service.record(
        TelemetryEvent(
            event_id=event_id,
            event_type=
                "web_test_feedback_submitted",
            timestamp_ms=
                request.submitted_at_ms,
            metadata={
                "test_run_id":
                    WEB_TEST_RUN_ID,
                "usability":
                    usability,
                "connection":
                    connection,
                "battle_balance":
                    battle_balance,
                "module_booster_balance":
                    module_booster_balance,
                "has_note":
                    bool(note),
                "note":
                    note,
            },
        )
    )

    return {
        "accepted":
            accepted,
        "duplicate":
            not accepted,
        "test_run_id":
            WEB_TEST_RUN_ID,
    }


@app.get("/web-test/feedback/summary")
def web_test_feedback_summary() -> dict:
    return build_feedback_summary(
        telemetry_service=
            telemetry_service,
        test_run_id=
            WEB_TEST_RUN_ID,
    )


@app.get("/web-test/findings")
def web_test_findings() -> dict:
    feedback = (
        web_test_feedback_summary()
    )

    return build_beta_findings(
        telemetry_service=
            telemetry_service,
        test_run_id=
            WEB_TEST_RUN_ID,
        feedback_summary=
            feedback,
        minimum_feedback=3,
    )


@app.get("/web-test/review-candidates")
def web_test_review_candidates() -> dict:
    return build_review_candidates(
        findings=
            web_test_findings(),
    )


@app.post("/web-test/audit/operation-snapshot")
def record_web_test_operation_snapshot() -> dict:
    status = (
        web_test_operation_status()
    )
    timestamp_ms = int(
        time.time()
        * 1000
    )
    event_id = (
        "web-test-operation-"
        + WEB_TEST_RUN_ID
        + "-"
        + str(timestamp_ms)
    )

    accepted = telemetry_service.record(
        TelemetryEvent(
            event_id=event_id,
            event_type=
                "web_test_operation_snapshot",
            timestamp_ms=
                timestamp_ms,
            metadata={
                "test_run_id":
                    WEB_TEST_RUN_ID,
                "operational_state":
                    status[
                        "operational_state"
                    ],
                "preflight_ready":
                    bool(
                        status[
                            "preflight_ready"
                        ]
                    ),
                "run_started":
                    bool(
                        status[
                            "run_started"
                        ]
                    ),
                "consistency_status":
                    status[
                        "consistency_status"
                    ],
            },
        )
    )

    return {
        "accepted":accepted,
        "test_run_id":
            WEB_TEST_RUN_ID,
        "operational_state":
            status[
                "operational_state"
            ],
        "preflight_ready":
            bool(
                status[
                    "preflight_ready"
                ]
            ),
        "run_started":
            bool(
                status[
                    "run_started"
                ]
            ),
        "consistency_status":
            status[
                "consistency_status"
            ],
    }


@app.post("/web-test/audit/stability-snapshot")
def record_web_test_stability_snapshot() -> dict:
    stability = (
        web_test_operation_stability()
    )
    timestamp_ms = int(
        time.time()
        * 1000
    )
    event_id = (
        "web-test-stability-"
        + WEB_TEST_RUN_ID
        + "-"
        + str(timestamp_ms)
    )

    accepted = telemetry_service.record(
        TelemetryEvent(
            event_id=event_id,
            event_type=
                "web_test_stability_snapshot",
            timestamp_ms=
                timestamp_ms,
            metadata={
                "test_run_id":
                    WEB_TEST_RUN_ID,
                "stability":
                    stability[
                        "stability"
                    ],
                "operation_running_rate":
                    float(
                        stability[
                            "operation_running_rate"
                        ]
                    ),
                "running_to_other_regressions":
                    int(
                        stability[
                            "running_to_other_regressions"
                        ]
                    ),
            },
        )
    )

    return {
        "accepted":accepted,
        "test_run_id":
            WEB_TEST_RUN_ID,
        "stability":
            stability[
                "stability"
            ],
    }


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


def _balance_change_plan_for_player(
    player_id:str|None,
)->dict:
    report=build_manual_battle_report(
        events=telemetry_service.events(
            player_id=player_id,
        ),
        player_id=player_id,
        minimum_battles=3,
    )
    return build_balance_change_plan(
        report
    )


@app.get("/telemetry/balance-change-plan")
def balance_change_plan(
    player_id:str|None=None,
)->dict:
    return _balance_change_plan_for_player(
        player_id
    )


@app.get("/telemetry/balance-change-draft")
def balance_change_draft(
    player_id:str,
)->dict:
    plan=_balance_change_plan_for_player(
        player_id
    )
    return (
        balance_change_draft_service
        .view(
            player_id=player_id,
            plan=plan,
        )
    )


@app.put("/telemetry/balance-change-draft")
def update_balance_change_draft(
    player_id:str,
    request:BalanceChangeDraftItemRequest,
)->dict:
    plan=_balance_change_plan_for_player(
        player_id
    )

    try:
        return (
            balance_change_draft_service
            .update_item(
                player_id=player_id,
                plan=plan,
                area=request.area,
                before_value=
                    request.before_value,
                proposed_value=
                    request.proposed_value,
                approved=
                    request.approved,
                simulation_status=
                    request.simulation_status,
                regression_status=
                    request.regression_status,
            )
        )
    except BalanceChangeDraftError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc


@app.post("/telemetry/balance-change-simulate")
def simulate_balance_change(
    player_id:str,
    request:BalanceSimulationRequest,
)->dict:
    plan=_balance_change_plan_for_player(
        player_id
    )
    draft=(
        balance_change_draft_service
        .view(
            player_id=player_id,
            plan=plan,
        )
    )

    if not draft.get(
        "review_ready"
    ):
        raise HTTPException(
            status_code=422,
            detail="İzole denge simülasyonu yalnız review_ready gerçek maç raporunda çalıştırılabilir.",
        )

    item=next(
        (
            value
            for value
            in draft.get(
                "items",
                [],
            )
            if value.get("area")
            == request.area
        ),
        None,
    )
    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Simüle edilecek denge taslağı bulunamadı.",
        )

    if item.get(
        "before_value"
    ) is None or item.get(
        "proposed_value"
    ) is None:
        raise HTTPException(
            status_code=422,
            detail="Simülasyon için mevcut ve önerilen değer girilmelidir.",
        )

    try:
        result=run_balance_simulation(
            area=request.area,
            before_value=
                item["before_value"],
            proposed_value=
                item["proposed_value"],
        )
    except BalanceSimulationError as exc:
        # Unsupported/invalid simulation never changes canonical values.
        updated=(
            balance_change_draft_service
            .update_item(
                player_id=player_id,
                plan=plan,
                area=request.area,
                before_value=
                    item.get(
                        "before_value"
                    ),
                proposed_value=
                    item.get(
                        "proposed_value"
                    ),
                approved=bool(
                    item.get(
                        "approved",
                        False,
                    )
                ),
                simulation_status=
                    "failed",
                regression_status=
                    item.get(
                        "regression_status",
                        "pending",
                    ),
            )
        )
        return {
            "ok":False,
            "reason":str(exc),
            "draft":updated,
            "canonical_values_changed":
                False,
        }

    updated=(
        balance_change_draft_service
        .update_item(
            player_id=player_id,
            plan=plan,
            area=request.area,
            before_value=
                item.get(
                    "before_value"
                ),
            proposed_value=
                item.get(
                    "proposed_value"
                ),
            approved=bool(
                item.get(
                    "approved",
                    False,
                )
            ),
            simulation_status=
                "passed",
            regression_status=
                item.get(
                    "regression_status",
                    "pending",
                ),
        )
    )

    return {
        "ok":True,
        "simulation":result,
        "draft":updated,
        "canonical_values_changed":
            False,
        "automatic_apply":False,
    }


@app.post("/telemetry/balance-change-regression")
def regress_balance_change(
    player_id:str,
    request:BalanceSimulationRequest,
)->dict:
    plan=_balance_change_plan_for_player(
        player_id
    )
    draft=(
        balance_change_draft_service
        .view(
            player_id=player_id,
            plan=plan,
        )
    )

    if not draft.get(
        "review_ready"
    ):
        raise HTTPException(
            status_code=422,
            detail="Battle-engine regresyonu yalnız review_ready gerçek maç raporunda çalıştırılabilir.",
        )

    item=next(
        (
            value
            for value
            in draft.get(
                "items",
                [],
            )
            if value.get("area")
            == request.area
        ),
        None,
    )
    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Regresyonu çalıştırılacak denge taslağı bulunamadı.",
        )

    structural=(
        is_structural_regression_area(
            request.area
        )
    )

    if (
        not structural
        and item.get(
            "simulation_status"
        ) != "passed"
    ):
        raise HTTPException(
            status_code=422,
            detail="Sayısal regresyondan önce izole simülasyon passed olmalıdır.",
        )

    if (
        not structural
        and (
            item.get(
                "before_value"
            ) is None
            or item.get(
                "proposed_value"
            ) is None
        )
    ):
        raise HTTPException(
            status_code=422,
            detail="Sayısal regresyon için mevcut ve önerilen değer girilmelidir.",
        )

    try:
        result=run_balance_regression(
            area=request.area,
            before_value=
                item["before_value"],
            proposed_value=
                item["proposed_value"],
        )
    except BalanceRegressionError as exc:
        updated=(
            balance_change_draft_service
            .update_item(
                player_id=player_id,
                plan=plan,
                area=request.area,
                before_value=
                    item.get(
                        "before_value"
                    ),
                proposed_value=
                    item.get(
                        "proposed_value"
                    ),
                approved=bool(
                    item.get(
                        "approved",
                        False,
                    )
                ),
                simulation_status=(
                    item.get(
                        "simulation_status",
                        "pending",
                    )
                    if structural
                    else "passed"
                ),
                regression_status=
                    "failed",
            )
        )
        return {
            "ok":False,
            "reason":str(exc),
            "draft":updated,
            "canonical_values_changed":
                False,
            "automatic_apply":False,
        }

    regression_status=(
        "passed"
        if result.get(
            "status"
        ) == "passed"
        else "failed"
    )

    updated=(
        balance_change_draft_service
        .update_item(
            player_id=player_id,
            plan=plan,
            area=request.area,
            before_value=
                item.get(
                    "before_value"
                ),
            proposed_value=
                item.get(
                    "proposed_value"
                ),
            approved=bool(
                item.get(
                    "approved",
                    False,
                )
            ),
            simulation_status=(
                item.get(
                    "simulation_status",
                    "pending",
                )
                if structural
                else "passed"
            ),
            regression_status=
                regression_status,
        )
    )

    return {
        "ok":
            regression_status
            == "passed",
        "regression":result,
        "draft":updated,
        "canonical_values_changed":
            False,
        "automatic_apply":False,
        "apply_endpoint_available":
            False,
        "structural_review":
            structural,
    }


@app.get("/telemetry/balance-human-review")
def balance_human_review(
    player_id:str,
)->dict:
    plan=_balance_change_plan_for_player(
        player_id
    )
    draft=(
        balance_change_draft_service
        .view(
            player_id=player_id,
            plan=plan,
        )
    )
    return build_human_review_queue(
        draft
    )


@app.get("/telemetry/balance-human-review-evidence")
def balance_human_review_evidence(
    player_id:str,
)->dict:
    plan=_balance_change_plan_for_player(
        player_id
    )
    draft=(
        balance_change_draft_service
        .view(
            player_id=player_id,
            plan=plan,
        )
    )
    queue=build_human_review_queue(
        draft
    )

    evidence=[]
    for item in draft.get(
        "items",
        [],
    ):
        area=str(
            item.get(
                "area",
                "",
            )
        )
        human_ready=bool(
            item.get(
                "human_review_ready",
                False,
            )
        )
        if not human_ready:
            continue

        entry={
            "area":area,
            "reason":
                item.get("reason"),
            "suggestion":
                item.get("suggestion"),
            "before_value":
                item.get(
                    "before_value"
                ),
            "proposed_value":
                item.get(
                    "proposed_value"
                ),
            "approved":bool(
                item.get(
                    "approved",
                    False,
                )
            ),
            "simulation_status":
                item.get(
                    "simulation_status",
                    "pending",
                ),
            "regression_status":
                item.get(
                    "regression_status",
                    "pending",
                ),
            "numeric_change":
                item.get(
                    "proposed_value"
                ) is not None,
            "simulation":None,
            "regression":None,
            "errors":[],
        }

        if (
            entry[
                "simulation_status"
            ] == "passed"
            and entry[
                "before_value"
            ] is not None
            and entry[
                "proposed_value"
            ] is not None
        ):
            try:
                entry[
                    "simulation"
                ]=run_balance_simulation(
                    area=area,
                    before_value=
                        entry[
                            "before_value"
                        ],
                    proposed_value=
                        entry[
                            "proposed_value"
                        ],
                )
            except BalanceSimulationError as exc:
                entry[
                    "errors"
                ].append(
                    f"simulation: {exc}"
                )

        if (
            entry[
                "regression_status"
            ] == "passed"
        ):
            try:
                entry[
                    "regression"
                ]=run_balance_regression(
                    area=area,
                    before_value=
                        entry[
                            "before_value"
                        ],
                    proposed_value=
                        entry[
                            "proposed_value"
                        ],
                )
            except BalanceRegressionError as exc:
                entry[
                    "errors"
                ].append(
                    f"regression: {exc}"
                )

        evidence.append(entry)

    return {
        "player_id":player_id,
        "review_ready":bool(
            draft.get(
                "review_ready"
            )
        ),
        "candidate_count":
            len(evidence),
        "evidence":
            evidence,
        "human_decision_required":
            True,
        "automatic_apply":
            False,
        "apply_endpoint_available":
            False,
        "numeric_balance_changed":
            False,
        "queue":queue,
    }


@app.delete("/telemetry/balance-change-draft")
def clear_balance_change_draft(
    player_id:str,
)->dict:
    balance_change_draft_service.clear(
        player_id
    )
    return {
        "player_id":player_id,
        "cleared":True,
        "automatic_apply":False,
        "numeric_balance_changed":False,
    }


@app.get("/telemetry/manual-battle-report")
def manual_battle_report(
    player_id: str | None = None,
) -> dict:
    return build_manual_battle_report(
        events=telemetry_service.events(
            player_id=player_id,
        ),
        player_id=player_id,
        minimum_battles=3,
    )


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
            sound_muted=request.sound_muted,
            music_muted=request.music_muted,
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


@app.get("/profile/{player_id}/battle-pool-presets")
def list_battle_pool_presets(
    player_id:str,
)->dict:
    return {
        "player_id":player_id,
        "presets":
            battle_pool_preset_service
            .list(player_id),
    }


@app.put("/profile/{player_id}/battle-pool-presets")
def save_battle_pool_preset(
    player_id:str,
    request:BattlePoolPresetRequest,
)->dict:
    try:
        preset=(
            battle_pool_preset_service
            .save(
                player_id,
                name=request.name,
                module_definition_ids=
                    request.battle_pool_ids,
            )
        )
    except (
        BattlePoolPresetError,
        ValueError,
    ) as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    return {
        "player_id":player_id,
        "preset":preset,
        "presets":
            battle_pool_preset_service
            .list(player_id),
    }


@app.patch("/profile/{player_id}/battle-pool-presets/rename")
def rename_battle_pool_preset(
    player_id:str,
    request:BattlePoolPresetRenameRequest,
)->dict:
    try:
        preset=(
            battle_pool_preset_service
            .rename(
                player_id,
                old_name=request.old_name,
                new_name=request.new_name,
            )
        )
    except (
        BattlePoolPresetError,
        ValueError,
    ) as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    return {
        "player_id":player_id,
        "preset":preset,
        "presets":
            battle_pool_preset_service
            .list(player_id),
    }


@app.patch("/profile/{player_id}/battle-pool-presets/{preset_name}/meta")
def update_battle_pool_preset_meta(
    player_id:str,
    preset_name:str,
    request:BattlePoolPresetMetaRequest,
)->dict:
    try:
        preset=(
            battle_pool_preset_service
            .update_meta(
                player_id,
                name=preset_name,
                favorite=request.favorite,
                mark_used=request.mark_used,
            )
        )
    except (
        BattlePoolPresetError,
        ValueError,
    ) as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    return {
        "player_id":player_id,
        "preset":preset,
        "presets":
            battle_pool_preset_service
            .list(player_id),
    }


@app.delete("/profile/{player_id}/battle-pool-presets/{preset_name}")
def delete_battle_pool_preset(
    player_id:str,
    preset_name:str,
)->dict:
    deleted=(
        battle_pool_preset_service
        .delete(
            player_id,
            preset_name,
        )
    )
    return {
        "player_id":player_id,
        "deleted":deleted,
        "presets":
            battle_pool_preset_service
            .list(player_id),
    }


@app.get("/game/module-catalog")
def game_module_catalog() -> dict:
    return build_module_catalog_view()


@app.get("/identity")
def gridshard_identity() -> dict:
    return {
        "name":"GRIDSHARD",
        "tagline_tr":
            "Devreni Kur. Çekirdeği Kır.",
        "tagline_en":
            "Build the Circuit. Break the Core.",
        "identity_version":
            "2.0.0-beta.20",
        "palette":{
            "void_navy":"#070B14",
            "reactor_blue":"#0C1625",
            "alloy_navy":"#132238",
            "circuit_steel":"#294766",
            "arc_cyan":"#36D9FF",
            "plasma_cyan":"#67F4FF",
            "reactor_gold":"#F4C85A",
            "ion_green":"#55DF8A",
            "charge_amber":"#F0B84B",
            "overload_red":"#FF515A",
            "interference_violet":"#A86BFF",
            "ice_white":"#ECF5FF",
            "signal_gray":"#8CA1B9",
        },
    }


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
        test_run_id_ready=
            bool(
                WEB_TEST_RUN_ID
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


@app.get("/web-test/go-no-go")
def web_test_go_no_go() -> dict:
    operation = (
        web_test_operation_readiness()
    )
    kpis = (
        web_test_kpi_service
        .snapshot()
    )
    return build_go_no_go(
        operation_readiness=
            operation,
        kpis=kpis,
    )


@app.get("/web-test/test-run")
def web_test_current_run() -> dict:
    return {
        "test_run_id":
            WEB_TEST_RUN_ID,
        "build":
            "web-test-beta.13",
    }


@app.get("/web-test/test-runs/compare")
def web_test_compare_runs(
    baseline_test_run_id: str,
    candidate_test_run_id: str,
    minimum_sample: int = 10,
) -> dict:
    return compare_test_runs(
        telemetry_service=
            telemetry_service,
        baseline_test_run_id=
            baseline_test_run_id,
        candidate_test_run_id=
            candidate_test_run_id,
        minimum_sample=
            max(
                1,
                minimum_sample,
            ),
    )


@app.get("/web-test/test-runs/{test_run_id}/stability-history")
def web_test_stability_history(
    test_run_id: str,
) -> dict:
    return build_stability_history_summary(
        telemetry_service=
            telemetry_service,
        test_run_id=
            test_run_id,
    )


@app.get("/web-test/test-runs/{test_run_id}/operation-transitions")
def web_test_operation_transitions(
    test_run_id: str,
) -> dict:
    return build_operation_transition_summary(
        telemetry_service=
            telemetry_service,
        test_run_id=
            test_run_id,
    )


@app.get("/web-test/test-runs/{test_run_id}/operation-history")
def web_test_operation_history(
    test_run_id: str,
) -> dict:
    return build_operation_history_summary(
        telemetry_service=
            telemetry_service,
        test_run_id=
            test_run_id,
    )


@app.get("/web-test/test-runs")
def web_test_run_catalog() -> dict:
    return build_test_run_catalog(
        telemetry_service=
            telemetry_service,
        active_test_run_id=
            WEB_TEST_RUN_ID,
    )


@app.get("/web-test/test-runs/{test_run_id}/summary")
def web_test_run_summary(
    test_run_id: str,
) -> dict:
    return build_test_run_summary(
        telemetry_service=
            telemetry_service,
        test_run_id=test_run_id,
    )


@app.get("/web-test/test-runs/{test_run_id}/go-no-go")
def web_test_run_go_no_go(
    test_run_id: str,
) -> dict:
    return build_test_run_go_no_go(
        test_run_id=test_run_id,
        active_test_run_id=
            WEB_TEST_RUN_ID,
        operation_readiness=
            web_test_operation_readiness(),
        run_summary=
            build_test_run_summary(
                telemetry_service=
                    telemetry_service,
                test_run_id=
                    test_run_id,
            ),
    )


@app.get("/web-test/rc-candidate")
def web_test_rc_candidate() -> dict:
    operation = (
        web_test_operation_readiness()
    )
    go_no_go = (
        web_test_go_no_go()
    )
    data_health = (
        web_test_data_health()
    )
    run_summary = (
        build_test_run_summary(
            telemetry_service=
                telemetry_service,
            test_run_id=
                WEB_TEST_RUN_ID,
        )
    )

    return build_rc_candidate_summary(
        version=VERSION,
        build=
            "web-test-beta.13",
        test_run_id=
            WEB_TEST_RUN_ID,
        operation_readiness=
            operation,
        go_no_go=
            go_no_go,
        data_health=
            data_health,
        run_summary=
            run_summary,
    )


@app.get("/web-test/launch-readiness")
def web_test_launch_readiness() -> dict:
    player_persistence = (
        player_data_persistence_health()
    )
    telemetry_persistence = (
        telemetry_persistence_health()
    )
    manifest = build_manifest(
        version=VERSION,
        telemetry_service=
            telemetry_service,
        persistence_ready=bool(
            player_persistence["ready"]
        ),
        telemetry_persistence_ready=bool(
            telemetry_persistence[
                "ready"
            ]
        ),
        test_run_id=
            WEB_TEST_RUN_ID,
    )

    return build_launch_snapshot(
        version=VERSION,
        build=
            "web-test-beta.13",
        test_run_id=
            WEB_TEST_RUN_ID,
        manifest=manifest,
        operation_readiness=
            web_test_operation_readiness(),
        rc_candidate=
            web_test_rc_candidate(),
        data_health=
            web_test_data_health(),
    )


@app.get("/web-test/first-run-checklist")
def web_test_first_run_checklist() -> dict:
    data_health = (
        web_test_data_health()
    )
    rc_candidate = (
        web_test_rc_candidate()
    )
    launch = (
        web_test_launch_readiness()
    )
    run_summary = (
        build_test_run_summary(
            telemetry_service=
                telemetry_service,
            test_run_id=
                WEB_TEST_RUN_ID,
        )
    )

    return build_first_run_checklist(
        version=VERSION,
        build=
            "web-test-beta.13",
        test_run_id=
            WEB_TEST_RUN_ID,
        launch_readiness=
            launch,
        data_health=
            data_health,
        rc_candidate=
            rc_candidate,
        run_summary=
            run_summary,
    )


@app.get("/web-test/preflight")
def web_test_preflight() -> dict:
    run_summary = (
        build_test_run_summary(
            telemetry_service=
                telemetry_service,
            test_run_id=
                WEB_TEST_RUN_ID,
        )
    )

    return build_preflight_report(
        version=VERSION,
        build=
            "web-test-beta.13",
        test_run_id=
            WEB_TEST_RUN_ID,
        checklist=
            web_test_first_run_checklist(),
        launch=
            web_test_launch_readiness(),
        rc_candidate=
            web_test_rc_candidate(),
        data_health=
            web_test_data_health(),
        run_summary=
            run_summary,
        kpis=
            web_test_kpi_service
            .snapshot(),
    )


@app.get("/web-test/test-run/status")
def web_test_run_status() -> dict:
    started_events = (
        telemetry_service.events(
            event_type=
                "web_test_run_started",
        )
    )
    finished_events = (
        telemetry_service.events(
            event_type=
                "web_test_run_finished",
        )
    )

    started = any(
        event.get(
            "metadata",
            {},
        ).get(
            "test_run_id"
        )
        == WEB_TEST_RUN_ID
        for event in started_events
    )
    finished = any(
        event.get(
            "metadata",
            {},
        ).get(
            "test_run_id"
        )
        == WEB_TEST_RUN_ID
        for event in finished_events
    )

    return {
        "test_run_id":
            WEB_TEST_RUN_ID,
        "build":
            "web-test-beta.13",
        "started":
            started,
        "finished":
            finished,
    }


@app.get("/web-test/test-run/consistency")
def web_test_run_consistency() -> dict:
    return build_run_started_consistency(
        active_test_run_id=
            WEB_TEST_RUN_ID,
        run_status=
            web_test_run_status(),
        preflight=
            web_test_preflight(),
    )


@app.get("/web-test/operation-status")
def web_test_operation_status() -> dict:
    return build_operation_status(
        version=VERSION,
        build=
            "web-test-beta.13",
        test_run_id=
            WEB_TEST_RUN_ID,
        preflight=
            web_test_preflight(),
        run_status=
            web_test_run_status(),
        consistency=
            web_test_run_consistency(),
    )


@app.get("/web-test/operation-stability")
def web_test_operation_stability() -> dict:
    run_summary = (
        build_test_run_summary(
            telemetry_service=
                telemetry_service,
            test_run_id=
                WEB_TEST_RUN_ID,
        )
    )
    transitions = (
        build_operation_transition_summary(
            telemetry_service=
                telemetry_service,
            test_run_id=
                WEB_TEST_RUN_ID,
        )
    )

    return build_operation_stability(
        operation_status=
            web_test_operation_status(),
        run_summary=
            run_summary,
        transition_summary=
            transitions,
    )


@app.get("/web-test/monitoring")
def web_test_monitoring() -> dict:
    run_summary = (
        build_test_run_summary(
            telemetry_service=
                telemetry_service,
            test_run_id=
                WEB_TEST_RUN_ID,
        )
    )

    return build_monitoring_summary(
        version=VERSION,
        build=
            "web-test-beta.13",
        test_run_id=
            WEB_TEST_RUN_ID,
        operation_status=
            web_test_operation_status(),
        stability=
            web_test_operation_stability(),
        run_summary=
            run_summary,
        kpis=
            web_test_kpi_service
            .snapshot(),
    )


@app.get("/web-test/test-run/report")
def web_test_run_report() -> dict:
    run_summary = (
        build_test_run_summary(
            telemetry_service=
                telemetry_service,
            test_run_id=
                WEB_TEST_RUN_ID,
        )
    )

    return build_post_run_report(
        version=VERSION,
        build=
            "web-test-beta.13",
        test_run_id=
            WEB_TEST_RUN_ID,
        run_summary=
            run_summary,
        monitoring=
            web_test_monitoring(),
        operation_history=
            build_operation_history_summary(
                telemetry_service=
                    telemetry_service,
                test_run_id=
                    WEB_TEST_RUN_ID,
            ),
        operation_transitions=
            build_operation_transition_summary(
                telemetry_service=
                    telemetry_service,
                test_run_id=
                    WEB_TEST_RUN_ID,
            ),
        stability_history=
            build_stability_history_summary(
                telemetry_service=
                    telemetry_service,
                test_run_id=
                    WEB_TEST_RUN_ID,
            ),
        data_health=
            web_test_data_health(),
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
    manifest=build_manifest(
        version=VERSION,
        telemetry_service=telemetry_service,
        persistence_ready=bool(
            player_persistence["ready"]
        ),
        telemetry_persistence_ready=bool(
            telemetry_persistence["ready"]
        ),
        test_run_id=
            WEB_TEST_RUN_ID,
    )
    manifest["version"]=VERSION
    manifest["ui_build_label"]=f"GRIDSHARD {VERSION}"
    manifest["static_cache_mode"]="no-store"
    manifest["browser_e2e"]="optional-real-browser"
    return manifest


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
        test_run_id=
            WEB_TEST_RUN_ID,
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


# API ve WebSocket rotalarından sonra istemciyi aynı origin altında servis et.
# Böylece gerçek Web testi için ayrı bir statik HTTP sunucusuna gerek kalmaz.
app.mount(
    "/",
    NoCacheStaticFiles(
        directory=str(
            CLIENT_DIR
        ),
        html=True,
    ),
    name="project-relay-web",
)
