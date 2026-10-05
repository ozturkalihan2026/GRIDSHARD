"""Opt-in real PostgreSQL tests, using the guarded local gridshard_test DB only."""
import pytest

from app import main as gateway
from app.review_access import MARKER_KEY, ReviewAccessService, ReviewLoginRequest, new_review_config, parse_review_config
from test_postgres_social_api import social_db, erasure_db  # noqa: F401


@pytest.mark.parametrize("inject_failure", [False, True])
def test_review_identity_profile_and_device_commit_or_rollback_together(erasure_db, monkeypatch, inject_failure):
    (pool, players, platform, (owner, _, _)), identities, _, _ = erasure_db
    raw, password = new_review_config()
    config = parse_review_config(raw)
    before = players.load(owner)
    service = ReviewAccessService(config, gateway.participant_auth_service, platform, gateway.player_profile_service,
        profile_exists=lambda player_id: players.load(player_id) is not None,
        persist=gateway.persist_player_data, operation=gateway._review_account_operation)
    monkeypatch.setattr(gateway, "review_access_service", service)
    request = ReviewLoginRequest(username=config.username, password=password, device_secret="s" * 64, device_id="fixture-review-device")
    register = platform.register_device
    try:
        if inject_failure:
            def fail_after_register(*args, **kwargs):
                register(*args, **kwargs)
                raise RuntimeError("injected demo transaction failure")
            with monkeypatch.context() as patch:
                patch.setattr(platform, "register_device", fail_after_register)
                with pytest.raises(RuntimeError, match="demo transaction failure"):
                    service.login(request)
            assert identities.get(config.player_id) is None
            assert players.load(config.player_id) is None
            assert config.player_id not in gateway.player_profile_service._profiles
        else:
            result = service.login(request)
            assert MARKER_KEY in identities.get(config.player_id)["devices"]
            assert players.load(config.player_id) is not None
            service.assert_identity_allowed(service.auth.verify_access_token(result["access_token"]))
            # A new service instance (server restart) recognizes the durable marker.
            restarted = ReviewAccessService(config, service.auth, platform, service.profiles, service.profile_exists,
                                            service.persist, service.operation)
            assert restarted.login(request)["player_id"] == config.player_id
        assert players.load(owner) == before
    finally:
        with pool.transaction() as connection:
            identities.delete(config.player_id)
            connection.execute("DELETE FROM player_data WHERE player_id = %s", (config.player_id,))
            with platform._lock:
                data = platform._read()
                data["accounts"].pop(config.player_id, None)
                platform._write(data)
