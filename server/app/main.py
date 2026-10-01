from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4
import asyncio
from contextlib import asynccontextmanager, contextmanager
from functools import wraps
from inspect import signature
import hashlib
import logging
import secrets
import time
import os
import json
from pathlib import Path
from threading import Lock, RLock
from urllib.parse import parse_qs, urlencode, urlsplit

from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Query, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
from .production_config import environment_secret, production_endpoints
from .postgres_economic_operations import PostgresEconomicOperations, EconomicOperationConflict
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.websockets import WebSocketDisconnect
from pydantic import BaseModel

from .auth import (
    AuthenticationError,
    JsonIdentityRepository,
    ParticipantAuthService,
    load_or_create_signing_key,
)
from .platform_services import PlatformService, PlatformServiceError
from .postgres_platform import PostgresPlatformService
from .postgres_social_transactions import PostgresSocialTransactionRepository, SocialTransactionError
from .postgres_social_runtime import PostgresSocialRuntime, social_operation_id
from .postgres_account_erasure import PostgresAccountErasure
from .persistent_state import PersistentState
from .postgres_battle_results import PostgresBattleResults
from .postgres_worker_guard import PostgresWorkerGuard
from .push_delivery import PushSender
from .json_schema_migrations import apply_json_store_migrations, json_store_paths
from .clean_install import (
    ensure_clean_postgres_installation,
    ensure_clean_runtime_directory,
    require_runtime_store_path,
    runtime_data_directory,
)
from .product_analytics import (
    ProductAnalyticsService, ProductAnalyticsError, ProductAnalyticsStorageError,
    EVENT_DIMENSIONS, RETENTION_DAYS,
)
from .postgres_product_analytics import PostgresProductAnalyticsService
from .display_names import DisplayNameError
from .account_export import build_personal_export
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
)
from .game.ai_archetypes import (
    AI_ARCHETYPE_IDS,
    get_ai_archetype,
    normalize_ai_archetype_id,
    select_ai_archetype_for_key,
)
from .game.catalog_view import (
    build_module_catalog_view,
)
from .game.pvp_protocol import PVP_PROTOCOL_VERSION
from .game.pvp_setup import InitialModulePlacement, PvPSetupPayload
from .game.pvp_websocket import PvPWebSocketAdapter
from .game.pvp_runner import PvPTickRunner
from .version import VERSION
from .player_profile import (
    PlayerProfileError,
    PlayerProfileService,
    SEASON_PREMIUM_REWARD_TRACK,
    SEASON_REWARD_TRACK,
    season_descriptor,
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
from .team_tournament import (
    MINIMUM_REWARD_POINTS as TEAM_TOURNAMENT_MINIMUM_POINTS,
    SESSION_PREFIX as TEAM_TOURNAMENT_SESSION_PREFIX,
    build_team_tournament_view,
    locate_leg as locate_team_tournament_leg,
    period_id_for as team_tournament_period_id,
    period_id_of_leg as team_tournament_period_of_leg,
    player_open_leg as team_tournament_open_leg,
    registration_open as team_tournament_registration_open,
    tournament_calendar as team_tournament_calendar,
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
    PlayerProgressionError,
    PlayerProgressionService,
)
from .store_catalog import (
    STORE_PROVIDERS,
    StoreError,
    ad_test_mode_enabled,
    mark_ad_view_claimed,
    mark_purchase_consumed,
    process_purchase,
    product_by_id,
    purchase_test_mode_enabled,
    record_verified_ad_view,
    restore_refunded_purchase,
    revoke_purchase,
    store_account_token,
    store_product_id,
    store_refund_message,
    store_view,
    verified_ad_view_for_battle,
    verify_ad_view,
)
from .store_verification import StoreVerificationError, StoreVerifiers
from .store_reconciliation import StoreReconciler
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
from .postgres_telemetry import PostgresTelemetryRepository

from .static_files import (
    NoCacheStaticFiles,
    ProductionStaticFiles,
    client_directory,
)

from .battle_pool_presets import (
    BattlePoolPresetError,
    BattlePoolPresetService,
    JsonBattlePoolPresetRepository,
)
from .postgres_battle_pool_presets import PostgresBattlePoolPresetRepository
from .team_service import (
    JsonTeamRepository,
    REQUEST_POLICY as TEAM_REQUEST_POLICY,
    TEAM_APPEARANCE_OPTIONS,
    TEAM_PRIZE_APPEARANCE_KEYS,
    TeamService,
    TeamServiceError,
    team_appearance,
    team_appearance_for_seed,
    team_appearance_unlocked,
)
from .postgres_team import PostgresTeamRepository

SERVER_DATA_DIR = (
    Path(__file__).resolve()
    .parent.parent
    / "data"
)
RUNTIME_MODE = os.environ.get("GRIDSHARD_RUNTIME_MODE", "development").strip().lower()
if RUNTIME_MODE not in {"development", "production"}:
    raise RuntimeError(
        "GRIDSHARD_RUNTIME_MODE yalnız development veya production olabilir."
    )
RUNTIME_STRICT = RUNTIME_MODE == "production"
DATABASE_URL = environment_secret("DATABASE_URL", os.environ) or None
REDIS_URL = environment_secret("REDIS_URL", os.environ) or None

if RUNTIME_STRICT and not DATABASE_URL:
    raise RuntimeError("Üretim modunda DATABASE_URL zorunludur.")
if RUNTIME_STRICT and urlsplit(DATABASE_URL).password == "gridshard-local-only":
    raise RuntimeError("Üretimde örnek PostgreSQL parolası kullanılamaz.")
if RUNTIME_STRICT and not REDIS_URL:
    raise RuntimeError("Üretim modunda REDIS_URL zorunludur.")
if RUNTIME_STRICT and not environment_secret("GRIDSHARD_AUTH_SIGNING_KEY", os.environ):
    raise RuntimeError("Üretim modunda GRIDSHARD_AUTH_SIGNING_KEY zorunludur.")

RUNTIME_DATA_DIR = runtime_data_directory(SERVER_DATA_DIR, RUNTIME_MODE, os.environ)
PRODUCTION_ENDPOINTS = production_endpoints(os.environ) if RUNTIME_STRICT else None
RUNTIME_STORE_PATHS = json_store_paths(
    RUNTIME_DATA_DIR, postgres=DATABASE_URL is not None,
)
for _store_path in RUNTIME_STORE_PATHS.values():
    require_runtime_store_path(_store_path, RUNTIME_DATA_DIR, RUNTIME_MODE)
ACTIVE_JSON_STORE_PATHS = {
    key: value for key, value in RUNTIME_STORE_PATHS.items()
    if not (RUNTIME_STRICT and key in {"platform_state", "teams", "battle_pool_presets", "telemetry"})
}


def _runtime_path(env_name: str, filename: str) -> Path:
    return require_runtime_store_path(
        Path(os.environ.get(env_name, str(RUNTIME_DATA_DIR / filename))),
        RUNTIME_DATA_DIR, RUNTIME_MODE,
    )

postgres_pool = PostgresPool(DATABASE_URL) if DATABASE_URL else None
postgres_worker_guard = PostgresWorkerGuard(postgres_pool) if RUNTIME_STRICT else None
# JSON depoları okunmadan önce bekleyen dosya şema göçleri uygulanır;
# değişmiş, zinciri bozuk veya bilinmeyen göç geçmişi açılışı durdurur.
# Üretimde mevcut veriyi dönüştüren göç otomatik uygulanmaz; operatör
# sunucu dururken tools/json_schema_migrate.py up çalıştırır.
if not RUNTIME_STRICT:
    apply_json_store_migrations(ACTIVE_JSON_STORE_PATHS, auto_apply=True)
runtime_coordinator = RuntimeCoordinator(
    REDIS_URL,
    strict=RUNTIME_STRICT,
)


async def _runtime_maintenance_loop() -> None:
    last_analytics_prune = 0.0
    while True:
        await asyncio.sleep(5.0)
        if RUNTIME_STRICT:
            try:
                await runtime_coordinator.renew_worker()
                await asyncio.to_thread(postgres_worker_guard.check)
            except Exception:
                runtime_coordinator._lease_lost = True
                await pvp_tick_runner.stop_all()
                for connection in list(pvp_websocket_adapter.registry.connections.values()):
                    if connection.connected:
                        try:
                            await pvp_websocket_adapter.disconnect(connection.connection_id, close_code=1013)
                        except Exception:
                            pass
                logging.getLogger(__name__).error("Worker ownership lost; API disabled until restart")
                return
            try:
                await asyncio.to_thread(_recover_pending_battle_results)
            except Exception:
                logging.getLogger(__name__).warning("Pending battle results require retry", exc_info=True)
        if time.monotonic() - last_analytics_prune >= 3600:
            last_analytics_prune = time.monotonic()
            try:
                await asyncio.to_thread(product_analytics_service.prune_expired)
            except (ProductAnalyticsError, OSError):
                logging.getLogger(__name__).warning("Product analytics retention cleanup failed", exc_info=True)
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
            state = pvp_service.get_session(session_id).engine.state
            await runtime_coordinator.touch_session(
                session_id, ttl_seconds=360, player_ids=tuple(state.players),
                status=state.status.value, websocket_base_url=MATCHMAKING_PUBLIC_WS_BASE_URL,
            )
        await runtime_coordinator.local_limiter.cleanup()


async def _push_delivery_loop(stop: asyncio.Event):
    # Sağlayıcı çağrısı savaş tick döngüsünden ayrı iş parçacığında yapılır.
    while not stop.is_set():
        try:
            processed = await asyncio.to_thread(platform_service.process_push_once)
        except Exception:
            # İstek URL'si/istisna loglanmaz: APNs URL'si cihaz belirtecini taşır.
            logging.getLogger(__name__).warning("Push outbox unavailable; retrying without exposing payloads")
            processed = False
        try:
            await asyncio.wait_for(stop.wait(), timeout=.25 if processed else 5)
        except asyncio.TimeoutError:
            pass


async def _store_reconciliation_loop(stop: asyncio.Event):
    delay = min(60.0, STORE_RECONCILE_INTERVAL_SECONDS)
    while not stop.is_set():
        try:
            await asyncio.wait_for(stop.wait(), timeout=delay)
            return
        except asyncio.TimeoutError:
            pass
        if RUNTIME_STRICT and not (runtime_coordinator.owns_worker and postgres_worker_guard.held):
            return
        try:
            await asyncio.to_thread(
                store_reconciler.run_once,
                should_stop=lambda: stop.is_set() or (
                    RUNTIME_STRICT
                    and not (runtime_coordinator.owns_worker and postgres_worker_guard.held)
                ),
            )
        except Exception:
            logging.getLogger(__name__).warning("Store refund reconciliation failed; retrying at the next interval")
        delay = STORE_RECONCILE_INTERVAL_SECONDS


@asynccontextmanager
async def application_lifespan(_app: FastAPI):
    global telemetry_service
    maintenance_task = None
    push_stop = asyncio.Event()
    push_task = None
    reconcile_stop = asyncio.Event()
    reconcile_task = None
    try:
        if postgres_pool is not None:
            await asyncio.to_thread(postgres_pool.open)
            if RUNTIME_STRICT:
                await asyncio.to_thread(postgres_worker_guard.acquire)
                installation_id = await asyncio.to_thread(
                    ensure_clean_postgres_installation, postgres_pool
                )
                await asyncio.to_thread(
                    ensure_clean_runtime_directory, RUNTIME_DATA_DIR, installation_id
                )
                await asyncio.to_thread(
                    apply_json_store_migrations, ACTIVE_JSON_STORE_PATHS, auto_apply=False
                )
                telemetry_service = InMemoryTelemetryService(repository=telemetry_repository)
        await runtime_coordinator.open()
        if RUNTIME_STRICT:
            await asyncio.to_thread(_postgres_social_runtime().close_sessions, stale_boot=True)
            await asyncio.to_thread(_recover_pending_battle_results)
        # GRIDSHARD_PUSH_ENABLED=1 değilse gönderici kapalıdır, bağlantı açmaz.
        platform_service.push_sender = PushSender.from_environment()
        push_task = asyncio.create_task(_push_delivery_loop(push_stop))
        maintenance_task = asyncio.create_task(_runtime_maintenance_loop())
        if STORE_RECONCILE_INTERVAL_SECONDS and store_reconciler.enabled():
            reconcile_task = asyncio.create_task(_store_reconciliation_loop(reconcile_stop))
        yield
    finally:
        try:
            push_stop.set()
            reconcile_stop.set()
            if push_task is not None:
                # Süren sınırlı HTTP çağrısı bitmeden istemci kapatılmaz.
                await push_task
            if reconcile_task is not None:
                await reconcile_task
            platform_service.push_sender.close()
        finally:
            try:
                if maintenance_task is not None:
                    maintenance_task.cancel()
                    try:
                        await maintenance_task
                    except asyncio.CancelledError:
                        pass
            finally:
                try:
                    await pvp_tick_runner.stop_all()
                finally:
                    try:
                        await runtime_coordinator.close()
                    finally:
                        try:
                            if postgres_worker_guard is not None:
                                await asyncio.to_thread(postgres_worker_guard.release)
                        finally:
                            if postgres_pool is not None:
                                await asyncio.to_thread(postgres_pool.close)


app = FastAPI(
    title="GRIDSHARD PvP Gateway",
    version=VERSION,
    lifespan=application_lifespan,
)
if PRODUCTION_ENDPOINTS:
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=[PRODUCTION_ENDPOINTS[2], "127.0.0.1", "localhost"], www_redirect=False)


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
        str(RUNTIME_DATA_DIR / "player_identities.json"),
    )
)
AUTH_KEY_PATH = Path(
    os.environ.get(
        "GRIDSHARD_AUTH_KEY_PATH",
        str(RUNTIME_DATA_DIR / ".auth_signing_key"),
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
_platform_options = {
    "expose_codes": os.environ.get(
        "GRIDSHARD_DEV_EXPOSE_VERIFICATION_CODES", "0" if RUNTIME_STRICT else "1"
    ).strip().lower() in {"1", "true", "yes", "on"},
    "web_base_url": os.environ.get(
        "GRIDSHARD_PUBLIC_WEB_URL",
        "http://127.0.0.1:8000",
    ),
}
platform_service = (
    PostgresPlatformService(postgres_pool, path=RUNTIME_STORE_PATHS["platform_state"], **_platform_options)
    if RUNTIME_STRICT else PlatformService(RUNTIME_STORE_PATHS["platform_state"], **_platform_options)
)


def auth_is_required() -> bool:
    return RUNTIME_STRICT or os.environ.get("GRIDSHARD_AUTH_REQUIRED", "1").strip().lower() not in {
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
    "/teams",
    "/social/",
    "/accounts/",
    "/notifications/",
    "/players/",
    "/events",
    "/local-ai/",
    "/pvp/",
    "/store/",
    "/analytics/",
)


def _path_claimed_player_id(path: str) -> str | None:
    segments = [segment for segment in path.split("/") if segment]
    if not segments:
        return None
    if segments[0] in {"participants", "player-data", "settings", "statistics", "profile", "social", "accounts", "notifications", "store"}:
        return segments[1] if len(segments) > 1 else None
    if segments[0] == "matchmaking" and len(segments) > 1 and segments[1] != "join":
        return segments[1]
    if segments[0] in {"progression", "post-match"} and len(segments) > 2:
        return segments[-1]
    if segments[0] == "teams" and len(segments) > 2 and segments[1] == "player":
        return segments[2]
    return None


@app.middleware("http")
async def require_participant_authentication(request: Request, call_next):
    path = request.url.path
    if RUNTIME_STRICT and runtime_coordinator.strict and (
        not runtime_coordinator.owns_worker or not postgres_worker_guard.held
    ) and path != "/health":
        return JSONResponse(status_code=503, content={"detail": "Savaş sunucusu yeniden başlatılmayı bekliyor."})
    protected = any(path.startswith(prefix) for prefix in PROTECTED_PLAYER_PREFIXES)
    if not auth_is_required() or not protected or request.method == "OPTIONS":
        return await call_next(request)

    try:
        token = participant_auth_service.bearer_token(
            request.headers.get("authorization")
        )
        def verify_identity():
            identity = participant_auth_service.verify_access_token(token)
            if platform_service.token_is_revoked(identity.player_id, identity.token_id):
                raise AuthenticationError("Bu cihaz oturumu sonlandırılmış.")
            return identity
        # Identity and revocation reads use PostgreSQL in production. Do not
        # stall every battle socket/tick on the event loop while they run.
        identity = await asyncio.to_thread(verify_identity)
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
    await runtime_coordinator.touch_player(identity.player_id)

    request.state.authenticated_player_id = identity.player_id
    request.state.authenticated_token_id = identity.token_id
    return await call_next(request)


def _rate_limit_policy(path: str) -> tuple[str, int, int] | None:
    if path in {"/auth/session", "/auth/provider-session"}:
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

CLIENT_DIR = client_directory(
    Path(__file__).resolve().parents[2],
    production=RUNTIME_STRICT,
    override=os.environ.get("GRIDSHARD_CLIENT_DIR", ""),
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
    RUNTIME_DATA_DIR
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
    PostgresTelemetryRepository(postgres_pool, max_events=TELEMETRY_MAX_EVENTS)
    if RUNTIME_STRICT else JsonFileTelemetryRepository(
        TELEMETRY_PATH, max_events=TELEMETRY_MAX_EVENTS,
    )
)
telemetry_service = InMemoryTelemetryService(
    repository=None if RUNTIME_STRICT else telemetry_repository
)

def process_completed_pvp_battle(state) -> None:
    if RUNTIME_STRICT:
        _process_durable_battle_result(state)
        return
    # /local-ai/sessions uses local-ai-<uuid> for isolated test battles.
    # Matchmaking fallback uses local-ai-match-<uuid> and must complete the
    # normal statistics/progression/post-match pipeline.
    if state.match_type == "local_test":
        telemetry_service.ingest_finished_battle(
            state
        )
        return

    # The first tournament match of a new four-week period replaces the
    # previous contribution counters. Queue the closed-period reward before
    # that authoritative progression write happens.
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
    if state.match_type == "team_tournament":
        try:
            _record_team_tournament_leg(state)
        except Exception:
            # Sonuç yazılamasa da maç kapanır; giriş uç noktası bitmiş oturumu
            # gördüğünde sonucu yeniden yazmayı dener.
            pass

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

    analytics_mode = (
        "team" if state.match_type == "team_tournament"
        else "friend" if state.match_type in {"friend", "social_friend", "team_training"}
        else "training" if state.match_type == "local_test"
        else "arena"
    )
    duration_ms = int(state.finished_at_ms if state.finished_at_ms is not None else state.elapsed_ms)
    duration_bucket = "under_60s" if duration_ms < 60_000 else "60_179s" if duration_ms < 180_000 else "180s_plus"
    for player_id in account_player_ids:
        result = "draw" if state.is_draw else "win" if player_id == state.winner_player_id else "loss"
        request_id = hashlib.sha256(f"product:battle:{state.battle_id}:{player_id}".encode("utf-8")).hexdigest()[:32]
        try:
            product_analytics_service.record(
                player_id, "battle_completed",
                {"result": result, "mode": analytics_mode, "duration": duration_bucket},
                request_id=request_id, client=False,
            )
        except Exception:
            # İsteğe bağlı analitik savaşın otoriter sonucunu değiştiremez.
            logging.getLogger(__name__).warning("Product analytics battle record failed", exc_info=True)

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

async def _finish_battle_off_thread(state):
    await asyncio.to_thread(process_completed_pvp_battle, state)
    if state.players:
        await _matchmaking_clear_match(next(iter(state.players)))


pvp_tick_runner = PvPTickRunner(
    pvp_service,
    pvp_websocket_adapter,
    match_finished_callback=(
        _finish_battle_off_thread
    ),
)
player_settings_service = PlayerSettingsService()

DEFAULT_PLAYER_DATA_PATH = (
    RUNTIME_DATA_DIR
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
_analytics_options = (
    _runtime_path("GRIDSHARD_PRODUCT_ANALYTICS_PATH", "product_analytics.json"),
    participant_auth_service.signing_key,
    lambda player_id: bool(
        (snapshot := player_data_repository.load(player_id))
        and snapshot.settings.get("analytics_consent") is True
    ),
)
product_analytics_service = (
    PostgresProductAnalyticsService(postgres_pool, *_analytics_options)
    if RUNTIME_STRICT else ProductAnalyticsService(*_analytics_options)
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
    PostgresBattlePoolPresetRepository(postgres_pool)
    if RUNTIME_STRICT else JsonBattlePoolPresetRepository(BATTLE_POOL_PRESET_PATH)
)
battle_pool_preset_service = (
    BattlePoolPresetService(
        battle_pool_preset_repository
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
team_repository = (
    PostgresTeamRepository(postgres_pool)
    if RUNTIME_STRICT else JsonTeamRepository(TEAM_DATA_PATH)
)
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
    # Simulations are intentionally not restored after process loss. A new
    # boot must never route players to a ready match from the former RAM owner.
    namespace=(f"{runtime_coordinator.namespace}:boot:{runtime_coordinator.owner_id}" if RUNTIME_STRICT else runtime_coordinator.namespace),
    instance_id=MATCHMAKING_INSTANCE_ID,
    websocket_base_url=MATCHMAKING_PUBLIC_WS_BASE_URL,
)
MATCHMAKING_AI_FALLBACK_SECONDS = 32
# Beta clients play server-controlled AI; live PvP can be explicitly enabled.
MATCHMAKING_AI_ONLY = os.environ.get(
    "GRIDSHARD_MATCHMAKING_AI_ONLY",
    "1" if "beta" in VERSION.lower() else "0",
).strip().lower() in {"1", "true", "yes", "on"}
PURCHASE_TEST_MODE = purchase_test_mode_enabled(RUNTIME_STRICT)
AD_TEST_MODE = ad_test_mode_enabled(RUNTIME_STRICT)
STORE_VERIFIERS = StoreVerifiers.from_environment()


def _store_reconcile_interval_seconds() -> float:
    raw = os.environ.get("GRIDSHARD_STORE_RECONCILE_INTERVAL_SECONDS", "").strip()
    try:
        value = float(raw) if raw else 1800.0
    except ValueError:
        raise RuntimeError("GRIDSHARD_STORE_RECONCILE_INTERVAL_SECONDS saniye cinsinden sayı olmalıdır.") from None
    if value <= 0:
        return 0.0
    return max(value, 300.0)


STORE_RECONCILE_INTERVAL_SECONDS = _store_reconcile_interval_seconds()
DAILY_META_ROLL_LOCK = Lock()
SOCIAL_LOCK = RLock()
RUNTIME_BOOT_ID = uuid4().hex
REWARD_INBOX_LOCK = Lock()
PERSISTENT_STATE = PersistentState()
ECONOMIC_OPERATIONS = frozenset({
    "claim_reward_inbox_item", "claim_player_arena_reward", "claim_player_operator_title_reward", "upgrade_player_collection_module",
    "claim_player_progression_gift_chest", "open_player_progression_chest",
    "open_all_available_player_progression_chests", "buy_store_chest", "claim_battle_ad_reward",
    "unlock_player_core_skill", "upgrade_player_core", "choose_player_module_talent",
    "reset_player_module_talents", "claim_daily_mission_reward", "claim_login_period_reward",
    "claim_season_tier_reward", "claim_premium_season_tier_reward",
})


def _replay_economic_operation(player_id, outcome):
    profile = _team_member_profile(player_id)
    layout = outcome["layout"]
    if layout == "meta":
        response = {"meta_progression": meta_progression_service.view(profile)}
    elif layout == "inbox":
        response = _reward_inbox_view(profile)
    elif layout == "engagement":
        response = {**profile.to_view(), "tier_advanced": None}
    else:
        response = {}
    if outcome["with_profile"]:
        response["profile"] = profile.to_view()
    response.update(outcome["receipts"])
    response["replayed"] = True
    if isinstance(response.get("receipt"), dict):
        response["receipt"] = {**response["receipt"], "replayed": True}
    return response


@contextmanager
def _persistent_operation(player_ids=()):
    if not RUNTIME_STRICT:
        yield
        return
    with PERSISTENT_STATE.operation(
        pool=postgres_pool, store=player_data_store_service, platform=platform_service,
        teams=team_service, social_lock=SOCIAL_LOCK, player_ids=player_ids,
        safety_check=_require_worker_ownership,
    ):
        yield


def _require_worker_ownership():
    if RUNTIME_STRICT and runtime_coordinator.strict and (
        not runtime_coordinator.owns_worker or not postgres_worker_guard.held
    ):
        raise HTTPException(status_code=503, detail="Worker sahipliği kaybedildi; yeniden başlatma gerekir.")


def persistent_operation(function):
    """Explicit sync-handler boundary; do not decorate async/provider I/O."""
    parameters = signature(function)

    @wraps(function)
    def guarded(*args, **kwargs):
        arguments = parameters.bind(*args, **kwargs).arguments
        player_ids = [arguments.get("player_id")]
        request = arguments.get("request")
        if isinstance(request, BaseModel):
            player_ids.extend(getattr(request, name, None) for name in (
                "player_id", "target_player_id", "requester_id", "member_id", "applicant_id",
            ))
        with PERSISTENT_STATE.lock, _pending_results_barrier(), _persistent_operation(player_ids):
            actor_id = arguments.get("player_id") or getattr(request, "player_id", None)
            if (RUNTIME_STRICT and runtime_coordinator.strict and actor_id
                and function.__name__ not in {"create_participant_auth_session", "create_provider_auth_session"}
                and player_data_repository.load(actor_id) is None):
                raise HTTPException(status_code=401, detail="Oyuncu hesabı artık mevcut değil.")
            kind = function.__name__
            request_id = getattr(request, "request_id", None)
            economic = RUNTIME_STRICT and kind in ECONOMIC_OPERATIONS and actor_id and request_id
            if not economic:
                return function(*args, **kwargs)
            payload = {key: value.model_dump(mode="json", exclude={"request_id"}) if isinstance(value, BaseModel) else value
                       for key, value in arguments.items()}
            receipts = PostgresEconomicOperations(postgres_pool)
            try:
                key, previous = receipts.begin(actor_id, request_id, kind, payload)
            except EconomicOperationConflict as exc:
                raise HTTPException(status_code=409, detail=str(exc)) from exc
            if previous is not None:
                return _replay_economic_operation(actor_id, previous)
            response = function(*args, **kwargs)
            layout = ("meta" if "meta_progression" in response else "inbox" if kind == "claim_reward_inbox_item"
                      else "engagement" if kind.startswith(("claim_daily_", "claim_login_", "claim_season_", "claim_premium_")) else "basic")
            receipts.complete(actor_id, key, response, layout)
            return response

    return guarded


@contextmanager
def _pending_results_barrier():
    # A failed result may not be overtaken by a season rollover, prize claim
    # or another economic mutation. Nested helpers are already in the UOW.
    if RUNTIME_STRICT and not PERSISTENT_STATE.active:
        _drain_pending_battle_results()
    yield


def _process_durable_battle_result(state, *, replaying=False) -> None:
    if state.match_type == "local_test":
        telemetry_service.ingest_finished_battle(state)
        return
    ledger = PostgresBattleResults(postgres_pool)
    account_ids = tuple(state.account_player_ids or tuple(state.players))
    with PERSISTENT_STATE.lock:
        _require_worker_ownership()
        if not replaying:
            _drain_pending_battle_results()
        # This commit precedes the grant transaction. A failure afterwards
        # leaves a recoverable pending intention, not partially awarded players.
        if ledger.record_terminal(state) == "aborted":
            return
        try:
            with _persistent_operation(account_ids):
                entry = ledger.lock(state.battle_id)
                if entry["status"] == "pending":
                    if any(player_data_repository.load(owner) is None for owner in account_ids):
                        ledger.abort(state.battle_id, "participant_missing")
                        return  # Never resurrect a deleted account from a battle.
                    # Memory deduplication is not the authority. Clear this
                    # battle only; the durable locked ledger decides replay.
                    _forget_pending_battle_projection(state.battle_id)
                    with player_profile_service.settlement_time(entry["completed_at"]):
                        player_statistics_service.process_finished_battle(state)
                        player_progression_service.process_finished_battle(
                            state, completed_at=entry["completed_at"],
                        )
                        if state.match_type == "team_tournament":
                            _record_team_tournament_leg(state)
                        _complete_social_battle_invites(state.battle_id)
                        team_service.complete_training_challenge(state.battle_id)
                        for owner in account_ids:
                            persist_player_data(owner)
                    ledger.apply(state.battle_id, {
                        owner: player_progression_service.player_result(state.battle_id, owner)
                        for owner in account_ids
                    })
        except BaseException:
            _forget_pending_battle_projection(state.battle_id)
            raise
        # Optional observability is separate from authoritative economic state.
        # Repository event IDs are stable and permit later retry without grants.
        try:
            telemetry_service.ingest_finished_battle(state)
            mode = "team" if state.match_type == "team_tournament" else "friend" if state.match_type in {"friend_battle", "team_training"} else "arena"
            duration = int(state.finished_at_ms if state.finished_at_ms is not None else state.elapsed_ms)
            bucket = "under_60s" if duration < 60_000 else "60_179s" if duration < 180_000 else "180s_plus"
            for owner in account_ids:
                product_analytics_service.record(
                    owner, "battle_completed",
                    {"result": "draw" if state.is_draw else "win" if state.winner_player_id == owner else "loss",
                     "mode": mode, "duration": bucket},
                    request_id=hashlib.sha256(f"product:battle:{state.battle_id}:{owner}".encode()).hexdigest()[:32],
                    client=False,
                )
        except Exception:
            logging.getLogger(__name__).warning("Committed battle observability unavailable", exc_info=True)
    if state.players:
        matchmaking_service.clear_match(next(iter(state.players)))


def _forget_pending_battle_projection(battle_id):
    player_statistics_service._processed_battle_ids.discard(battle_id)
    player_progression_service._processed_battle_ids.discard(battle_id)
    player_progression_service._results_by_battle_id.pop(battle_id, None)


def _drain_pending_battle_results():
    with PERSISTENT_STATE.lock:
        while True:
            pending = PostgresBattleResults(postgres_pool).pending()
            if not pending:
                return
            for state in pending:
                _process_durable_battle_result(state, replaying=True)


def _recover_pending_battle_results():
    # Failed first writes may still be recoverable from a finished RAM session;
    # persisted pending results also survive complete loss of that RAM state.
    _drain_pending_battle_results()
    for session in list(pvp_service._sessions.values()):
        if session.engine.state.status == BattleStatus.FINISHED:
            _process_durable_battle_result(session.engine.state)


def persist_player_data(
    player_id: str,
) -> None:
    if RUNTIME_STRICT:
        PERSISTENT_STATE.require_touched(player_id)
    player_data_store_service.save_player(
        player_id
    )
    if RUNTIME_STRICT:
        PERSISTENT_STATE.saved(player_id)


@persistent_operation
def attach_player_progression_to_session(
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
    battle_player.battle_emoji_ids = profile.available_battle_emoji_ids
    # Beta.72: çekirdek türü CAN'ı değiştirmez; bütün çekirdekler kanonik CAN'la girer.
    session.engine.state.player_module_talents[player_id] = {k: dict(v) for k, v in profile.module_talents.items()}
    today = daily_meta_catalog_view()["day"]
    session.engine.state.player_daily_meta_ids[player_id] = (
        profile.daily_meta_id
        if profile.daily_meta_day == today and daily_meta_by_id(profile.daily_meta_id)
        else ""
    )
    from .arena_canon import unlocked_module_ids
    session.engine.state.player_unlocked_modules[player_id] = unlocked_module_ids(max(profile.rating, profile.highest_rating))


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
    ai_archetype: str = "balanced"


class LocalAiBattleCommandRequest(BaseModel):
    player_id: str
    kind: str
    payload: dict


class ProfileNameRequest(BaseModel):
    model_config = {"extra": "forbid"}
    display_name: str


class ProfileBattlePoolRequest(BaseModel):
    model_config = {"extra": "forbid"}
    battle_pool_ids: list[str]


class ProfileCosmeticsRequest(BaseModel):
    model_config = {"extra": "forbid"}
    avatar_id: str | None = None
    avatar_frame_id: str | None = None
    battle_emoji_id: str | None = None
    profile_background_id: str | None = None


class MetaOperationRequest(BaseModel):
    model_config = {"extra": "forbid"}
    request_id: str


class PurchaseRequest(BaseModel):
    model_config = {"extra": "forbid"}
    product_id: str
    provider: str
    transaction_id: str
    purchase_token: str = ""


class AdRewardRequest(BaseModel):
    model_config = {"extra": "forbid"}
    request_id: str
    provider: str


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
    emblem_id: str | None = None
    frame_id: str | None = None
    name_color_id: str | None = None


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


class FriendRequestCancelOperation(BaseModel):
    player_id: str
    target_player_id: str
    request_id: str


class InboxNoticeSeenRequest(BaseModel):
    player_id: str
    notice_ids: list[str] = []


class CoreSelectionRequest(BaseModel):
    model_config = {"extra": "forbid"}
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


class MatchmakingJoinRequest(BaseModel):
    player_id: str


class AuthSessionRequest(BaseModel):
    player_id: str
    device_secret: str
    device_id: str | None = None
    device_name: str | None = None
    platform: str = "web"


class ProviderSessionRequest(BaseModel):
    exchange: str
    device_secret: str
    device_id: str
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
    device_id: str | None = None


class PushSubscriptionRequest(BaseModel):
    model_config = {"extra": "forbid"}
    player_id: str
    device_id: str
    platform: str
    token: str


class InviteCodeRequest(BaseModel):
    player_id: str
    code: str | None = None
    request_id: str | None = None


class DirectMessageRequest(BaseModel):
    player_id: str
    recipient_id: str
    text: str
    request_id: str | None = None


class DirectMessageSeenRequest(BaseModel):
    player_id: str
    request_id: str | None = None
    # Boşsa bütün sohbetler okunur (eski istemci davranışı).
    peer_id: str | None = None


class SocialSafetyRequest(BaseModel):
    player_id: str
    target_player_id: str
    request_id: str | None = None
    blocked: bool | None = None
    reason: str | None = None
    detail: str | None = None


class GdprDeleteRequest(BaseModel):
    player_id: str
    confirmation: str


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
    analytics_consent: bool | None = None


class ProductAnalyticsEventRequest(BaseModel):
    event_type: str
    dimensions: dict
    request_id: str | None = None


@app.post("/auth/session")
@persistent_operation
def create_participant_auth_session(
    request: AuthSessionRequest,
) -> dict:
    try:
        device_id = str(request.device_id or "").strip() or hashlib.sha256(
            request.device_secret.encode("utf-8")
        ).hexdigest()[:24]
        result = participant_auth_service.register_or_login(
            request.player_id,
            request.device_secret,
            device_id,
        )
        identity = participant_auth_service.verify_access_token(
            result["access_token"]
        )
        platform_service.register_device(
            request.player_id,
            device_id,
            request.device_name or f"{request.platform.title()} cihazı",
            request.platform,
            identity.token_id,
            identity.expires_at,
        )
        if RUNTIME_STRICT and player_data_repository.load(request.player_id) is None:
            # An authenticated first-time account must have durable profile
            # state before entering its first match (no client data import).
            player_profile_service.get_or_create(request.player_id)
            persist_player_data(request.player_id)
        return {**result, "device_id": device_id}
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=401,
            detail=str(exc),
        ) from exc
    except PlatformServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/auth/provider-session")
@persistent_operation
def create_provider_auth_session(request: ProviderSessionRequest) -> dict:
    try:
        exchange = platform_service.consume_oauth_exchange(request.exchange)
        PERSISTENT_STATE.touch(exchange["player_id"])
        result = participant_auth_service.authorize_device(
            exchange["player_id"],
            request.device_secret,
            request.device_id,
        )
        identity = participant_auth_service.verify_access_token(
            result["access_token"]
        )
        platform_service.register_device(
            exchange["player_id"],
            request.device_id,
            request.device_name or f"{request.platform.title()} cihazı",
            request.platform,
            identity.token_id,
            identity.expires_at,
        )
        if RUNTIME_STRICT and player_data_repository.load(exchange["player_id"]) is None:
            player_profile_service.get_or_create(exchange["player_id"])
            persist_player_data(exchange["player_id"])
        return {
            **result,
            "device_id": request.device_id,
            "provider": exchange["provider"],
        }
    except (AuthenticationError, PlatformServiceError) as exc:
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
            player_id,
            request.channel,
            request.destination,
            language=player_settings_service.get_or_create(player_id).language,
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
def start_account_oauth(
    player_id: str,
    provider: str,
    mode: str = Query(default="link"),
) -> dict:
    try:
        return platform_service.start_oauth(player_id, provider, mode=mode)
    except PlatformServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _oauth_callback_redirect(
    provider: str,
    state: str,
    code: str,
    error: str,
):
    query = {"oauth_provider": provider}
    if error:
        query["oauth_status"] = "cancelled"
        return RedirectResponse(
            f"{platform_service.web_base_url}/?{urlencode(query)}",
            status_code=303,
        )
    try:
        result = platform_service.complete_oauth(provider, state, code)
    except PlatformServiceError:
        query["oauth_status"] = "error"
        return RedirectResponse(
            f"{platform_service.web_base_url}/?{urlencode(query)}",
            status_code=303,
        )
    query["oauth_status"] = "linked"
    if result.get("exchange"):
        query["oauth_exchange"] = result["exchange"]
    return RedirectResponse(
        f"{platform_service.web_base_url}/?{urlencode(query)}",
        status_code=303,
    )


@app.get("/oauth/{provider}/callback")
def complete_account_oauth(
    provider: str,
    state: str = Query(default=""),
    code: str = Query(default=""),
    error: str = Query(default=""),
):
    return _oauth_callback_redirect(provider, state, code, error)


@app.post("/oauth/apple/callback")
async def complete_apple_oauth(request: Request):
    try:
        body = (await request.body()).decode("utf-8")
        fields = parse_qs(body, keep_blank_values=True)
    except UnicodeDecodeError:
        fields = {}
    return _oauth_callback_redirect(
        "apple",
        str(fields.get("state", [""])[0]),
        str(fields.get("code", [""])[0]),
        str(fields.get("error", [""])[0]),
    )


@app.delete("/accounts/{player_id}/devices/{device_id}")
@persistent_operation
def revoke_account_device(
    player_id: str,
    device_id: str,
    request: DeviceActionRequest,
) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    try:
        account = platform_service.revoke_device(player_id, device_id)
        participant_auth_service.revoke_device(player_id, device_id)
        return account
    except (AuthenticationError, PlatformServiceError) as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.post("/account-recovery/request")
def request_account_recovery(request: RecoveryRequest) -> dict:
    try:
        return platform_service.request_recovery(request.identifier)
    except PlatformServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/account-recovery/confirm")
@persistent_operation
def confirm_account_recovery(request: RecoveryConfirmRequest) -> dict:
    try:
        platform_service.confirm_recovery(request.player_id, request.code)
        participant_auth_service.reset_device_secret(
            request.player_id,
            request.new_device_secret,
            request.device_id,
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
    http_request: Request,
) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    try:
        # Abonelik yalnız o cihazın kendi oturumundan açılabilir.
        return platform_service.subscribe_push(
            player_id, request.device_id, request.platform, request.token,
            token_id=getattr(http_request.state, "authenticated_token_id", None),
        )
    except PlatformServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.delete("/notifications/{player_id}/push-subscriptions/{device_id}")
def unsubscribe_platform_push(player_id: str, device_id: str, request: Request) -> dict:
    try:
        return platform_service.unsubscribe_push(
            player_id, device_id, token_id=getattr(request.state, "authenticated_token_id", None),
        )
    except PlatformServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/social/{player_id}/invite-codes")
def create_social_invite_code(player_id: str, request: InviteCodeRequest) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    return platform_service.create_invite(player_id)


@app.post("/social/{player_id}/invite-codes/accept")
@persistent_operation
def accept_social_invite_code(player_id: str, request: InviteCodeRequest) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    if RUNTIME_STRICT:
        result = _apply_postgres_social_workflow("accept_code", player_id, request.code, request.request_id)
        return {key: value for key, value in result.items() if key not in {"affected_player_ids", "social"}} | {"social": result["social"]}
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
            source_player_id=player_id,
        )
        return {**result, "social": _social_view(player_id)}
    except PlatformServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.get("/social/{player_id}/messages")
@persistent_operation
def get_direct_messages(player_id: str, peer_id: str | None = None) -> dict:
    return {"messages": platform_service.messages(player_id, peer_id)}


@app.post("/social/{player_id}/messages/seen")
@persistent_operation
def mark_direct_messages_seen(player_id: str, request: DirectMessageSeenRequest) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    peer_id = str(request.peer_id or "").strip() or None
    if RUNTIME_STRICT:
        result = _apply_postgres_social_workflow("mark_seen", player_id, peer_id, request.request_id)
        return {**result["social"], "replayed": result["replayed"]}
    platform_service.mark_conversation_seen(player_id, peer_id)
    if peer_id is None:
        with SOCIAL_LOCK:
            profile = _team_member_profile(player_id)
            profile.direct_messages_seen_at = int(time.time())
            persist_player_data(player_id)
    return _social_view(player_id)


@app.post("/social/{player_id}/messages")
@persistent_operation
def send_direct_message(player_id: str, request: DirectMessageRequest) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    if RUNTIME_STRICT:
        result = _apply_postgres_social_workflow("send_message", player_id, request.recipient_id.strip(), request.text, request.request_id)
        return {"message": result["message"], "replayed": result["replayed"]}
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
            source_player_id=player_id,
        )
        return {"message": message}
    except PlatformServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/social/{player_id}/block")
@persistent_operation
def set_social_block(player_id: str, request: SocialSafetyRequest) -> dict:
    if request.player_id != player_id or request.target_player_id == player_id:
        raise HTTPException(status_code=403, detail="Geçersiz engelleme işlemi.")
    blocked = request.blocked is not False
    if RUNTIME_STRICT:
        result = _apply_postgres_friend_operation(
            "block" if blocked else "unblock", player_id,
            request.target_player_id.strip(), request.request_id,
        )
        return {
            "blocked_player_ids": list(_team_member_profile(player_id).blocked_player_ids),
            "social": result["social"], "replayed": result["replayed"],
        }
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
@persistent_operation
def export_account_data(player_id: str) -> JSONResponse:
    # Export is a read, not a save: do not overwrite a cold account with a
    # default profile, and do not hand a client any restore capability.
    _team_member_profile(player_id)
    snapshot = player_data_store_service.build_snapshot(player_id).to_dict()
    try:
        analytics_events = product_analytics_service.events_for(player_id)
    except ProductAnalyticsStorageError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    payload = build_personal_export(
        snapshot, platform_service.export_data(player_id),
        participant_auth_service.signing_key,
        product_analytics=analytics_events,
    )
    return JSONResponse(payload, headers={"Cache-Control": "no-store", "Pragma": "no-cache"})


@app.post("/accounts/{player_id}/delete")
@persistent_operation
def delete_account_data(player_id: str, request: GdprDeleteRequest) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    if request.confirmation.strip() != f"SIL {player_id}":
        raise HTTPException(status_code=422, detail=f"Onay metni `SIL {player_id}` olmalıdır.")
    if RUNTIME_STRICT:
        with SOCIAL_LOCK:
            result = PostgresAccountErasure(
                postgres_pool, platform_service, team_service, player_data_repository,
                participant_auth_service.repository, product_analytics_service,
            ).erase(player_id)
            for owner_id in result.pop("affected_player_ids"):
                player_data_store_service.load_player(owner_id)
            player_profile_service._profiles.pop(player_id, None)
            player_statistics_service._statistics.pop(player_id, None)
            player_settings_service._settings.pop(player_id, None)
            return {"player_id": player_id, **result, "gdpr_erasure_completed": True}
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
    player_settings_service.update(player_id, analytics_consent=False)
    persist_player_data(player_id)
    try:
        product_analytics_service.erase_player(player_id)
    except ProductAnalyticsStorageError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
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


@app.post("/player-data/{player_id}/save")
def save_player_data(
    player_id: str,
) -> dict:
    raise HTTPException(status_code=410, detail="İlerleme yalnız sunucudaki oyun işlemleriyle kaydedilir.")


@app.post("/player-data/{player_id}/load")
def load_player_data(
    player_id: str,
) -> dict:
    raise HTTPException(status_code=410, detail="Dışa aktarılan veya istemcide düzenlenen ilerleme yüklenemez.")


@app.delete("/player-data/{player_id}")
def delete_player_data(
    player_id: str,
) -> dict:
    raise HTTPException(status_code=410, detail="Hesap silmek için Ayarlar'daki onaylı hesap silme işlemini kullanın.")


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
    attach_player_progression_to_session(session.session_id, pair.player_a_id)
    attach_player_progression_to_session(session.session_id, pair.player_b_id)


@persistent_operation
def _matchmaking_player_details(player_id):
    profile = player_profile_service.get_or_create(player_id)
    return {"rating":profile.rating, "league_name_tr":profile.league_name_tr,
            "level":profile.level, "match_level":round((sum(1 + profile.module_upgrade_levels.get(mid, 0)
                for mid in profile.preferred_battle_pool_ids) / 6 + 1 + profile.core_upgrade_levels.get(profile.selected_core_type, 0)) / 2)}


def _provision_match_state(pair, background_tasks):
    accounts = [pair.player_a_id] if pair.opponent_type == "ai" else [pair.player_a_id, pair.player_b_id]
    with PERSISTENT_STATE.lock:
        existed = pair.match_id in pvp_service._sessions
        try:
            with _pending_results_barrier(), _persistent_operation(accounts):
                if RUNTIME_STRICT and any(player_data_repository.load(owner) is None for owner in accounts):
                    raise HTTPException(status_code=404, detail="Eşleşme katılımcısı artık mevcut değil.")
                if pair.opponent_type == "ai":
                    _create_matchmaking_ai_session(pair, background_tasks=background_tasks)
                else:
                    _ensure_human_match_session(pair)
        except BaseException:
            # A new, half-provisioned RAM session must never be published as
            # ready on the next retry. Existing live sessions are not removed.
            if not existed:
                pvp_service.delete_session(pair.match_id)
            raise


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

    await asyncio.to_thread(_provision_match_state, pair, background_tasks)

    if distributed:
        pair = await redis_matchmaking_service.mark_ready(pair)
        await runtime_coordinator.touch_session(
            pair.match_id,
            ttl_seconds=360,
            player_ids=(pair.player_a_id, pair.player_b_id),
            websocket_base_url=MATCHMAKING_PUBLIC_WS_BASE_URL,
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

        profile = await asyncio.to_thread(_matchmaking_player_details, request.player_id)
        queue_entry = await _matchmaking_enqueue(
            request.player_id,
            rating=profile["rating"],
            league_name_tr=profile["league_name_tr"],
            level=profile["match_level"],
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
                "rating": profile["rating"],
                "league_name_tr": profile["league_name_tr"],
                "level": profile["level"],
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
@persistent_operation
def get_player_settings(
    player_id: str,
) -> dict:
    return (
        player_settings_service
        .get_or_create(player_id)
        .to_view()
    )


def _analytics_actor(request: Request) -> str:
    try:
        token = participant_auth_service.bearer_token(request.headers.get("authorization"))
        identity = participant_auth_service.verify_access_token(token)
        if platform_service.token_is_revoked(identity.player_id, identity.token_id):
            raise AuthenticationError("Bu cihaz oturumu sonlandırılmış.")
        return identity.player_id
    except AuthenticationError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@app.get("/analytics/schema")
def product_analytics_schema() -> dict:
    return {
        "schema_version": 1,
        "default_consent": False,
        "retention_days": RETENTION_DAYS,
        "events": {name: {key: sorted(values) for key, values in fields.items()} for name, fields in EVENT_DIMENSIONS.items()},
    }


@app.post("/analytics/events")
def record_product_analytics(request: Request, event: ProductAnalyticsEventRequest) -> dict:
    player_id = _analytics_actor(request)
    try:
        accepted = product_analytics_service.record(
            player_id, event.event_type, event.dimensions, request_id=event.request_id,
        )
    except ProductAnalyticsStorageError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except ProductAnalyticsError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {"accepted": accepted}


@app.get("/analytics/my-events")
def my_product_analytics(request: Request) -> JSONResponse:
    player_id = _analytics_actor(request)
    try:
        events = product_analytics_service.events_for(player_id)
    except ProductAnalyticsStorageError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return JSONResponse({"events": events}, headers={"Cache-Control": "no-store"})


@app.delete("/analytics/my-events")
def delete_my_product_analytics(request: Request) -> dict:
    player_id = _analytics_actor(request)
    try:
        removed = product_analytics_service.erase_player(player_id)
    except ProductAnalyticsStorageError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"deleted_events": removed}


@app.put("/settings/{player_id}")
@persistent_operation
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
            analytics_consent=request.analytics_consent,
        )
    except PlayerSettingsError as exc:
        raise HTTPException(
            status_code=422,
            detail=str(exc),
        ) from exc

    persist_player_data(
        player_id
    )
    if request.analytics_consent is False:
        try:
            product_analytics_service.erase_player(player_id)
        except ProductAnalyticsStorageError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
    return settings.to_view()


@app.get("/progression/battles/{battle_id}/{player_id}")
@persistent_operation
def get_battle_progression(
    battle_id: str,
    player_id: str,
) -> dict:
    result = PostgresBattleResults(postgres_pool).player_result(battle_id, player_id) if RUNTIME_STRICT else (
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
    progression = PostgresBattleResults(postgres_pool).player_result(battle_id, player_id) if RUNTIME_STRICT else (
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
        progression = PostgresBattleResults(postgres_pool).player_result(battle_id, player_id) if RUNTIME_STRICT else (
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

    with _persistent_operation([player_id]):
        return _post_match_view(battle_id, player_id, progression)


def _post_match_view(battle_id, player_id, progression):
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
@persistent_operation
def get_statistics(
    player_id: str,
) -> dict:
    return (
        player_statistics_service
        .get_or_create(player_id)
        .to_view()
    )


@app.get("/profile/{player_id}/battle-history")
@persistent_operation
def get_player_battle_history(player_id: str, limit: int = 30) -> dict:
    return {"battles": PostgresBattleResults(postgres_pool).history(player_id, limit) if RUNTIME_STRICT else []}


def _leaderboard_profile_rows() -> list[dict]:
    """Merge persisted players with authoritative profiles already in memory."""
    players: dict[str, dict] = {}
    current_season = season_descriptor()

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



# --- Takımlar arası turnuva ------------------------------------------------
# Kurallar ve eşleşme team_tournament.py içindedir; takvim sezonla aynı dört
# haftalık döngüdür. Kayıtlar ve oynanan maç ayakları takım deposunda dönem
# kimliğiyle tutulur; AI takımları her dönem katılır.

def _team_tournament_ai_teams() -> dict[str, dict]:
    teams: dict[str, dict] = {}
    for bot in BOTS:
        team_id = str(bot.get("team_id") or "").strip()
        if not team_id:
            continue
        team = teams.setdefault(
            team_id,
            {"team_name": str(bot.get("team_name") or "AI Takımı"), "roster": []},
        )
        team["roster"].append({
            "player_id": str(bot["id"]),
            "display_name": str(bot["display_name"]),
            "rating": max(0, int(bot.get("rating", 0))),
        })
    return teams


def _team_roster_snapshot(team: dict) -> list[dict]:
    roster = []
    for member_id in team.get("member_ids", []):
        profile = _team_member_profile(str(member_id))
        roster.append({
            "player_id": str(member_id),
            "display_name": profile.display_name,
            "rating": max(0, int(profile.rating)),
        })
    return roster


def _team_tournament_state(period_id: str) -> dict:
    """Dönemin kayıtları ve oynanan maç ayakları."""
    return team_service.tournament_state(period_id)


def _events_view(moment: datetime | None = None) -> dict:
    current = moment or datetime.now(timezone.utc)
    return build_events_view(
        _leaderboard_profile_rows(),
        current,
        team_tournament_state=_team_tournament_state(team_tournament_period_id(current)),
    )


def _team_tournament_final_standings(period_id: str) -> list[dict]:
    calendar = team_tournament_calendar(period_id)
    state = _team_tournament_state(period_id)
    return build_team_tournament_view(
        period_id,
        calendar["ends_at"],
        registrations=state["registrations"],
        ai_teams=_team_tournament_ai_teams(),
        legs=state["legs"],
    )["standings"]


def _team_tournament_periods_to_settle(profile, moment: datetime) -> list[str]:
    """Turnuvası bitmiş (4. hafta Pazar'ı geçmiş) ve oyuncunun maç oynadığı dönemler."""
    candidates = {str(profile.team_tournament_period or ""), team_tournament_period_id(moment)}
    ready = []
    for period_id in candidates:
        try:
            calendar = team_tournament_calendar(period_id)
        except (TypeError, ValueError):
            continue
        if moment >= calendar["ends_at"]:
            ready.append(period_id)
    return sorted(ready)


def _record_team_tournament_leg(state) -> None:
    """Takım turnuvası maçının sonucunu kendi maç ayağına bir kez yazar."""
    session_id = str(getattr(state, "battle_id", "") or "")
    if not session_id.startswith(TEAM_TOURNAMENT_SESSION_PREFIX):
        return
    leg_id = session_id[len(TEAM_TOURNAMENT_SESSION_PREFIX):]
    period_id = team_tournament_period_of_leg(leg_id)
    try:
        located = locate_team_tournament_leg(
            period_id,
            leg_id,
            registrations=_team_tournament_state(period_id)["registrations"],
            ai_teams=_team_tournament_ai_teams(),
        )
    except (TypeError, ValueError):
        return
    if located is None:
        return
    pairing = located["pairing"]
    participants = {pairing["home_player_id"], pairing["away_player_id"]}
    winner = str(getattr(state, "winner_player_id", "") or "")
    loser = str(getattr(state, "loser_player_id", "") or "")
    draw = bool(getattr(state, "is_draw", False)) or winner not in participants
    team_service.record_tournament_leg(period_id, leg_id, {
        "winner_player_id": None if draw else winner,
        "loser_player_id": None if draw else loser,
        "draw": draw,
        "battle_id": session_id,
        "finish_reason": str(getattr(state, "finish_reason", "") or ""),
    })


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
            "season": {"id": season_descriptor()["id"], "name_tr": season_descriptor()["name_tr"], "ends_at": season_descriptor()["ends_at"], "summary": {}},
            "statistics": record,
            "honors": {"rank_trophy_ids": [], "badge_ids": []},
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
    season = season_descriptor()

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
        # Devre Koleksiyonu ziyaretçilere de açıktır.
        "honors": {
            "rank_trophy_ids": list(profile.unlocked_rank_trophy_ids),
            "badge_ids": list(profile.unlocked_badge_ids),
        },
        "visibility": {
            "profile": True,
            "avatar": False,
            "rewards": False,
            "settings": False,
        },
    }


@app.get("/public-profiles/{player_id}")
@persistent_operation
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
        appearance = team_appearance_for_seed(clean_team_id)
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
        appearance = team_appearance(team.get("cosmetics"))
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

    competition = _events_view()
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
        "appearance": appearance,
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
@persistent_operation
def get_public_team_profile(team_id: str) -> dict:
    return _public_team_profile_view(team_id)


@app.get("/leaderboards")
@persistent_operation
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
        "season": season_descriptor(),
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
        iso_year, iso_week, _ = datetime.now(timezone.utc).isocalendar()
        current_week = f"{iso_year}-W{iso_week:02d}"
        current_season = season_descriptor()["id"]

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

        # Takım turnuvası dönemin 4. haftası bitince sona erer. Ödül ekrandaki
        # sıralamayla aynı hesaptan gelir: oyuncunun kayıtlı kadrosunda olduğu
        # takım ilk üçteyse ve katkısı en az 4 puansa kasası kuyruğa girer.
        for team_period in _team_tournament_periods_to_settle(target, datetime.now(timezone.utc)):
            standings = _team_tournament_final_standings(team_period)
            team_row = next(
                (
                    row for row in standings
                    if not row["is_ai"]
                    and any(member["player_id"] == player_id for member in row["members"])
                ),
                None,
            )
            if team_row is None or not 1 <= team_row["position"] <= len(TEAM_PRIZES):
                continue
            member = next(item for item in team_row["members"] if item["player_id"] == player_id)
            if member["contribution_points"] < TEAM_TOURNAMENT_MINIMUM_POINTS:
                continue
            changed |= _queue_competition_reward(
                target,
                source="team_tournament",
                period_id=team_period,
                position=team_row["position"],
                prize=dict(TEAM_PRIZES[team_row["position"] - 1]),
                team_id=team_row["team_id"],
            )
        if changed:
            persist_player_data(player_id)


# Mesaj kutusu duyuruları: oyun güncellemeleri. Oyun bildirimleri (ör. takım
# turnuvası maç saati) okuma anında oyuncunun durumundan üretilir.
INBOX_UPDATE_NOTICES: tuple[dict, ...] = (
    {
        "notice_id": "update-beta72",
        "kind": "update",
        "title_tr": "Beta.72 güncellemesi",
        "body_tr": "Modül ve çekirdek imza mekanikleri, yeni savaş efektleri, sezon ödüllerinde ücretli geçiş sütunu ve arkadaş savaşı davetleri oyuna eklendi.",
    },
)


def _inbox_invitations(profile) -> list[dict]:
    """Bekleyen ve kabul edilip henüz bitmemiş kupasız savaş davetleri."""
    player_id = profile.player_id
    items: list[dict] = []
    for invite in reversed(profile.social_battle_invites[-50:]):
        status = str(invite.get("status") or "")
        incoming = invite.get("opponent_id") == player_id
        if status == "pending" and not incoming:
            continue
        if status not in {"pending", "accepted"}:
            continue
        if status == "accepted" and not _battle_session_open(invite.get("battle_session_id")):
            continue
        peer_id = invite.get("challenger_id") if incoming else invite.get("opponent_id")
        peer_name = invite.get("challenger_name") if incoming else invite.get("opponent_name")
        items.append({
            "invitation_id": str(invite.get("invite_id")),
            "kind": "friend_battle",
            "status": status,
            "incoming": incoming,
            "peer_id": peer_id,
            "peer_name": peer_name or "Oyuncu",
            "battle_session_id": invite.get("battle_session_id"),
            "players": [invite.get("challenger_id"), invite.get("opponent_id")],
        })
    team = team_service.team_for_player(player_id)
    if team:
        names = {
            member_id: _team_member_profile(member_id).display_name
            for member_id in team.get("member_ids", [])
        }
        for challenge in reversed(team.get("training_challenges", [])[-50:]):
            status = str(challenge.get("status") or "")
            incoming = challenge.get("opponent_id") == player_id
            outgoing = challenge.get("challenger_id") == player_id
            if not (incoming or outgoing):
                continue
            if status == "pending" and not incoming:
                continue
            if status not in {"pending", "accepted"}:
                continue
            if status == "accepted" and not _battle_session_open(challenge.get("battle_session_id")):
                continue
            peer_id = challenge.get("challenger_id") if incoming else challenge.get("opponent_id")
            items.append({
                "invitation_id": str(challenge.get("challenge_id")),
                "kind": "team_training",
                "status": status,
                "incoming": incoming,
                "team_id": team.get("team_id"),
                "peer_id": peer_id,
                "peer_name": names.get(peer_id, "Takım üyesi"),
                "battle_session_id": challenge.get("battle_session_id"),
                "players": [challenge.get("challenger_id"), challenge.get("opponent_id")],
            })
    return items[:20]


def _inbox_notices(profile) -> list[dict]:
    seen = set(profile.seen_inbox_notice_ids)
    notices = [dict(item) for item in INBOX_UPDATE_NOTICES]
    try:
        events = _events_view()
    except Exception:  # Bildirim üretimi mesaj kutusunu hiçbir zaman düşürmez.
        events = {}
    for fixture in (events.get("team_tournament") or {}).get("fixtures", []):
        if fixture.get("status") not in {"upcoming", "live"}:
            continue
        pairing = next(
            (
                item for item in fixture.get("member_pairings", [])
                if profile.player_id in {item.get("home_player_id"), item.get("away_player_id")}
            ),
            None,
        )
        if pairing is None or all(leg.get("status") == "played" for leg in pairing.get("legs", [])):
            continue
        opponent_name = (
            pairing.get("away_player_name")
            if pairing.get("home_player_id") == profile.player_id
            else pairing.get("home_player_name")
        )
        live = fixture.get("status") == "live"
        notices.append({
            "notice_id": f"fixture:{fixture.get('fixture_id')}",
            "kind": "game",
            "title_tr": "Takım turnuvası maçların açık" if live else "Takım turnuvası eşleşmen açıklandı",
            "body_tr": f"Rakibin: {opponent_name or 'Rakip'}. Rövanşlı iki maç Cuma–Pazar oynanır; Etkinlik → Eşleşmeler bölümünden gir.",
            "scheduled_at": fixture.get("matches_open_at"),
            "fixture_id": fixture.get("fixture_id"),
        })
    for notice in notices:
        notice["seen"] = notice["notice_id"] in seen
    return notices


def _reward_inbox_view(profile) -> dict:
    messages = [dict(item) for item in reversed(profile.reward_inbox)]
    invitations = _inbox_invitations(profile)
    notices = _inbox_notices(profile)
    unclaimed_count = sum(item.get("status") == "unclaimed" for item in messages)
    actionable_invitations = sum(
        1 for item in invitations
        if item["incoming"] and item["status"] == "pending"
    )
    return {
        "player_id": profile.player_id,
        "messages": messages,
        "unclaimed_count": unclaimed_count,
        "universal_module_shards": int(profile.universal_module_shards),
        "invitations": invitations,
        "notices": notices,
        "unread_count": (
            unclaimed_count
            + actionable_invitations
            + sum(not item["seen"] for item in notices)
        ),
    }


@app.post("/profile/{player_id}/reward-inbox/notices/seen")
@persistent_operation
def mark_reward_inbox_notices_seen(player_id: str, request: InboxNoticeSeenRequest) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    with REWARD_INBOX_LOCK:
        profile = _team_member_profile(player_id)
        current = [item["notice_id"] for item in _inbox_notices(profile)]
        wanted = [value for value in request.notice_ids if value in current] or current
        profile.seen_inbox_notice_ids = tuple(
            dict.fromkeys((*profile.seen_inbox_notice_ids, *wanted))
        )[-200:]
        persist_player_data(player_id)
        return _reward_inbox_view(profile)


@app.get("/profile/{player_id}/reward-inbox")
@persistent_operation
def get_reward_inbox(player_id: str) -> dict:
    _settle_competition_rewards(player_id)
    return _reward_inbox_view(_team_member_profile(player_id))


@app.post("/profile/{player_id}/reward-inbox/{message_id}/claim")
@persistent_operation
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
        team_unlocks: dict[str, str] = {}
        if message.get("source") == "team_tournament" and message.get("team_id"):
            # Ödülü her üye alır; takım görünümü takım ve dönem başına bir kez açılır.
            team_unlocks = team_service.grant_reward_cosmetics(
                str(message["team_id"]),
                reward,
                grant_id=f"team_tournament:{message.get('period_id')}:{message['team_id']}",
            )
        message["status"] = "claimed"
        receipt = {
            "request_id": request.request_id,
            "message_id": message_id,
            "source": message.get("source"),
            "position": message.get("position"),
            "chest": reward,
            "team_unlocks": team_unlocks,
        }
        profile.reward_inbox_receipts[request.request_id] = dict(receipt)
        persist_player_data(player_id)
        return {**_reward_inbox_view(profile), "receipt": receipt, "profile": profile.to_view(), "replayed": False}


def _team_member_profile(player_id: str):
    if RUNTIME_STRICT:
        PERSISTENT_STATE.touch(player_id)
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
        "online": runtime_coordinator.player_online(player_id) if RUNTIME_STRICT else player_id in player_profile_service._profiles,
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


def _battle_session_open(session_id: str | None) -> bool:
    """Oturum hâlâ kayıtlı ve bitmemişse True (süresi dolan oturum kapalıdır)."""
    if not session_id:
        return False
    try:
        session = pvp_service.get_session(str(session_id))
    except PvPSessionError:
        return False
    status = getattr(session.engine.state.status, "value", session.engine.state.status)
    return str(status) != "finished"


def _complete_social_battle_invites(session_id: str) -> bool:
    clean_session_id = str(session_id or "").strip()
    if not clean_session_id:
        return False
    if RUNTIME_STRICT:
        with SOCIAL_LOCK:
            affected = _postgres_social_runtime().close_sessions(session_id=clean_session_id)
            for owner_id in affected:
                player_data_store_service.load_player(owner_id)
            return bool(affected)
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


def _direct_message_conversations(profile) -> list[dict]:
    """Oyuncunun sohbet listesi: karşı oyuncu, son mesaj ve okunmamış sayısı."""
    try:
        rows = platform_service.conversations(
            profile.player_id,
            legacy_seen_at=int(profile.direct_messages_seen_at or 0),
        )
    except Exception:
        return []
    friend_ids = set(profile.friend_ids)
    blocked_ids = set(profile.blocked_player_ids)
    conversations = []
    for row in rows:
        if row["peer_id"] in blocked_ids:
            continue
        try:
            peer = _social_player_summary(row["peer_id"])
        except Exception:
            continue
        conversations.append({
            **row,
            "peer": peer,
            "is_friend": row["peer_id"] in friend_ids,
        })
        if len(conversations) >= 100:
            break
    return conversations


def _social_view(player_id: str) -> dict:
    profile = _team_member_profile(player_id)
    if RUNTIME_STRICT:
        for stored in tuple(profile.social_battle_invites):
            if stored.get("status") == "accepted" and _battle_session_finished(stored.get("battle_session_id")):
                _complete_social_battle_invites(stored["battle_session_id"])
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
    conversations = _direct_message_conversations(profile)
    unread_messages = sum(int(item["unread_count"]) for item in conversations)
    pending_battle_invites = sum(
        1 for item in invitations
        if item.get("status") == "pending" and item.get("opponent_id") == player_id
    )
    return {
        "player_id": player_id,
        "friend_limit": 100,
        "notifications": {
            "incoming_requests": len(profile.incoming_friend_request_ids),
            "battle_invites": pending_battle_invites,
            "unread_messages": unread_messages,
        },
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
        "conversations": conversations,
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
            season_id=season_descriptor()["id"],
            ranked_eligible=False,
            normalized=True,
        )
    for player_id in (player_a_id, player_b_id):
        profile = _team_member_profile(player_id)
        pvp_service.join(session_id, player_id, display_name=profile.display_name)
        attach_player_progression_to_session(session_id, player_id)
    return {
        "session_id": session.session_id,
        "players": [player_a_id, player_b_id],
        "opponent_type": "human",
        "match_type": match_type,
        "ranked_eligible": False,
        "rewards_enabled": False,
    }


@app.get("/social/{player_id}")
@persistent_operation
def get_social_view(player_id: str) -> dict:
    return _social_view(player_id)


@app.get("/players/search")
@persistent_operation
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


def _postgres_social_runtime() -> PostgresSocialRuntime:
    return PostgresSocialRuntime(postgres_pool, platform_service, boot_id=RUNTIME_BOOT_ID)


def _social_workflow_http_error(exc: SocialTransactionError) -> HTTPException:
    messages = {
        "player_missing": (404, "Kayıtlı oyuncu bulunamadı."),
        "invite_missing": (404, "Arkadaş savaşı daveti bulunamadı."),
        "invalid_request_id": (422, "Geçerli bir işlem kimliği gerekli; istemciyi güncelle."),
        "invalid_social_operation": (422, "Geçerli bir oyuncu ve işlem seç."),
        "blocked_relation": (422, "Bu oyuncuyla arkadaşlık isteği kullanılamıyor."),
        "friend_limit": (422, "Arkadaş sınırı 100 oyuncudur."),
        "request_missing": (422, "Bekleyen arkadaşlık isteği bulunamadı."),
        "friendship_required": (422, "Bu işlem için önce arkadaş olmalısınız."),
        "invite_closed": (409, "Bu davet artık beklemede değil."),
        "invite_code_missing": (422, "Davet kodu geçersiz veya süresi dolmuş."),
        "idempotency_conflict": (409, "İşlem kimliği farklı bir istek için kullanılmış."),
    }
    status, detail = messages.get(exc.code, (409, "Sosyal kayıtlar tutarsız; işlem kaydedilmedi."))
    return HTTPException(status_code=status, detail=detail)


def _apply_postgres_social_workflow(method: str, player_id: str, *args, **kwargs) -> dict:
    with SOCIAL_LOCK:
        try:
            result = getattr(_postgres_social_runtime(), method)(player_id, *args, **kwargs)
        except SocialTransactionError as exc:
            raise _social_workflow_http_error(exc) from exc
        except PlatformServiceError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        for owner_id in result.get("affected_player_ids", []):
            player_data_store_service.load_player(owner_id)
        return {**result, "social": _social_view(player_id)}


def _apply_postgres_friend_operation(
    kind: str, player_id: str, target_id: str, request_id: str | None,
) -> dict:
    # Scope client IDs to the authenticated actor, not the operation/target:
    # changing either with the same ID must still conflict, not create a write.
    try:
        operation_id = social_operation_id(player_id, request_id)
    except SocialTransactionError as exc:
        raise _social_workflow_http_error(exc) from exc
    with SOCIAL_LOCK:
        try:
            with postgres_pool.joined_transaction():
                # Store transactions use this same lock order. Locking the
                # platform document after players would permit a deadlock.
                with platform_service._lock:
                    result = PostgresSocialTransactionRepository(postgres_pool).apply_friend_operation(
                        kind, player_id, target_id, operation_id,
                    )
                    blocks = {}
                    for owner_id in (player_id, target_id):
                        snapshot = player_data_repository.load(owner_id)
                        if snapshot is None:
                            raise SocialTransactionError("player_missing")
                        blocks[owner_id] = snapshot.profile.get("meta_progression_state", {}).get("blocked_player_ids", [])
                    platform_service.sync_social_blocks(blocks)
        except SocialTransactionError as exc:
            raise _social_workflow_http_error(exc) from exc
        # No live profile is mutated before commit. Reload committed revisions
        # so later ordinary profile saves cannot overwrite the social changes.
        for owner_id in (player_id, target_id):
            player_data_store_service.load_player(owner_id)
        return {**result, "social": _social_view(player_id)}


@app.post("/social/{player_id}/requests")
@persistent_operation
def send_friend_request(player_id: str, request: FriendRequestOperation) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    target_id = str(request.target_player_id).strip()
    if not target_id or target_id == player_id:
        raise HTTPException(status_code=422, detail="Geçerli bir oyuncu seç.")
    if RUNTIME_STRICT:
        result = _apply_postgres_friend_operation("request", player_id, target_id, request.request_id)
        return {**result["social"], "replayed": result["replayed"]}
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
@persistent_operation
def accept_friend_request(player_id: str, request: FriendDecisionOperation) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    requester_id = str(request.requester_id).strip()
    if RUNTIME_STRICT:
        result = _apply_postgres_friend_operation("accept", player_id, requester_id, request.request_id)
        return {**result["social"], "replayed": result["replayed"]}
    with SOCIAL_LOCK:
        profile = _team_member_profile(player_id)
        requester = _team_member_profile(requester_id)
        if requester_id not in profile.incoming_friend_request_ids and requester_id not in profile.friend_ids:
            raise HTTPException(status_code=422, detail="Bekleyen arkadaşlık isteği bulunamadı.")
        if requester_id in profile.blocked_player_ids or player_id in requester.blocked_player_ids:
            raise HTTPException(status_code=422, detail="Bu oyuncuyla arkadaşlık isteği kullanılamıyor.")
        if requester_id not in profile.friend_ids and (len(profile.friend_ids) >= 100 or len(requester.friend_ids) >= 100):
            raise HTTPException(status_code=422, detail="Arkadaş sınırı 100 oyuncudur.")
        _replace_tuple(profile, "friend_ids", (*profile.friend_ids, requester_id))
        _replace_tuple(requester, "friend_ids", (*requester.friend_ids, player_id))
        _replace_tuple(profile, "incoming_friend_request_ids", (value for value in profile.incoming_friend_request_ids if value != requester_id))
        _replace_tuple(requester, "outgoing_friend_request_ids", (value for value in requester.outgoing_friend_request_ids if value != player_id))
        persist_player_data(player_id)
        persist_player_data(requester_id)
    return _social_view(player_id)


@app.post("/social/{player_id}/requests/reject")
@persistent_operation
def reject_friend_request(player_id: str, request: FriendDecisionOperation) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    requester_id = str(request.requester_id).strip()
    if RUNTIME_STRICT:
        result = _apply_postgres_friend_operation("reject", player_id, requester_id, request.request_id)
        return {**result["social"], "replayed": result["replayed"]}
    with SOCIAL_LOCK:
        profile = _team_member_profile(player_id)
        requester = _team_member_profile(requester_id)
        _replace_tuple(profile, "incoming_friend_request_ids", (value for value in profile.incoming_friend_request_ids if value != requester_id))
        _replace_tuple(requester, "outgoing_friend_request_ids", (value for value in requester.outgoing_friend_request_ids if value != player_id))
        persist_player_data(player_id)
        persist_player_data(requester_id)
    return _social_view(player_id)


@app.post("/social/{player_id}/requests/cancel")
@persistent_operation
def cancel_friend_request(player_id: str, request: FriendRequestCancelOperation) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    target_id = str(request.target_player_id).strip()
    if RUNTIME_STRICT:
        result = _apply_postgres_friend_operation("cancel", player_id, target_id, request.request_id)
        return {**result["social"], "replayed": result["replayed"]}
    with SOCIAL_LOCK:
        profile = _team_member_profile(player_id)
        target = _team_member_profile(target_id)
        _replace_tuple(profile, "outgoing_friend_request_ids", (value for value in profile.outgoing_friend_request_ids if value != target_id))
        _replace_tuple(target, "incoming_friend_request_ids", (value for value in target.incoming_friend_request_ids if value != player_id))
        persist_player_data(player_id)
        persist_player_data(target_id)
    return _social_view(player_id)


@app.post("/social/{player_id}/battle-invites/{invite_id}/decline")
@persistent_operation
def decline_social_battle_invite(
    player_id: str,
    invite_id: str,
    request: EventRegistrationOperation,
) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    if RUNTIME_STRICT:
        result = _apply_postgres_social_workflow("decide_battle_invite", player_id, invite_id, request.request_id, accept=False)
        return {**result["social"], "replayed": result["replayed"], "inbox": _reward_inbox_view(_team_member_profile(player_id))}
    with SOCIAL_LOCK:
        profile = _team_member_profile(player_id)
        invite = next((item for item in profile.social_battle_invites if item.get("invite_id") == invite_id), None)
        if invite is None or invite.get("opponent_id") != player_id:
            raise HTTPException(status_code=404, detail="Arkadaş savaşı daveti bulunamadı.")
        if invite.get("status") != "pending":
            raise HTTPException(status_code=422, detail="Bu davet artık beklemede değil.")
        challenger_id = str(invite["challenger_id"])
        for owner_id in (player_id, challenger_id):
            owner = _team_member_profile(owner_id)
            for item in owner.social_battle_invites:
                if item.get("invite_id") == invite_id:
                    item["status"] = "declined"
            persist_player_data(owner_id)
    return {**_social_view(player_id), "inbox": _reward_inbox_view(_team_member_profile(player_id))}


@app.post("/social/{player_id}/battle-invites")
@persistent_operation
def create_social_battle_invite(player_id: str, request: SocialBattleInviteOperation) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    opponent_id = str(request.opponent_id).strip()
    if RUNTIME_STRICT:
        result = _apply_postgres_social_workflow("create_battle_invite", player_id, opponent_id, request.request_id)
        return {**result["social"], "replayed": result["replayed"]}
    with SOCIAL_LOCK:
        profile = _team_member_profile(player_id)
        opponent = _team_member_profile(opponent_id)
        if opponent_id not in profile.friend_ids:
            raise HTTPException(status_code=422, detail="Arkadaş savaşı için önce arkadaş olmalısınız.")
        # Aynı arkadaşa bekleyen bir davet varken yenisi açılmaz.
        pending = next(
            (
                item for item in profile.social_battle_invites
                if item.get("status") == "pending"
                and item.get("challenger_id") == player_id
                and item.get("opponent_id") == opponent_id
            ),
            None,
        )
        if pending is not None:
            return {**_social_view(player_id), "replayed": True}
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
            platform_service.queue_notification(
                opponent_id,
                "Savaş daveti",
                f"{profile.display_name} seni kupasız savaşa çağırdı.",
                "gridshard://inbox",
                source_player_id=player_id,
            )
    return _social_view(player_id)


@app.post("/social/{player_id}/battle-invites/{invite_id}/accept")
@persistent_operation
def accept_social_battle_invite(
    player_id: str,
    invite_id: str,
    request: EventRegistrationOperation,
) -> dict:
    if request.player_id != player_id:
        raise HTTPException(status_code=403, detail="Başka bir oyuncu adına işlem yapılamaz.")
    if RUNTIME_STRICT:
        result = _apply_postgres_social_workflow("decide_battle_invite", player_id, invite_id, request.request_id, accept=True)
        invite = _postgres_social_runtime().invite(player_id, invite_id)
        if invite["status"] != "accepted" or invite.get("owner_boot_id") != RUNTIME_BOOT_ID:
            raise HTTPException(status_code=409, detail="Bu arkadaş savaşı artık açık değil.")
        battle = _create_unranked_social_session(invite["battle_session_id"], invite["challenger_id"], player_id, match_type="friend_battle")
        return {**result["social"], "replayed": result["replayed"], "battle": battle}
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


def _team_appearance_unlock_sources() -> dict[str, dict[str, int]]:
    """Görünüm seçeneği → onu doğrudan veren takım turnuvası sırası."""
    sources: dict[str, dict[str, int]] = {key: {} for key in TEAM_APPEARANCE_OPTIONS}
    for prize in TEAM_PRIZES:
        for reward_key, key in TEAM_PRIZE_APPEARANCE_KEYS.items():
            value = prize.get(reward_key)
            if value and value not in sources[key]:
                sources[key][value] = int(prize["position"])
    return sources


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
        "appearance": team_appearance(team.get("cosmetics")),
        "appearance_options": {
            key: list(values) for key, values in TEAM_APPEARANCE_OPTIONS.items()
        },
        "appearance_unlocked": team_appearance_unlocked(team.get("cosmetics")),
        "appearance_unlock_sources": _team_appearance_unlock_sources(),
        "applications": applicants,
        "members": members,
        "module_requests": requests,
        "module_request_available": team_service.module_request_available(team, player_id),
        "messages": messages,
        "training_challenges": challenges,
        "request_policy": TEAM_REQUEST_POLICY,
        "online_opponents": [
            item for item in members
            if item["player_id"] != player_id and item["online"]
        ],
    }


@app.get("/teams")
@persistent_operation
def list_teams() -> dict:
    return {
        "teams": [_team_summary(team) for team in team_service.list_teams()]
    }


@app.get("/teams/player/{player_id}")
@persistent_operation
def get_player_team(player_id: str) -> dict:
    team = team_service.team_for_player(player_id)
    profile = _team_member_profile(player_id)
    membership = (team["team_id"], team["name"]) if team else (None, None)
    if (profile.team_id, profile.team_name) != membership:
        profile.team_id, profile.team_name = membership
        persist_player_data(player_id)
    if team is None:
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
    return _team_view(team, player_id)


def _sync_team_membership(player_id: str) -> None:
    # A receipt is historical evidence, not a current membership snapshot.
    # Replaying an old acceptance/removal must not undo a later leave/join.
    team = team_service.team_for_player(player_id)
    profile = _team_member_profile(player_id)
    membership = (team["team_id"], team["name"]) if team else (None, None)
    if (profile.team_id, profile.team_name) != membership:
        profile.team_id, profile.team_name = membership
        persist_player_data(player_id)


def _current_team_operation_view(team_id: str, player_id: str) -> dict:
    try:
        team = team_service.get_team(team_id)
    except TeamServiceError:
        return get_player_team(player_id)
    return _team_view(team, player_id)


@app.post("/teams")
@persistent_operation
def create_team(request: TeamCreateRequest) -> dict:
    try:
        result = team_service.create_team(
            request.player_id,
            request.name,
            request.request_id,
        )
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    _sync_team_membership(request.player_id)
    return {**_current_team_operation_view(result["team_id"], request.player_id), "replayed": result["replayed"]}


@app.post("/teams/{team_id}/join")
@persistent_operation
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
@persistent_operation
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
    _sync_team_membership(request.applicant_id)
    return {**_current_team_operation_view(team_id, request.player_id), "replayed": result["replayed"]}


@app.post("/teams/{team_id}/members/remove")
@persistent_operation
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
    _sync_team_membership(request.member_id)
    return {**_current_team_operation_view(team_id, request.player_id), "replayed": result["replayed"]}


@app.post("/teams/{team_id}/leave")
@persistent_operation
def leave_team(team_id: str, request: TeamActionRequest) -> dict:
    try:
        result = team_service.leave_team(
            team_id=team_id,
            player_id=request.player_id,
            request_id=request.request_id,
        )
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    _sync_team_membership(request.player_id)
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
@persistent_operation
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
    return {**_current_team_operation_view(team_id, request.player_id), "replayed": result["replayed"]}


@app.post("/teams/{team_id}/cosmetics")
@persistent_operation
def update_team_cosmetics(team_id: str, request: TeamCosmeticsRequest) -> dict:
    try:
        result = team_service.set_cosmetics(
            team_id=team_id,
            owner_id=request.player_id,
            selections={
                "emblem_id": request.emblem_id,
                "frame_id": request.frame_id,
                "name_color_id": request.name_color_id,
            },
            request_id=request.request_id,
        )
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {**_current_team_operation_view(team_id, request.player_id), "replayed": result["replayed"]}


@app.post("/teams/{team_id}/module-requests")
@persistent_operation
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


TEAM_DONATION_LOCK = Lock()


@contextmanager
def _team_donation_transaction(team_id: str, donor_id: str, module_request_id: str):
    """Serialize a team request and both player shard balances in production."""
    with TEAM_DONATION_LOCK:
        involved = [donor_id]
        try:
            if RUNTIME_STRICT:
                with postgres_pool.joined_transaction() as connection:
                    connection.execute(
                        "SELECT singleton FROM team_document WHERE singleton = TRUE FOR UPDATE"
                    )
                    team = team_service.get_team(team_id)
                    target = next(
                        (item for item in team.get("module_requests", [])
                         if item.get("request_id") == module_request_id), None,
                    )
                    if target is None:
                        raise HTTPException(status_code=404, detail="Modül isteği bulunamadı.")
                    involved.append(str(target["requester_id"]))
                    connection.execute(
                        "SELECT player_id FROM player_data WHERE player_id = ANY(%s) "
                        "ORDER BY player_id FOR UPDATE",
                        (sorted(set(involved)),),
                    )
                    for player_id in set(involved):
                        if player_data_repository.load(player_id) is not None:
                            player_data_store_service.load_player(player_id)
                    yield target
            else:
                team = team_service.get_team(team_id)
                target = next(
                    (item for item in team.get("module_requests", [])
                     if item.get("request_id") == module_request_id), None,
                )
                if target is None:
                    raise HTTPException(status_code=404, detail="Modül isteği bulunamadı.")
                yield target
        except BaseException:
            if RUNTIME_STRICT:
                for player_id in set(involved):
                    if player_data_repository.load(player_id) is not None:
                        player_data_store_service.load_player(player_id)
                    else:
                        player_profile_service._profiles.pop(player_id, None)
            raise


@app.post("/teams/{team_id}/module-requests/{module_request_id}/donate")
@persistent_operation
def donate_team_module_shard(
    team_id: str,
    module_request_id: str,
    request: TeamActionRequest,
) -> dict:
    try:
        with _team_donation_transaction(team_id, request.player_id, module_request_id) as target:
            donor = _team_member_profile(request.player_id)
            module_id = str(target.get("module_id", ""))
            result = team_service.donate_module_shard(
                team_id=team_id,
                player_id=request.player_id,
                module_request_id=module_request_id,
                request_id=request.request_id,
                available_amount=int(donor.module_shards.get(module_id, 0)),
            )
            if not result["replayed"]:
                requester = _team_member_profile(result["requester_id"])
                donor.module_shards[module_id] = int(donor.module_shards.get(module_id, 0)) - 1
                requester.module_shards[module_id] = int(requester.module_shards.get(module_id, 0)) + 1
                persist_player_data(donor.player_id)
                persist_player_data(requester.player_id)
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except PlayerDataStoreError as exc:
        raise HTTPException(status_code=503, detail="Takım bağışı kaydedilemedi; yeniden dene.") from exc
    return {
        **_team_view(team_service.get_team(team_id), request.player_id),
        "operation": result,
    }


@app.post("/teams/{team_id}/messages")
@persistent_operation
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
@persistent_operation
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
@persistent_operation
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


@app.post("/teams/{team_id}/training-challenges/{challenge_id}/decline")
@persistent_operation
def decline_team_training_challenge(
    team_id: str,
    challenge_id: str,
    request: TeamActionRequest,
) -> dict:
    try:
        result = team_service.decline_training_challenge(
            team_id=team_id,
            player_id=request.player_id,
            challenge_id=challenge_id,
            request_id=request.request_id,
        )
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        **_team_view(team_service.get_team(team_id), request.player_id),
        "operation": result,
        "inbox": _reward_inbox_view(_team_member_profile(request.player_id)),
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

    # Restoring an existing account can apply the four-week season rollover,
    # so the normalized state must also be persisted.
    persist_player_data(
        player_id
    )

    return {
        "player_id": player_id,
        "identity": {
            "kind":
                "participant",
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
@persistent_operation
def get_profile(
    player_id: str,
) -> dict:
    profile = player_profile_service.get_or_create(
        player_id
    )
    return profile.to_view()


@app.get("/profile/{player_id}/meta-progression")
@persistent_operation
def get_player_meta_progression(player_id: str) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    return meta_progression_service.view(profile)


@app.post("/profile/{player_id}/meta-progression/arena/{node_id}/claim")
@persistent_operation
def claim_player_arena_reward(player_id: str, node_id: str, request: MetaOperationRequest) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        receipt = meta_progression_service.claim_arena_reward(profile, node_id)
    except MetaProgressionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return {"receipt": receipt, "meta_progression": meta_progression_service.view(profile), "profile": profile.to_view()}


@app.post("/profile/{player_id}/operator-titles/{title_id}/claim")
@persistent_operation
def claim_player_operator_title_reward(player_id: str, title_id: str, request: MetaOperationRequest) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        receipt = meta_progression_service.claim_operator_title_reward(profile, title_id)
    except MetaProgressionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return {"receipt": receipt, "meta_progression": meta_progression_service.view(profile), "profile": profile.to_view()}


@app.post(
    "/profile/{player_id}/meta-progression/modules/{module_definition_id}/upgrade"
)
@persistent_operation
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
@persistent_operation
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
@persistent_operation
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
@persistent_operation
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


@app.post("/store/{player_id}/chests/{definition_id}/buy")
@persistent_operation
def buy_store_chest(
    player_id: str,
    definition_id: str,
    request: MetaOperationRequest,
) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        receipt = meta_progression_service.purchase_store_chest(
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


def _player_store_view(profile) -> dict:
    return store_view(
        profile,
        purchase_test_mode=PURCHASE_TEST_MODE,
        ad_test_mode=AD_TEST_MODE,
        platforms=STORE_VERIFIERS.platform_view(),
    )


STORE_ECONOMY_LOCK = Lock()


@contextmanager
def _store_economy_transaction(player_id: str):
    """Commit a profile and its purchase/refund ledger as one unit in production."""
    with _persistent_operation([player_id]), STORE_ECONOMY_LOCK:
        if not RUNTIME_STRICT:
            yield
            return
        try:
            with postgres_pool.joined_transaction():
                # The platform row serializes receipt decisions across workers.
                with platform_service._lock:
                    if player_data_repository.load(player_id) is not None:
                        player_data_store_service.load_player(player_id)
                    yield
        except BaseException:
            # A rolled-back database write must not leave a granted reward in
            # this process's cached profile for the next request.
            if player_data_repository.load(player_id) is not None:
                player_data_store_service.load_player(player_id)
            else:
                player_profile_service._profiles.pop(player_id, None)
            raise


@app.get("/store/{player_id}")
@persistent_operation
def get_player_store(player_id: str) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    return _player_store_view(profile)


@app.post("/store/{player_id}/purchases")
def purchase_store_product(player_id: str, request: PurchaseRequest) -> dict:
    verified = None
    try:
        if request.provider in STORE_PROVIDERS:
            # Makbuz mağazanın sunucusundan doğrulanır; istemcinin işlem
            # kimliğine güvenilmez.
            verified = STORE_VERIFIERS.verify_purchase(
                request.provider,
                store_product_id(product_by_id(request.product_id)),
                transaction_id=request.transaction_id,
                purchase_token=request.purchase_token,
            )
            # Alım ödeme penceresinde bu hesaba bağlanır; aynı makbuz başka bir
            # hesapta yeniden kullanılamaz (makbuz kayıtları oyuncu başınadır).
            if verified.account_token != store_account_token(player_id):
                raise StoreVerificationError("Mağaza alımı bu hesaba ait değil.")
        with _store_economy_transaction(player_id):
            profile = player_profile_service.get_or_create(player_id)
            if verified is not None:
                ledger_entry = platform_service.store_receipt(
                    f"{verified.provider}:{verified.transaction_id}"
                )
                if ledger_entry is not None:
                    if ledger_entry.get("player_id") != player_id:
                        raise StoreVerificationError("Mağaza alımı bu hesaba ait değil.")
                    if ledger_entry.get("refunded"):
                        raise StoreVerificationError("Bu alım iade edilmiş.")
                    # A ledger without the player's receipt is corruption,
                    # never an invitation to grant the product a second time.
                    if ledger_entry["key"] not in profile.purchase_receipts:
                        raise PlatformServiceError("Mağaza makbuzu ve oyuncu kaydı uyuşmuyor.")
            receipt = process_purchase(
                profile,
                request.product_id,
                request.provider,
                request.transaction_id,
                test_mode=PURCHASE_TEST_MODE,
                now_iso=datetime.now(timezone.utc).isoformat(),
                verified=verified,
            )
            persist_player_data(player_id)
            if verified is not None:
                platform_service.record_store_receipt(
                    receipt["key"],
                    player_id=player_id,
                    receipt=receipt,
                    purchase_token=verified.purchase_token,
                )
    except StoreVerificationError as exc:
        # Geçici doğrulama sorunu 503: istemci alımı onaylamadan saklar ve
        # yeniden gönderir. Kalıcı ret 422.
        raise HTTPException(
            status_code=503 if exc.retryable else 422,
            detail=str(exc),
        ) from exc
    except StoreError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except (PlatformServiceError, PlayerDataStoreError) as exc:
        raise HTTPException(status_code=503, detail="Mağaza kaydı tamamlanamadı; yeniden dene.") from exc
    # Google Play: hak kaydedildikten sonra alım tüketilir; tüketilmezse
    # istemci aynı belirteçle yeniden gönderir ve ürün ikinci kez verilmez.
    try:
        if (
            verified is not None
            and verified.provider == "google_play"
            and not receipt.get("consumed")
            and STORE_VERIFIERS.google_play is not None
            and STORE_VERIFIERS.google_play.consume(verified)
        ):
            with _store_economy_transaction(player_id):
                profile = player_profile_service.get_or_create(player_id)
                mark_purchase_consumed(profile, receipt["key"])
                persist_player_data(player_id)
            receipt = {**receipt, "consumed": True}
    except (PlatformServiceError, PlayerDataStoreError, StoreVerificationError) as exc:
        # The grant is already committed; a retry replays the receipt and can
        # finish the provider consumption without issuing the reward again.
        raise HTTPException(status_code=503, detail="Alım kaydedildi; mağaza onayı yeniden denenecek.") from exc
    return {
        "receipt": receipt,
        "store": _player_store_view(profile),
        "meta_progression": meta_progression_service.view(profile),
        "profile": profile.to_view(),
    }


STORE_REFUND_LOCK = Lock()


def _existing_player_profile(player_id: str):
    """Kayıtlı oyuncunun profili; hesap silinmişse None (yeni profil açılmaz)."""
    if RUNTIME_STRICT:
        PERSISTENT_STATE.touch(player_id)
    profile = player_profile_service._profiles.get(player_id)
    if profile is not None:
        return profile
    if player_data_repository.load(player_id) is None:
        return None
    player_data_store_service.load_player(player_id)
    return player_profile_service._profiles.get(player_id)


def _apply_store_refund(
    *,
    provider: str,
    source: str,
    transaction_id: str = "",
    purchase_token: str = "",
    reversed_refund: bool = False,
    event_id: str = "",
    event_at_ms: int = 0,
) -> dict:
    """İade edilen alımın verdiğini geri alır; iade geri çevrildiyse yeniden verir.

    Makbuz defteri alımın hangi oyuncuya ait olduğunu ve ne verdiğini tutar.
    Aynı bildirim yeniden gelse de değişiklik bir kez uygulanır (kilit ve
    defterdeki ``refunded`` durumu).
    """
    now_iso = datetime.now(timezone.utc).isoformat()
    with STORE_REFUND_LOCK:
        entry = platform_service.find_store_receipt(
            provider,
            transaction_id=transaction_id,
            purchase_token=purchase_token,
        )
        if entry is None:
            logging.getLogger(__name__).warning(
                "Store refund notification did not match a recorded receipt (%s)", provider
            )
            return {"matched": False}
        player_id = str(entry["player_id"])
        with _store_economy_transaction(player_id):
            if event_id and platform_service.store_notification_seen(event_id):
                return {"matched": True, "changed": False, "duplicate": True}
            # Re-read after acquiring the shared database row lock: another
            # worker may already have processed this provider notification.
            entry = platform_service.find_store_receipt(
                provider,
                transaction_id=transaction_id,
                purchase_token=purchase_token,
            )
            if entry is None:
                return {"matched": False}
            last_event_at_ms = int(entry.get("refund_event_at_ms") or 0)
            if event_at_ms and event_at_ms < last_event_at_ms:
                if event_id:
                    platform_service.remember_store_notification(event_id)
                return {"matched": True, "changed": False, "stale": True}
            if bool(entry.get("refunded")) != reversed_refund:
                if event_at_ms > last_event_at_ms:
                    platform_service.mark_store_receipt_refunded(
                        entry["key"], refunded=bool(entry.get("refunded")), source=source,
                        at=now_iso, event_at_ms=event_at_ms,
                    )
                if event_id:
                    platform_service.remember_store_notification(event_id)
                return {"matched": True, "changed": False}
            profile = _existing_player_profile(player_id)
            changes: dict = {}
            if profile is not None:
                changes = (
                    restore_refunded_purchase(profile, entry, now_iso=now_iso)
                    if reversed_refund
                    else revoke_purchase(profile, entry, now_iso=now_iso)
                )
                persist_player_data(player_id)
            platform_service.mark_store_receipt_refunded(
                entry["key"],
                refunded=not reversed_refund,
                source=source,
                at=now_iso,
                event_at_ms=event_at_ms,
            )
            if event_id:
                platform_service.remember_store_notification(event_id)
    if profile is not None:
        title, body = store_refund_message(entry, reversed_refund=reversed_refund)
        try:
            platform_service.queue_notification(player_id, title, body)
        except PlatformServiceError:
            pass
    return {"matched": True, "changed": True, "player_found": profile is not None, "changes": changes}


def _handle_google_store_notification(notification: dict) -> dict:
    if notification["ignored"]:
        return {"ok": True, "ignored": notification["ignored"]}
    if not notification["voided"]:
        # Test, tek seferlik alım ve abonelik bildirimleri: alım akışı ve
        # istemci kurtarması bunları zaten işler.
        return {"ok": True, "ignored": "test" if notification["test"] else "type"}
    event_id = f"google:{notification['notification_id']}"
    if platform_service.store_notification_seen(event_id):
        return {"ok": True, "duplicate": True}
    result = _apply_store_refund(
        provider="google_play",
        source="google_rtdn",
        transaction_id=notification["order_id"],
        purchase_token=notification["purchase_token"],
        event_id=event_id,
    )
    if not result.get("matched"):
        # Provider notifications can precede the client purchase callback.
        # A success acknowledgement here would permanently lose the refund.
        raise HTTPException(status_code=503, detail="Makbuz henüz kayıtlı değil; bildirim yeniden denenecek.")
    return {"ok": True, **result}


@app.post("/billing/google/rtdn")
async def google_play_rtdn(request: Request) -> dict:
    """Google Play gerçek zamanlı geliştirici bildirimi (Pub/Sub itme).

    Kimlik Bearer oturumuyla değil, Google'ın imzaladığı OIDC belirteciyle
    doğrulanır. 2xx bildirimi onaylar; hata kodunda Pub/Sub yeniden dener.
    Yalnız iade (voided purchase) işlenir.
    """
    verifier = STORE_VERIFIERS.google_notifications
    if verifier is None:
        raise HTTPException(status_code=404, detail="Google Play bildirimleri bu sunucuda kapalı.")
    body = await request.body()
    try:
        notification = verifier.verify(request.headers.get("authorization"), body)
    except StoreVerificationError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return await asyncio.to_thread(_handle_google_store_notification, notification)


class AppStoreNotificationRequest(BaseModel):
    signedPayload: str


def _handle_app_store_notification(notification: dict, *, source: str = "app_store_notification") -> dict:
    kind = notification["type"]
    if notification["ignored"]:
        return {"ok": True, "ignored": notification["ignored"]}
    if kind not in {"REFUND", "REFUND_REVERSED"} or not notification["transaction_id"]:
        return {"ok": True, "ignored": kind.lower() or "type"}
    event_id = "apple:" + (
        notification["notification_id"] or f"{kind}:{notification['transaction_id']}"
    )
    if platform_service.store_notification_seen(event_id):
        return {"ok": True, "duplicate": True}
    result = _apply_store_refund(
        provider="app_store",
        source=source,
        transaction_id=notification["transaction_id"],
        reversed_refund=kind == "REFUND_REVERSED",
        event_id=event_id,
        event_at_ms=int(notification.get("signed_date") or 0),
    )
    if not result.get("matched"):
        raise HTTPException(status_code=503, detail="Makbuz henüz kayıtlı değil; bildirim yeniden denenecek.")
    return {"ok": True, **result}


@app.post("/billing/app-store/notifications")
def app_store_notification(request: AppStoreNotificationRequest) -> dict:
    """App Store Server Notifications V2.

    ``REFUND`` alımın verdiğini geri alır, ``REFUND_REVERSED`` yeniden verir;
    diğer türler onaylanıp geçilir. İmza Apple kök sertifikasına kadar
    doğrulanır; hatalı imza 403 (Apple yeniden dener).
    """
    verifier = STORE_VERIFIERS.app_store
    if verifier is None:
        raise HTTPException(status_code=404, detail="App Store bildirimleri bu sunucuda kapalı.")
    try:
        notification = verifier.verify_notification(request.signedPayload)
    except StoreVerificationError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    return _handle_app_store_notification(notification)


def _handle_google_voided_purchase(voided: dict) -> dict:
    order_id = str(voided.get("order_id") or "")
    purchase_token = str(voided.get("purchase_token") or "")
    event_id = "google-voided:" + (
        order_id or "token-" + hashlib.sha256(purchase_token.encode("utf-8")).hexdigest()[:40]
    )
    if platform_service.store_notification_seen(event_id):
        return {"ok": True, "duplicate": True}
    result = _apply_store_refund(
        provider="google_play", source="google_voided_purchases",
        transaction_id=order_id, purchase_token=purchase_token, event_id=event_id,
    )
    if not result.get("matched"):
        raise HTTPException(status_code=503, detail="Makbuz henüz kayıtlı değil; iade yeniden denenecek.")
    return {"ok": True, **result}


store_reconciler = StoreReconciler(
    verifiers=lambda: STORE_VERIFIERS,
    state=platform_service,
    handle_google_voided=_handle_google_voided_purchase,
    handle_app_store_notification=_handle_app_store_notification,
)


@app.get("/ads/admob/ssv")
def admob_ssv_callback(request: Request) -> dict:
    """AdMob ödüllü reklam sunucu doğrulaması (SSV) geri çağrısı.

    Kimlik doğrulaması Bearer belirteciyle değil, Google'ın ECDSA imzasıyla
    yapılır; bu yüzden korumalı oyuncu yolları dışındadır.
    """
    if STORE_VERIFIERS.admob is None:
        raise HTTPException(status_code=404, detail="AdMob doğrulaması bu sunucuda kapalı.")
    try:
        view = STORE_VERIFIERS.admob.verify(request.url.query)
    except StoreVerificationError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    # Provider verification/key refresh is outside the economic transaction.
    with _persistent_operation([view["user_id"]]):
        profile = _existing_player_profile(view["user_id"])
        if profile is None:
            return {"ok": True, "ignored": True}
        if record_verified_ad_view(profile, view, now_iso=datetime.now(timezone.utc).isoformat()):
            persist_player_data(view["user_id"])
    return {"ok": True}


@app.post("/profile/{player_id}/battles/{battle_id}/ad-reward")
@persistent_operation
def claim_battle_ad_reward(
    player_id: str,
    battle_id: str,
    request: AdRewardRequest,
) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    verified_view = None
    try:
        if request.provider == "admob" and STORE_VERIFIERS.admob is not None:
            # Ödül ancak AdMob'un imzalı geri çağrısı bu savaş için geldiyse verilir.
            existing = profile.ad_reward_receipts.get(battle_id)
            if existing is None:
                verified_view = verified_ad_view_for_battle(profile, battle_id)
        else:
            verify_ad_view(request.provider, test_mode=AD_TEST_MODE)
        durable_result = PostgresBattleResults(postgres_pool).player_result(battle_id, player_id) if RUNTIME_STRICT else None
        if RUNTIME_STRICT and durable_result is None:
            raise PlayerProgressionError("Bu savaşın kalıcı sonucu bulunamadı; reklam ödülü verilemez.")
        receipt = player_progression_service.grant_ad_bonus(
            battle_id,
            player_id,
            now_iso=datetime.now(timezone.utc).isoformat(),
            durable_result=durable_result,
        )
    except (StoreError, PlayerProgressionError) as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if verified_view is not None:
        mark_ad_view_claimed(profile, verified_view)
    persist_player_data(player_id)
    return {"receipt": receipt, "profile": profile.to_view()}


@app.put("/profile/{player_id}/meta-progression/core")
@persistent_operation
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
@persistent_operation
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
@persistent_operation
def upgrade_player_core(player_id: str, core_type_id: str, request: MetaOperationRequest) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        receipt = meta_progression_service.upgrade_core(profile, core_type_id, request.request_id)
    except MetaProgressionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return {"receipt": receipt, "meta_progression": meta_progression_service.view(profile), "profile": profile.to_view()}


@app.post("/profile/{player_id}/meta-progression/modules/{module_id}/talents/{tier}/{choice}")
@persistent_operation
def choose_player_module_talent(player_id: str, module_id: str, tier: str, choice: str, request: MetaOperationRequest) -> dict:
    profile = player_profile_service.get_or_create(player_id)
    try:
        receipt = meta_progression_service.choose_module_talent(profile, module_id, tier, choice, request.request_id)
    except MetaProgressionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    persist_player_data(player_id)
    return {"receipt": receipt, "meta_progression": meta_progression_service.view(profile), "profile": profile.to_view()}


@app.post("/profile/{player_id}/meta-progression/modules/{module_id}/talents/reset")
@persistent_operation
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
@persistent_operation
def get_events(player_id: str | None = Query(None)) -> dict:
    """Competition hub plus viewer registration/readiness state."""
    view = _events_view()
    if not player_id:
        return view
    profile = _team_member_profile(player_id)
    week_id = str(view["weekly_tournament"]["period"]["id"])
    tournament = view["team_tournament"]
    team = team_service.team_for_player(player_id)
    viewer_team_id = str(team.get("team_id") or "") if team else ""
    registered_team_ids = set(tournament.get("registered_team_ids") or [])
    roster_member = any(
        member["player_id"] == player_id
        for row in tournament.get("standings", [])
        if row["team_id"] == viewer_team_id
        for member in row["members"]
    )
    open_leg = team_tournament_open_leg(tournament, player_id)
    view["viewer"] = {
        "player_id": player_id,
        "weekly_registered": profile.weekly_tournament_registered_period == week_id,
        "weekly_entry_fee": int(view["weekly_tournament"].get("entry_fee", 0)),
        "weekly_trophies_earned": (
            profile.weekly_tournament_trophies_earned
            if profile.weekly_tournament_registered_period == week_id
            else 0
        ),
        "team_id": viewer_team_id or profile.team_id,
        "team_owner": bool(team and team.get("owner_id") == player_id),
        "team_registered": viewer_team_id in registered_team_ids,
        "team_roster_member": roster_member,
        "team_registration_open": bool(tournament.get("registration_open")),
        "team_next_leg": (
            {
                "fixture_id": open_leg["fixture"]["fixture_id"],
                "leg": open_leg["leg"]["leg"],
                "battle_session_id": open_leg["leg"]["battle_session_id"],
            }
            if open_leg
            else None
        ),
    }
    return view


@app.post("/events/weekly/register")
@persistent_operation
def register_weekly_tournament(request: EventRegistrationOperation) -> dict:
    profile = _team_member_profile(request.player_id)
    # Registration resets weekly counters, so materialize an unopened reward
    # from the just-closed week before advancing the period.
    _settle_competition_rewards(request.player_id)
    view = _events_view()
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
@persistent_operation
def register_team_tournament(request: EventRegistrationOperation) -> dict:
    profile = _team_member_profile(request.player_id)
    _settle_competition_rewards(request.player_id)
    team = team_service.team_for_player(request.player_id)
    if team is None:
        raise HTTPException(status_code=422, detail="Takım turnuvası için bir takıma katılmalısın.")
    if team.get("owner_id") != request.player_id:
        raise HTTPException(status_code=422, detail="Takım turnuvasına yalnız takım lideri kayıt yapabilir.")
    now = datetime.now(timezone.utc)
    period_id = team_tournament_period_id(now)
    if not team_tournament_registration_open(period_id, now):
        raise HTTPException(
            status_code=422,
            detail="Takım turnuvası kaydı yalnız dönemin ilk Pazartesi–Çarşamba günlerinde açıktır; bu dönemin kayıt süresi doldu.",
        )
    try:
        team_service.register_tournament(
            str(team.get("team_id")),
            period_id,
            registered_by=request.player_id,
            roster=_team_roster_snapshot(team),
        )
    except TeamServiceError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    profile.team_tournament_registered_period = period_id
    persist_player_data(request.player_id)
    return get_events(request.player_id)


@app.post("/events/team/fixtures/{fixture_id}/check-in")
@persistent_operation
def check_in_team_tournament_fixture(
    fixture_id: str,
    request: EventRegistrationOperation,
) -> dict:
    """Oyuncunun bu haftaki sıradaki maç ayağına girer (önce ilk maç, sonra rövanş)."""
    view = get_events(request.player_id)
    tournament = view["team_tournament"]
    if not view.get("viewer", {}).get("team_registered"):
        raise HTTPException(status_code=422, detail="Takım bu turnuvaya kayıtlı değil.")
    fixture = next(
        (
            item
            for item in tournament.get("fixtures", [])
            if item.get("fixture_id") == fixture_id
        ),
        None,
    )
    if fixture is None:
        raise HTTPException(status_code=404, detail="Turnuva eşleşmesi bulunamadı.")
    if fixture.get("status") != "live":
        raise HTTPException(
            status_code=422,
            detail="Turnuva maçları her hafta Cuma, Cumartesi ve Pazar oynanır.",
        )
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
    located = team_tournament_open_leg(tournament, request.player_id, fixture_id)
    if located is None:
        raise HTTPException(status_code=422, detail="Bu haftanın iki maçını da oynadın.")
    leg = located["leg"]
    opponent_id = (
        pairing["away_player_id"]
        if pairing["home_player_id"] == request.player_id
        else pairing["home_player_id"]
    )
    session_id = str(leg["battle_session_id"])
    # Sonucu yazılamamış bitmiş bir oturum kalmışsa önce sonucu kaydedilir.
    try:
        existing = pvp_service.get_session(session_id)
    except PvPSessionError:
        existing = None
    if existing is not None and existing.engine.state.status == BattleStatus.FINISHED:
        _record_team_tournament_leg(existing.engine.state)
        raise HTTPException(
            status_code=409,
            detail="Bu maç tamamlandı ve sonucu kaydedildi; sıradaki maç için yeniden gir.",
        )
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
    return {"fixture": fixture, "pairing": pairing, "leg": leg, "battle": battle}


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
@persistent_operation
def get_player_daily_meta(player_id: str) -> dict:
    """Return the player's immutable choice for the current UTC day."""
    return _daily_meta_view(_team_member_profile(player_id))


@app.post("/profile/{player_id}/daily-meta/roll")
@persistent_operation
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
@persistent_operation
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
@persistent_operation
def claim_login_period_reward(
    player_id: str,
    day: int,
    request: MetaOperationRequest | None = None,
) -> dict:
    try:
        receipt = player_profile_service.claim_login_reward(
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
        "event_id": f"{season_descriptor()['id']}:{player_id}:{source}:{tier_after}",
        "season_id": season_descriptor()["id"],
        "tier_before": tier_before,
        "tier_after": tier_after,
    }


@app.post("/profile/{player_id}/engagement/tiers/{tier}/claim")
@persistent_operation
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


@app.post("/profile/{player_id}/engagement/tiers/{tier}/premium/claim")
@persistent_operation
def claim_premium_season_tier_reward(
    player_id: str,
    tier: int,
    request: MetaOperationRequest | None = None,
) -> dict:
    engagement_request_id = request.request_id if request else None
    before_profile = player_profile_service.get_or_create(player_id)
    replayed = bool(
        engagement_request_id
        and engagement_request_id in before_profile.engagement_claim_receipts
    )
    try:
        profile = player_profile_service.claim_premium_season_tier(
            player_id,
            tier,
            request_id=engagement_request_id,
        )
    except PlayerProfileError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    reward = next(
        (item for item in SEASON_PREMIUM_REWARD_TRACK if int(item["tier"]) == tier),
        None,
    )
    chest_definition_ids = {
        "bronze": "field_3h",
        "silver": "circuit_8h",
        "gold": "core_24h",
        "diamond": "diamond_24h",
    }
    chest_receipts = []
    if reward and reward.get("chest_tier"):
        for index in range(int(reward.get("chest_count", 0) or 0)):
            chest_request_id = f"season-premium-tier:{profile.player_id}:{profile.active_meta_season_id}:{tier}:{index}"
            if replayed:
                receipt = profile.chest_receipts.get(chest_request_id)
            else:
                receipt = meta_progression_service.award_instant_chest(
                    profile,
                    chest_definition_ids[str(reward["chest_tier"])],
                    f"season-premium-tier:{profile.active_meta_season_id}:{tier}:{index}",
                    chest_request_id,
                )
            if receipt:
                chest_receipts.append(receipt)
    persist_player_data(player_id)
    view = profile.to_view()
    return {
        **view,
        "season_reward_receipt": (
            dict(profile.engagement_claim_receipts[engagement_request_id])
            if engagement_request_id
            and engagement_request_id in profile.engagement_claim_receipts
            else None
        ),
        "season_chest_receipts": chest_receipts,
    }


@app.put("/profile/{player_id}/display-name")
@persistent_operation
def update_profile_display_name(
    player_id: str,
    request: ProfileNameRequest,
) -> dict:
    with player_profile_service.name_lock:
        profile = _team_member_profile(player_id)
        previous_name = profile.display_name
        try:
            profile = player_profile_service.set_display_name(player_id, request.display_name)
            persist_player_data(player_id)
        except (DisplayNameError, PlayerProfileError) as exc:
            profile.display_name = previous_name
            raise HTTPException(
                status_code=409 if getattr(exc, "code", "") == "taken" else 422,
                detail=str(exc),
            ) from exc
        except Exception:
            profile.display_name = previous_name
            raise
        return profile.to_view()


@app.put("/profile/{player_id}/battle-pool")
@persistent_operation
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
@persistent_operation
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
@persistent_operation
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
@persistent_operation
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
@persistent_operation
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
@persistent_operation
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
@persistent_operation
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
    player_persistence, telemetry_persistence = await asyncio.gather(
        asyncio.to_thread(player_data_persistence_health),
        asyncio.to_thread(telemetry_persistence_health),
    )
    runtime_health = await runtime_coordinator.health()
    if RUNTIME_STRICT:
        # Public readiness is not a database diagnostic endpoint. Exceptions
        # can carry hostnames, paths and connection parameters.
        player_persistence = {key: player_persistence[key] for key in ("ready", "state", "backend") if key in player_persistence}
        telemetry_persistence = {key: telemetry_persistence[key] for key in ("ready", "state", "backend") if key in telemetry_persistence}
        runtime_health = {key: runtime_health[key] for key in ("ready", "state", "backend", "worker_lease_ready", "latency_ms") if key in runtime_health}
    ready = bool(player_persistence["ready"]) and bool(telemetry_persistence["ready"])
    if RUNTIME_STRICT:
        ready = ready and bool(runtime_health["ready"]) and bool(postgres_worker_guard and postgres_worker_guard.held)

    payload = {
        "status": "ok" if ready else "degraded",
        "version": VERSION,
        "pvp_protocol_version": PVP_PROTOCOL_VERSION,
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
        "store_reconciliation": {
            "enabled": bool(STORE_RECONCILE_INTERVAL_SECONDS) and store_reconciler.enabled(),
            "interval_seconds": STORE_RECONCILE_INTERVAL_SECONDS,
            "last_runs": store_reconciler.last_runs(),
        },
    }
    if RUNTIME_STRICT and not ready:
        return JSONResponse(status_code=503, content=payload)
    return payload


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


FIRST_MATCH_AI_FIRST_DECISION_MS = 15_000
FIRST_MATCH_AI_DECISION_DELAY_MS = 3_500
FIRST_MATCH_AI_MISTAKE_RATE = 0.35


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
    # İlk maç eğitimi (Beta.72 tur 11): hiç maç bitirmemiş oyuncunun AI rakibi
    # ilk hamlesini 15 sn sonra yapar, daha seyrek karar verir, daha sık hata
    # yapar ve "Dengeli" oynar; oyuncu eğitim ipuçlarını savaş sürerken okur.
    # Kupa ve ödül kuralları değişmez.
    first_match = (
        match_type == "arena_ai"
        and player_statistics_service.get_or_create(pair.player_a_id).total_matches == 0
    )
    if first_match:
        bot.update(
            archetype_tr="Dengeli",
            decision_delay_ms=max(
                int(bot.get("decision_delay_ms") or 0),
                FIRST_MATCH_AI_DECISION_DELAY_MS,
            ),
            mistake_rate=max(
                float(bot.get("mistake_rate") or 0),
                FIRST_MATCH_AI_MISTAKE_RATE,
            ),
        )
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
        season_id=season_descriptor()["id"],
        ranked_eligible=ranked_eligible,
        normalized=False,
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
    # Resolve progression only when both final battle decks are ready.
    session.ai_level_reference_player_ids[pair.player_b_id] = pair.player_a_id
    # Eşleştirme oturumundaki rakip slotu her maçta yeniden üretilir. Günlük
    # meta tohumunu bu geçici slotla değil, kanonik bot kimliğiyle kurarak aynı
    # AI oyuncunun UTC günü boyunca aynı metayı kullanmasını sağla.
    ai_meta_seed = str(bot.get("id") or pair.player_b_id)
    session.engine.state.player_daily_meta_ids[pair.player_b_id] = daily_meta_for_seed(
        ai_meta_seed
    ).get("id", "")
    session.ai_profile_options[pair.player_b_id] = bot
    attach_player_progression_to_session(pair.match_id, pair.player_a_id)

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
        first_decision_at_ms=FIRST_MATCH_AI_FIRST_DECISION_MS if first_match else 0,
    )

    telemetry_call = {
        "event_id": f"server:{pair.match_id}:matchmaking_ai_fallback:{pair.player_a_id}",
        "event_type": "matchmaking_matched",
        "player_id": pair.player_a_id,
        "session_id": pair.match_id,
        "metadata": {
            "rating_difference": abs(int(bot["match_rating"]) - profile.rating),
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
        pvp_service.create_session(
            session_id,
            setup_required=True,
            auto_start_when_ready=False,
            match_type="local_test",
            season_id=season_descriptor()["id"],
            ranked_eligible=False,
            normalized=True,
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
        attach_player_progression_to_session(session_id, request.player_id)
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
@persistent_operation
def create_pvp_session(
    request: CreateSessionRequest,
) -> dict:
    try:
        session = pvp_service.create_session(
            request.session_id,
            setup_required=True,
            auto_start_when_ready=request.auto_start_when_ready,
            match_type="ranked_pvp",
            season_id=season_descriptor()["id"],
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
@persistent_operation
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
        attach_player_progression_to_session(
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
@persistent_operation
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

    def verify_socket_identity():
        _require_worker_ownership()
        if auth_is_required():
            identity = participant_auth_service.verify_access_token(access_token or "")
            if platform_service.token_is_revoked(identity.player_id, identity.token_id):
                raise AuthenticationError("Bu cihaz oturumu sonlandırılmış.")
            if identity.player_id != player_id:
                raise AuthenticationError("WebSocket oyuncu kimliği belirteçle eşleşmiyor.")

    async def authorize_socket():
        await asyncio.to_thread(verify_socket_identity)
        await runtime_coordinator.touch_player(player_id)

    try:
        await pvp_websocket_adapter.connect(
            connection_id=connection_id,
            session_id=session_id,
            player_id=player_id,
            socket=websocket,
            authorize=authorize_socket,
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
        await websocket.close(code=4401, reason=str(exc))
    except PvPSessionError as exc:
        await websocket.close(code=4404, reason=str(exc))
    except HTTPException:
        await websocket.close(code=1013, reason="Savaş sunucusu yeniden başlatılmayı bekliyor.")
    finally:
        if connected:
            try:
                await pvp_websocket_adapter.connection_lost(
                    connection_id
                )
            except PvPSessionError:
                pass


# Retired diagnostic/admin surfaces are explicit tombstones, not a browser
# static-file 404/405 and never a way to restore live player data.
@app.api_route("/web-test", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"], include_in_schema=False)
@app.api_route("/web-test/{retired_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"], include_in_schema=False)
@app.api_route("/laboratory/{retired_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"], include_in_schema=False)
@app.api_route("/telemetry/{retired_path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"], include_in_schema=False)
def retired_diagnostic_surface(retired_path: str = ""):
    # /telemetry/events is a real route declared above this catch-all.
    raise HTTPException(status_code=410, detail="Bu eski yönetim/deneme arayüzü kaldırıldı; canlı kayıtlar bu uçtan değiştirilemez.")


# API ve WebSocket rotalarından sonra istemciyi aynı origin altında servis et.
# Geliştirmede kaynak/no-cache; üretimde doğrulanmış dist ve içerik özetli önbellek.
app.mount(
    "/",
    (ProductionStaticFiles if RUNTIME_STRICT else NoCacheStaticFiles)(
        directory=str(
            CLIENT_DIR
        ),
        html=True,
    ),
    name="project-relay-web",
)
