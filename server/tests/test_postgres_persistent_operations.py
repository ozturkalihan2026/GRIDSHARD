"""Real transaction/cache tests. Only the isolated social_db fixture is used."""

from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy
from threading import Barrier
from uuid import uuid4

import pytest

from app import main as gateway
from app.postgres_team import PostgresTeamRepository
from app.team_service import TeamService
from fastapi import HTTPException
from test_postgres_social_api import social_db  # noqa: F401 -- shared guarded DB fixture
from test_postgres_social_api import erasure_db  # noqa: F401


def test_recovery_rolls_back_code_identity_and_revocations_together(erasure_db, monkeypatch):
    (pool, _, platform, (a, _, _)), identities, _, _ = erasure_db
    auth = gateway.participant_auth_service
    old_secret = "old-secret-" + "x" * 40
    auth.reset_device_secret(a, old_secret, "old-device")
    session = auth.register_or_login(a, old_secret, "old-device")
    identity = auth.verify_access_token(session["access_token"])
    platform.register_device(a, "old-device", "Fixture", "android", identity.token_id, identity.expires_at)
    with platform._lock:
        data = platform._read()
        platform._account(data, a)["recovery"] = {"code_hash": platform._code_hash("123456"), "expires_at": int(platform.now_func()) + 300}
        platform._write(data)
    before_identity = deepcopy(identities.get(a))
    before_account = platform.account_view(a)
    revoke = platform.revoke_device
    def fail_after_revoke(*args):
        revoke(*args)
        raise RuntimeError("injected recovery failure")
    request = gateway.RecoveryConfirmRequest(player_id=a, code="123456", new_device_secret="new-secret-" + "y" * 40, device_id="new-device")
    with monkeypatch.context() as patch:
        patch.setattr(platform, "revoke_device", fail_after_revoke)
        with pytest.raises(RuntimeError, match="recovery failure"):
            gateway.confirm_account_recovery(request)
    assert identities.get(a) == before_identity
    assert platform.account_view(a) == before_account
    assert not platform.token_is_revoked(a, identity.token_id)
    assert gateway.confirm_account_recovery(request)["recovered"] is True
    assert platform.token_is_revoked(a, identity.token_id)
    with pytest.raises(gateway.AuthenticationError):
        auth.register_or_login(a, old_secret, "old-device")
    assert auth.register_or_login(a, request.new_device_secret, "new-device")["player_id"] == a


def test_economic_replay_survives_profile_receipt_pruning_and_payload_conflict(social_db):
    pool, players, _, (a, _, _) = social_db
    profile = gateway.player_profile_service.get_or_create(a)
    profile.circuit_credits = 10000
    profile.module_shards["laser"] = 100
    gateway.persist_player_data(a)
    request = gateway.MetaOperationRequest(request_id=uuid4().hex)
    first = gateway.upgrade_player_collection_module(a, "laser", request)
    saved = players.load(a).profile["meta_progression_state"]
    profile = gateway.player_profile_service.get_or_create(a)
    profile.module_upgrade_receipts.clear()
    profile.circuit_credits += 9  # A later mutation must remain visible on replay.
    gateway.persist_player_data(a)
    replay = gateway.upgrade_player_collection_module(a, "laser", request)
    current = players.load(a).profile["meta_progression_state"]
    assert replay["receipt"]["level_after"] == first["receipt"]["level_after"]
    assert replay["replayed"] is True
    assert current["circuit_credits"] == saved["circuit_credits"] + 9
    assert current["module_upgrade_levels"] == saved["module_upgrade_levels"]
    assert replay["meta_progression"]["circuit_credits"] == current["circuit_credits"]
    with pytest.raises(HTTPException) as conflict:
        gateway.upgrade_player_collection_module(a, "shield", request)
    assert conflict.value.status_code == 409
    with pytest.raises(HTTPException) as conflict:
        gateway.buy_store_chest(a, "field_3h", request)
    assert conflict.value.status_code == 409


def test_failed_economic_operation_does_not_reserve_request_id(social_db):
    pool, _, _, (a, _, _) = social_db
    request = gateway.MetaOperationRequest(request_id=uuid4().hex)
    with pytest.raises(HTTPException):
        gateway.upgrade_player_collection_module(a, "does-not-exist", request)
    with pool.connection() as connection:
        assert connection.execute("SELECT COUNT(*) FROM player_economic_operations WHERE player_id = %s", (a,)).fetchone()[0] == 0


@pytest.fixture
def team_db(social_db, monkeypatch):
    pool, players, platform, ids = social_db
    repository = PostgresTeamRepository(pool)
    baseline = deepcopy(repository.load())
    service = TeamService(repository)
    monkeypatch.setattr(gateway, "team_service", service)
    yield pool, players, platform, ids, service
    with pool.transaction():
        baseline["_revision"] = repository.load()["_revision"]
        repository.save(baseline)


def test_failed_membership_rolls_back_team_receipt_profile_and_cache(team_db, monkeypatch):
    pool, players, _, (a, b, _), teams = team_db
    created = gateway.create_team(gateway.TeamCreateRequest(
        player_id=a, name="Atomic circuit", request_id=uuid4().hex,
    ))
    team_id = created["team_id"]
    gateway.join_team(team_id, gateway.TeamJoinRequest(player_id=b, request_id=uuid4().hex))
    operation_id = uuid4().hex
    request = gateway.TeamApplicationActionRequest(
        player_id=a, applicant_id=b, accept=True, request_id=operation_id,
    )
    before = players.load(b).to_dict()
    save = gateway.persist_player_data

    def fail_after_save(player_id):
        save(player_id)
        if player_id == b:
            raise RuntimeError("injected after profile write")

    with monkeypatch.context() as patch:
        patch.setattr(gateway, "persist_player_data", fail_after_save)
        with pytest.raises(RuntimeError, match="injected"):
            gateway.review_team_application(team_id, request)
    assert players.load(b).to_dict() == before
    assert gateway.player_profile_service.get_or_create(b).team_id is None
    assert b not in teams.get_team(team_id)["member_ids"]
    assert operation_id not in teams.repository.load()["receipts"]
    gateway.review_team_application(team_id, request)
    assert teams.team_for_player(b)["team_id"] == team_id
    assert players.load(b).profile["team_id"] == team_id


def test_old_team_receipts_do_not_restore_later_membership(team_db):
    _, players, _, (a, b, c), teams = team_db
    create_request = gateway.TeamCreateRequest(player_id=a, name="First circuit", request_id=uuid4().hex)
    first = gateway.create_team(create_request)["team_id"]
    gateway.join_team(first, gateway.TeamJoinRequest(player_id=b, request_id=uuid4().hex))
    accept_request = gateway.TeamApplicationActionRequest(
        player_id=a, applicant_id=b, accept=True, request_id=uuid4().hex,
    )
    gateway.review_team_application(first, accept_request)
    leave_request = gateway.TeamActionRequest(player_id=b, request_id=uuid4().hex)
    gateway.leave_team(first, leave_request)
    second = gateway.create_team(gateway.TeamCreateRequest(
        player_id=c, name="Second circuit", request_id=uuid4().hex,
    ))["team_id"]
    gateway.join_team(second, gateway.TeamJoinRequest(player_id=b, request_id=uuid4().hex))
    gateway.review_team_application(second, gateway.TeamApplicationActionRequest(
        player_id=c, applicant_id=b, accept=True, request_id=uuid4().hex,
    ))
    assert gateway.review_team_application(first, accept_request)["replayed"] is True
    assert gateway.leave_team(first, leave_request)["replayed"] is True
    assert teams.team_for_player(b)["team_id"] == second
    assert players.load(b).profile["team_id"] == second
    gateway.leave_team(first, gateway.TeamActionRequest(player_id=a, request_id=uuid4().hex))
    assert gateway.create_team(create_request)["replayed"] is True
    assert teams.team_for_player(a) is None
    assert gateway.player_profile_service.get_or_create(a).team_id is None


def test_parallel_cache_mutations_refresh_canonical_state_and_rollback(team_db):
    _, players, _, (a, _, _), _ = team_db
    start = Barrier(2)

    @gateway.persistent_operation
    def credit(player_id, amount, fail=False):
        profile = gateway.player_profile_service.get_or_create(player_id)
        profile.circuit_credits += amount
        gateway.persist_player_data(player_id)
        if fail:
            raise RuntimeError("injected")
        return profile.circuit_credits

    def parallel(amount):
        start.wait(timeout=5)
        return credit(a, amount)

    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(parallel, amount) for amount in (7, 11)]
        for future in futures:
            future.result(timeout=15)
    assert players.load(a).profile["meta_progression_state"]["circuit_credits"] == 339
    with pytest.raises(RuntimeError, match="injected"):
        credit(a, 1000, fail=True)
    assert gateway.player_profile_service.get_or_create(a).circuit_credits == 339
    assert credit(a, 1) == 340


def test_failed_settings_opt_out_rolls_back_settings_and_cache(team_db, monkeypatch):
    _, players, _, (a, _, _), _ = team_db
    from app.product_analytics import ProductAnalyticsStorageError
    before = players.load(a).to_dict()

    def fail(_player_id):
        raise ProductAnalyticsStorageError("injected erase failure")

    monkeypatch.setattr(gateway.product_analytics_service, "erase_player", fail)
    with pytest.raises(gateway.HTTPException) as rejected:
        gateway.update_player_settings(a, gateway.PlayerSettingsRequest(
            music_volume=20, analytics_consent=False,
        ))
    assert rejected.value.status_code == 503
    assert players.load(a).to_dict() == before
    assert gateway.player_settings_service.get_or_create(a).music_volume == before["settings"]["music_volume"]
