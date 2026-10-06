"""Production social handlers against an explicitly isolated PostgreSQL DB."""

from concurrent.futures import ThreadPoolExecutor
import os
from threading import Barrier
from urllib.parse import urlsplit
from uuid import uuid4

from fastapi import HTTPException
import pytest

from app import main as gateway
from app.player_data_store import PlayerDataStoreService
from app.player_profile import PlayerProfileService
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService
from app.postgres_platform import PostgresPlatformService
from app.postgres_repository import PostgresPlayerDataRepository, PostgresPool
from app.postgres_social_transactions import PostgresSocialTransactionRepository
from app.game.pvp_session import PvPSessionService
from app.postgres_social_runtime import PostgresSocialRuntime
from app.auth import ParticipantAuthService
from app.postgres_repository import PostgresIdentityRepository
from app.postgres_product_analytics import PostgresProductAnalyticsService
from app.postgres_team import PostgresTeamRepository
from app.team_service import TeamService


@pytest.fixture
def social_db(monkeypatch, tmp_path):
    url = os.environ.get("GRIDSHARD_TEST_DATABASE_URL", "").strip()
    if not url:
        pytest.skip("İzole PostgreSQL test veritabanı tanımlı değil.")
    parsed = urlsplit(url)
    if parsed.hostname not in {"127.0.0.1", "localhost"} or parsed.path != "/gridshard_test":
        pytest.fail("Test yalnız yerel gridshard_test veritabanında çalışabilir.")
    pool = PostgresPool(url, min_size=1, max_size=4)
    pool.open()
    players = PostgresPlayerDataRepository(pool)
    profiles = PlayerProfileService()
    statistics = PlayerStatisticsService()
    settings = PlayerSettingsService()
    store = PlayerDataStoreService(
        repository=players, profile_service=profiles,
        statistics_service=statistics, settings_service=settings,
    )
    platform = PostgresPlatformService(pool, path=tmp_path / "must-not-be-created.json")
    ids = tuple(f"social-api-{uuid4().hex}" for _ in range(3))
    for name, value in {
        "RUNTIME_STRICT": True, "postgres_pool": pool,
        "player_data_repository": players, "player_profile_service": profiles,
        "player_statistics_service": statistics, "player_settings_service": settings,
        "player_data_store_service": store, "platform_service": platform,
        "pvp_service": PvPSessionService(),
    }.items():
        monkeypatch.setattr(gateway, name, value)
    try:
        for player_id in ids:
            profile = profiles.get_or_create(player_id)
            profile.display_name = player_id
            profile.circuit_credits = 321
            store.save_player(player_id)
        yield pool, players, platform, ids
        assert not platform.path.exists()
    finally:
        with pool.transaction() as connection:
            with platform._lock:
                data = platform._read()
                for player_id in ids:
                    data["accounts"].pop(player_id, None)
                platform._write(data)
                for table, left, right in (
                    ("friend_requests", "requester_id", "recipient_id"),
                    ("friendships", "player_a_id", "player_b_id"),
                    ("player_blocks", "owner_id", "target_id"),
                    ("social_operation_receipts", "actor_id", "target_id"),
                    ("social_battle_invites", "challenger_id", "opponent_id"),
                ):
                    connection.execute(
                        f"DELETE FROM {table} WHERE {left} = ANY(%s) OR {right} = ANY(%s)",
                        (list(ids), list(ids)),
                    )
                connection.execute("DELETE FROM platform_accounts WHERE player_id = ANY(%s)", (list(ids),))
                connection.execute("DELETE FROM player_data WHERE player_id = ANY(%s)", (list(ids),))
        pool.close()


def _request(actor, target, request_id):
    return gateway.send_friend_request(actor, gateway.FriendRequestOperation(
        player_id=actor, target_player_id=target, request_id=request_id,
    ))


def _decision(kind, actor, target, request_id):
    return getattr(gateway, f"{kind}_friend_request")(actor, gateway.FriendDecisionOperation(
        player_id=actor, requester_id=target, request_id=request_id,
    ))


def _block(actor, target, blocked, request_id):
    return gateway.set_social_block(actor, gateway.SocialSafetyRequest(
        player_id=actor, target_player_id=target, blocked=blocked, request_id=request_id,
    ))


def test_handlers_commit_edges_mirrors_and_receipts_and_replay_without_resurrection(social_db):
    pool, players, platform, (a, b, c) = social_db
    request_id = "request-" + "x" * 100  # Existing client IDs can exceed SQL's 96-character limit.
    assert _request(a, b, request_id)["replayed"] is False
    revision = players.load(a).revision
    assert _request(a, b, request_id)["replayed"] is True
    assert players.load(a).revision == revision
    with pytest.raises(HTTPException) as conflict:
        _request(a, c, request_id)
    assert conflict.value.status_code == 409
    assert _decision("accept", b, a, "accept")["friends"][0]["player_id"] == a
    result = _block(a, b, True, "block")
    assert result["blocked_player_ids"] == [b]
    assert result["social"]["friends"] == []
    assert platform.is_blocked(a, b)
    with pool.connection() as connection:
        assert connection.execute("SELECT COUNT(*) FROM friendships WHERE player_a_id = ANY(%s)", (list((a, b)),)).fetchone()[0] == 0
        assert connection.execute("SELECT target_id FROM player_blocks WHERE owner_id = %s", (a,)).fetchone() == (b,)
    with pytest.raises(HTTPException) as blocked:
        _request(b, a, "blocked-request")
    assert blocked.value.status_code == 422
    _block(a, b, False, "unblock")
    assert not platform.is_blocked(a, b)
    assert _block(a, b, True, "block")["replayed"] is True
    assert not platform.is_blocked(a, b)  # An old packet must not reapply a reversed action.
    assert _decision("accept", b, a, "accept")["friends"] == []
    for player_id in (a, b):
        assert gateway.player_profile_service.get_or_create(player_id).storage_revision == players.load(player_id).revision
        assert players.load(player_id).profile["meta_progression_state"]["circuit_credits"] == 321


def test_cancel_and_reject_replays_do_not_consume_new_requests(social_db):
    _, players, _, (a, b, _) = social_db
    _request(a, b, "first")
    cancel = gateway.FriendRequestCancelOperation(player_id=a, target_player_id=b, request_id="cancel")
    gateway.cancel_friend_request(a, cancel)
    assert not players.load(b).profile["meta_progression_state"]["incoming_friend_request_ids"]
    _request(a, b, "second")
    assert gateway.cancel_friend_request(a, cancel)["replayed"] is True
    assert _decision("reject", b, a, "reject")["incoming_requests"] == []
    _request(a, b, "third")
    assert _decision("reject", b, a, "reject")["incoming_requests"][0]["player_id"] == a


@pytest.mark.parametrize("kind", ["request", "block"])
def test_platform_write_failure_rolls_back_both_profiles_edges_and_receipt(social_db, monkeypatch, kind):
    pool, players, platform, (a, b, _) = social_db
    if kind == "block":
        _request(a, b, "setup")
        _decision("accept", b, a, "setup-accept")
    else:
        # Force a real mirror correction, rather than a no-op platform write.
        platform.set_block(a, "stale-test-mirror", True)
    before = (players.load(a), players.load(b))
    with pool.connection() as connection:
        receipts_before = connection.execute("SELECT COUNT(*) FROM social_operation_receipts WHERE actor_id = ANY(%s)", (list((a, b)),)).fetchone()[0]
    original_write = platform._write
    def fail_after_write(data):
        original_write(data)
        raise RuntimeError("injected platform write failure")
    monkeypatch.setattr(platform, "_write", fail_after_write)
    with pytest.raises(RuntimeError, match="injected"):
        if kind == "request":
            _request(a, b, "failure")
        else:
            _block(a, b, True, "failure")
    monkeypatch.setattr(platform, "_write", original_write)
    assert (players.load(a), players.load(b)) == before
    for saved in before:
        assert gateway.player_profile_service.get_or_create(saved.player_id).storage_revision == saved.revision
    assert not platform.is_blocked(a, b)
    with pool.connection() as connection:
        assert connection.execute("SELECT COUNT(*) FROM social_operation_receipts WHERE actor_id = ANY(%s)", (list((a, b)),)).fetchone()[0] == receipts_before
        assert connection.execute("SELECT COUNT(*) FROM friend_requests WHERE requester_id = %s", (a,)).fetchone()[0] == 0
        assert connection.execute("SELECT COUNT(*) FROM player_blocks WHERE owner_id = %s", (a,)).fetchone()[0] == 0
        assert connection.execute("SELECT COUNT(*) FROM friendships WHERE player_a_id = %s AND player_b_id = %s", tuple(sorted((a, b)))).fetchone()[0] == (1 if kind == "block" else 0)
    if kind == "request":
        assert platform.is_blocked(a, "stale-test-mirror")
    # Rolled-back receipt must not suppress the next delivery.
    result = _request(a, b, "failure") if kind == "request" else _block(a, b, True, "failure")
    assert result["replayed"] is False


def test_invalid_requests_do_not_create_ghost_players_or_receipts(social_db):
    pool, players, _, (a, b, _) = social_db
    ghost = "missing-" + uuid4().hex
    with pytest.raises(HTTPException) as missing:
        _request(a, ghost, "missing")
    assert missing.value.status_code == 404
    assert players.load(ghost) is None
    assert ghost not in gateway.player_profile_service._profiles
    with pytest.raises(HTTPException) as no_id:
        _block(a, b, True, None)
    assert no_id.value.status_code == 422
    with pytest.raises(HTTPException) as self_request:
        _decision("accept", a, a, "self")
    assert self_request.value.status_code == 422
    with pytest.raises(HTTPException) as wrong_actor:
        gateway.send_friend_request(a, gateway.FriendRequestOperation(
            player_id=b, target_player_id=a, request_id="wrong-actor",
        ))
    assert wrong_actor.value.status_code == 403
    with pool.connection() as connection:
        assert connection.execute("SELECT COUNT(*) FROM social_operation_receipts WHERE actor_id = %s", (a,)).fetchone()[0] == 0


def test_concurrent_duplicate_requests_have_one_commit(social_db):
    pool, players, _, (a, b, _) = social_db
    barrier = Barrier(2)
    repository = PostgresSocialTransactionRepository(pool)
    request_id = "concurrent-" + uuid4().hex
    before = (players.load(a).revision, players.load(b).revision)
    def send():
        barrier.wait(timeout=5)
        return repository.apply_friend_operation("request", a, b, request_id)
    with ThreadPoolExecutor(max_workers=2) as workers:
        results = list(workers.map(lambda _: send(), range(2)))
    assert sorted(result["replayed"] for result in results) == [False, True]
    assert (players.load(a).revision, players.load(b).revision) == tuple(value + 1 for value in before)


def test_opposite_api_requests_use_actor_scoped_receipts_and_consistent_mirrors(social_db):
    pool, players, _, (a, b, _) = social_db
    barrier = Barrier(2)
    def send(pair):
        barrier.wait(timeout=5)
        return _request(*pair, "same-client-request-id")
    with ThreadPoolExecutor(max_workers=2) as workers:
        results = list(workers.map(send, ((a, b), (b, a))))
    assert all(result["replayed"] is False for result in results)
    for actor, peer in ((a, b), (b, a)):
        meta = players.load(actor).profile["meta_progression_state"]
        assert meta["friend_ids"] == [peer]
        assert not meta["incoming_friend_request_ids"]
        assert not meta["outgoing_friend_request_ids"]
    with pool.connection() as connection:
        assert connection.execute("SELECT COUNT(*) FROM social_operation_receipts WHERE actor_id = ANY(%s)", (list((a, b)),)).fetchone()[0] == 2
        assert connection.execute("SELECT COUNT(*) FROM friendships WHERE player_a_id = %s AND player_b_id = %s", tuple(sorted((a, b)))).fetchone()[0] == 1


def test_accept_checks_persisted_limit_instead_of_stale_live_profile(social_db):
    _, players, _, (a, b, _) = social_db
    _request(a, b, "pending")
    profile = gateway.player_profile_service.get_or_create(b)
    profile.friend_ids = tuple(f"fixture-friend-{i}" for i in range(100))
    gateway.player_data_store_service.save_player(b)
    before = (players.load(a), players.load(b))
    profile.friend_ids = ()  # Simulate a stale cache with available friend slots.
    with pytest.raises(HTTPException) as full:
        _decision("accept", b, a, "limit")
    assert full.value.status_code == 422
    assert (players.load(a), players.load(b)) == before


def _friends(a, b):
    _request(a, b, "setup-friend")
    _decision("accept", b, a, "setup-friend-accept")


def _invite(a, b, request_id="battle-invite"):
    return gateway.create_social_battle_invite(a, gateway.SocialBattleInviteOperation(
        player_id=a, opponent_id=b, request_id=request_id,
    ))


def _battle_decision(kind, actor, invite_id, request_id):
    return getattr(gateway, f"{kind}_social_battle_invite")(
        actor, invite_id, gateway.EventRegistrationOperation(player_id=actor, request_id=request_id),
    )


def test_battle_invite_commits_live_notification_and_push_job_once(social_db, monkeypatch):
    pool, players, platform, (a, b, _) = social_db
    _friends(a, b)
    with platform._lock:
        data = platform._read()
        account = platform._account(data, b)
        account["devices"]["fixture"] = {}
        account["push_subscriptions"]["fixture"] = {"revision": "fixture", "updated_at": int(platform.now_func())}
        platform._write(data)
    before = (players.load(a), players.load(b))
    original_queue = platform.queue_notification
    def fail_after_queue(*args, **kwargs):
        original_queue(*args, **kwargs)
        raise RuntimeError("notification failure")
    monkeypatch.setattr(platform, "queue_notification", fail_after_queue)
    with pytest.raises(RuntimeError, match="notification failure"):
        _invite(a, b)
    monkeypatch.setattr(platform, "queue_notification", original_queue)
    assert (players.load(a), players.load(b)) == before
    assert platform.notification_view(b)["notifications"] == []
    with pool.connection() as connection:
        assert connection.execute("SELECT COUNT(*) FROM social_battle_invites WHERE challenger_id = %s", (a,)).fetchone()[0] == 0
    invite_id = _invite(a, b)["battle_invites"][0]["invite_id"]
    assert _invite(a, b)["replayed"] is True
    assert len(platform.notification_view(b)["notifications"]) == 1
    assert platform.notification_view(b)["push"]["deliveries"] == {"pending": 1}
    with pool.connection() as connection:
        payload = connection.execute("SELECT payload FROM social_battle_invites WHERE invite_id = %s", (invite_id,)).fetchone()[0]
    assert players.load(a).profile["meta_progression_state"]["social_battle_invites"] == [payload]
    assert players.load(b).profile["meta_progression_state"]["social_battle_invites"] == [payload]


def test_invite_decline_completion_and_restart_cannot_resurrect_arena(social_db):
    pool, _, platform, (a, b, _) = social_db
    _friends(a, b)
    invite_id = _invite(a, b)["battle_invites"][0]["invite_id"]
    accepted = _battle_decision("accept", b, invite_id, "accept-battle")
    session_id = accepted["battle"]["session_id"]
    assert _battle_decision("accept", b, invite_id, "accept-battle")["replayed"] is True
    assert gateway._complete_social_battle_invites(session_id) is True
    assert gateway._complete_social_battle_invites(session_id) is False
    with pytest.raises(HTTPException) as completed:
        _battle_decision("accept", b, invite_id, "accept-battle")
    assert completed.value.status_code == 409
    second = _invite(a, b, "second-battle")["battle_invites"][-1]["invite_id"]
    _battle_decision("decline", b, second, "decline-battle")
    assert _battle_decision("decline", b, second, "decline-battle")["replayed"] is True
    with pytest.raises(HTTPException):
        _battle_decision("accept", b, second, "accept-declined")
    third = _invite(a, b, "third-battle")["battle_invites"][-1]["invite_id"]
    _battle_decision("accept", b, third, "accept-third")
    restarted = PostgresSocialRuntime(pool, platform, boot_id="a-new-boot")
    assert set(restarted.close_sessions(stale_boot=True)) == {a, b}
    assert restarted.invite(b, third)["status"] == "expired"
    with pytest.raises(HTTPException):
        _battle_decision("accept", b, third, "accept-third")


def test_dm_and_notification_are_atomic_and_message_replay_checks_payload(social_db, monkeypatch):
    _, _, platform, (a, b, _) = social_db
    _friends(a, b)
    request = gateway.DirectMessageRequest(player_id=a, recipient_id=b, preset_id="hello", request_id="dm")
    original = platform.queue_notification
    def fail(*args, **kwargs):
        original(*args, **kwargs)
        raise RuntimeError("dm notification failure")
    monkeypatch.setattr(platform, "queue_notification", fail)
    with pytest.raises(RuntimeError):
        gateway.send_direct_message(a, request)
    monkeypatch.setattr(platform, "queue_notification", original)
    assert platform.messages(a, b) == []
    first = gateway.send_direct_message(a, request)
    replay = gateway.send_direct_message(a, request)
    assert first["message"] == replay["message"]
    assert replay["replayed"] is True
    assert len(platform.messages(a, b)) == len(platform.notification_view(b)["notifications"]) == 1
    with pytest.raises(HTTPException) as conflict:
        gateway.send_direct_message(a, request.model_copy(update={"preset_id": "yes"}))
    assert conflict.value.status_code == 409
    seen = gateway.DirectMessageSeenRequest(player_id=b, peer_id=a, request_id="seen")
    assert gateway.mark_direct_messages_seen(b, seen)["notifications"]["unread_messages"] == 0
    assert gateway.mark_direct_messages_seen(b, seen)["replayed"] is True
    _block(a, b, True, "block-dm")
    with pytest.raises(HTTPException):
        gateway.send_direct_message(b, gateway.DirectMessageRequest(player_id=b, recipient_id=a, preset_id="hello", request_id="blocked-dm"))


def test_invite_code_use_rolls_back_on_block_and_replays_once(social_db):
    pool, _, platform, (a, b, _) = social_db
    code = platform.create_invite(a)["code"]
    _block(a, b, True, "block-code")
    request = gateway.InviteCodeRequest(player_id=b, code=code, request_id="accept-code")
    with pytest.raises(HTTPException):
        gateway.accept_social_invite_code(b, request)
    with platform._lock:
        assert platform._read()["invites"][code]["uses"] == 0
    _block(a, b, False, "unblock-code")
    assert gateway.accept_social_invite_code(b, request)["accepted"] is True
    assert gateway.accept_social_invite_code(b, request)["replayed"] is True
    with platform._lock:
        assert platform._read()["invites"][code]["uses"] == 1
    with pool.connection() as connection:
        assert connection.execute("SELECT COUNT(*) FROM friendships WHERE player_a_id = %s AND player_b_id = %s", tuple(sorted((a, b)))).fetchone()[0] == 1


@pytest.fixture
def erasure_db(social_db, monkeypatch, tmp_path):
    pool, _, _, ids = social_db
    identities = PostgresIdentityRepository(pool)
    auth = ParticipantAuthService(identities, b"fixture-signing-key-32-bytes-long-test")
    analytics = PostgresProductAnalyticsService(pool, tmp_path / "unused-analytics.json", auth.signing_key, lambda _player: True)
    teams = TeamService(PostgresTeamRepository(pool))
    monkeypatch.setattr(gateway, "team_service", teams)
    monkeypatch.setattr(gateway, "participant_auth_service", auth)
    monkeypatch.setattr(gateway, "product_analytics_service", analytics)
    for player_id in ids:
        identities.create(player_id, {"salt": "fixture", "verifier": "fixture", "devices": {}})
    try:
        yield social_db, identities, analytics, teams
    finally:
        for player_id in ids:
            identities.delete(player_id)
            analytics.erase_player(player_id)
        with teams._lock:
            data = teams.repository.load()
            data["teams"] = {key: team for key, team in data["teams"].items() if not set(team.get("member_ids", [])).intersection(ids)}
            data["receipts"] = {}  # This isolated fixture is the sole team writer.
            teams.repository.save(data)


@pytest.mark.parametrize("fail", [False, True])
def test_erasure_covers_cold_profiles_team_edges_identity_and_live_jobs_atomically(erasure_db, monkeypatch, fail):
    (pool, players, platform, (a, b, c)), identities, _, teams = erasure_db
    _friends(a, b)
    _request(c, a, "incoming-erasure")
    _invite(a, b)
    team = teams.create_team(a, "Fixture Team", "fixture-team-create")["team"]
    teams.join_team(b, team["team_id"], "fixture-team-join")
    teams.review_application(team_id=team["team_id"], owner_id=a, applicant_id=b, accept=True, request_id="fixture-team-review")
    original_profiles = (players.load(a), players.load(b), players.load(c))
    original_team = teams.repository.load()
    notices_before = platform.notification_view(b)
    for value in (b, c):
        gateway.player_profile_service._profiles.pop(value, None)
    original_delete = identities.delete
    if fail:
        def fail_after_delete(player_id):
            original_delete(player_id)
            raise RuntimeError("identity erase failure")
        monkeypatch.setattr(identities, "delete", fail_after_delete)
    request = gateway.GdprDeleteRequest(player_id=a, confirmation=f"SIL {a}")
    if fail:
        with pytest.raises(RuntimeError, match="identity erase failure"):
            gateway.delete_account_data(a, request)
        monkeypatch.setattr(identities, "delete", original_delete)
        assert (players.load(a), players.load(b), players.load(c)) == original_profiles
        assert teams.repository.load() == original_team
        assert platform.notification_view(b) == notices_before
        assert identities.get(a) is not None
    else:
        assert gateway.delete_account_data(a, request)["deleted"] is True
        assert players.load(a) is identities.get(a) is None
        for value in (b, c):
            meta = players.load(value).profile["meta_progression_state"]
            for key in ("friend_ids", "incoming_friend_request_ids", "outgoing_friend_request_ids", "blocked_player_ids"):
                assert a not in meta[key]
            assert not meta["social_battle_invites"]
        remaining = teams.team_for_player(b)
        assert remaining["owner_id"] == b
        assert remaining["member_ids"] == [b]
        assert platform.notification_view(b)["notifications"] == []
        with pool.connection() as connection:
            assert connection.execute("SELECT COUNT(*) FROM social_operation_receipts WHERE actor_id = %s OR target_id = %s", (a, a)).fetchone()[0] == 0
            assert connection.execute("SELECT COUNT(*) FROM social_battle_invites WHERE challenger_id = %s", (a,)).fetchone()[0] == 0
        assert gateway.delete_account_data(a, request)["deleted"] is False
