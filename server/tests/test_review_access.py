"""Isolated local tests: no production files, accounts, API calls or payments."""
from copy import deepcopy
from dataclasses import replace
from datetime import datetime, timedelta, timezone
import json

from fastapi.testclient import TestClient
import pytest

from app import main as gateway
from app.auth import AuthenticationError, JsonIdentityRepository, ParticipantAuthService
from app.platform_services import PlatformService
from app.player_profile import PlayerProfileService, SEASON_PREMIUM_REWARD_TRACK
from app.review_access import (MARKER_KEY, ReviewAccessService, ReviewLoginRequest,
                              load_review_config, new_review_config, parse_review_config)


@pytest.fixture
def review(tmp_path, monkeypatch):
    raw, password = new_review_config()
    config = parse_review_config(raw)
    now = [datetime(2026, 10, 5, tzinfo=timezone.utc)]
    auth = ParticipantAuthService(JsonIdentityRepository(tmp_path / "identities.json"), b"a" * 48)
    profiles = PlayerProfileService(now_func=lambda: now[0])
    platform = PlatformService(tmp_path / "platform.json")
    persisted = {}
    service = ReviewAccessService(config, auth, platform, profiles,
        profile_exists=lambda player_id: player_id in persisted or player_id in profiles._profiles,
        persist=lambda player_id: persisted.update({player_id: deepcopy(profiles.get(player_id))}),
        operation=gateway._review_account_operation)
    monkeypatch.setattr(gateway, "review_access_service", service)
    monkeypatch.setattr(gateway, "participant_auth_service", auth)
    monkeypatch.setattr(gateway, "platform_service", platform)
    monkeypatch.setenv("GRIDSHARD_AUTH_REQUIRED", "1")
    request = ReviewLoginRequest(username=config.username, password=password,
                                 device_secret="s" * 64, device_id="fixture-device")
    return service, request, persisted, now


def headers(result):
    return {"authorization": f"Bearer {result['access_token']}"}


def test_private_configuration_is_strict_and_disabled_by_default(tmp_path):
    assert load_review_config({}) is None
    raw, password = new_review_config()
    assert password not in json.dumps(raw)
    config = parse_review_config(raw)
    assert config.verify(config.username, password)
    assert not config.verify("unlisted-user", password)
    assert not config.verify("ğ", password)
    for mutation in ({"password": password}, {"player_id": "existing-player"}, {"schema_version": 2}):
        with pytest.raises(ValueError):
            parse_review_config({**raw, **mutation})
    path = tmp_path / "config.json"
    path.write_text(json.dumps(raw), encoding="utf-8")
    assert load_review_config({"GRIDSHARD_PLAY_REVIEW_CONFIG_FILE": str(path)}) == config
    for invalid in ("relative.json", str(tmp_path / "missing.json")):
        with pytest.raises(RuntimeError, match="unreadable or invalid"):
            load_review_config({"GRIDSHARD_PLAY_REVIEW_CONFIG_FILE": invalid})


def test_reusable_credentials_grant_only_dedicated_profile_and_real_device_auth(review):
    service, request, persisted, _ = review
    ordinary = service.auth.register_or_login("existing-player", "o" * 64, "owner-device")
    profile = service.profiles.get_or_create("existing-player")
    profile.display_name = "28Mehmethan"
    original_profile = deepcopy(profile)
    original_identity = deepcopy(service.auth.repository.get("existing-player"))
    results = [service.login(request), service.login(request.model_copy(update={"device_id": "second-device"}))]
    for result in results:
        assert result["review_access"] is True
        assert result["player_id"] == service.config.player_id
        service.assert_identity_allowed(service.auth.verify_access_token(result["access_token"]))
    demo = persisted[service.config.player_id]
    assert demo.premium_pass_active() and demo.battle_premium_active()
    assert demo.season_xp >= max(item["required_xp"] for item in SEASON_PREMIUM_REWARD_TRACK)
    assert (demo.flux_shards, demo.circuit_credits, demo.rating) == (1050, 9000, 0)
    assert profile == original_profile
    assert service.auth.repository.get("existing-player") == original_identity
    assert "existing-player" not in persisted
    service.assert_identity_allowed(service.auth.verify_access_token(ordinary["access_token"]))
    stored = json.dumps(service.auth.repository.get(service.config.player_id))
    assert request.password not in stored and request.device_secret not in stored


@pytest.mark.parametrize("collision", ["identity", "profile", "foreign_marker"])
def test_existing_or_foreign_account_is_never_promoted(review, collision):
    service, request, persisted, _ = review
    player_id = service.config.player_id
    if collision != "profile":
        service.auth.register_or_login(player_id, "old" * 32, "original-device")
        if collision == "foreign_marker":
            record = service.auth.repository.get(player_id)
            record["devices"][MARKER_KEY] = {"owner_id": "b" * 64}
            service.auth.repository.update(player_id, record)
    service.profiles.get_or_create(player_id)
    before_identity = deepcopy(service.auth.repository.get(player_id))
    before_profile = deepcopy(service.profiles.get(player_id))
    with pytest.raises(AuthenticationError):
        service.login(request)
    assert service.auth.repository.get(player_id) == before_identity
    assert service.profiles.get(player_id) == before_profile
    assert not persisted


def test_invalid_credentials_and_reserved_device_make_no_accounts(review):
    service, request, persisted, _ = review
    for change in ({"password": "wrong"}, {"username": "wrong"}, {"password": "\ud800"},
                   {"device_id": MARKER_KEY}, {"device_id": "__schema__"}, {"device_id": " whitespace "}):
        with pytest.raises(AuthenticationError):
            service.login(request.model_copy(update=change))
    assert not persisted and not service.profiles._profiles
    assert service.auth.repository.get(service.config.player_id) is None


def test_season_rollover_reopens_premium_without_expiring_the_password(review):
    service, request, persisted, now = review
    result = service.login(request)
    old_season = persisted[result["player_id"]].active_meta_season_id
    now[0] += timedelta(days=60)
    service.assert_device_allowed(result["player_id"], request.device_id)
    refreshed = service.auth.register_or_login(result["player_id"], request.device_secret, request.device_id)
    service.record_session(result["player_id"], request.device_id, refreshed)
    demo = persisted[result["player_id"]]
    assert demo.active_meta_season_id != old_season
    assert demo.premium_pass_active() and demo.battle_premium_active()
    assert service.login(request)["player_id"] == result["player_id"]


def test_disabling_or_rotating_invalidates_tokens_and_saved_devices(review):
    service, request, _, _ = review
    result = service.login(request)
    identity = service.auth.verify_access_token(result["access_token"])
    config = service.config
    service.config = None
    for action in (lambda: service.assert_identity_allowed(identity),
                   lambda: service.assert_device_allowed(identity.player_id, request.device_id), lambda: service.login(request)):
        with pytest.raises(AuthenticationError): action()
    service.config = replace(config, salt="b" * 64, verifier="c" * 64)
    with pytest.raises(AuthenticationError): service.assert_identity_allowed(identity)
    with pytest.raises(AuthenticationError): service.assert_device_allowed(identity.player_id, request.device_id)
    service.config = config
    with pytest.raises(AuthenticationError): service.assert_external_login_allowed(identity.player_id)
    with pytest.raises(AuthenticationError): service.auth.reset_device_secret(identity.player_id, "new" * 32, "new-device")
    assert MARKER_KEY in service.auth.repository.get(identity.player_id)["devices"]


def test_gateway_rejects_scope_forgery_and_validation_does_not_echo_secrets(review):
    service, request, _, _ = review
    client = TestClient(gateway.app)
    response = client.post("/auth/review-session", json={**request.model_dump(), "player_id": "existing-player", "premium": True})
    assert response.status_code == 422
    assert request.password not in response.text and request.device_secret not in response.text
    response = client.post("/auth/review-session", json={**request.model_dump(), "password": "x" * 101})
    assert response.status_code == 422 and "x" * 101 not in response.text
    assert client.post("/auth/review-session", content=b"{" * 4097).status_code == 413
    assert service.auth.repository.get(service.config.player_id) is None


def test_gateway_normal_security_demo_disable_refresh_and_owner_return(review):
    service, request, _, _ = review
    client = TestClient(gateway.app)
    original = client.post("/auth/session", json={"player_id": "ordinary-owner", "device_secret": "o" * 64, "device_id": "owner"}).json()
    demo_response = client.post("/auth/review-session", json=request.model_dump())
    assert demo_response.status_code == 200 and demo_response.headers["cache-control"] == "no-store"
    demo = demo_response.json()
    assert client.get("/accounts/ordinary-owner", headers=headers(demo)).status_code == 403
    assert client.get(f"/accounts/{demo['player_id']}", headers=headers(demo)).status_code == 200
    assert client.post(f"/accounts/{demo['player_id']}/play-games/start", headers=headers(demo), json={"mode": "link"}).status_code == 401
    assert client.get("/accounts/ordinary-owner").status_code == 401
    refresh = {"player_id": demo["player_id"], "device_secret": request.device_secret, "device_id": request.device_id}
    assert client.post("/auth/session", json=refresh).status_code == 200
    assert client.post("/auth/session", json={**refresh, "device_secret": "wrong" * 10}).status_code == 401
    service.config = None
    assert client.post("/auth/review-session", json=request.model_dump()).status_code == 404
    assert client.get(f"/accounts/{demo['player_id']}", headers=headers(demo)).status_code == 401
    assert client.post("/auth/session", json=refresh).status_code == 401
    assert client.get("/accounts/ordinary-owner", headers=headers(original)).status_code == 200
    assert client.post("/auth/session", json={"player_id": "missing-original", "device_secret": "o" * 64, "existing_only": True}).status_code == 401
    assert service.auth.repository.get("missing-original") is None


def test_rate_limit_is_bounded_and_cannot_be_bypassed_by_bearer_headers(review):
    service, request, _, _ = review
    client = TestClient(gateway.app)
    for i in range(5):
        assert client.post("/auth/review-session", json={}, headers={"Authorization": f"Bearer changing-{i}"}).status_code == 422
    assert client.post("/auth/review-session", json=request.model_dump(), headers={"Authorization": "Bearer another"}).status_code == 429
    service._attempts.clear()
    for i in range(40): assert service.allow_attempt(str(i))
    assert not service.allow_attempt("another-ip")
    service.now = lambda: service._attempts[-1][0] + 61
    assert service.allow_attempt("another-ip")


def test_reserved_marker_cannot_be_replaced_through_normal_device_registration(review):
    service, request, _, _ = review
    service.login(request)
    before = service.auth.repository.get(service.config.player_id)
    for method in (service.auth.authorize_device, service.auth.register_or_login, service.auth.reset_device_secret):
        with pytest.raises(AuthenticationError): method(service.config.player_id, "malicious" * 8, MARKER_KEY)
    with pytest.raises(AuthenticationError): service.auth.revoke_device(service.config.player_id, MARKER_KEY)
    assert service.auth.repository.get(service.config.player_id) == before
    # Synthetic fixture boundary: count the marker separately from 128 devices.
    bounded = deepcopy(before)
    for index in range(127):
        bounded["devices"][f"fixture-other-{index}"] = deepcopy(bounded["devices"][request.device_id])
    service.auth.repository.update(service.config.player_id, bounded)
    with pytest.raises(AuthenticationError):
        service.login(request.model_copy(update={"device_id":"over-limit-device"}))
    assert service.auth.repository.get(service.config.player_id) == bounded
    service.login(request)  # Already enrolled device still works at the boundary.


def test_new_password_rotation_requires_fresh_proof_and_preserves_profile(review):
    service, request, persisted, _ = review
    old = service.login(request)
    old_identity = service.auth.verify_access_token(old["access_token"])
    old_profile = deepcopy(persisted[old["player_id"]])
    raw, password = new_review_config()
    service.config = replace(service.config, salt=raw["salt"], verifier=raw["verifier"])
    with pytest.raises(AuthenticationError): service.login(request)
    new_request = request.model_copy(update={"password": password, "device_id": "rotated-device"})
    new = service.login(new_request)
    assert new["player_id"] == old["player_id"]
    assert persisted[new["player_id"]] == old_profile
    with pytest.raises(AuthenticationError): service.assert_identity_allowed(old_identity)
    with pytest.raises(AuthenticationError): service.assert_device_allowed(old["player_id"], request.device_id)
    service.assert_identity_allowed(service.auth.verify_access_token(new["access_token"]))
    assert service.assert_device_allowed(new["player_id"], new_request.device_id)


def test_config_collision_does_not_disable_an_existing_unmarked_players_login(review):
    service, request, persisted, _ = review
    player_id = service.config.player_id
    owner = service.auth.register_or_login(player_id, "owner" * 16, "owner-device")
    profile = deepcopy(service.profiles.get_or_create(player_id))
    with pytest.raises(AuthenticationError): service.login(request)
    service.assert_identity_allowed(service.auth.verify_access_token(owner["access_token"]))
    service.assert_device_allowed(player_id, "owner-device")
    service.assert_external_login_allowed(player_id)
    client = TestClient(gateway.app)
    assert client.get(f"/accounts/{player_id}", headers=headers(owner)).status_code == 200
    assert client.post("/auth/session", json={"player_id":player_id, "device_secret":"owner" * 16, "device_id":"owner-device"}).status_code == 200
    assert service.profiles.get(player_id) == profile and not persisted
    assert MARKER_KEY not in service.auth.repository.get(player_id)["devices"]


def test_json_cold_restart_preserves_demo_progress_instead_of_overwriting_it(review, monkeypatch, tmp_path):
    from app.player_data_store import JsonFilePlayerDataRepository, PlayerDataStoreService
    from app.player_settings import PlayerSettingsService
    from app.player_statistics import PlayerStatisticsService
    service, request, _, _ = review
    repository = JsonFilePlayerDataRepository(tmp_path / "players.json")
    store = PlayerDataStoreService(repository=repository, profile_service=service.profiles,
                                   settings_service=PlayerSettingsService(), statistics_service=PlayerStatisticsService())
    monkeypatch.setattr(gateway, "player_profile_service", service.profiles)
    monkeypatch.setattr(gateway, "player_data_repository", repository)
    monkeypatch.setattr(gateway, "player_data_store_service", store)
    service.persist = gateway.persist_player_data
    service.profile_exists = lambda player_id: repository.load(player_id) is not None
    result = service.login(request)
    profile = service.profiles.get(result["player_id"])
    profile.claimed_premium_season_tiers = (1,)
    profile.display_name = "Review Saved Name"
    profile.rating = 123
    gateway.persist_player_data(profile.player_id)
    service.profiles._profiles.clear()
    restarted = ReviewAccessService(service.config, service.auth, service.platform, service.profiles,
                                    service.profile_exists, service.persist, gateway._review_account_operation)
    restarted.login(request)
    restored = service.profiles.get(result["player_id"])
    assert restored.claimed_premium_season_tiers == (1,)
    assert restored.display_name == "Review Saved Name"
    assert restored.rating == 123
    assert restored.premium_pass_active() and restored.battle_premium_active()
