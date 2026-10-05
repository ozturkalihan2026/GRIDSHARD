import json
from urllib.error import HTTPError
from urllib.parse import parse_qs

import pytest
from fastapi.testclient import TestClient

from app.native_oauth import pkce_challenge
from app.platform_services import PlatformService, PlatformServiceError

VERIFIER = "a" * 64
CLIENT = "123456789-testclient.apps.googleusercontent.com"


class Response:
    def __init__(self, value): self.value = value
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self): return json.dumps(self.value).encode()


@pytest.fixture
def games(tmp_path, monkeypatch):
    monkeypatch.setenv("GRIDSHARD_PLAY_GAMES_ID", "123456789")
    monkeypatch.setenv("GRIDSHARD_PLAY_GAMES_SERVER_CLIENT_ID", CLIENT)
    monkeypatch.setenv("GRIDSHARD_PLAY_GAMES_CLIENT_SECRET", "fixture-confidential-secret")
    monkeypatch.delenv("GRIDSHARD_PLAY_GAMES_CLIENT_SECRET_FILE", raising=False)
    now = [1000]
    service = PlatformService(tmp_path / "platform.json", now_func=lambda: now[0])
    requests = []
    subject = ["g-verified-player"]
    def http(request, timeout):
        requests.append(request)
        if request.full_url == "https://oauth2.googleapis.com/token":
            params = parse_qs(request.data.decode(), keep_blank_values=True)
            assert params["client_id"] == [CLIENT]
            assert params["client_secret"] == ["fixture-confidential-secret"]
            assert params["redirect_uri"] == [""]
            return Response({"access_token":"fixture-access-token", "refresh_token":"must-not-persist"})
        assert request.full_url == "https://games.googleapis.com/games/v1/applications/123456789/verify"
        assert request.headers["Authorization"] == "Bearer fixture-access-token"
        return Response({"player_id":subject[0]})
    service.http_open = http
    return service, now, requests, subject


def complete(service, player="guest", mode="link"):
    start = service.start_play_games(player, mode, pkce_challenge(VERIFIER))
    return service.complete_play_games(player, start["state"], "fixture-code", VERIFIER)


def test_server_identity_no_email_no_secrets_and_one_use_proof(games):
    service, _, calls, _ = games
    start = service.start_play_games("guest", "link", pkce_challenge(VERIFIER))
    with pytest.raises(PlatformServiceError): service.complete_play_games("guest", start["state"], "fixture-code", "b"*64)
    assert calls == []
    result = service.complete_play_games("guest", start["state"], "fixture-code", VERIFIER)
    assert len(calls) == 2
    with pytest.raises(PlatformServiceError): service.complete_play_games("guest", start["state"], "fixture-code", VERIFIER)
    with pytest.raises(PlatformServiceError): service.consume_oauth_exchange(result["exchange"], code_verifier="b"*64)
    assert service.consume_oauth_exchange(result["exchange"], code_verifier=VERIFIER)["player_id"] == "guest"
    with pytest.raises(PlatformServiceError): service.consume_oauth_exchange(result["exchange"], code_verifier=VERIFIER)
    saved = service.path.read_text()
    for forbidden in ["fixture-code", "fixture-access-token", "must-not-persist", "fixture-confidential-secret", VERIFIER]:
        assert forbidden not in saved
    view = service.account_view("guest")
    assert view["oauth"]["google_play_games"] == {"linked":True, "configured":True}
    assert view["contacts"] == {}


def test_login_restores_owner_link_cannot_steal_and_link_cannot_be_replaced(games):
    service, _, _, subject = games
    complete(service, "original")
    with pytest.raises(PlatformServiceError): complete(service, "another", "link")
    result = complete(service, "another", "login")
    assert service.consume_oauth_exchange(result["exchange"], code_verifier=VERIFIER)["player_id"] == "original"
    subject[0] = "different-pgs-account"
    with pytest.raises(PlatformServiceError): complete(service, "original", "login")
    assert service._read()["accounts"]["original"]["oauth_links"]["google_play_games"]["subject"] == "g-verified-player"


def test_existing_persistent_identity_never_silently_switches(games):
    service, _, _, _ = games
    complete(service, "original")
    with service._lock:
        data = service._read()
        service._account(data, "email-owner")["contacts"]["email"] = {"value":"fixture@example.test", "verified_at":1000}
        service._write(data)
    with pytest.raises(PlatformServiceError): complete(service, "email-owner", "login")
    assert not service._read()["accounts"]["email-owner"]["oauth_links"]


def test_expiry_foreign_state_and_upstream_error_fail_closed(games):
    service, now, calls, _ = games
    start = service.start_play_games("guest", "login", pkce_challenge(VERIFIER))
    with pytest.raises(PlatformServiceError): service.complete_play_games("other", start["state"], "fixture", VERIFIER)
    now[0] += 601
    with pytest.raises(PlatformServiceError): service.complete_play_games("guest", start["state"], "fixture", VERIFIER)
    assert calls == []
    def rejected(request, timeout): raise HTTPError(request.full_url, 400, "secret-response", {}, None)
    service.http_open = rejected
    start = service.start_play_games("guest", "login", pkce_challenge(VERIFIER))
    with pytest.raises(PlatformServiceError, match="tamamlanamadı") as error:
        service.complete_play_games("guest", start["state"], "bad-code", VERIFIER)
    assert "secret-response" not in str(error.value)
    with pytest.raises(PlatformServiceError): service.complete_play_games("guest", start["state"], "bad-code", VERIFIER)


@pytest.mark.parametrize("subject", [None, "", {}, "x/y", 123])
def test_bad_verified_identity_cannot_link(games, subject):
    service, _, _, identity = games
    identity[0] = subject
    with pytest.raises(PlatformServiceError): complete(service)
    assert not service._read()["accounts"]["guest"]["oauth_links"]


def test_secret_file_and_unconfigured_status(games, tmp_path, monkeypatch):
    service, _, _, _ = games
    monkeypatch.delenv("GRIDSHARD_PLAY_GAMES_CLIENT_SECRET")
    assert service.oauth_status()["google_play_games"] == {"configured":False}
    assert service.start_play_games("guest", "link", pkce_challenge(VERIFIER)) == {"configured":False}
    file = tmp_path / "external-secret"
    file.write_text("fixture-file-secret")
    monkeypatch.setenv("GRIDSHARD_PLAY_GAMES_CLIENT_SECRET_FILE", str(file))
    assert service.oauth_status()["google_play_games"] == {"configured":True}
    monkeypatch.setenv("GRIDSHARD_PLAY_GAMES_CLIENT_SECRET", "conflicting")
    with pytest.raises(PlatformServiceError): service.oauth_status()


def test_http_requires_current_owner_and_rejects_client_identity(games, monkeypatch):
    from app import main
    service, _, _, _ = games
    monkeypatch.setattr(main, "platform_service", service)
    monkeypatch.setenv("GRIDSHARD_AUTH_REQUIRED", "1")
    client = TestClient(main.app)
    path = "/accounts/play-games-http-fixture/play-games"
    payload = {"mode":"link", "code_challenge":pkce_challenge(VERIFIER)}
    assert client.post(path+"/start", json=payload).status_code == 401
    session = client.post("/auth/session", json={"player_id":"play-games-http-fixture", "device_secret":"d"*64}).json()
    headers = {"authorization": f"Bearer {session['access_token']}"}
    assert client.post("/accounts/other/play-games/start", json=payload, headers=headers).status_code == 403
    response = client.post(path+"/start", json=payload, headers=headers)
    assert response.headers["cache-control"] == "no-store"
    body = {"state":response.json()["state"], "code":"fixture", "code_verifier":VERIFIER}
    assert client.post(path+"/complete", json={**body,"player_id":"victim"}, headers=headers).status_code == 403
    assert client.post(path+"/complete", json={**body,"player_id":"play-games-http-fixture"}, headers=headers).status_code == 422
    result = client.post(path+"/complete", json=body, headers=headers)
    assert result.status_code == 200 and result.headers["cache-control"] == "no-store"
    login = client.post("/auth/provider-session", json={"exchange":result.json()["exchange"], "code_verifier":VERIFIER,
        "device_secret":"e"*64, "device_id":"games-fixture-device", "platform":"android"})
    assert login.status_code == 200 and login.json()["player_id"] == "play-games-http-fixture"


def recovery_start(service, player="original"):
    return service.start_play_games_recovery(player, pkce_challenge(VERIFIER))


def test_recovery_restores_only_proven_existing_owner_without_new_accounts(games):
    service, _, _, _ = games
    complete(service, "original")
    before = service._read()["accounts"]
    started = recovery_start(service)
    result = service.complete_play_games_recovery(started["state"], "fixture", VERIFIER)
    assert service._read()["accounts"] == before
    with pytest.raises(PlatformServiceError):
        service.consume_oauth_exchange(result["exchange"], code_verifier="b" * 64)
    proof = service.consume_oauth_exchange(result["exchange"], code_verifier=VERIFIER)
    assert proof == {"player_id":"original", "provider":"google_play_games", "recovery":True}
    with pytest.raises(PlatformServiceError):
        service.consume_oauth_exchange(result["exchange"], code_verifier=VERIFIER)
    with pytest.raises(PlatformServiceError):
        service.complete_play_games_recovery(started["state"], "fixture", VERIFIER)


@pytest.mark.parametrize("case", ["unknown", "wrong-owner", "wrong-google", "duplicate-owner", "deleted"])
def test_recovery_never_claims_switches_or_recreates_an_account(games, case):
    service, _, _, subject = games
    complete(service, "original")
    player = "unknown" if case == "unknown" else "original"
    if case == "wrong-owner":
        complete(service, "second", "login")
        player = "second"
    if case == "duplicate-owner":
        with service._lock:
            data = service._read()
            service._account(data, "duplicate")["oauth_links"]["google_play_games"] = {"subject":subject[0]}
            service._write(data)
    started = recovery_start(service, player)
    if case == "wrong-google": subject[0] = "different-google"
    if case == "deleted": service.erase("original")
    before = service._read()["accounts"]
    with pytest.raises(PlatformServiceError):
        service.complete_play_games_recovery(started["state"], "fixture", VERIFIER)
    assert service._read()["accounts"] == before


def test_recovery_pkce_expiry_and_quota_fail_closed(games):
    service, now, calls, _ = games
    started = recovery_start(service)
    assert service._read()["accounts"] == {}
    with pytest.raises(PlatformServiceError):
        service.complete_play_games_recovery(started["state"], "fixture", "b" * 64)
    assert calls == []
    now[0] += 601
    with pytest.raises(PlatformServiceError):
        service.complete_play_games_recovery(started["state"], "fixture", VERIFIER)
    assert calls == []
    for _ in range(100): recovery_start(service)
    with pytest.raises(PlatformServiceError): recovery_start(service)
    now[0] += 601
    assert recovery_start(service)["configured"] is True
    assert len(service._read()["play_games_recovery_states"]) == 1


def test_recovery_upstream_failure_consumes_state_and_preserves_accounts(games):
    service, _, _, _ = games
    complete(service, "original")
    started = recovery_start(service)
    before = service._read()["accounts"]
    def rejected(request, timeout): raise HTTPError(request.full_url, 400, "secret-response", {}, None)
    service.http_open = rejected
    with pytest.raises(PlatformServiceError):
        service.complete_play_games_recovery(started["state"], "bad-code", VERIFIER)
    with pytest.raises(PlatformServiceError):
        service.complete_play_games_recovery(started["state"], "bad-code", VERIFIER)
    assert service._read()["accounts"] == before


def test_revoked_device_recovery_http_keeps_auth_guards_and_reauthorizes_only_after_proof(games, monkeypatch, tmp_path):
    from app import main
    from app.auth import ParticipantAuthService, JsonIdentityRepository
    service, _, _, _ = games
    complete(service, "original")
    auth = ParticipantAuthService(JsonIdentityRepository(tmp_path / "identities.json"), b"k" * 32)
    monkeypatch.setattr(main, "platform_service", service)
    monkeypatch.setattr(main, "participant_auth_service", auth)
    monkeypatch.setenv("GRIDSHARD_AUTH_REQUIRED", "1")
    client = TestClient(main.app)
    device = {"player_id":"original", "device_secret":"s" * 64, "device_id":"own-phone"}
    session = client.post("/auth/session", json=device).json()
    headers = {"authorization":f"Bearer {session['access_token']}"}
    assert client.request("DELETE", "/accounts/original/devices/own-phone", json={"player_id":"original"}, headers=headers).status_code == 200
    assert client.post("/auth/session", json=device).status_code == 401
    assert client.get("/accounts/original", headers=headers).status_code == 401
    start = client.post("/auth/play-games/recovery/start", json={"expected_player_id":"original", "code_challenge":pkce_challenge(VERIFIER)})
    assert start.status_code == 200 and start.headers["cache-control"] == "no-store"
    completion = {"state":start.json()["state"], "code":"fixture", "code_verifier":VERIFIER}
    assert client.post("/auth/play-games/recovery/complete", json={**completion, "player_id":"victim"}).status_code == 422
    result = client.post("/auth/play-games/recovery/complete", json=completion)
    assert result.status_code == 200 and result.headers["cache-control"] == "no-store"
    assert client.post("/auth/session", json=device).status_code == 401, "Proof alone has not yet registered a device"
    payload = {"exchange":result.json()["exchange"], "code_verifier":VERIFIER,
               "device_secret":device["device_secret"], "device_id":device["device_id"], "platform":"android"}
    restored = client.post("/auth/provider-session", json=payload)
    assert restored.status_code == 200 and restored.json()["player_id"] == "original"
    assert client.post("/auth/session", json=device).status_code == 200
    assert client.get("/accounts/original", headers=headers).status_code == 401, "Old revoked token remains revoked"
    assert client.post("/auth/provider-session", json=payload).status_code == 422
    assert set(service._read()["accounts"]) == {"original"}
    for path in ("/auth/play-games/recovery/start", "/auth/play-games/recovery/complete"):
        assert main._rate_limit_policy(path) == ("auth", 10, 60)


def test_recovery_exchange_cannot_recreate_missing_identity(games, monkeypatch, tmp_path):
    from app import main
    from app.auth import ParticipantAuthService, JsonIdentityRepository
    service, _, _, _ = games
    complete(service, "original")
    started = recovery_start(service)
    result = service.complete_play_games_recovery(started["state"], "fixture", VERIFIER)
    auth = ParticipantAuthService(JsonIdentityRepository(tmp_path / "identities.json"), b"k" * 32)
    monkeypatch.setattr(main, "platform_service", service)
    monkeypatch.setattr(main, "participant_auth_service", auth)
    response = TestClient(main.app).post("/auth/provider-session", json={"exchange":result["exchange"],
        "code_verifier":VERIFIER, "device_secret":"s" * 64, "device_id":"own-phone", "platform":"android"})
    assert response.status_code == 422
    assert auth.repository.get("original") is None


def test_recovery_exchange_cannot_recreate_missing_production_profile(games, monkeypatch, tmp_path):
    from app import main
    from app.auth import ParticipantAuthService, JsonIdentityRepository
    from types import SimpleNamespace
    from fastapi import HTTPException
    service, _, _, _ = games
    complete(service, "original")
    started = recovery_start(service)
    proof = service.complete_play_games_recovery(started["state"], "fixture", VERIFIER)
    auth = ParticipantAuthService(JsonIdentityRepository(tmp_path / "identities.json"), b"k" * 32)
    auth.register_or_login("original", "s" * 64, device_id="own-phone")
    auth.revoke_device("original", "own-phone")
    before = auth.repository.get("original")
    monkeypatch.setattr(main, "platform_service", service)
    monkeypatch.setattr(main, "participant_auth_service", auth)
    monkeypatch.setattr(main, "RUNTIME_STRICT", True)
    monkeypatch.setattr(main, "player_data_repository", SimpleNamespace(load=lambda _player:None))
    request = main.ProviderSessionRequest(exchange=proof["exchange"], code_verifier=VERIFIER,
        device_secret="s" * 64, device_id="own-phone", platform="android")
    # Exercise the production profile guard directly, without a production DB/worker.
    with pytest.raises(HTTPException) as error:
        main.create_provider_auth_session.__wrapped__(request)
    assert error.value.status_code == 422
    assert auth.repository.get("original") == before


def test_recovery_start_is_non_enumerating_and_rejects_malformed_claims(games, monkeypatch):
    from app import main
    service, _, _, _ = games
    complete(service, "original")
    monkeypatch.setattr(main, "platform_service", service)
    client = TestClient(main.app)
    results = []
    for player in ("original", "nonexistent"):
        response = client.post("/auth/play-games/recovery/start", json={
            "expected_player_id":player, "code_challenge":pkce_challenge(VERIFIER)})
        assert response.status_code == 200
        results.append({key:value for key, value in response.json().items() if key != "state"})
    assert results[0] == results[1]
    for claim in ({"expected_player_id":"a/b", "code_challenge":pkce_challenge(VERIFIER)},
                  {"expected_player_id":"original", "code_challenge":"a" * 42},
                  {"expected_player_id":"original", "code_challenge":"+" * 43},
                  {"expected_player_id":"original", "code_challenge":pkce_challenge(VERIFIER), "player_id":"victim"}):
        assert client.post("/auth/play-games/recovery/start", json=claim).status_code == 422
    assert set(service._read()["accounts"]) == {"original"}


def test_erasure_removes_pending_recovery_states_and_exchanges(games):
    service, _, _, _ = games
    complete(service, "original")
    first, second = recovery_start(service), recovery_start(service)
    proof = service.complete_play_games_recovery(first["state"], "fixture", VERIFIER)
    service.erase("original")
    with pytest.raises(PlatformServiceError):
        service.complete_play_games_recovery(second["state"], "fixture", VERIFIER)
    with pytest.raises(PlatformServiceError):
        service.consume_oauth_exchange(proof["exchange"], code_verifier=VERIFIER)
    assert service._read()["accounts"] == {}
    assert service._read()["play_games_recovery_states"] == {}
