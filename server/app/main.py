from __future__ import annotations

from uuid import uuid4
from dataclasses import replace
import asyncio
from contextlib import asynccontextmanager
import hashlib
import secrets
import time
import os
import json
from pathlib import Path
from threading import Lock

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Query, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.websockets import WebSocketDisconnect
from pydantic import BaseModel

from .auth import (
    AuthenticationError,
    JsonIdentityRepository,
    ParticipantAuthService,
    load_or_create_signing_key,
)
from .platform_services import PlatformService, PlatformServiceError
from .postgres_repository import (
    PostgresIdentityRepository,
    PostgresPlayerDataRepository,
    PostgresPool,
)
from .runtime_coordination import RuntimeCoordinator

from .game.pvp_session import (
    PvPSessionError,
    PvPSessionService,
)
from .game.models import BattleCommand, BattleStatus
from .game.catalog import (
    BASIC_MODULE_DEFINITIONS,
    PLAYER_SELECTABLE_MODULE_IDS,
    get_module_definition,
)
from .game.core_balance import core_rarity_profile
from .game.ai_archetypes import (
    AI_ARCHETYPE_IDS,
    get_ai_archetype,
    normalize_ai_archetype_id,
    select_ai_archetype_for_key,
)
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
    SEASON_REWARD_TRACK,
    monthly_season_descriptor,
)
from .laboratory import (
    LaboratoryError,
    build_laboratory_view,
    reset_calibrations,
    upgrade_calibration,
)
from .meta_progression import (
    CORE_TYPES,
    MetaProgressionError,
    MetaProgressionService,
)
from .arena_canon import BOTS, rank_stage_for_rating
from .season_competition import (
    DAILY_META_DEFINITIONS,
    LEADERBOARD_PRIZES,
    TEAM_PRIZES,
    WEEKLY_PRIZES,
    build_events_view,
    daily_meta_by_id,
    daily_meta_catalog_view,
    daily_meta_for_seed,
)
from .player_statistics import (
    PlayerStatisticsService,
)
from .player_settings import (
    PlayerSettingsError,
    PlayerSettingsService,
)
from .matchmaking import (
    MatchmakingEntry,
    MatchmakingError,
    MatchmakingPair,
    MatchmakingService,
    RedisMatchmakingService,
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
from .team_service import (
    JsonTeamRepository,
    REQUEST_POLICY as TEAM_REQUEST_POLICY,
    TeamService,
    TeamServiceError,
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


SERVER_DATA_DIR = (
    Path(__file__).resolve()
    .parent.parent
    / "data"
)
RUNTIME_MODE = os.environ.get("GRIDSHARD_RUNTIME_MODE", "development").strip().lower()
RUNTIME_STRICT = RUNTIME_MODE == "production"
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip() or None
REDIS_URL = os.environ.get("REDIS_URL", "").strip() or None

if RUNTIME_STRICT and not DATABASE_URL:
    raise RuntimeError("Üretim modunda DATABASE_URL zorunludur.")
if RUNTIME_STRICT and not REDIS_URL:
    raise RuntimeError("Üretim modunda REDIS_URL zorunludur.")
if RUNTIME_STRICT and not os.environ.get("GRIDSHARD_AUTH_SIGNING_KEY", "").strip():
    raise RuntimeError("Üretim modunda GRIDSHARD_AUTH_SIGNING_KEY zorunludur.")

postgres_pool = PostgresPool(DATABASE_URL) if DATABASE_URL else None
runtime_coordinator = RuntimeCoordinator(
    REDIS_URL,
    strict=RUNTIME_STRICT,
)


async def _runtime_maintenance_loop() -> None:
    while True:
        await asyncio.sleep(5.0)
        await pvp_websocket_adapter.sweep_connection_health()
        expired_session_ids = pvp_service.cleanup_expired_sessions()
        for session_id in expired_session_ids:
            await pvp_tick_runner.stop_session(session_id)
            await runtime_coordinator.delete_session(session_id)
        if runtime_coordinator.redis is None:
            matchmaking_service.cleanup_expired()
        else:
            try:
                await redis_matchmaking_service.cleanup_expired()
            except Exception as exc:
                runtime_coordinator.last_error = str(exc)
                if RUNTIME_STRICT:
                    raise
        for session_id in pvp_service.active_session_ids():
            await runtime_coordinator.touch_session(session_id, ttl_seconds=360)
        await runtime_coordinator.local_limiter.cleanup()


@asynccontextmanager
async def application_lifespan(_app: FastAPI):
    if postgres_pool is not None:
        await asyncio.to_thread(postgres_pool.open)
    await runtime_coordinator.open()
    maintenance_task = asyncio.create_task(_runtime_maintenance_loop())
    try:
        yield
    finally:
        maintenance_task.cancel()
        try:
            await maintenance_task
        except asyncio.CancelledError:
            pass
        await pvp_tick_runner.stop_all()
        await runtime_coordinator.close()
        if postgres_pool is not None:
            await asyncio.to_thread(postgres_pool.close)


app = FastAPI(
    title="GRIDSHARD PvP Gateway",
    version=VERSION,
    lifespan=application_lifespan,
)

CORS_ORIGINS = tuple(
    origin.strip()
    for origin in os.environ.get("GRIDSHARD_CORS_ORIGINS", "").split(",")
    if origin.strip()
)
if CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(CORS_ORIGINS),
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

AUTH_IDENTITY_PATH = Path(
    os.environ.get(
        "GRIDSHARD_AUTH_IDENTITY_PATH",
        str(SERVER_DATA_DIR / "player_identities.json"),
    )
)
AUTH_KEY_PATH = Path(
    os.environ.get(
        "GRIDSHARD_AUTH_KEY_PATH",
        str(SERVER_DATA_DIR / ".auth_signing_key"),
    )
)
participant_auth_service = ParticipantAuthService(
    (
        PostgresIdentityRepository(postgres_pool)
        if postgres_pool is not None
        else JsonIdentityRepository(AUTH_IDENTITY_PATH)
    ),
    load_or_create_signing_key(AUTH_KEY_PATH),
    access_token_ttl_seconds=int(
        os.environ.get("GRIDSHARD_ACCESS_TOKEN_TTL_SECONDS", "3600")
    ),
)
platform_service = PlatformService(
    Path(
        os.environ.get(
            "GRIDSHARD_PLATFORM_STATE_PATH",
            str(SERVER_DATA_DIR / "platform_state.json"),
        )
    ),
    expose_codes=os.environ.get(
        "GRIDSHARD_DEV_EXPOSE_VERIFICATION_CODES", "0" if RUNTIME_STRICT else "1"
    ).strip().lower() in {"1", "true", "yes", "on"},
    web_base_url=os.environ.get(
        "GRIDSHARD_PUBLIC_WEB_URL", "https://gridshard.game"
    ),
)


def auth_is_required() -> bool:
    return os.environ.get("GRIDSHARD_AUTH_REQUIRED", "1").strip().lower() not in {
        "0",
        "false",
        "no",
        "off",
    }


PROTECTED_PLAYER_PREFIXES = (
    "/participants/",
    "/player-data/",
    "/matchmaking",
    "/settings/",
    "/progression/",
    "/post-match/",
    "/statistics/",
    "/profile/",
    "/public-profiles/",
    "/social/",
    "/accounts/",
    "/notifications/",
    "/players/",
    "/events",
    "/local-ai/",
    "/pvp/",
)


def _path_claimed_player_id(path: str) -> str | None:
    segments = [segment for segment in path.split("/") if segment]
    if not segments:
        return None
    if segments[0] in {"participants", "player-data", "settings", "statistics", "profile", "social", "accounts", "notifications"}:
        return segments[1] if len(segments) > 1 else None
    if segments[0] == "matchmaking" and len(segments) > 1 and segments[1] != "join":
        return segments[1]
    if segments[0] in {"progression", "post-match"} and len(segments) > 2:
        return segments[-1]
    return None


@app.middleware("http")
async def require_participant_authentication(request: Request, call_next):
    path = request.url.path
    protected = any(path.startswith(prefix) for prefix in PROTECTED_PLAYER_PREFIXES)
    if not auth_is_required() or not protected or request.method == "OPTIONS":
        return await call_next(request)

    try:
        token = participant_auth_service.bearer_token(
            request.headers.get("authorization")
        )
        identity = participant_auth_service.verify_access_token(token)
        if platform_service.token_is_revoked(identity.player_id, identity.token_id):
            raise AuthenticationError("Bu cihaz oturumu sonlandırılmış.")
    except AuthenticationError as exc:
        return JSONResponse(
            status_code=401,
            content={"detail": str(exc)},
            headers={"WWW-Authenticate": "Bearer"},
        )

    claimed_player_ids: set[str] = set()
    path_player_id = _path_claimed_player_id(path)
    if path_player_id:
        claimed_player_ids.add(path_player_id)
    query_player_id = request.query_params.get("player_id")
    if query_player_id:
        claimed_player_ids.add(query_player_id)
    if request.method in {"POST", "PUT", "PATCH"}:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            try:
                raw_body = await request.body()
                body = json.loads(raw_body) if raw_body else {}
            except (json.JSONDecodeError, UnicodeDecodeError):
                body = {}
            if isinstance(body, dict) and isinstance(body.get("player_id"), str):
                claimed_player_ids.add(body["player_id"])

    if any(player_id != identity.player_id for player_id in claimed_player_ids):
        return JSONResponse(
            status_code=403,
            content={"detail": "Başka bir oyuncu adına işlem yapılamaz."},
        )

    request.state.authenticated_player_id = identity.player_id
    request.state.authenticated_token_id = identity.token_id
    return await call_next(request)


def _rate_limit_policy(path: str) -> tuple[str, int, int] | None:
    if path == "/auth/session":
        return ("auth", 10, 60)
    if path.endswith("/commands") or path == "/matchmaking/join":
        return ("commands", 30, 1)
    if path.endswith("/snapshot"):
        return ("snapshots", 30, 1)
    if any(path.startswith(prefix) for prefix in PROTECTED_PLAYER_PREFIXES):
        return ("player_api", 120, 60)
    return None


@app.middleware("http")
async def apply_rate_limit(request: Request, call_next):
    if os.environ.get("GRIDSHARD_RATE_LIMIT_REQUIRED", "1").strip().lower() in {
        "0",
        "false",
        "no",
        "off",
    }:
        return await call_next(request)
    policy = _rate_limit_policy(request.url.path)
    if policy is None or request.method == "OPTIONS":
        return await call_next(request)
    scope, limit, window_seconds = policy
    authorization = request.headers.get("authorization", "")
    identity_key = (
        hashlib.sha256(authorization.encode("utf-8")).hexdigest()[:20]
        if authorization
        else (request.client.host if request.client else "unknown")
    )
    decision = await runtime_coordinator.rate_limit(
        scope,
        identity_key,
        limit=limit,
        window_seconds=window_seconds,
    )
    headers = {
        "X-RateLimit-Limit": str(decision.limit),
        "X-RateLimit-Remaining": str(decision.remaining),
    }
    if not decision.allowed:
        headers["Retry-After"] = str(decision.retry_after_seconds)
        return JSONResponse(
            status_code=429,
            content={"detail": "İstek hızı sınırı aşıldı; daha sonra yeniden deneyin."},
            headers=headers,
        )
    response = await call_next(request)
    response.headers.update(headers)
    return response

CLIENT_DIR = (
    Path(__file__).resolve()
    .parents[2]
    / "client"
)

pvp_service = PvPSessionService()
pvp_websocket_adapter = PvPWebSocketAdapter(
    pvp_service,
    silent_timeout_seconds=float(
        os.environ.get("GRIDSHARD_PVP_SILENT_TIMEOUT_SECONDS", "12")
    ),
    grace_period_seconds=float(
        os.environ.get("GRIDSHARD_PVP_GRACE_PERIOD_SECONDS", "30")
    ),
)
player_statistics_service = PlayerStatisticsService()
player_profile_service = PlayerProfileService()
meta_progression_service = MetaProgressionService()
player_progression_service = PlayerProgressionService(
    player_profile_service,
    meta_progression_service,
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
    # /local-ai/sessions uses local-ai-<uuid> for isolated test battles.
    # Matchmaking fallback uses local-ai-match-<uuid> and must complete the
    # normal statistics/progression/post-match pipeline.
    if state.match_type == "local_test":
        telemetry_service.ingest_finished_battle(
            state
        )
        return

    # The first tournament match of a new month replaces the previous
    # contribution counters. Queue the closed-period reward before that
    # authoritative progression write happens.
    if state.match_type == "team_tournament":
        for account_player_id in (
            state.account_player_ids
            if state.account_player_ids
            else tuple(state.players)
        ):
            try:
                _settle_competition_rewards(str(account_player_id))
            except Exception:
                pass

    player_statistics_service.process_finished_battle(
        state
    )
    player_progression_service.process_finished_battle(
        state
    )
    telemetry_service.ingest_finished_battle(
        state
    )

    # Social and team-training invitations are one-shot entry points.  Close
    # them at the authoritative terminal transition so a finished arena can
    # never be re-entered from either social surface.
    try:
        battle_session_id = str(getattr(state, "battle_id", "") or "")
        _complete_social_battle_invites(battle_session_id)
        team_service.complete_training_challenge(battle_session_id)
    except Exception:
        # Progression/statistics must not fail because a legacy social record
        # cannot be reconciled; the read models also backfill this state.
        pass

    account_player_ids = (
        state.account_player_ids
        if state.account_player_ids
        else tuple(state.players)
    )
    for player_id in account_player_ids:
        persist_player_data(
            player_id
        )

    player_ids=tuple(state.players)
    if player_ids:
        matchmaking_service.clear_match(
            player_ids[0]
        )
        if _redis_matchmaking_enabled():
            asyncio.get_running_loop().create_task(
                redis_matchmaking_service.clear_match(
                    player_ids[0]
                )
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
    PostgresPlayerDataRepository(postgres_pool)
    if postgres_pool is not None
    else JsonFilePlayerDataRepository(
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

DEFAULT_TEAM_DATA_PATH = PLAYER_DATA_PATH.with_name(
    "web_test_teams.json"
)
TEAM_DATA_PATH = Path(
    os.environ.get(
        "RELAY_TEAM_DATA_PATH",
        str(DEFAULT_TEAM_DATA_PATH),
    )
)
team_repository = JsonTeamRepository(TEAM_DATA_PATH)
team_service = TeamService(team_repository)

player_data_store_service = PlayerDataStoreService(
    profile_service=player_profile_service,
    statistics_service=player_statistics_service,
    settings_service=player_settings_service,
    repository=player_data_repository,
)
matchmaking_service = MatchmakingService(
    now_func=time.monotonic
)
MATCHMAKING_INSTANCE_ID = (
    os.environ.get("GRIDSHARD_INSTANCE_ID", "").strip()
    or f"gridshard-{uuid4().hex}"
)
MATCHMAKING_PUBLIC_WS_BASE_URL = os.environ.get(
    "GRIDSHARD_PUBLIC_WS_BASE_URL",
    "",
).strip()
redis_matchmaking_service = RedisMatchmakingService(
    lambda: runtime_coordinator.redis,
    namespace=runtime_coordinator.namespace,
    instance_id=MATCHMAKING_INSTANCE_ID,
    websocket_base_url=MATCHMAKING_PUBLIC_WS_BASE_URL,
)
MATCHMAKING_AI_FALLBACK_SECONDS = 32
# Beta clients play server-controlled AI; live PvP can be explicitly enabled.
MATCHMAKING_AI_ONLY = os.environ.get(
    "GRIDSHARD_MATCHMAKING_AI_ONLY",
    "1" if "beta" in VERSION.lower() else "0",
).strip().lower() in {"1", "true", "yes", "on"}
EXPERIMENTAL_LAB_EFFECTS_ENABLED = os.environ.get(
    "GRIDSHARD_EXPERIMENTAL_LAB_EFFECTS",
    "0",
).strip().lower() in {"1", "true", "yes", "on"}
DAILY_META_ROLL_LOCK = Lock()
SOCIAL_LOCK = Lock()
REWARD_INBOX_LOCK = Lock()


def persist_player_data(
    player_id: str,
) -> None:
    player_data_store_service.save_player(
        player_id
    )


def attach_player_laboratory_to_session(
    session_id: str,
    player_id: str,
) -> None:
    profile = player_profile_service.get_or_create(player_id)
    session = pvp_service.get_session(session_id)
    session.engine.state.player_upgrade_levels[player_id] = dict(profile.module_upgrade_levels)
    session.engine.state.player_match_ratings[player_id] = profile.rating
    battle_player = session.engine.state.players[player_id]
    battle_player.core_type = profile.selected_core_type
    battle_player.core_level = 1 + profile.core_upgrade_levels.get(profile.selected_core_type, 0)
    battle_player.core_skills = profile.core_skills.get(profile.selected_core_type, ())
    battle_player.selected_battle_emoji_id = profile.selected_battle_emoji_id
    core = next(
        (
            module for module in battle_player.modules.values()
            if module.definition.id == "core"
        ),
        None,
    )
    if core is not None:
        base_core = get_module_definition("core")
        hp_ratio = core.hp / max(1, core.definition.max_hp)
        scaled_hp = round(
            base_core.max_hp
            * core_rarity_profile(profile.selected_core_type)["hp"]
        )
        core.definition = replace(base_core, max_hp=scaled_hp)
        core.hp = max(1, round(scaled_hp * hp_ratio))
    session.engine.state.player_module_talents[player_id] = {k: dict(v) for k, v in profile.module_talents.items()}
    today = daily_meta_catalog_view()["day"]
    session.engine.state.player_daily_meta_ids[player_id] = (
        profile.daily_meta_id
        if profile.daily_meta_day == today and daily_meta_by_id(profile.daily_meta_id)
        else ""
    )
    from .arena_canon import unlocked_module_ids
    session.engine.state.player_unlocked_modules[player_id] = unlocked_module_ids(max(profile.rating, profile.highest_rating))
    pvp_service.set_player_calibrations(
        session_id,
        player_id,
        profile.module_calibration_levels,
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

class SetupSessionRequest(BaseModel):
    player_id: str
    battle_pool_ids: list[str]
    initial_modules: list[InitialModuleRequest]

class ReadySessionRequest(BaseModel):
    player_id: str
    ready: bool = True


class LocalAiBattleStartRequest(BaseModel):
    player_id: str
    battle_pool_ids: list[str]
    initial_modules: list[InitialModuleRequest] | None = None
    experimental_calibrations: bool = False
    ai_archetype: str = "balanced"


class LocalAiBattleCommandRequest(BaseModel):
    player_id: str
    kind: str
    payload: dict


class ProfileNameRequest(BaseModel):
    display_name: str


class ProfileBattlePoolRequest(BaseModel):
    battle_pool_ids: list[str]


class ProfileCosmeticsRequest(BaseModel):
    avatar_id: str | None = None
    avatar_frame_id: str | None = None
    battle_emoji_id: str | None = None
    profile_background_id: str | None = None


class LaboratoryOperationRequest(BaseModel):
    request_id: str


class MetaOperationRequest(BaseModel):
    request_id: str


class TeamCreateRequest(BaseModel):
    player_id: str
    name: str
    request_id: str


class TeamJoinRequest(BaseModel):
    player_id: str
    request_id: str


class TeamModuleRequest(BaseModel):
    player_id: str
    module_id: str
    request_id: str


class TeamActionRequest(BaseModel):
    player_id: str
    request_id: str


class TeamMessageRequest(BaseModel):
    player_id: str
    message: str
    request_id: str


class TeamTrainingChallengeRequest(BaseModel):
    player_id: str
    opponent_id: str
    request_id: str


class TeamMemberActionRequest(TeamActionRequest):
    member_id: str


class TeamApplicationActionRequest(TeamActionRequest):
    applicant_id: str
    accept: bool


class TeamCosmeticsRequest(TeamActionRequest):
    avatar_id: str | None = None
    avatar_frame_id: str | None = None
    bar_background_id: str | None = None
    name_frame_id: str | None = None


class FriendRequestOperation(BaseModel):
    player_id: str
    target_player_id: str
    request_id: str


class FriendDecisionOperation(BaseModel):
    player_id: str
    requester_id: str
    request_id: str


class SocialBattleInviteOperation(BaseModel):
    player_id: str
    opponent_id: str
    request_id: str


class EventRegistrationOperation(BaseModel):
    player_id: str
    request_id: str


class CoreSelectionRequest(BaseModel):
    core_type_id: str


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


class AuthSessionRequest(BaseModel):
    player_id: str
    device_secret: str
    device_id: str | None = None
    device_name: str | None = None
    platform: str = "web"


class ContactVerificationRequest(BaseModel):
    player_id: str
    channel: str
    destination: str


class ContactVerificationConfirmRequest(BaseModel):
    player_id: str
    channel: str
    code: str


class DeviceActionRequest(BaseModel):
    player_id: str


class RecoveryRequest(BaseModel):
    identifier: str


class RecoveryConfirmRequest(BaseModel):
    player_id: str
    code: str
    new_device_secret: str


class PushSubscriptionRequest(BaseModel):
    player_id: str
    device_id: str
    platform: str
    token: str


class InviteCodeRequest(BaseModel):
    player_id: str
    code: str | None = None


class DirectMessageRequest(BaseModel):
    player_id: str
    recipient_id: str
    text: str


class SocialSafetyRequest(BaseModel):
    player_id: str
    target_player_id: str
    blocked: bool | None = None
    reason: str | None = None
    detail: str | None = None


class GdprDeleteRequest(BaseModel):
    player_id: str
    confirmation: str


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


@app.post("/auth/session")
def create_participant_auth_session(
    request: AuthSessionRequest,
) -> dict:
    try:
        result = participant_auth_service.register_or_login(
            request.player_id,
            request.device_secret,
        )
        identity = participant_auth_service.verify_access_token(
            result["access_token"]
        )
        device_id = str(request.device_id or "").strip() or hashlib.sha256(
            request.device_secret.encode("utf-8")
        ).hexdigest()[:24]
        platform_service.register_device(
            request.player_id,
            device_id,
            request.device_name or f"{request.platform.title()} cihazı",
            request.platform,
            identity.token_id,
            identity.expires_at,
        )
        return {**result, "device_id": device_id}
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=401,
            detail=str(exc),
        ) from exc
    except PlatformServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/accounts/{player_id}")
def get_account_platform_view(player_id: str) -> dict:
    return platform_service.account_view(player_id)


@app.post("/accounts/{player_id}/verification/request")
def request_account_verification(
    player_id: str,
    request: ContactVerificationRequest,
) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    try:
        return platform_service.request_verification(
            player_id, request.channel, request.destination
        )
    except PlatformServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/accounts/{player_id}/verification/confirm")
def confirm_account_verification(
    player_id: str,
    request: ContactVerificationConfirmRequest,
) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    try:
        result = platform_service.confirm_verification(
            player_id, request.channel, request.code
        )
        return {**result, "account": platform_service.account_view(player_id)}
    except PlatformServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/accounts/{player_id}/oauth/{provider}/start")
def start_account_oauth(player_id: str, provider: str) -> dict:
    try:
        return platform_service.start_oauth(player_id, provider)
    except PlatformServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.delete("/accounts/{player_id}/devices/{device_id}")
def revoke_account_device(
    player_id: str,
    device_id: str,
    request: DeviceActionRequest,
) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    try:
        return platform_service.revoke_device(player_id, device_id)
    except PlatformServiceError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/account-recovery/request")
def request_account_recovery(request: RecoveryRequest) -> dict:
    try:
        return platform_service.request_recovery(request.identifier)
    except PlatformServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/account-recovery/confirm")
def confirm_account_recovery(request: RecoveryConfirmRequest) -> dict:
    try:
        platform_service.confirm_recovery(request.player_id, request.code)
        participant_auth_service.reset_device_secret(
            request.player_id, request.new_device_secret
        )
        for device in list(platform_service.account_view(request.player_id)["devices"]):
            platform_service.revoke_device(request.player_id, device["device_id"])
        return {"player_id": request.player_id, "recovered": True}
    except (AuthenticationError, PlatformServiceError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/notifications/{player_id}")
def get_platform_notifications(player_id: str) -> dict:
    return platform_service.notification_view(player_id)


@app.post("/notifications/{player_id}/push-subscriptions")
def subscribe_platform_push(
    player_id: str,
    request: PushSubscriptionRequest,
) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    try:
        return platform_service.subscribe_push(
            player_id, request.device_id, request.platform, request.token
        )
    except PlatformServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/social/{player_id}/invite-codes")
def create_social_invite_code(player_id: str, request: InviteCodeRequest) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    return platform_service.create_invite(player_id)


@app.post("/social/{player_id}/invite-codes/accept")
def accept_social_invite_code(player_id: str, request: InviteCodeRequest) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    try:
        result = platform_service.accept_invite(player_id, request.code or "")
        inviter_id = result["inviter_id"]
        with SOCIAL_LOCK:
            profile = _team_member_profile(player_id)
            inviter = _team_member_profile(inviter_id)
            if (
                inviter_id in profile.blocked_player_ids
                or player_id in inviter.blocked_player_ids
                or platform_service.is_blocked(player_id, inviter_id)
            ):
                raise PlatformServiceError("Engellenen oyuncunun daveti kullanılamaz.")
            _replace_tuple(profile, "friend_ids", (*profile.friend_ids, inviter_id))
            _replace_tuple(inviter, "friend_ids", (*inviter.friend_ids, player_id))
            persist_player_data(player_id)
            persist_player_data(inviter_id)
        platform_service.queue_notification(
            inviter_id,
            "Davet kabul edildi",
            f"{profile.display_name} artık arkadaşın.",
            f"gridshard://profile/{player_id}",
        )
        return {**result, "social": _social_view(player_id)}
    except PlatformServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/social/{player_id}/messages")
def get_direct_messages(player_id: str, peer_id: str | None = None) -> dict:
    return {"messages": platform_service.messages(player_id, peer_id)}


@app.post("/social/{player_id}/messages")
def send_direct_message(player_id: str, request: DirectMessageRequest) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    sender = _team_member_profile(player_id)
    recipient = _team_member_profile(request.recipient_id)
    if request.recipient_id not in sender.friend_ids:
        raise HTTPException(status_code=422, detail="Doğrudan mesaj yalnız arkadaşlara gönderilebilir.")
    if (
        request.recipient_id in sender.blocked_player_ids
        or player_id in recipient.blocked_player_ids
        or platform_service.is_blocked(player_id, request.recipient_id)
    ):
        raise HTTPException(status_code=422, detail="Engellenen oyuncuya mesaj gönderilemez.")
    try:
        message = platform_service.send_message(
            player_id, request.recipient_id, request.text
        )
        platform_service.queue_notification(
            request.recipient_id,
            "Yeni mesaj",
            f"{sender.display_name} sana mesaj gönderdi.",
            f"gridshard://friends/messages/{player_id}",
        )
        return {"message": message}
    except PlatformServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/social/{player_id}/block")
def set_social_block(player_id: str, request: SocialSafetyRequest) -> dict:
    if request.player_id != player_id or request.target_player_id == player_id:
        raise HTTPException(status_code=403, detail="Geçersiz engelleme işlemi.")
    blocked = request.blocked is not False
    with SOCIAL_LOCK:
        profile = _team_member_profile(player_id)
        target = _team_member_profile(request.target_player_id)
        if blocked:
            _replace_tuple(profile, "blocked_player_ids", (*profile.blocked_player_ids, request.target_player_id))
        else:
            _replace_tuple(profile, "blocked_player_ids", (value for value in profile.blocked_player_ids if value != request.target_player_id))
        for owner, other_id in ((profile, request.target_player_id), (target, player_id)):
            _replace_tuple(owner, "friend_ids", (value for value in owner.friend_ids if value != other_id))
            _replace_tuple(owner, "incoming_friend_request_ids", (value for value in owner.incoming_friend_request_ids if value != other_id))
            _replace_tuple(owner, "outgoing_friend_request_ids", (value for value in owner.outgoing_friend_request_ids if value != other_id))
        persist_player_data(player_id)
        persist_player_data(request.target_player_id)
    return {
        "blocked_player_ids": platform_service.set_block(
            player_id, request.target_player_id, blocked
        ),
        "social": _social_view(player_id),
    }


@app.post("/social/{player_id}/reports")
def report_social_player(player_id: str, request: SocialSafetyRequest) -> dict:
    if request.player_id != player_id or request.target_player_id == player_id:
        raise HTTPException(status_code=403, detail="Geçersiz şikâyet işlemi.")
    try:
        return platform_service.report(
            player_id,
            request.target_player_id,
            request.reason or "other",
            request.detail or "",
        )
    except PlatformServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/social/{player_id}/share/{target_player_id}")
def share_player_profile(player_id: str, target_player_id: str) -> dict:
    del player_id
    base = platform_service.web_base_url
    return {
        "deep_link": f"gridshard://profile/{target_player_id}",
        "web_link": f"{base}/profile/{target_player_id}",
    }


@app.get("/accounts/{player_id}/data-export")
def export_account_data(player_id: str) -> dict:
    snapshot = player_data_store_service.save_player(player_id).to_dict()
    return {
        "schema_version": 1,
        "exported_at": int(time.time()),
        "player_data": snapshot,
        "platform_data": platform_service.export_data(player_id),
    }


@app.post("/accounts/{player_id}/delete")
def delete_account_data(player_id: str, request: GdprDeleteRequest) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    if request.confirmation.strip() != f"SIL {player_id}":
        raise HTTPException(status_code=422, detail=f"Onay metni `SIL {player_id}` olmalıdır.")
    profile = _team_member_profile(player_id)
    if profile.team_id:
        try:
            team_service.leave_team(
                profile.team_id, player_id, f"gdpr-delete:{player_id}"
            )
        except TeamServiceError:
            pass
    for other in list(player_profile_service._profiles.values()):
        if other.player_id == player_id:
            continue
        changed = False
        for attribute in (
            "friend_ids", "incoming_friend_request_ids",
            "outgoing_friend_request_ids", "blocked_player_ids",
        ):
            values = tuple(value for value in getattr(other, attribute) if value != player_id)
            if values != getattr(other, attribute):
                setattr(other, attribute, values)
                changed = True
        if changed:
            persist_player_data(other.player_id)
    deleted = player_data_repository.delete(player_id)
    platform_service.erase(player_id)
    identity_deleted = participant_auth_service.delete_identity(player_id)
    player_profile_service._profiles.pop(player_id, None)
    player_statistics_service._statistics.pop(player_id, None)
    player_settings_service._settings.pop(player_id, None)
    return {
        "player_id": player_id,
        "deleted": bool(deleted or identity_deleted),
        "identity_deleted": identity_deleted,
        "gdpr_erasure_completed": True,
    }


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


def _redis_matchmaking_enabled() -> bool:
    return runtime_coordinator.redis is not None


def _matchmaking_pair_response(pair: MatchmakingPair) -> dict:
    return {
        "matched": True,
        "session_id": pair.match_id,
        "players": [pair.player_a_id, pair.player_b_id],
        "rating_difference": pair.rating_difference,
        "opponent_type": pair.opponent_type,
        "match_owner": pair.owner_instance_id or None,
        "websocket_base_url": pair.websocket_base_url or None,
    }


async def _matchmaking_pair_for(player_id: str) -> MatchmakingPair | None:
    if _redis_matchmaking_enabled():
        return await redis_matchmaking_service.matched_pair_for(player_id)
    return matchmaking_service.matched_pair_for(player_id)


async def _matchmaking_enqueue(
    player_id: str,
    *,
    rating: int,
    league_name_tr: str,
    level: int,
) -> MatchmakingEntry | MatchmakingPair:
    if _redis_matchmaking_enabled():
        return await redis_matchmaking_service.enqueue(
            player_id,
            rating=rating,
            league_name_tr=league_name_tr,
            level=level,
        )
    return matchmaking_service.enqueue(
        player_id,
        rating=rating,
        league_name_tr=league_name_tr,
        level=level,
    )


async def _matchmaking_try_match(player_id: str) -> MatchmakingPair | None:
    if _redis_matchmaking_enabled():
        return await redis_matchmaking_service.try_match(player_id)
    return matchmaking_service.try_match(player_id)


async def _matchmaking_snapshot(player_id: str) -> dict:
    if _redis_matchmaking_enabled():
        snapshot = await redis_matchmaking_service.queue_snapshot(player_id)
    else:
        snapshot = matchmaking_service.queue_snapshot(player_id)
    snapshot["ai_only"] = MATCHMAKING_AI_ONLY
    snapshot["ai_fallback_after_seconds"] = MATCHMAKING_AI_FALLBACK_SECONDS
    return snapshot


async def _matchmaking_match_with_ai(player_id: str) -> MatchmakingPair:
    if _redis_matchmaking_enabled():
        return await redis_matchmaking_service.match_with_ai(player_id)
    return matchmaking_service.match_with_ai(player_id)


async def _matchmaking_cancel_player(player_id: str) -> bool:
    if _redis_matchmaking_enabled():
        return await redis_matchmaking_service.cancel(player_id)
    return matchmaking_service.cancel(player_id)


async def _matchmaking_clear_match(player_id: str) -> bool:
    if _redis_matchmaking_enabled():
        return await redis_matchmaking_service.clear_match(player_id)
    pair=matchmaking_service.matched_pair_for(player_id)
    matchmaking_service.clear_match(player_id)
    return pair is not None


def _matchmaking_pair_is_stale(pair: MatchmakingPair) -> bool:
    try:
        session=pvp_service.get_session(pair.match_id)
    except PvPSessionError:
        if not pair.ready:
            return False
        if not _redis_matchmaking_enabled():
            return True
        return (
            pair.owner_instance_id
            == redis_matchmaking_service.instance_id
        )
    return session.engine.state.status.value == "finished"


def _ensure_human_match_session(pair: MatchmakingPair) -> None:
    try:
        pvp_service.get_session(pair.match_id)
        return
    except PvPSessionError:
        pass

    session = pvp_service.create_session(
        pair.match_id,
        setup_required=True,
        auto_start_when_ready=True,
        normalized=False,
        laboratory_effects_enabled=False,
    )
    pvp_service.join(
        session.session_id,
        pair.player_a_id,
        display_name=player_profile_service.get_or_create(pair.player_a_id).display_name,
    )
    pvp_service.join(
        session.session_id,
        pair.player_b_id,
        display_name=player_profile_service.get_or_create(pair.player_b_id).display_name,
    )
    attach_player_laboratory_to_session(session.session_id, pair.player_a_id)
    attach_player_laboratory_to_session(session.session_id, pair.player_b_id)


async def _provision_match_session(
    pair: MatchmakingPair,
    background_tasks: BackgroundTasks | None = None,
) -> MatchmakingPair:
    distributed = _redis_matchmaking_enabled()
    if distributed and pair.ready:
        return pair
    if (
        distributed
        and pair.owner_instance_id != redis_matchmaking_service.instance_id
    ):
        return pair

    if pair.opponent_type == "ai":
        _create_matchmaking_ai_session(pair, background_tasks=background_tasks)
    else:
        _ensure_human_match_session(pair)

    if distributed:
        pair = await redis_matchmaking_service.mark_ready(pair)
        await runtime_coordinator.touch_session(
            pair.match_id,
            ttl_seconds=360,
        )
    return pair


def _record_human_matchmaking_telemetry(pair: MatchmakingPair) -> None:
    for matched_player_id in (pair.player_a_id, pair.player_b_id):
        telemetry_service.record_now(
            event_id=(
                f"server:{pair.match_id}:"
                f"matchmaking_matched:{matched_player_id}"
            ),
            event_type="matchmaking_matched",
            player_id=matched_player_id,
            session_id=pair.match_id,
            metadata={
                "rating_difference": pair.rating_difference,
                "match_owner": pair.owner_instance_id or None,
            },
        )


def _raise_matchmaking_backend_error(exc: Exception) -> None:
    runtime_coordinator.last_error = str(exc)
    raise HTTPException(
        status_code=503,
        detail="Dağıtık eşleştirme hizmetine şu anda ulaşılamıyor.",
    ) from exc


@app.post("/matchmaking/join")
async def matchmaking_join(
    request: MatchmakingJoinRequest,
    background_tasks: BackgroundTasks,
) -> dict:
    try:
        existing_match = await _matchmaking_pair_for(request.player_id)
        if (
            existing_match is not None
            and _matchmaking_pair_is_stale(existing_match)
        ):
            await _matchmaking_clear_match(request.player_id)
            existing_match=None
        if existing_match is not None:
            existing_match = await _provision_match_session(
                existing_match,
                background_tasks,
            )
            if existing_match.ready:
                return _matchmaking_pair_response(existing_match)
            return {
                "matched": False,
                "queue": await _matchmaking_snapshot(request.player_id),
            }

        profile = player_profile_service.get_or_create(request.player_id)
        queue_entry = await _matchmaking_enqueue(
            request.player_id,
            rating=profile.rating,
            league_name_tr=profile.league_name_tr,
            level=round((sum(1 + profile.module_upgrade_levels.get(mid, 0) for mid in profile.preferred_battle_pool_ids) / 6
                         + 1 + profile.core_upgrade_levels.get(profile.selected_core_type, 0)) / 2),
        )
        if isinstance(queue_entry, MatchmakingPair):
            queue_entry = await _provision_match_session(
                queue_entry,
                background_tasks,
            )
            if queue_entry.ready:
                return _matchmaking_pair_response(queue_entry)
            return {
                "matched": False,
                "queue": await _matchmaking_snapshot(request.player_id),
            }

        # The JSON telemetry repository can be large during long beta runs.
        # Recording it after the response keeps matchmaking off the disk-I/O
        # critical path while preserving the same event.
        background_tasks.add_task(
            telemetry_service.record_now,
            event_id=(
                f"server:matchmaking:{request.player_id}:"
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

        # Beta yayınına kadar oyuncu doğrudan kendi arena/kupa aralığındaki
        # sunucu denetimli AI rakibe bağlanır; insan kuyruğu beklenmez.
        match = (
            await _matchmaking_match_with_ai(request.player_id)
            if MATCHMAKING_AI_ONLY
            else await _matchmaking_try_match(request.player_id)
        )
        if match is None:
            return {
                "matched": False,
                "queue": await _matchmaking_snapshot(request.player_id),
            }

        match = await _provision_match_session(match, background_tasks)
        if not match.ready:
            return {
                "matched": False,
                "queue": await _matchmaking_snapshot(request.player_id),
            }
        if match.opponent_type == "human":
            _record_human_matchmaking_telemetry(match)
        return _matchmaking_pair_response(match)
    except (MatchmakingError, PvPSessionError, ValueError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        if _redis_matchmaking_enabled():
            _raise_matchmaking_backend_error(exc)
        raise


@app.delete("/matchmaking/{player_id}")
async def matchmaking_cancel(player_id: str) -> dict:
    try:
        cancelled = await _matchmaking_cancel_player(player_id)
        pair = await _matchmaking_pair_for(player_id)
        if pair is not None:
            try:
                session = pvp_service.get_session(pair.match_id)
            except PvPSessionError:
                session = None
            if session is not None and session.engine.state.status == BattleStatus.WAITING:
                # A found opponent is still cancellable until the battle starts.
                await _matchmaking_clear_match(player_id)
                pvp_service.delete_session(pair.match_id)
                cancelled = True
    except Exception as exc:
        if _redis_matchmaking_enabled():
            _raise_matchmaking_backend_error(exc)
        raise
    return {"player_id": player_id, "cancelled": cancelled}


@app.get("/matchmaking/{player_id}")
async def matchmaking_status(
    player_id: str,
    background_tasks: BackgroundTasks,
) -> dict:
    try:
        snapshot = await _matchmaking_snapshot(player_id)
        if snapshot.get("queued") and not snapshot.get("provisioning") and not MATCHMAKING_AI_ONLY:
            pair = await _matchmaking_try_match(player_id)
            if pair is not None:
                await _provision_match_session(pair, background_tasks)
                snapshot = await _matchmaking_snapshot(player_id)
        if snapshot.get("provisioning"):
            pair = await _matchmaking_pair_for(player_id)
            if pair is not None:
                await _provision_match_session(pair, background_tasks)
                snapshot = await _matchmaking_snapshot(player_id)
        if (
            snapshot.get("queued")
            and not snapshot.get("provisioning")
            and (
                MATCHMAKING_AI_ONLY
                or int(snapshot.get("waited_seconds", 0))
                >= MATCHMAKING_AI_FALLBACK_SECONDS
            )
        ):
            pair = await _matchmaking_match_with_ai(player_id)
            pair = await _provision_match_session(pair, background_tasks)
            snapshot = await _matchmaking_snapshot(player_id)
        return snapshot
    except (MatchmakingError, PvPSessionError, ValueError) as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except HTTPException:
        raise
    except Exception as exc:
        if _redis_matchmaking_enabled():
            _raise_matchmaking_backend_error(exc)
        raise


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
        # The terminal WebSocket result is authoritative. If persistence or
        # telemetry failed in the runner callback, rebuild the idempotent
        # post-match projections from the still-live finished session.
        try:
            session = pvp_service.get_session(battle_id)
            if session.engine.state.status.value == "finished":
                process_completed_pvp_battle(
                    session.engine.state
                )
        except Exception:
            pass
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
        "match_type": progression["match_type"],
        "match_label_tr": progression["match_label_tr"],
        "ranked_eligible": progression["ranked_eligible"],
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


def _leaderboard_profile_rows() -> list[dict]:
    """Merge persisted players with authoritative profiles already in memory."""
    players: dict[str, dict] = {}
    current_season = monthly_season_descriptor()

    for snapshot in player_data_repository.list_snapshots():
        profile = dict(snapshot.profile)
        meta = dict(profile.get("meta_progression_state") or {})
        rating = max(0, int(profile.get("rating", 0)))
        if meta.get("active_season_id") != current_season["id"] and rating >= 3600:
            rating = 3600
        players[snapshot.player_id] = {
            "player_id": snapshot.player_id,
            "display_name": str(profile.get("display_name") or snapshot.player_id),
            "rating": rating,
            "core_damage": max(
                0,
                int(dict(meta.get("lifetime_stats") or {}).get("core_damage_dealt", 0)),
            ),
            "team_id": profile.get("team_id"),
            "team_name": profile.get("team_name"),
            "is_bot": False,
            "weekly_matches": max(0, int(meta.get("weekly_tournament_matches", 0))),
            "weekly_wins": max(0, int(meta.get("weekly_tournament_wins", 0))),
            "weekly_period": str(meta.get("weekly_tournament_period", "")),
            "weekly_registered_period": str(meta.get("weekly_tournament_registered_period", "")),
            "weekly_trophies_earned": max(0, int(meta.get("weekly_tournament_trophies_earned", 0))),
            "team_tournament_matches": max(0, int(meta.get("team_tournament_matches", 0))),
            "team_tournament_wins": max(0, int(meta.get("team_tournament_wins", 0))),
            "team_tournament_points": max(
                0,
                int(
                    meta.get(
                        "team_tournament_contribution_points",
                        meta.get("team_tournament_wins", 0),
                    )
                ),
            ),
            "team_tournament_period": str(meta.get("team_tournament_period", "")),
            "team_registered_period": str(meta.get("team_tournament_registered_period", "")),
        }

    for player_id in list(player_profile_service._profiles):
        profile = player_profile_service.get_or_create(player_id)
        players[player_id] = {
            "player_id": player_id,
            "display_name": profile.display_name,
            "rating": max(0, int(profile.rating)),
            "core_damage": max(0, int(profile.lifetime_stats.get("core_damage_dealt", 0))),
            "team_id": profile.team_id,
            "team_name": profile.team_name,
            "is_bot": False,
            "weekly_matches": profile.weekly_tournament_matches,
            "weekly_wins": profile.weekly_tournament_wins,
            "weekly_period": profile.weekly_tournament_period,
            "weekly_registered_period": profile.weekly_tournament_registered_period,
            "weekly_trophies_earned": profile.weekly_tournament_trophies_earned,
            "team_tournament_matches": profile.team_tournament_matches,
            "team_tournament_wins": profile.team_tournament_wins,
            "team_tournament_points": profile.team_tournament_contribution_points,
            "team_tournament_period": profile.team_tournament_period,
            "team_registered_period": profile.team_tournament_registered_period,
        }
    for bot in BOTS:
        players[str(bot["id"])] = {
            "player_id": str(bot["id"]),
            "display_name": str(bot["display_name"]),
            "rating": max(0, int(bot.get("rating", 0))),
            "core_damage": max(0, int(bot.get("core_damage", 0))),
            "team_id": bot.get("team_id"),
            "team_name": bot.get("team_name"),
            "is_bot": True,
            "weekly_matches": 0,
            "weekly_wins": 0,
            "weekly_period": "",
            "weekly_registered_period": "",
            "weekly_trophies_earned": 0,
            "team_tournament_matches": 0,
            "team_tournament_wins": 0,
            "team_tournament_points": 0,
            "team_tournament_period": "",
            "team_registered_period": "",
        }
    return list(players.values())


def _ranked_player_rows(players: list[dict], value_key: str) -> list[dict]:
    ordered = sorted(
        players,
        key=lambda row: (
            -int(row[value_key]),
            row["display_name"].casefold(),
            row["player_id"],
        ),
    )[:100]
    return [
        {
            "position": index,
            "player_id": row["player_id"],
            "display_name": row["display_name"],
            "rank_name_tr": rank_stage_for_rating(row["rating"])["name_tr"],
            "rank_stage_id": rank_stage_for_rating(row["rating"])["id"],
            "value": int(row[value_key]),
            "is_bot": bool(row.get("is_bot")),
        }
        for index, row in enumerate(ordered, start=1)
    ]


def _synthetic_bot_record(bot: dict) -> dict:
    """Build a plausible, bounded lifetime record for a canonical AI player."""
    rating = max(0, int(bot.get("rating", 0)))
    wins = 8 + (rating // 55)
    matches = max(wins, wins + 5 + (rating // 110))
    losses = max(0, matches - wins)
    return {
        "total_matches": matches,
        "wins": min(wins, matches),
        "losses": losses,
        "draws": 0,
        # Public profile statistics use a 0..1 ratio.  The client is the only
        # layer that formats that ratio as a percentage.
        "win_rate": round(min(1.0, wins / max(1, matches)), 6),
        "average_match_duration_ms": 90000,
        "total_damage_dealt": int(bot.get("core_damage", 0)) * 3,
    }


def _public_player_profile_view(player_id: str) -> dict:
    """Return the public first profile page without private account controls."""
    bot = next((item for item in BOTS if str(item.get("id")) == player_id), None)
    if bot is not None:
        rating = max(0, int(bot.get("rating", 0)))
        rank = rank_stage_for_rating(rating)
        core = next(
            (item for item in CORE_TYPES if item["id"] == bot.get("core_type")),
            CORE_TYPES[0],
        )
        record = _synthetic_bot_record(bot)
        matches = record["total_matches"]
        return {
            "player_id": player_id,
            "is_bot": True,
            "display_name": bot["display_name"],
            "rating": rating,
            "highest_rating": rating,
            "rank_name_tr": rank["name_tr"],
            "operator_title": bot.get("archetype_tr", "Devre Operatörü"),
            "avatar": {"selected_avatar_id": "default", "selected_avatar_frame_id": "none"},
            "team": {"team_id": bot.get("team_id"), "team_name": bot.get("team_name")},
            "featured_deck": {"module_ids": list(bot.get("battle_pool_ids", ())), "matches": matches},
            "selected_core": {"id": core["id"], "name_tr": core["name_tr"], "level": 1, "rarity": core["rarity"]},
            "season": {"id": monthly_season_descriptor()["id"], "name_tr": monthly_season_descriptor()["name_tr"], "ends_at": monthly_season_descriptor()["ends_at"], "summary": {}},
            "statistics": record,
            "visibility": {"profile": True, "avatar": False, "rewards": False, "settings": False},
        }
    try:
        profile = player_profile_service.get(player_id)
    except PlayerProfileError:
        try:
            player_data_store_service.load_player(player_id)
        except PlayerDataStoreError as exc:
            raise HTTPException(status_code=404, detail="Oyuncu profili bulunamadı.") from exc
        profile = player_profile_service.get_or_create(player_id)

    profile_view = profile.to_view()
    statistics = player_statistics_service.get_or_create(player_id).to_view()
    meta_view = meta_progression_service.view(profile)
    selected_core = next(
        (
            item
            for item in meta_view["cores"]["types"]
            if item["id"] == profile.selected_core_type
        ),
        meta_view["cores"]["types"][0],
    )
    most_used_decks = meta_view["statistics"].get("most_used_decks", [])
    featured_deck = (
        dict(most_used_decks[0])
        if most_used_decks
        else {
            "module_ids": list(profile.preferred_battle_pool_ids),
            "matches": 0,
        }
    )
    season = monthly_season_descriptor()

    return {
        "player_id": profile.player_id,
        "display_name": profile.display_name,
        "rating": max(0, int(profile.rating)),
        "highest_rating": max(0, int(profile_view["highest_rating"])),
        "rank_name_tr": profile_view["league_name_tr"],
        "operator_title": profile_view["operator_title"],
        "avatar": {
            "selected_avatar_id": profile.selected_avatar_id,
            "selected_avatar_frame_id": profile.selected_avatar_frame_id,
        },
        "team": {
            "team_id": profile.team_id,
            "team_name": profile.team_name,
        },
        "featured_deck": featured_deck,
        "selected_core": {
            "id": selected_core["id"],
            "name_tr": selected_core["name_tr"],
            "level": selected_core["level"],
            "rarity": selected_core["rarity"],
        },
        "season": {
            "id": season["id"],
            "name_tr": season["name_tr"],
            "ends_at": season["ends_at"],
            "summary": profile_view["season_summary"],
        },
        "statistics": {
            "total_matches": statistics["total_matches"],
            "wins": statistics["wins"],
            "losses": statistics["losses"],
            "draws": statistics["draws"],
            "win_rate": statistics["win_rate"],
            "average_match_duration_ms": statistics["average_match_duration_ms"],
            "total_damage_dealt": statistics["total_damage_dealt"],
        },
        "visibility": {
            "profile": True,
            "avatar": False,
            "rewards": False,
            "settings": False,
        },
    }


@app.get("/public-profiles/{player_id}")
def get_public_player_profile(player_id: str) -> dict:
    return _public_player_profile_view(player_id)


def _public_team_profile_view(team_id: str) -> dict:
    """Return a read-only team profile for both player and canonical AI teams."""
    clean_team_id = str(team_id or "").strip()
    ai_members = [
        bot for bot in BOTS
        if str(bot.get("team_id") or "").strip() == clean_team_id
    ]

    members: list[dict] = []
    if ai_members:
        team_name = str(ai_members[0].get("team_name") or "Takım")
        member_limit = 30
        for bot in ai_members:
            record = _synthetic_bot_record(bot)
            members.append({
                "player_id": bot["id"],
                "display_name": bot["display_name"],
                "trophies": max(0, int(bot.get("rating", 0))),
                "role": "member",
                "online": True,
                "is_bot": True,
                "rank_name_tr": rank_stage_for_rating(int(bot.get("rating", 0)))["name_tr"],
                "operator_title": bot.get("archetype_tr", "Devre Operatörü"),
                "statistics": record,
            })
    else:
        try:
            team = team_service.get_team(clean_team_id)
        except TeamServiceError as exc:
            raise HTTPException(status_code=404, detail="Takım profili bulunamadı.") from exc
        team_name = str(team.get("name") or "Takım")
        member_limit = max(1, int(team.get("member_limit", 30)))
        online_ids = set(player_profile_service._profiles)
        for member_id in team.get("member_ids", []):
            profile = _team_member_profile(member_id)
            statistics = player_statistics_service.get_or_create(member_id).to_view()
            members.append({
                "player_id": member_id,
                "display_name": profile.display_name,
                "trophies": max(0, int(profile.rating)),
                "role": "owner" if member_id == team.get("owner_id") else "member",
                "online": member_id in online_ids,
                "is_bot": False,
                "rank_name_tr": profile.league_name_tr,
                "operator_title": profile.to_view()["operator_title"],
                "statistics": {
                    "total_matches": max(0, int(statistics["total_matches"])),
                    "wins": max(0, int(statistics["wins"])),
                    "losses": max(0, int(statistics["losses"])),
                    "draws": max(0, int(statistics["draws"])),
                    "win_rate": max(0.0, min(1.0, float(statistics["win_rate"]))),
                    "average_match_duration_ms": max(0, int(statistics["average_match_duration_ms"])),
                    "total_damage_dealt": max(0, int(statistics["total_damage_dealt"])),
                },
            })

    members.sort(key=lambda item: (-item["trophies"], item["display_name"].casefold()))
    if ai_members and members:
        members[0]["role"] = "owner"
    for position, member in enumerate(members, start=1):
        member["position"] = position

    total_matches = sum(member["statistics"]["total_matches"] for member in members)
    total_wins = sum(member["statistics"]["wins"] for member in members)
    total_losses = sum(member["statistics"]["losses"] for member in members)
    total_draws = sum(member["statistics"]["draws"] for member in members)
    total_trophies = sum(member["trophies"] for member in members)

    competition = build_events_view(_leaderboard_profile_rows())
    tournament_row = next(
        (
            row for row in competition["team_tournament"]["standings"]
            if row["team_id"] == clean_team_id
        ),
        None,
    )
    return {
        "team_id": clean_team_id,
        "name": team_name,
        "member_count": len(members),
        "member_limit": member_limit,
        "total_trophies": total_trophies,
        "average_trophies": round(total_trophies / max(1, len(members))),
        "highest_member_trophies": max((member["trophies"] for member in members), default=0),
        "members": members,
        "statistics": {
            "total_matches": total_matches,
            "wins": total_wins,
            "losses": total_losses,
            "draws": total_draws,
            "win_rate": round(min(1.0, total_wins / max(1, total_matches)), 6),
        },
        "tournament": {
            "position": tournament_row.get("position") if tournament_row else None,
            "points": tournament_row.get("points", 0) if tournament_row else 0,
            "qualified_member_count": tournament_row.get("qualified_member_count", 0) if tournament_row else 0,
            "minimum_reward_points": competition["team_tournament"]["minimum_reward_points"],
        },
    }


@app.get("/team-profiles/{team_id}")
def get_public_team_profile(team_id: str) -> dict:
    return _public_team_profile_view(team_id)


@app.get("/leaderboards")
def get_leaderboards(player_id: str | None = None) -> dict:
    players = _leaderboard_profile_rows()
    teams: dict[str, dict] = {}
    for player in players:
        team_id = str(player.get("team_id") or "").strip()
        team_name = str(player.get("team_name") or "").strip()
        if not team_id or not team_name:
            continue
        team = teams.setdefault(
            team_id,
            {
                "team_id": team_id,
                "team_name": team_name,
                "member_count": 0,
                "value": 0,
            },
        )
        team["member_count"] += 1
        team["value"] += int(player["rating"])

    ordered_teams = sorted(
        teams.values(),
        key=lambda row: (
            -row["value"],
            row["team_name"].casefold(),
            row["team_id"],
        ),
    )[:100]
    trophy_groups: dict[str, dict] = {}
    for player in players:
        stage = rank_stage_for_rating(player["rating"])
        group = trophy_groups.setdefault(
            stage["id"],
            {
                "id": stage["id"],
                "name_tr": stage["name_tr"],
                "minimum_rating": int(stage["minimum_rating"]),
                "players": [],
            },
        )
        group["players"].append(player)
    ordered_groups = []
    for group in sorted(trophy_groups.values(), key=lambda item: item["minimum_rating"]):
        ordered_groups.append({
            **{key: value for key, value in group.items() if key != "players"},
            "standings": _ranked_player_rows(group["players"], "rating"),
        })
    viewer_group = None
    if player_id:
        viewer = next(
            (player for player in players if player["player_id"] == player_id),
            None,
        )
        if viewer is not None:
            viewer_stage_id = rank_stage_for_rating(viewer["rating"])["id"]
            viewer_group = next(
                (group for group in ordered_groups if group["id"] == viewer_stage_id),
                None,
            )
    return {
        "season": monthly_season_descriptor(),
        "top_five_rewards": [dict(item) for item in LEADERBOARD_PRIZES[:5]],
        "top_ten_rewards": [dict(item) for item in LEADERBOARD_PRIZES],
        "trophies": _ranked_player_rows(players, "rating"),
        "trophy_groups": ordered_groups,
        "viewer_trophy_group": viewer_group,
        "core_damage": _ranked_player_rows(players, "core_damage"),
        "teams": [
            {**row, "position": index}
            for index, row in enumerate(ordered_teams, start=1)
        ],
    }


def _real_competition_profiles() -> list:
    player_ids = set(player_profile_service._profiles)
    player_ids.update(snapshot.player_id for snapshot in player_data_repository.list_snapshots())
    return [_team_member_profile(player_id) for player_id in sorted(player_ids)]


def _queue_competition_reward(profile, *, source: str, period_id: str, position: int, prize: dict, team_id: str | None = None) -> bool:
    message_id = f"{source}:{period_id}:{profile.player_id}"
    if any(item.get("message_id") == message_id for item in profile.reward_inbox):
        return False
    source_names = {
        "season_leaderboard": "Sezon Lider Panosu",
        "weekly_tournament": "Haftalık Devre Turnuvası",
        "team_tournament": "Takımlar Arası Turnuva",
    }
    profile.reward_inbox.append({
        "message_id": message_id,
        "source": source,
        "period_id": period_id,
        "position": int(position),
        "title_tr": f"{source_names[source]} · {position}. sıra",
        "body_tr": "Sıralama kapandı. Ödül kasan teslim edilmeyi bekliyor.",
        "status": "unclaimed",
        "team_id": team_id,
        "chest": dict(prize),
    })
    profile.reward_inbox[:] = profile.reward_inbox[-60:]
    return True


def _settle_competition_rewards(player_id: str) -> None:
    """Lazily materialize ended season/week/team rewards exactly once."""
    with REWARD_INBOX_LOCK:
        profiles = _real_competition_profiles()
        target = next((item for item in profiles if item.player_id == player_id), None)
        if target is None:
            return
        changed = False
        current_events = build_events_view(_leaderboard_profile_rows())
        current_week = current_events["weekly_tournament"]["period"]["id"]
        current_month = current_events["team_tournament"]["period"]["id"]
        current_season = monthly_season_descriptor()["id"]

        # Monthly general leaderboard: archived final ratings are immutable and
        # therefore safe to settle after rollover.
        for archive in target.season_archives:
            period_id = str(archive.get("season_id") or archive.get("id") or "")
            if not period_id or period_id == current_season:
                continue
            rows = []
            for profile in profiles:
                record = next(
                    (
                        item for item in profile.season_archives
                        if str(item.get("season_id") or item.get("id") or "") == period_id
                    ),
                    None,
                )
                if record is not None:
                    rows.append((profile.player_id, int(record.get("final_rating", 0))))
            rows.sort(key=lambda item: (-item[1], item[0]))
            position = next((index for index, row in enumerate(rows, 1) if row[0] == player_id), 0)
            if 1 <= position <= len(LEADERBOARD_PRIZES):
                changed |= _queue_competition_reward(
                    target,
                    source="season_leaderboard",
                    period_id=period_id,
                    position=position,
                    prize=dict(LEADERBOARD_PRIZES[position - 1]),
                )

        # Weekly standings retain the last closed period until the player
        # registers or records progress in a newer week.
        weekly_period = str(target.weekly_tournament_period or "")
        if weekly_period and weekly_period != current_week:
            rows = sorted(
                (
                    (profile.player_id, int(profile.weekly_tournament_trophies_earned), int(profile.weekly_tournament_wins))
                    for profile in profiles
                    if profile.weekly_tournament_period == weekly_period
                    and profile.weekly_tournament_registered_period == weekly_period
                ),
                key=lambda item: (-item[1], -item[2], item[0]),
            )
            position = next((index for index, row in enumerate(rows, 1) if row[0] == player_id), 0)
            if 1 <= position <= len(WEEKLY_PRIZES):
                changed |= _queue_competition_reward(
                    target,
                    source="weekly_tournament",
                    period_id=weekly_period,
                    position=position,
                    prize=dict(WEEKLY_PRIZES[position - 1]),
                )

        team_period = str(target.team_tournament_period or "")
        if (
            team_period
            and team_period != current_month
            and target.team_id
            and int(target.team_tournament_contribution_points) >= 5
        ):
            team_scores: dict[str, int] = {}
            for profile in profiles:
                if profile.team_tournament_period != team_period or not profile.team_id:
                    continue
                team_scores[profile.team_id] = team_scores.get(profile.team_id, 0) + int(profile.team_tournament_contribution_points)
            ranked_teams = sorted(team_scores.items(), key=lambda item: (-item[1], item[0]))
            position = next((index for index, row in enumerate(ranked_teams, 1) if row[0] == target.team_id), 0)
            if 1 <= position <= len(TEAM_PRIZES):
                changed |= _queue_competition_reward(
                    target,
                    source="team_tournament",
                    period_id=team_period,
                    position=position,
                    prize=dict(TEAM_PRIZES[position - 1]),
                    team_id=target.team_id,
                )
        if changed:
            persist_player_data(player_id)


def _reward_inbox_view(profile) -> dict:
    messages = [dict(item) for item in reversed(profile.reward_inbox)]
    return {
        "player_id": profile.player_id,
        "messages": messages,
        "unclaimed_count": sum(item.get("status") == "unclaimed" for item in messages),
        "universal_module_shards": int(profile.universal_module_shards),
    }


@app.get("/profile/{player_id}/reward-inbox")
def get_reward_inbox(player_id: str) -> dict:
    _settle_competition_rewards(player_id)
    return _reward_inbox_view(_team_member_profile(player_id))


@app.post("/profile/{player_id}/reward-inbox/{message_id}/claim")
def claim_reward_inbox_item(player_id: str, message_id: str, request: MetaOperationRequest) -> dict:
    with REWARD_INBOX_LOCK:
        profile = _team_member_profile(player_id)
        if request.request_id in profile.reward_inbox_receipts:
            return {**_reward_inbox_view(profile), "receipt": dict(profile.reward_inbox_receipts[request.request_id]), "replayed": True}
        message = next((item for item in profile.reward_inbox if item.get("message_id") == message_id), None)
        if message is None:
            raise HTTPException(status_code=404, detail="Ödül mesajı bulunamadı.")
        if message.get("status") != "unclaimed":
            raise HTTPException(status_code=422, detail="Bu ödül daha önce alındı.")
        reward = dict(message.get("chest") or {})
        profile.circuit_credits += max(0, int(reward.get("circuit_credits", 0)))
        profile.flux_shards += max(0, int(reward.get("flux_shards", 0)))
        profile.universal_module_shards += max(0, int(reward.get("universal_module_shards", 0)))
        player_unlocks = {
            "avatar_id": "unlocked_avatar_ids",
            "avatar_frame_id": "unlocked_avatar_frame_ids",
            "emoji_id": "unlocked_battle_emoji_ids",
            "profile_background_id": "unlocked_profile_background_ids",
            "badge_id": "unlocked_badge_ids",
            "rank_trophy_id": "unlocked_rank_trophy_ids",
        }
        for reward_key, attribute in player_unlocks.items():
            value = str(reward.get(reward_key) or "").strip()
            if value:
                setattr(profile, attribute, tuple(dict.fromkeys((*getattr(profile, attribute), value))))
        if message.get("source") == "team_tournament" and message.get("team_id"):
            team_service.grant_reward_cosmetics(str(message["team_id"]), reward)
        message["status"] = "claimed"
        receipt = {
            "request_id": request.request_id,
            "message_id": message_id,
            "source": message.get("source"),
            "position": message.get("position"),
            "chest": reward,
        }
        profile.reward_inbox_receipts[request.request_id] = dict(receipt)
        persist_player_data(player_id)
        return {**_reward_inbox_view(profile), "receipt": receipt, "profile": profile.to_view(), "replayed": False}


def _team_member_profile(player_id: str):
    if player_id not in player_profile_service._profiles:
        snapshot = player_data_repository.load(player_id)
        if snapshot is not None:
            player_data_store_service.load_player(player_id)
    return player_profile_service.get_or_create(player_id)


def _social_player_summary(player_id: str) -> dict:
    profile = _team_member_profile(player_id)
    return {
        "player_id": profile.player_id,
        "is_bot": False,
        "display_name": profile.display_name,
        "rating": max(0, int(profile.rating)),
        "rank_name_tr": profile.league_name_tr,
        "team_id": profile.team_id,
        "team_name": profile.team_name,
        "online": player_id in player_profile_service._profiles,
        "avatar": {
            "selected_avatar_id": profile.selected_avatar_id,
            "selected_avatar_frame_id": profile.selected_avatar_frame_id,
        },
    }


def _replace_tuple(profile, attribute: str, values) -> None:
    setattr(profile, attribute, tuple(dict.fromkeys(str(value) for value in values if value)))


def _battle_session_finished(session_id: str | None) -> bool:
    if not session_id:
        return False
    try:
        session = pvp_service.get_session(str(session_id))
    except PvPSessionError:
        return False
    status = getattr(session.engine.state.status, "value", session.engine.state.status)
    return str(status) == "finished"


def _complete_social_battle_invites(session_id: str) -> bool:
    clean_session_id = str(session_id or "").strip()
    if not clean_session_id:
        return False
    changed = False
    with SOCIAL_LOCK:
        candidates = set(player_profile_service._profiles)
        candidates.update(snapshot.player_id for snapshot in player_data_repository.list_snapshots())
        for owner_id in candidates:
            profile = _team_member_profile(owner_id)
            owner_changed = False
            for item in profile.social_battle_invites:
                if (
                    item.get("battle_session_id") == clean_session_id
                    and item.get("status") == "accepted"
                ):
                    item["status"] = "completed"
                    owner_changed = True
                    changed = True
            if owner_changed:
                persist_player_data(owner_id)
    return changed


def _social_view(player_id: str) -> dict:
    profile = _team_member_profile(player_id)
    invitations = []
    changed = False
    for stored in profile.social_battle_invites[-50:]:
        item = dict(stored)
        if item.get("status") == "accepted" and _battle_session_finished(item.get("battle_session_id")):
            item["status"] = "completed"
            stored["status"] = "completed"
            changed = True
        invitations.append(item)
    if changed:
        persist_player_data(player_id)
    return {
        "player_id": player_id,
        "friend_limit": 100,
        "friends": [_social_player_summary(value) for value in profile.friend_ids],
        "incoming_requests": [
            _social_player_summary(value)
            for value in profile.incoming_friend_request_ids
        ],
        "outgoing_requests": [
            _social_player_summary(value)
            for value in profile.outgoing_friend_request_ids
        ],
        "battle_invites": invitations,
    }


def _create_unranked_social_session(
    session_id: str,
    player_a_id: str,
    player_b_id: str,
    *,
    match_type: str,
) -> dict:
    try:
        session = pvp_service.get_session(session_id)
    except PvPSessionError:
        session = pvp_service.create_session(
            session_id,
            setup_required=True,
            auto_start_when_ready=True,
            match_type=match_type,
            season_id=monthly_season_descriptor()["id"],
            ranked_eligible=False,
            normalized=True,
            laboratory_effects_enabled=False,
        )
    for player_id in (player_a_id, player_b_id):
        profile = _team_member_profile(player_id)
        pvp_service.join(session_id, player_id, display_name=profile.display_name)
        attach_player_laboratory_to_session(session_id, player_id)
    return {
        "session_id": session.session_id,
        "players": [player_a_id, player_b_id],
        "opponent_type": "human",
        "match_type": match_type,
        "ranked_eligible": False,
        "rewards_enabled": False,
    }


@app.get("/social/{player_id}")
def get_social_view(player_id: str) -> dict:
    return _social_view(player_id)


@app.get("/players/search")
def search_players(
    player_id: str = Query(...),
    q: str = Query("", min_length=1, max_length=24),
) -> dict:
    viewer = _team_member_profile(player_id)
    needle = " ".join(str(q).strip().split()).casefold()
    excluded = {
        player_id,
        *viewer.friend_ids,
        *viewer.incoming_friend_request_ids,
        *viewer.outgoing_friend_request_ids,
        *viewer.blocked_player_ids,
    }
    rows = []
    for row in _leaderboard_profile_rows():
        candidate_id = str(row.get("player_id", ""))
        if row.get("is_bot") or candidate_id in excluded:
            continue
        if needle not in str(row.get("display_name", "")).casefold():
            continue
        rows.append(_social_player_summary(candidate_id))
        if len(rows) >= 20:
            break
    return {"query": q, "players": rows}


@app.post("/social/{player_id}/requests")
def send_friend_request(player_id: str, request: FriendRequestOperation) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    target_id = str(request.target_player_id).strip()
    if not target_id or target_id == player_id:
        raise HTTPException(status_code=422, detail="Geçerli bir oyuncu seç.")
    with SOCIAL_LOCK:
        profile = _team_member_profile(player_id)
        target = _team_member_profile(target_id)
        if target_id in profile.blocked_player_ids or player_id in target.blocked_player_ids:
            raise HTTPException(status_code=422, detail="Bu oyuncuyla arkadaşlık isteği kullanılamıyor.")
        if target_id in profile.friend_ids:
            return {**_social_view(player_id), "replayed": True}
        if len(profile.friend_ids) >= 100 or len(target.friend_ids) >= 100:
            raise HTTPException(status_code=422, detail="Arkadaş sınırı 100 oyuncudur.")
        if player_id in target.outgoing_friend_request_ids:
            _replace_tuple(profile, "friend_ids", (*profile.friend_ids, target_id))
            _replace_tuple(target, "friend_ids", (*target.friend_ids, player_id))
            _replace_tuple(profile, "incoming_friend_request_ids", (value for value in profile.incoming_friend_request_ids if value != target_id))
            _replace_tuple(target, "outgoing_friend_request_ids", (value for value in target.outgoing_friend_request_ids if value != player_id))
        else:
            _replace_tuple(profile, "outgoing_friend_request_ids", (*profile.outgoing_friend_request_ids, target_id))
            _replace_tuple(target, "incoming_friend_request_ids", (*target.incoming_friend_request_ids, player_id))
        persist_player_data(player_id)
        persist_player_data(target_id)
    return _social_view(player_id)


@app.post("/social/{player_id}/requests/accept")
def accept_friend_request(player_id: str, request: FriendDecisionOperation) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    requester_id = str(request.requester_id).strip()
    with SOCIAL_LOCK:
        profile = _team_member_profile(player_id)
        requester = _team_member_profile(requester_id)
        if requester_id not in profile.incoming_friend_request_ids and requester_id not in profile.friend_ids:
            raise HTTPException(status_code=422, detail="Bekleyen arkadaşlık isteği bulunamadı.")
        _replace_tuple(profile, "friend_ids", (*profile.friend_ids, requester_id))
        _replace_tuple(requester, "friend_ids", (*requester.friend_ids, player_id))
        _replace_tuple(profile, "incoming_friend_request_ids", (value for value in profile.incoming_friend_request_ids if value != requester_id))
        _replace_tuple(requester, "outgoing_friend_request_ids", (value for value in requester.outgoing_friend_request_ids if value != player_id))
        persist_player_data(player_id)
        persist_player_data(requester_id)
    return _social_view(player_id)


@app.post("/social/{player_id}/requests/reject")
def reject_friend_request(player_id: str, request: FriendDecisionOperation) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    requester_id = str(request.requester_id).strip()
    with SOCIAL_LOCK:
        profile = _team_member_profile(player_id)
        requester = _team_member_profile(requester_id)
        _replace_tuple(profile, "incoming_friend_request_ids", (value for value in profile.incoming_friend_request_ids if value != requester_id))
        _replace_tuple(requester, "outgoing_friend_request_ids", (value for value in requester.outgoing_friend_request_ids if value != player_id))
        persist_player_data(player_id)
        persist_player_data(requester_id)
    return _social_view(player_id)


@app.post("/social/{player_id}/battle-invites")
def create_social_battle_invite(player_id: str, request: SocialBattleInviteOperation) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    opponent_id = str(request.opponent_id).strip()
    with SOCIAL_LOCK:
        profile = _team_member_profile(player_id)
        opponent = _team_member_profile(opponent_id)
        if opponent_id not in profile.friend_ids:
            raise HTTPException(status_code=422, detail="Arkadaş savaşı için önce arkadaş olmalısınız.")
        invite_id = "friend-battle-" + hashlib.sha1(request.request_id.encode("utf-8")).hexdigest()[:16]
        existing = next((item for item in profile.social_battle_invites if item.get("invite_id") == invite_id), None)
        if existing is None:
            item = {
                "invite_id": invite_id,
                "challenger_id": player_id,
                "challenger_name": profile.display_name,
                "opponent_id": opponent_id,
                "opponent_name": opponent.display_name,
                "status": "pending",
                "match_type": "friend_battle",
                "ranked": False,
                "rewards_enabled": False,
            }
            profile.social_battle_invites.append(dict(item))
            opponent.social_battle_invites.append(dict(item))
            profile.social_battle_invites[:] = profile.social_battle_invites[-50:]
            opponent.social_battle_invites[:] = opponent.social_battle_invites[-50:]
            persist_player_data(player_id)
            persist_player_data(opponent_id)
    return _social_view(player_id)


@app.post("/social/{player_id}/battle-invites/{invite_id}/accept")
def accept_social_battle_invite(
    player_id: str,
    invite_id: str,
    request: EventRegistrationOperation,
) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    with SOCIAL_LOCK:
        profile = _team_member_profile(player_id)
        invite = next((item for item in profile.social_battle_invites if item.get("invite_id") == invite_id), None)
        if invite is None or invite.get("opponent_id") != player_id:
            raise HTTPException(status_code=404, detail="Arkadaş savaşı daveti bulunamadı.")
        challenger_id = str(invite["challenger_id"])
        session_id = str(invite.get("battle_session_id") or f"social-{invite_id}")
        for owner_id in (player_id, challenger_id):
            owner = _team_member_profile(owner_id)
            for item in owner.social_battle_invites:
                if item.get("invite_id") == invite_id:
                    item["status"] = "accepted"
                    item["battle_session_id"] = session_id
            persist_player_data(owner_id)
    battle = _create_unranked_social_session(
        session_id,
        challenger_id,
        player_id,
        match_type="friend_battle",
    )
    return {**_social_view(player_id), "battle": battle}


def _team_summary(team: dict) -> dict:
    ratings = []
    for member_id in team.get("member_ids", []):
        ratings.append(max(0, int(_team_member_profile(member_id).rating)))
    return {
        "team_id": team["team_id"],
        "name": team["name"],
        "member_count": len(team.get("member_ids", [])),
        "member_limit": int(team.get("member_limit", 30)),
        "total_trophies": sum(ratings),
    }


def _team_view(team: dict, player_id: str) -> dict:
    from .arena_canon import MODULES

    online_ids = set(player_profile_service._profiles)
    profiles = {
        member_id: _team_member_profile(member_id)
        for member_id in team.get("member_ids", [])
    }
    members = sorted(
        (
            {
                "player_id": member_id,
                "display_name": profile.display_name,
                "trophies": max(0, int(profile.rating)),
                "role": "owner" if member_id == team.get("owner_id") else "member",
                "online": member_id in online_ids or member_id == player_id,
            }
            for member_id, profile in profiles.items()
        ),
        key=lambda item: (-item["trophies"], item["display_name"].casefold()),
    )
    names = {
        member_id: profile.display_name
        for member_id, profile in profiles.items()
    }
    requests = []
    seen_request_weeks: set[tuple[str, str]] = set()
    for item in reversed(team.get("module_requests", [])[-100:]):
        requester_id = str(item.get("requester_id", ""))
        week_key = str(item.get("week_key", ""))
        requester_week = (requester_id, week_key)
        # Older builds allowed several requests from one player in the same
        # week.  Keep the newest one visible and collapse the legacy extras.
        if requester_id and week_key:
            if requester_week in seen_request_weeks:
                continue
            seen_request_weeks.add(requester_week)
        module = MODULES.get(str(item.get("module_id")), {})
        policy = TEAM_REQUEST_POLICY.get(str(item.get("rarity", "")), {})
        # Requests persisted before the current rarity amounts were lowered
        # must not keep advertising the legacy 12/8/4/2 target in the UI.
        # The service also applies this cap when the next donation mutates the
        # record, so the read model and write path stay consistent.
        requested_amount = int(item.get("requested_amount", policy.get("amount", 0)) or 0)
        if policy.get("amount"):
            requested_amount = min(requested_amount, int(policy["amount"]))
        donated_amount = min(int(item.get("donated_amount", 0) or 0), requested_amount)
        requests.append({
            **dict(item),
            "requested_amount": requested_amount,
            "donated_amount": donated_amount,
            "fulfilled": bool(item.get("fulfilled")) or donated_amount >= requested_amount,
            "module_name_tr": module.get("name_tr", item.get("module_id", "Modül")),
            "requester_name": names.get(item.get("requester_id"), "Oyuncu"),
            "is_own": item.get("requester_id") == player_id,
        })
    messages = [
        {
            **dict(item),
            "author_name": names.get(item.get("author_id"), "Oyuncu"),
            "is_own": item.get("author_id") == player_id,
        }
        for item in team.get("messages", [])[-100:]
        if item.get("visibility", "visible") == "visible"
    ]
    challenges = []
    completed_session_ids: set[str] = set()
    for stored in reversed(team.get("training_challenges", [])[-50:]):
        item = dict(stored)
        if item.get("status") == "accepted" and _battle_session_finished(item.get("battle_session_id")):
            item["status"] = "completed"
            completed_session_ids.add(str(item.get("battle_session_id") or ""))
        challenges.append({
            **item,
            "challenger_name": names.get(item.get("challenger_id"), "Oyuncu"),
            "opponent_name": names.get(item.get("opponent_id"), "Oyuncu"),
            "can_accept": (
                item.get("opponent_id") == player_id
                and item.get("status") == "pending"
            ),
        })
    # Read-time reconciliation also persists the terminal state. This covers
    # battles completed by an older runner process before the authoritative
    # finish callback learned how to close team invitations.
    for session_id in completed_session_ids:
        if session_id:
            team_service.complete_training_challenge(session_id)
    applicants = []
    for applicant_id in team.get("application_ids", []):
        try:
            applicant = _team_member_profile(str(applicant_id))
        except Exception:
            continue
        applicants.append({
            "player_id": applicant.player_id,
            "display_name": applicant.display_name,
            "trophies": max(0, int(applicant.rating)),
            "rank_name_tr": applicant.league_name_tr,
        })
    overview = _public_team_profile_view(team["team_id"])
    return {
        "joined": True,
        **_team_summary(team),
        "average_trophies": overview["average_trophies"],
        "statistics": overview["statistics"],
        "tournament": overview["tournament"],
        "owner_id": team.get("owner_id"),
        "is_owner": team.get("owner_id") == player_id,
        "cosmetics": dict(team.get("cosmetics") or {}),
        "applications": applicants,
        "members": members,
        "module_requests": requests,
        "messages": messages,
        "training_challenges": challenges,
        "request_policy": TEAM_REQUEST_POLICY,
        "online_opponents": [
            item for item in members
            if item["player_id"] != player_id and item["online"]
        ],
    }


@app.get("/teams")
def list_teams() -> dict:
    return {
        "teams": [_team_summary(team) for team in team_service.list_teams()]
    }


@app.get("/teams/player/{player_id}")
def get_player_team(player_id: str) -> dict:
    team = team_service.team_for_player(player_id)
    profile = _team_member_profile(player_id)
    if team is None:
        if profile.team_id or profile.team_name:
            profile.team_id = None
            profile.team_name = None
            persist_player_data(player_id)
        listed_teams = team_service.list_teams()
        pending_team = next(
            (candidate for candidate in listed_teams if player_id in candidate.get("application_ids", [])),
            None,
        )
        return {
            "joined": False,
            "application_pending": pending_team is not None,
            "applied_team_id": pending_team.get("team_id") if pending_team else None,
            "available_teams": [
                _team_summary(candidate)
                for candidate in listed_teams
                if len(candidate.get("member_ids", []))
                < int(candidate.get("member_limit", 30))
            ][:50],
            "request_policy": TEAM_REQUEST_POLICY,
        }
    profile.team_id = team["team_id"]
    profile.team_name = team["name"]
    return _team_view(team, player_id)


@app.post("/teams")
def create_team(request: TeamCreateRequest) -> dict:
    try:
        result = team_service.create_team(
            request.player_id,
            request.name,
            request.request_id,
        )
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    profile = _team_member_profile(request.player_id)
    profile.team_id = result["team_id"]
    profile.team_name = result["team"]["name"]
    persist_player_data(request.player_id)
    return {**_team_view(result["team"], request.player_id), "replayed": result["replayed"]}


@app.post("/teams/{team_id}/join")
def join_team(team_id: str, request: TeamJoinRequest) -> dict:
    try:
        result = team_service.join_team(
            request.player_id,
            team_id,
            request.request_id,
        )
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        "joined": False,
        "application_pending": True,
        "applied_team_id": result["team_id"],
        "replayed": result["replayed"],
        "available_teams": [
            _team_summary(candidate)
            for candidate in team_service.list_teams()
            if len(candidate.get("member_ids", [])) < int(candidate.get("member_limit", 30))
        ][:50],
        "request_policy": TEAM_REQUEST_POLICY,
    }


@app.post("/teams/{team_id}/applications/review")
def review_team_application(team_id: str, request: TeamApplicationActionRequest) -> dict:
    try:
        result = team_service.review_application(
            team_id=team_id,
            owner_id=request.player_id,
            applicant_id=request.applicant_id,
            accept=request.accept,
            request_id=request.request_id,
        )
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if result["accepted"]:
        applicant = _team_member_profile(request.applicant_id)
        applicant.team_id = team_id
        applicant.team_name = result["team"]["name"]
        persist_player_data(applicant.player_id)
    return {**_team_view(result["team"], request.player_id), "replayed": result["replayed"]}


@app.post("/teams/{team_id}/members/remove")
def remove_team_member(team_id: str, request: TeamMemberActionRequest) -> dict:
    try:
        result = team_service.remove_member(
            team_id=team_id,
            owner_id=request.player_id,
            member_id=request.member_id,
            request_id=request.request_id,
        )
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    member = _team_member_profile(request.member_id)
    member.team_id = None
    member.team_name = None
    persist_player_data(member.player_id)
    return {**_team_view(result["team"], request.player_id), "replayed": result["replayed"]}


@app.post("/teams/{team_id}/leave")
def leave_team(team_id: str, request: TeamActionRequest) -> dict:
    try:
        result = team_service.leave_team(
            team_id=team_id,
            player_id=request.player_id,
            request_id=request.request_id,
        )
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    profile = _team_member_profile(request.player_id)
    profile.team_id = None
    profile.team_name = None
    persist_player_data(profile.player_id)
    return {
        "joined": False,
        "replayed": result["replayed"],
        "available_teams": [
            _team_summary(candidate)
            for candidate in team_service.list_teams()
            if len(candidate.get("member_ids", [])) < int(candidate.get("member_limit", 30))
        ][:50],
        "request_policy": TEAM_REQUEST_POLICY,
    }


@app.post("/teams/{team_id}/owner/transfer")
def transfer_team_owner(team_id: str, request: TeamMemberActionRequest) -> dict:
    try:
        result = team_service.transfer_ownership(
            team_id=team_id,
            owner_id=request.player_id,
            member_id=request.member_id,
            request_id=request.request_id,
        )
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {**_team_view(result["team"], request.player_id), "replayed": result["replayed"]}


@app.post("/teams/{team_id}/cosmetics")
def update_team_cosmetics(team_id: str, request: TeamCosmeticsRequest) -> dict:
    try:
        result = team_service.set_cosmetics(
            team_id=team_id,
            owner_id=request.player_id,
            selections={
                "avatar_id": request.avatar_id,
                "avatar_frame_id": request.avatar_frame_id,
                "bar_background_id": request.bar_background_id,
                "name_frame_id": request.name_frame_id,
            },
            request_id=request.request_id,
        )
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {**_team_view(result["team"], request.player_id), "replayed": result["replayed"]}


@app.post("/teams/{team_id}/module-requests")
def create_team_module_request(team_id: str, request: TeamModuleRequest) -> dict:
    from .arena_canon import MODULES, unlocked_module_ids

    profile = _team_member_profile(request.player_id)
    module = MODULES.get(request.module_id)
    if module is None or request.module_id not in unlocked_module_ids(
        max(profile.rating, profile.highest_rating)
    ):
        raise HTTPException(
            status_code=422,
            detail="Yalnız koleksiyonda açılmış modüller istenebilir.",
        )
    try:
        result = team_service.create_module_request(
            team_id=team_id,
            player_id=request.player_id,
            module_id=request.module_id,
            rarity=str(module["rarity"]),
            request_id=request.request_id,
        )
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        **_team_view(team_service.get_team(team_id), request.player_id),
        "operation": result,
    }


@app.post("/teams/{team_id}/module-requests/{module_request_id}/donate")
def donate_team_module_shard(
    team_id: str,
    module_request_id: str,
    request: TeamActionRequest,
) -> dict:
    donor = _team_member_profile(request.player_id)
    team = team_service.get_team(team_id)
    target = next(
        (
            item
            for item in team.get("module_requests", [])
            if item.get("request_id") == module_request_id
        ),
        None,
    )
    if target is None:
        raise HTTPException(status_code=404, detail="Modül isteği bulunamadı.")
    module_id = str(target.get("module_id", ""))
    try:
        result = team_service.donate_module_shard(
            team_id=team_id,
            player_id=request.player_id,
            module_request_id=module_request_id,
            request_id=request.request_id,
            available_amount=int(donor.module_shards.get(module_id, 0)),
        )
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not result["replayed"]:
        requester = _team_member_profile(result["requester_id"])
        donor.module_shards[module_id] = int(donor.module_shards.get(module_id, 0)) - 1
        requester.module_shards[module_id] = int(requester.module_shards.get(module_id, 0)) + 1
        persist_player_data(donor.player_id)
        persist_player_data(requester.player_id)
    return {
        **_team_view(team_service.get_team(team_id), request.player_id),
        "operation": result,
    }


@app.post("/teams/{team_id}/messages")
def post_team_message(team_id: str, request: TeamMessageRequest) -> dict:
    try:
        result = team_service.post_message(
            team_id=team_id,
            player_id=request.player_id,
            message=request.message,
            request_id=request.request_id,
        )
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        **_team_view(team_service.get_team(team_id), request.player_id),
        "operation": result,
    }


@app.post("/teams/{team_id}/training-challenges")
def create_team_training_challenge(
    team_id: str,
    request: TeamTrainingChallengeRequest,
) -> dict:
    if request.opponent_id not in player_profile_service._profiles:
        raise HTTPException(status_code=422, detail="Seçilen takım üyesi çevrimiçi değil.")
    try:
        result = team_service.create_training_challenge(
            team_id=team_id,
            player_id=request.player_id,
            opponent_id=request.opponent_id,
            request_id=request.request_id,
        )
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        **_team_view(team_service.get_team(team_id), request.player_id),
        "operation": result,
    }


@app.post("/teams/{team_id}/training-challenges/{challenge_id}/accept")
def accept_team_training_challenge(
    team_id: str,
    challenge_id: str,
    request: TeamActionRequest,
) -> dict:
    try:
        result = team_service.accept_training_challenge(
            team_id=team_id,
            player_id=request.player_id,
            challenge_id=challenge_id,
            request_id=request.request_id,
        )
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    challenge = result["challenge"]
    battle = _create_unranked_social_session(
        str(challenge["battle_session_id"]),
        str(challenge["challenger_id"]),
        str(challenge["opponent_id"]),
        match_type="team_training",
    )
    return {
        **_team_view(team_service.get_team(team_id), request.player_id),
        "operation": {**result, "battle": battle},
    }


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
    # Older saved profiles kept verified results only in the statistics
    # snapshot. Promote those totals once so trophy + win based operator titles
    # remain correct after upgrading an existing account.
    for result_key in ("wins", "losses", "draws"):
        profile.lifetime_stats[result_key] = max(
            int(profile.lifetime_stats.get(result_key, 0)),
            int(getattr(statistics, result_key, 0)),
        )
    settings = (
        player_settings_service
        .get_or_create(
            player_id
        )
    )

    # Restoring an existing account can apply the calendar-month season
    # rollover, so the normalized state must also be persisted.
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


@app.get("/profile/{player_id}/laboratory")
def get_player_laboratory(player_id: str) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    return build_laboratory_view(profile)


@app.post("/profile/{player_id}/laboratory/{module_definition_id}/upgrade")
def upgrade_player_laboratory_module(
    player_id: str,
    module_definition_id: str,
    request: LaboratoryOperationRequest,
) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        receipt = upgrade_calibration(
            profile,
            module_definition_id,
            request.request_id,
        )
    except LaboratoryError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return {
        "receipt": receipt,
        "laboratory": build_laboratory_view(profile),
        "profile": profile.to_view(),
    }


@app.post("/profile/{player_id}/laboratory/reset")
def reset_player_laboratory(
    player_id: str,
    request: LaboratoryOperationRequest,
) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        receipt = reset_calibrations(profile, request.request_id)
    except LaboratoryError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return {
        "receipt": receipt,
        "laboratory": build_laboratory_view(profile),
        "profile": profile.to_view(),
    }


@app.get("/profile/{player_id}/meta-progression")
def get_player_meta_progression(player_id: str) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    return meta_progression_service.view(profile)


@app.post("/profile/{player_id}/meta-progression/arena/{node_id}/claim")
def claim_player_arena_reward(player_id: str, node_id: str, request: MetaOperationRequest) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        receipt = meta_progression_service.claim_arena_reward(profile, node_id)
    except MetaProgressionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return {"receipt": receipt, "meta_progression": meta_progression_service.view(profile), "profile": profile.to_view()}


@app.post(
    "/profile/{player_id}/meta-progression/modules/{module_definition_id}/upgrade"
)
def upgrade_player_collection_module(
    player_id: str,
    module_definition_id: str,
    request: MetaOperationRequest,
) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        receipt = meta_progression_service.upgrade_module(
            profile,
            module_definition_id,
            request.request_id,
        )
    except MetaProgressionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return {
        "receipt": receipt,
        "meta_progression": meta_progression_service.view(profile),
        "profile": profile.to_view(),
    }


@app.post(
    "/profile/{player_id}/meta-progression/chests/gifts/{definition_id}/claim"
)
def claim_player_progression_gift_chest(
    player_id: str,
    definition_id: str,
    request: MetaOperationRequest,
) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        receipt = meta_progression_service.claim_and_open_gift_chest(
            profile,
            definition_id,
            request.request_id,
        )
    except MetaProgressionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return {
        "receipt": receipt,
        "meta_progression": meta_progression_service.view(profile),
        "profile": profile.to_view(),
    }


@app.post(
    "/profile/{player_id}/meta-progression/chests/{chest_id}/open"
)
def open_player_progression_chest(
    player_id: str,
    chest_id: str,
    request: MetaOperationRequest,
) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        receipt = meta_progression_service.open_chest(
            profile,
            chest_id,
            request.request_id,
        )
    except MetaProgressionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return {
        "receipt": receipt,
        "meta_progression": meta_progression_service.view(profile),
        "profile": profile.to_view(),
    }


@app.post(
    "/profile/{player_id}/meta-progression/chests/{definition_id}/open-all"
)
def open_all_available_player_progression_chests(
    player_id: str,
    definition_id: str,
    request: MetaOperationRequest,
) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        receipt = meta_progression_service.open_all_available_chests(
            profile,
            definition_id,
            request.request_id,
        )
    except MetaProgressionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return {
        "receipt": receipt,
        "meta_progression": meta_progression_service.view(profile),
        "profile": profile.to_view(),
    }


@app.post(
    "/profile/{player_id}/meta-progression/shop/{offer_id}/purchase"
)
def purchase_player_daily_shop_offer(
    player_id: str,
    offer_id: str,
    request: MetaOperationRequest,
) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        receipt = meta_progression_service.purchase_daily_offer(
            profile,
            offer_id,
            request.request_id,
        )
    except MetaProgressionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return {
        "receipt": receipt,
        "meta_progression": meta_progression_service.view(profile),
        "profile": profile.to_view(),
    }


@app.put("/profile/{player_id}/meta-progression/core")
def select_player_core_type(
    player_id: str,
    request: CoreSelectionRequest,
) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        meta_progression_service.select_core(profile, request.core_type_id)
    except MetaProgressionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return meta_progression_service.view(profile)


@app.post(
    "/profile/{player_id}/meta-progression/cores/{core_type_id}/skills/{skill_id}"
)
def unlock_player_core_skill(
    player_id: str,
    core_type_id: str,
    skill_id: str,
    request: MetaOperationRequest,
) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        receipt = meta_progression_service.unlock_core_skill(
            profile,
            core_type_id,
            skill_id,
            request.request_id,
        )
    except MetaProgressionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return {
        "receipt": receipt,
        "meta_progression": meta_progression_service.view(profile),
    }


@app.post("/profile/{player_id}/meta-progression/cores/{core_type_id}/upgrade")
def upgrade_player_core(player_id: str, core_type_id: str, request: MetaOperationRequest) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        receipt = meta_progression_service.upgrade_core(profile, core_type_id, request.request_id)
    except MetaProgressionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return {"receipt": receipt, "meta_progression": meta_progression_service.view(profile), "profile": profile.to_view()}


@app.post("/profile/{player_id}/meta-progression/modules/{module_id}/talents/{tier}/{choice}")
def choose_player_module_talent(player_id: str, module_id: str, tier: str, choice: str, request: MetaOperationRequest) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        receipt = meta_progression_service.choose_module_talent(profile, module_id, tier, choice, request.request_id)
    except MetaProgressionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return {"receipt": receipt, "meta_progression": meta_progression_service.view(profile), "profile": profile.to_view()}


@app.post("/profile/{player_id}/meta-progression/modules/{module_id}/talents/reset")
def reset_player_module_talents(
    player_id: str,
    module_id: str,
    request: MetaOperationRequest,
) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        receipt = meta_progression_service.reset_module_talents(
            profile,
            module_id,
            request.request_id,
        )
    except MetaProgressionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return {
        "receipt": receipt,
        "meta_progression": meta_progression_service.view(profile),
        "profile": profile.to_view(),
    }


@app.get("/events")
def get_events(player_id: str | None = Query(None)) -> dict:
    """Competition hub plus viewer registration/readiness state."""
    view = build_events_view(_leaderboard_profile_rows())
    if not player_id:
        return view
    profile = _team_member_profile(player_id)
    week_id = str(view["weekly_tournament"]["period"]["id"])
    month_id = str(view["team_tournament"]["period"]["id"])
    team = team_service.team_for_player(player_id)
    owner = _team_member_profile(str(team.get("owner_id"))) if team else None
    view["viewer"] = {
        "player_id": player_id,
        "weekly_registered": profile.weekly_tournament_registered_period == week_id,
        "weekly_entry_fee": int(view["weekly_tournament"].get("entry_fee", 0)),
        "weekly_trophies_earned": (
            profile.weekly_tournament_trophies_earned
            if profile.weekly_tournament_registered_period == week_id
            else 0
        ),
        "team_id": profile.team_id,
        "team_owner": bool(team and team.get("owner_id") == player_id),
        "team_registered": bool(
            owner and owner.team_tournament_registered_period == month_id
        ),
    }
    return view


@app.post("/events/weekly/register")
def register_weekly_tournament(request: EventRegistrationOperation) -> dict:
    profile = _team_member_profile(request.player_id)
    # Registration resets weekly counters, so materialize an unopened reward
    # from the just-closed week before advancing the period.
    _settle_competition_rewards(request.player_id)
    view = build_events_view(_leaderboard_profile_rows())
    period_id = str(view["weekly_tournament"]["period"]["id"])
    entry_fee = int(view["weekly_tournament"].get("entry_fee", 100))
    if profile.weekly_tournament_registered_period != period_id:
        if profile.circuit_credits < entry_fee:
            raise HTTPException(status_code=422, detail="Turnuva katılımı için yeterli Devre Kredisi yok.")
        profile.circuit_credits -= entry_fee
        profile.weekly_tournament_registered_period = period_id
        profile.weekly_tournament_period = period_id
        profile.weekly_tournament_matches = 0
        profile.weekly_tournament_wins = 0
        profile.weekly_tournament_trophies_earned = 0
        persist_player_data(request.player_id)
    return get_events(request.player_id)


@app.post("/events/team/register")
def register_team_tournament(request: EventRegistrationOperation) -> dict:
    profile = _team_member_profile(request.player_id)
    _settle_competition_rewards(request.player_id)
    team = team_service.team_for_player(request.player_id)
    if team is None:
        raise HTTPException(status_code=422, detail="Takım turnuvası için bir takıma katılmalısın.")
    if team.get("owner_id") != request.player_id:
        raise HTTPException(status_code=422, detail="Takım turnuvasına yalnız takım lideri kayıt yapabilir.")
    view = build_events_view(_leaderboard_profile_rows())
    profile.team_tournament_registered_period = str(view["team_tournament"]["period"]["id"])
    persist_player_data(request.player_id)
    return get_events(request.player_id)


@app.post("/events/team/fixtures/{fixture_id}/check-in")
def check_in_team_tournament_fixture(
    fixture_id: str,
    request: EventRegistrationOperation,
) -> dict:
    view = get_events(request.player_id)
    if not view.get("viewer", {}).get("team_registered"):
        raise HTTPException(status_code=422, detail="Takım bu turnuvaya kayıtlı değil.")
    fixture = next(
        (
            item
            for item in view["team_tournament"].get("fixtures", [])
            if item.get("fixture_id") == fixture_id
        ),
        None,
    )
    if fixture is None:
        raise HTTPException(status_code=404, detail="Turnuva eşleşmesi bulunamadı.")
    if fixture.get("status") != "live":
        raise HTTPException(status_code=422, detail="Bu canlı eşleşmenin giriş saati henüz açık değil.")
    pairing = next(
        (
            item
            for item in fixture.get("member_pairings", [])
            if request.player_id in {item.get("home_player_id"), item.get("away_player_id")}
        ),
        None,
    )
    if pairing is None:
        raise HTTPException(status_code=422, detail="Bu fikstürde oyuncuya atanmış maç yok.")
    opponent_id = (
        pairing["away_player_id"]
        if pairing["home_player_id"] == request.player_id
        else pairing["home_player_id"]
    )
    session_id = str(pairing["battle_session_id"])
    bot = next((item for item in BOTS if str(item.get("id")) == opponent_id), None)
    if bot is not None:
        pair = MatchmakingPair(
            match_id=session_id,
            player_a_id=request.player_id,
            player_b_id=opponent_id,
            rating_difference=abs(
                int(_team_member_profile(request.player_id).rating)
                - int(bot.get("rating", 0))
            ),
            opponent_type="ai",
        )
        _create_matchmaking_ai_session(
            pair,
            bot_override=bot,
            match_type_override="team_tournament",
            ranked_eligible_override=False,
        )
        battle = {
            "session_id": session_id,
            "players": [request.player_id, opponent_id],
            "opponent_type": "ai",
            "match_type": "team_tournament",
        }
    else:
        battle = _create_unranked_social_session(
            session_id,
            request.player_id,
            str(opponent_id),
            match_type="team_tournament",
        )
    return {"fixture": fixture, "pairing": pairing, "battle": battle}


def _daily_meta_view(profile) -> dict:
    catalog = daily_meta_catalog_view()
    meta = (
        daily_meta_by_id(profile.daily_meta_id)
        if profile.daily_meta_day == catalog["day"]
        else None
    )
    return {
        **catalog,
        "selected": meta is not None,
        "requires_roll": meta is None,
        "meta": meta,
    }


@app.get("/profile/{player_id}/daily-meta")
def get_player_daily_meta(player_id: str) -> dict:
    """Return the player's immutable choice for the current UTC day."""
    return _daily_meta_view(_team_member_profile(player_id))


@app.post("/profile/{player_id}/daily-meta/roll")
def roll_player_daily_meta(
    player_id: str,
    request: MetaOperationRequest,
) -> dict:
    """Roll one of seven equal-probability metas once per player and UTC day."""
    with DAILY_META_ROLL_LOCK:
        profile = _team_member_profile(player_id)
        current = _daily_meta_view(profile)
        if current["selected"]:
            return {**current, "replayed": True, "request_id": request.request_id}

        selected = DAILY_META_DEFINITIONS[
            secrets.randbelow(len(DAILY_META_DEFINITIONS))
        ]
        profile.daily_meta_day = current["day"]
        profile.daily_meta_id = selected["id"]
        persist_player_data(player_id)
        return {
            **_daily_meta_view(profile),
            "replayed": False,
            "request_id": request.request_id,
        }


@app.post("/profile/{player_id}/engagement/missions/{mission_id}/claim")
def claim_daily_mission_reward(
    player_id: str,
    mission_id: str,
    request: MetaOperationRequest | None = None,
) -> dict:
    before_profile = player_profile_service.get_or_create(player_id)
    tier_before = int(before_profile.engagement_view()["current_tier"])
    try:
        profile = player_profile_service.claim_daily_mission(
            player_id,
            mission_id,
            request_id=request.request_id if request else None,
        )
    except PlayerProfileError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc
    persist_player_data(player_id)
    view = profile.to_view()
    tier_after = int(view["engagement"]["current_tier"])
    mission_receipt = (
        dict(profile.engagement_claim_receipts[request.request_id])
        if request
        and request.request_id in profile.engagement_claim_receipts
        else None
    )
    return {
        **view,
        "daily_mission_receipt": mission_receipt,
        "tier_advanced": _tier_advanced_payload(
            player_id,
            f"mission:{mission_id}",
            tier_before,
            tier_after,
        ),
    }


@app.post("/profile/{player_id}/engagement/login/{day}/claim")
def claim_monthly_login_reward(
    player_id: str,
    day: int,
    request: MetaOperationRequest | None = None,
) -> dict:
    try:
        receipt = player_profile_service.claim_monthly_login(
            player_id,
            day,
            request_id=request.request_id if request else None,
        )
    except PlayerProfileError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    profile = player_profile_service.get_or_create(player_id)
    persist_player_data(player_id)
    return {
        **profile.to_view(),
        "daily_login_receipt": receipt,
    }


def _tier_advanced_payload(
    player_id: str,
    source: str,
    tier_before: int,
    tier_after: int,
) -> dict | None:
    if tier_after <= tier_before:
        return None
    return {
        "event_id": f"{monthly_season_descriptor()['id']}:{player_id}:{source}:{tier_after}",
        "season_id": monthly_season_descriptor()["id"],
        "tier_before": tier_before,
        "tier_after": tier_after,
    }


@app.post("/profile/{player_id}/engagement/tiers/{tier}/claim")
def claim_season_tier_reward(
    player_id: str,
    tier: int,
    request: MetaOperationRequest | None = None,
) -> dict:
    before_profile = player_profile_service.get_or_create(player_id)
    tier_before = int(before_profile.engagement_view()["current_tier"])
    engagement_request_id = request.request_id if request else None
    replayed = bool(
        engagement_request_id
        and engagement_request_id in before_profile.engagement_claim_receipts
    )
    try:
        profile = player_profile_service.claim_season_tier(
            player_id,
            tier,
            request_id=engagement_request_id,
        )
    except PlayerProfileError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc
    reward = next(
        (item for item in SEASON_REWARD_TRACK if int(item["tier"]) == tier),
        None,
    )
    chest_receipt = None
    chest_definition_ids = {
        "bronze": "field_3h",
        "silver": "circuit_8h",
        "gold": "core_24h",
        "diamond": "diamond_24h",
    }
    chest_request_id = f"season-tier:{profile.player_id}:{profile.active_meta_season_id}:{tier}"
    if reward and reward.get("chest_tier") and replayed:
        chest_receipt = profile.chest_receipts.get(chest_request_id)
    elif reward and reward.get("chest_tier"):
        chest_receipt = meta_progression_service.award_instant_chest(
            profile,
            chest_definition_ids[str(reward["chest_tier"])],
            f"season-tier:{profile.active_meta_season_id}:{tier}",
            chest_request_id,
        )
    persist_player_data(player_id)
    view = profile.to_view()
    tier_after = int(view["engagement"]["current_tier"])
    season_reward_receipt = (
        dict(profile.engagement_claim_receipts[engagement_request_id])
        if engagement_request_id
        and engagement_request_id in profile.engagement_claim_receipts
        else None
    )
    return {
        **view,
        "season_reward_receipt": season_reward_receipt,
        "season_chest_receipt": chest_receipt,
        "tier_advanced": _tier_advanced_payload(
            player_id,
            f"reward:{tier}",
            tier_before,
            tier_after,
        ),
    }


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


@app.put("/profile/{player_id}/cosmetics")
def update_profile_cosmetics(
    player_id: str,
    request: ProfileCosmeticsRequest,
) -> dict:
    try:
        profile = player_profile_service.set_cosmetics(
            player_id,
            avatar_id=request.avatar_id,
            avatar_frame_id=request.avatar_frame_id,
            battle_emoji_id=request.battle_emoji_id,
            profile_background_id=request.profile_background_id,
        )
    except PlayerProfileError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return profile.to_view()


@app.post("/profile/{player_id}/notifications/{section}/seen")
def mark_profile_notifications_seen(player_id: str, section: str) -> dict:
    try:
        profile = player_profile_service.mark_notifications_seen(
            player_id,
            section,
        )
    except PlayerProfileError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
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


@app.get("/game/ai-archetypes")
def game_ai_archetypes() -> dict:
    return {
        "default": "balanced",
        "archetypes": [
            {
                "id": archetype.id,
                "name_tr": archetype.name_tr,
                "name_en": archetype.name_en,
                "description_tr": archetype.description_tr,
                "description_en": archetype.description_en,
                "battle_pool_ids": list(archetype.battle_pool_ids),
                "initial_module_ids": list(archetype.initial_module_ids),
                "expansion_module_ids": list(archetype.expansion_module_ids),
            }
            for archetype in (get_ai_archetype(item_id) for item_id in AI_ARCHETYPE_IDS)
        ],
    }


@app.get("/identity")
def gridshard_identity() -> dict:
    return {
        "name":"GRIDSHARD",
        "tagline_tr":
            "Devreni Kur. Çekirdeği Kır.",
        "tagline_en":
            "Build the Circuit. Break the Core.",
        "identity_version":
            VERSION,
        "palette":{
            "void_navy":"#07142B",
            "reactor_blue":"#0D2342",
            "alloy_navy":"#12305A",
            "circuit_steel":"#2F5B88",
            "arc_cyan":"#48F4E0",
            "plasma_cyan":"#82FFF1",
            "reactor_gold":"#FFD56A",
            "ion_green":"#9AF27A",
            "charge_amber":"#FFB84D",
            "overload_red":"#FF647C",
            "interference_violet":"#B87CFF",
            "ice_white":"#F5FAFF",
            "signal_gray":"#B9CEE6",
        },
    }


@app.get("/health")
async def health() -> dict:
    player_persistence = (
        player_data_persistence_health()
    )
    telemetry_persistence = (
        telemetry_persistence_health()
    )
    runtime_health = await runtime_coordinator.health()
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
        "runtime": {
            "mode": RUNTIME_MODE,
            "redis": runtime_health,
            "matchmaking": {
                "backend": (
                    "redis"
                    if runtime_coordinator.redis is not None
                    else "memory"
                ),
                "instance_id": MATCHMAKING_INSTANCE_ID,
                "websocket_routing_configured": bool(
                    MATCHMAKING_PUBLIC_WS_BASE_URL
                ),
            },
            "database_backend": (
                "postgresql" if postgres_pool is not None else "json"
            ),
            "active_pvp_sessions": len(pvp_service.active_session_ids()),
            "active_websockets": sum(
                1
                for connection in pvp_websocket_adapter.registry.connections.values()
                if connection.connected
            ),
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


def _local_ai_battle_pool(
    archetype_id: str = "balanced",
) -> tuple[str, ...]:
    return get_ai_archetype(archetype_id).battle_pool_ids


def _local_player_initial_modules(
    battle_pool_ids: list[str],
    selected_definition_ids: list[str] | tuple[str, ...] | None = None,
) -> tuple[InitialModulePlacement, ...]:
    return (InitialModulePlacement(instance_id="core-1", definition_id="core", x=2, y=1),)


def _local_ai_initial_modules(
    ai_player_id: str,
    archetype_id: str = "balanced",
) -> tuple[InitialModulePlacement, ...]:
    return (InitialModulePlacement(instance_id=f"{ai_player_id}-core", definition_id="core", x=2, y=1),)


def _local_ai_snapshot_envelope(
    session_id: str,
    player_id: str,
    cursor: int = 0,
) -> dict:
    snapshot = pvp_service.snapshot(
        session_id,
        player_id,
    )
    event_page = pvp_service.events_since(
        session_id,
        player_id,
        cursor,
    )
    session = pvp_service.get_session(session_id)
    ai_player_id = next(iter(sorted(session.ai_player_ids)), None)
    archetype = get_ai_archetype(
        session.ai_archetypes.get(ai_player_id, "balanced")
        if ai_player_id is not None
        else "balanced"
    )
    return {
        "session_id": session_id,
        "authority": "server_battle_engine",
        "ai_archetype": archetype.id,
        "ai_archetype_name_tr": archetype.name_tr,
        "ai_archetype_name_en": archetype.name_en,
        "ai_archetype_description_tr": archetype.description_tr,
        "snapshot": snapshot,
        "events": event_page["events"],
        "event_cursor": event_page["cursor"],
    }


def _create_matchmaking_ai_session(
    pair,
    *,
    background_tasks: BackgroundTasks | None = None,
    bot_override: dict | None = None,
    match_type_override: str | None = None,
    ranked_eligible_override: bool | None = None,
) -> None:
    """İnsan kuyruğu zaman aşımında normal PvP protokolüne AI slotu ekler."""
    try:
        pvp_service.get_session(pair.match_id)
        return
    except PvPSessionError:
        pass

    from .arena_canon import select_bot
    from .game.ai_archetypes import BOT_ARCHETYPE_IDS

    profile = player_profile_service.get_or_create(pair.player_a_id)
    bot = dict(bot_override or select_bot(profile.rating, pair.match_id))
    bot.setdefault("match_rating", int(bot.get("rating", profile.rating)))
    match_type = str(match_type_override or "arena_ai")
    ranked_eligible = (
        bool(ranked_eligible_override)
        if ranked_eligible_override is not None
        else match_type == "arena_ai"
    )

    pvp_service.create_session(
        pair.match_id,
        setup_required=True,
        auto_start_when_ready=True,
        match_type=match_type,
        season_id=monthly_season_descriptor()["id"],
        ranked_eligible=ranked_eligible,
        normalized=False,
        laboratory_effects_enabled=False,
    )
    pvp_service.join(
        pair.match_id,
        pair.player_a_id,
        display_name=player_profile_service.get_or_create(pair.player_a_id).display_name,
    )
    pvp_service.join(pair.match_id, pair.player_b_id, display_name=bot["display_name"])
    session = pvp_service.get_session(pair.match_id)
    session.engine.state.player_match_ratings[pair.player_b_id] = bot["match_rating"]
    session.engine.state.players[pair.player_b_id].core_type = bot["core_type"]
    session.engine.state.players[pair.player_b_id].core_level = 1 + profile.core_upgrade_levels.get(profile.selected_core_type, 0)
    session.engine.state.player_upgrade_levels[pair.player_b_id] = {
        module_id: max(0, min(14, round(sum(profile.module_upgrade_levels.get(mid, 0) for mid in profile.preferred_battle_pool_ids) / 6)))
        for module_id in bot["battle_pool_ids"]
    }
    # Eşleştirme oturumundaki rakip slotu her maçta yeniden üretilir. Günlük
    # meta tohumunu bu geçici slotla değil, kanonik bot kimliğiyle kurarak aynı
    # AI oyuncunun UTC günü boyunca aynı metayı kullanmasını sağla.
    ai_meta_seed = str(bot.get("id") or pair.player_b_id)
    session.engine.state.player_daily_meta_ids[pair.player_b_id] = daily_meta_for_seed(
        ai_meta_seed
    ).get("id", "")
    session.ai_profile_options[pair.player_b_id] = bot
    attach_player_laboratory_to_session(pair.match_id, pair.player_a_id)

    ai_archetype = get_ai_archetype(BOT_ARCHETYPE_IDS[bot["archetype_tr"]])
    ai_pool = tuple(bot["battle_pool_ids"])
    pvp_service.submit_setup(
        pair.match_id,
        pair.player_b_id,
        PvPSetupPayload(
            battle_pool_ids=ai_pool,
            initial_modules=_local_ai_initial_modules(
                pair.player_b_id,
                ai_archetype.id,
            ),
        ),
    )
    pvp_service.set_ready(pair.match_id, pair.player_b_id, True)
    pvp_service.mark_ai_player(
        pair.match_id,
        pair.player_b_id,
        archetype_id=ai_archetype.id,
    )

    telemetry_call = {
        "event_id": f"server:{pair.match_id}:matchmaking_ai_fallback:{pair.player_a_id}",
        "event_type": "matchmaking_matched",
        "player_id": pair.player_a_id,
        "session_id": pair.match_id,
        "metadata": {
            "rating_difference": 0,
            "opponent_type": "ai",
            "fallback_after_seconds": 0 if MATCHMAKING_AI_ONLY else MATCHMAKING_AI_FALLBACK_SECONDS,
            "ai_archetype": ai_archetype.id,
        },
    }
    if background_tasks is not None:
        background_tasks.add_task(telemetry_service.record_now, **telemetry_call)
    else:
        telemetry_service.record_now(**telemetry_call)


@app.post("/local-ai/sessions")
async def create_local_ai_session(
    request: LocalAiBattleStartRequest,
) -> dict:
    session_id = f"local-ai-{uuid4()}"
    ai_player_id = f"{session_id}-opponent"
    try:
        ai_archetype_id = normalize_ai_archetype_id(request.ai_archetype)
        experimental_enabled = bool(
            request.experimental_calibrations
            and EXPERIMENTAL_LAB_EFFECTS_ENABLED
        )
        pvp_service.create_session(
            session_id,
            setup_required=True,
            auto_start_when_ready=False,
            match_type="local_test",
            season_id=monthly_season_descriptor()["id"],
            ranked_eligible=False,
            normalized=not experimental_enabled,
            laboratory_effects_enabled=experimental_enabled,
        )
        pvp_service.join(
            session_id,
            request.player_id,
            display_name=player_profile_service.get_or_create(request.player_id).display_name,
        )
        pvp_service.join(
            session_id,
            ai_player_id,
        )
        attach_player_laboratory_to_session(session_id, request.player_id)
        session = pvp_service.get_session(session_id)
        # Yerel AI slotu UUID içerdiği için doğrudan kullanılırsa her maçta
        # farklı meta üretir. Arşetip günlük rakip kimliği olarak davranır.
        session.engine.state.player_daily_meta_ids[ai_player_id] = daily_meta_for_seed(
            f"local-ai-archetype:{ai_archetype_id}"
        ).get("id", "")
        pvp_service.submit_setup(
            session_id,
            request.player_id,
            PvPSetupPayload(
                battle_pool_ids=tuple(
                    request.battle_pool_ids
                ),
                initial_modules=(
                    tuple(
                        InitialModulePlacement(
                            instance_id=item.instance_id,
                            definition_id=item.definition_id,
                            x=item.x,
                            y=item.y,
                        )
                        for item in request.initial_modules
                    )
                    if request.initial_modules
                    else _local_player_initial_modules(request.battle_pool_ids)
                ),
            ),
        )
        ai_pool = _local_ai_battle_pool(ai_archetype_id)
        pvp_service.submit_setup(
            session_id,
            ai_player_id,
            PvPSetupPayload(
                battle_pool_ids=ai_pool,
                initial_modules=(
                    _local_ai_initial_modules(
                        ai_player_id,
                        ai_archetype_id,
                    )
                ),
            ),
        )
        pvp_service.set_ready(
            session_id,
            request.player_id,
            True,
        )
        pvp_service.set_ready(
            session_id,
            ai_player_id,
            True,
        )
        pvp_service.mark_ai_player(
            session_id,
            ai_player_id,
            archetype_id=ai_archetype_id,
        )
        pvp_service.start(session_id)
        await pvp_tick_runner.ensure_started(
            session_id
        )
        return _local_ai_snapshot_envelope(
            session_id,
            request.player_id,
        )
    except (PvPSessionError, ValueError) as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc


@app.post(
    "/local-ai/sessions/{session_id}/commands"
)
def command_local_ai_session(
    session_id: str,
    request: LocalAiBattleCommandRequest,
) -> dict:
    try:
        pvp_service.submit_command(
            session_id,
            request.player_id,
            BattleCommand(
                player_id=request.player_id,
                kind=request.kind,
                payload=request.payload,
            ),
        )
    except PvPSessionError as exc:
        raise HTTPException(
            status_code=409,
            detail=str(exc),
        ) from exc
    return {
        "session_id": session_id,
        "accepted": True,
        "authority": "server_battle_engine",
    }


@app.get(
    "/local-ai/sessions/{session_id}/snapshot"
)
def local_ai_session_snapshot(
    session_id: str,
    player_id: str = Query(min_length=1),
    cursor: int = Query(default=0, ge=0),
) -> dict:
    try:
        return _local_ai_snapshot_envelope(
            session_id,
            player_id,
            cursor,
        )
    except PvPSessionError as exc:
        raise HTTPException(
            status_code=404,
            detail=str(exc),
        ) from exc


@app.post("/pvp/sessions")
def create_pvp_session(
    request: CreateSessionRequest,
) -> dict:
    try:
        session = pvp_service.create_session(
            request.session_id,
            setup_required=True,
            auto_start_when_ready=request.auto_start_when_ready,
            match_type="ranked_pvp",
            season_id=monthly_season_descriptor()["id"],
            ranked_eligible=True,
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
            display_name=player_profile_service.get_or_create(request.player_id).display_name,
        )
        attach_player_laboratory_to_session(
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
    request: Request,
) -> dict:
    try:
        if auth_is_required():
            pvp_service.get_session(session_id).slot_for(
                request.state.authenticated_player_id
            )
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
def pvp_lobby(session_id: str, request: Request) -> dict:
    try:
        if auth_is_required():
            pvp_service.get_session(session_id).slot_for(
                request.state.authenticated_player_id
            )
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
    access_token: str | None = Query(default=None),
):
    connection_id = str(uuid4())
    connected = False

    try:
        if auth_is_required():
            identity = participant_auth_service.verify_access_token(
                access_token or ""
            )
            if platform_service.token_is_revoked(identity.player_id, identity.token_id):
                raise AuthenticationError("Bu cihaz oturumu sonlandırılmış.")
            if identity.player_id != player_id:
                raise AuthenticationError(
                    "WebSocket oyuncu kimliği belirteçle eşleşmiyor."
                )
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
    except AuthenticationError as exc:
        if not connected:
            await websocket.close(
                code=4401,
                reason=str(exc),
            )
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
