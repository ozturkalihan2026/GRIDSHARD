import base64
import json
from urllib.parse import parse_qs, urlsplit

import pytest
from fastapi.testclient import TestClient
from app.platform_services import PlatformService, PlatformServiceError
from app.native_oauth import asset_links, native_return_url, pkce_challenge


VERIFIER = "a" * 64


@pytest.fixture
def configured(tmp_path, monkeypatch):
    monkeypatch.setenv("GRIDSHARD_ANDROID_TEST_AUTH_CERT_SHA256", "a" * 64)
    for provider in ("GOOGLE", "APPLE"):
        monkeypatch.setenv(f"GRIDSHARD_{provider}_OAUTH_CLIENT_ID", "fixture-client")
        monkeypatch.setenv(f"GRIDSHARD_{provider}_OAUTH_CLIENT_SECRET", "fixture-secret")
        monkeypatch.delenv(f"GRIDSHARD_{provider}_OAUTH_CLIENT_SECRET_FILE", raising=False)
        monkeypatch.setenv(f"GRIDSHARD_{provider}_OAUTH_REDIRECT_URI", f"https://play.gridshard.test/oauth/{provider.lower()}/callback")
    now = [1000]
    platform = PlatformService(tmp_path / "platform.json", now_func=lambda: now[0], web_base_url="https://play.gridshard.test")
    class Response:
        def __init__(self, payload): self.payload = payload
        def __enter__(self): return self
        def __exit__(self, *_args): return False
        def read(self): return json.dumps(self.payload).encode()
    platform.http_open = lambda request, timeout: Response(
        {"access_token": "fixture-token"} if request.full_url.endswith("/token") else
        {"sub": "subject-1", "email": "pilot@example.test", "email_verified": True})
    return platform, now, Response


def start(platform, provider="google", **kwargs):
    result = platform.start_oauth("guest", provider, native_target="android-test", code_challenge=pkce_challenge(VERIFIER), **kwargs)
    params = parse_qs(urlsplit(result["authorization_url"]).query)
    return result, params


def test_native_exchange_proof_is_mandatory_not_consumed_by_attack_and_one_use(configured):
    platform, now, _ = configured
    started, params = start(platform)
    context = platform.oauth_return_context("google", params["state"][0])
    assert context == {"native_target": "android-test", "handoff": started["handoff"]}
    result = platform.complete_oauth("google", params["state"][0], "fixture-code")
    exchange = result["exchange"]  # native link also returns a proof-bound exchange
    for wrong in ("", "b" * 64, "a" * 10):
        with pytest.raises(PlatformServiceError, match="cihaz doğrulaması"):
            platform.consume_oauth_exchange(exchange, code_verifier=wrong)
    assert platform.consume_oauth_exchange(exchange, code_verifier=VERIFIER)["player_id"] == "guest"
    with pytest.raises(PlatformServiceError): platform.consume_oauth_exchange(exchange, code_verifier=VERIFIER)
    with pytest.raises(PlatformServiceError): platform.complete_oauth("google", params["state"][0], "fixture-code")


def test_login_selects_existing_provider_owner_but_link_cannot_steal_it(configured):
    platform, _, _ = configured
    original = platform.start_oauth("owner", "google")
    original_state = parse_qs(urlsplit(original["authorization_url"]).query)["state"][0]
    platform.complete_oauth("google", original_state, "first")
    _, params = start(platform)
    with pytest.raises(PlatformServiceError, match="başka bir oyuncuya bağlı"):
        platform.complete_oauth("google", params["state"][0], "link")
    _, params = start(platform, mode="login")
    result = platform.complete_oauth("google", params["state"][0], "login")
    assert platform.consume_oauth_exchange(result["exchange"], code_verifier=VERIFIER)["player_id"] == "owner"


def test_fixed_return_targets_reject_open_redirects_missing_proof_and_unconfigured_cert(configured, monkeypatch):
    platform, _, _ = configured
    for target in ("https://evil.test", "//evil.test", "ios", "android-test?next=evil"):
        with pytest.raises(PlatformServiceError): platform.start_oauth("guest","google",native_target=target,code_challenge=pkce_challenge(VERIFIER))
    with pytest.raises(PlatformServiceError): platform.start_oauth("guest","google",native_target="android-test")
    monkeypatch.delenv("GRIDSHARD_ANDROID_TEST_AUTH_CERT_SHA256")
    with pytest.raises(PlatformServiceError, match="henüz yapılandırılmadı"): start(platform)


def test_expiry_cancel_and_assetlinks_are_fail_closed(configured, monkeypatch):
    platform, now, _ = configured
    _, params = start(platform)
    result = platform.complete_oauth("google", params["state"][0], "code")
    now[0] += platform.OAUTH_EXCHANGE_TTL_SECONDS + 1
    with pytest.raises(PlatformServiceError): platform.consume_oauth_exchange(result["exchange"], code_verifier=VERIFIER)
    _, params = start(platform)
    platform.cancel_oauth("google", params["state"][0])
    assert platform.oauth_return_context("google", params["state"][0]) == {}
    with pytest.raises(PlatformServiceError): platform.complete_oauth("google", params["state"][0], "code")
    monkeypatch.delenv("GRIDSHARD_ANDROID_AUTH_CERT_SHA256", raising=False)
    assert asset_links()[0]["target"]["package_name"] == "com.gridshard.remotedebug"
    assert asset_links()[0]["target"]["sha256_cert_fingerprints"] == [":".join(["AA"] * 32)]
    monkeypatch.setenv("GRIDSHARD_ANDROID_AUTH_CERT_SHA256", "not-a-certificate")
    with pytest.raises(ValueError): asset_links()
    with pytest.raises(ValueError): native_return_url("http://play.gridshard.test", "android-test")
    with pytest.raises(ValueError): native_return_url("https://play.gridshard.test:8443", "android-test")


def test_callback_redirect_and_session_http_proof_auth_ownership_and_nostore(configured, monkeypatch):
    from app import main
    platform, _, _ = configured
    monkeypatch.setattr(main, "platform_service", platform)
    monkeypatch.setenv("GRIDSHARD_AUTH_REQUIRED", "1")
    client = TestClient(main.app)
    assert client.get("/accounts/guest/oauth/google/start").status_code == 401
    session = client.post("/auth/session", json={"player_id":"oauth-native-fixture", "device_secret":"g"*64}).json()
    headers = {"authorization":f"Bearer {session['access_token']}"}
    assert client.get("/accounts/other/oauth/google/start", headers=headers).status_code == 403
    response = client.get("/accounts/oauth-native-fixture/oauth/google/start", headers=headers,
                          params={"native_target":"android-test","code_challenge":pkce_challenge(VERIFIER)})
    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    started = response.json()
    state = parse_qs(urlsplit(started["authorization_url"]).query)["state"][0]
    callback = client.get("/oauth/google/callback", params={"state":state,"code":"fixture"}, follow_redirects=False)
    assert callback.status_code == 303
    assert callback.headers["referrer-policy"] == "no-referrer"
    target = urlsplit(callback.headers["location"])
    assert target.hostname == "play.gridshard.test" and target.path == "/native-auth/android-test"
    params = parse_qs(target.query)
    assert params["oauth_handoff"] == [started["handoff"]]
    assert "access_token" not in params and "player_id" not in params
    payload = {"exchange":params["oauth_exchange"][0],"device_secret":"d"*64,"device_id":"native-oauth-device","platform":"android"}
    assert client.post("/auth/provider-session",json=payload).status_code == 422
    assert client.post("/auth/provider-session",json={**payload,"code_verifier":VERIFIER}).status_code == 200
    assert client.post("/auth/provider-session",json={**payload,"code_verifier":VERIFIER}).status_code == 422
    links = client.get("/.well-known/assetlinks.json")
    assert links.status_code == 200 and links.headers["content-type"].startswith("application/json")
    landing = client.get("/native-auth/android-test?oauth_exchange=do-not-embed")
    assert landing.status_code == 200 and landing.headers["cache-control"] == "no-store"
    assert "do-not-embed" not in landing.text
    assert "script-src 'sha256-" in landing.headers["content-security-policy"]
    assert client.get("/native-auth/unknown").status_code == 404


def test_web_login_also_requires_tab_proof_and_cancel_removes_server_state(configured, monkeypatch):
    from app import main
    platform, _, _ = configured
    monkeypatch.setattr(main, "platform_service", platform)
    monkeypatch.setenv("GRIDSHARD_AUTH_REQUIRED", "1")
    client = TestClient(main.app)
    session = client.post("/auth/session",json={"player_id":"oauth-web-fixture","device_secret":"w"*64}).json()
    headers = {"authorization":f"Bearer {session['access_token']}"}
    path = "/accounts/oauth-web-fixture/oauth/google/start"
    assert client.get(path,headers=headers,params={"mode":"login"}).status_code == 422
    params = {"mode":"login","code_challenge":pkce_challenge(VERIFIER)}
    started = client.get(path,headers=headers,params=params).json()
    state = parse_qs(urlsplit(started["authorization_url"]).query)["state"][0]
    callback = client.get("/oauth/google/callback",params={"state":state,"code":"fixture"},follow_redirects=False)
    target = urlsplit(callback.headers["location"])
    assert target.path == "/"
    query = parse_qs(target.query)
    assert query["oauth_handoff"] == [started["handoff"]]
    with pytest.raises(PlatformServiceError): platform.consume_oauth_exchange(query["oauth_exchange"][0])
    assert platform.consume_oauth_exchange(query["oauth_exchange"][0],code_verifier=VERIFIER)["player_id"] == "oauth-web-fixture"
    started = client.get(path,headers=headers,params=params).json()
    state = parse_qs(urlsplit(started["authorization_url"]).query)["state"][0]
    cancelled = client.get("/oauth/google/callback",params={"state":state,"error":"access_denied"},follow_redirects=False)
    query = parse_qs(urlsplit(cancelled.headers["location"]).query)
    assert query["oauth_status"] == ["cancelled"] and query["oauth_handoff"] == [started["handoff"]]
    assert "oauth_exchange" not in query
    assert platform.oauth_return_context("google",state) == {}


def test_apple_signed_identity_nonce_and_native_proof(configured):
    from cryptography.hazmat.primitives import hashes
    from cryptography.hazmat.primitives.asymmetric import padding, rsa
    platform, _, Response = configured
    _, params = start(platform, provider="apple")
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    encode = lambda value: base64.urlsafe_b64encode(value).rstrip(b"=").decode()
    header = encode(json.dumps({"alg":"RS256","kid":"fixture-key"}).encode())
    claims = encode(json.dumps({"iss":"https://appleid.apple.com","aud":"fixture-client","iat":1000,"exp":1500,
                                "nonce":params["nonce"][0],"sub":"apple-user","email":"apple@example.test","email_verified":True}).encode())
    signature = encode(key.sign(f"{header}.{claims}".encode(),padding.PKCS1v15(),hashes.SHA256()))
    pub = key.public_key().public_numbers()
    numbers = lambda value: encode(value.to_bytes((value.bit_length()+7)//8,"big"))
    platform.http_open = lambda request, timeout: Response(
        {"id_token":f"{header}.{claims}.{signature}"} if request.full_url.endswith("/token") else
        {"keys":[{"kid":"fixture-key","kty":"RSA","n":numbers(pub.n),"e":numbers(pub.e)}]})
    result = platform.complete_oauth("apple",params["state"][0],"apple-code")
    assert platform.consume_oauth_exchange(result["exchange"],code_verifier=VERIFIER)["provider"] == "apple"
    assert platform.account_view("guest")["oauth"]["apple"]["linked"] is True


def test_oauth_secret_file_is_server_only_and_conflicts_fail_closed(configured, tmp_path, monkeypatch):
    platform, _, _ = configured
    secret = tmp_path / "oauth-secret"
    secret.write_text("fixture-secret-file")
    monkeypatch.setenv("GRIDSHARD_GOOGLE_OAUTH_CLIENT_SECRET_FILE",str(secret.resolve()))
    with pytest.raises(PlatformServiceError): platform.oauth_status()  # inline + file
    monkeypatch.delenv("GRIDSHARD_GOOGLE_OAUTH_CLIENT_SECRET")
    assert platform.oauth_status()["google"]["configured"]
    started, _ = start(platform)
    assert "fixture-secret-file" not in json.dumps(started)


def test_apple_client_secret_rejects_non_p256_keys(configured, tmp_path, monkeypatch):
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import ec
    platform, _, _ = configured
    key_path = tmp_path / "apple-fixture.p8"
    key = ec.generate_private_key(ec.SECP384R1())
    key_path.write_bytes(key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption()))
    monkeypatch.delenv("GRIDSHARD_APPLE_OAUTH_CLIENT_SECRET")
    monkeypatch.setenv("GRIDSHARD_APPLE_OAUTH_PRIVATE_KEY_FILE",str(key_path))
    monkeypatch.setenv("GRIDSHARD_APPLE_OAUTH_TEAM_ID","fixture-team")
    monkeypatch.setenv("GRIDSHARD_APPLE_OAUTH_KEY_ID","fixture-key")
    with pytest.raises(PlatformServiceError,match="imzalanamadı"):
        platform._apple_client_secret(platform._oauth_configuration("apple"))
