"""AWS WIF auth tests: real google-auth, entirely mocked HTTP/EC2 credentials."""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import json
import time
import traceback
from urllib.parse import parse_qs, unquote

import httpx
import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

from app.google_play_wif import (
    AWS_SUBJECT_TYPE, AWS_VERIFICATION_URL, AwsWifTokenProvider,
    IMDS_REGION_URL, IMDS_ROLE_URL, IMDS_TOKEN_URL, PUBLISHER_SCOPE, STS_URL,
    WifTokenError, _BoundedAuthRequest, load_aws_wif_config,
)
from app.player_profile import PlayerProfileService
from app.platform_services import PlatformService
from app.store_catalog import StoreError, process_purchase, store_account_token
from app.store_reconciliation import END_MARGIN_MS, StoreReconciler
from app.store_verification import GooglePlayVerifier, StoreVerificationError, StoreVerifiers


EMAIL = "billing@test-project.iam.gserviceaccount.com"
AUDIENCE = "//iam.googleapis.com/projects/123456789012/locations/global/workloadIdentityPools/gridshard-test/providers/aws-test"
IAM_URL = f"https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/{EMAIL}:generateAccessToken"
ROLE = "fixture-ec2-billing-role"
AUTH_ENV = (
    "GRIDSHARD_GOOGLE_PLAY_AUTH_MODE", "GRIDSHARD_GOOGLE_PLAY_PACKAGE_NAME",
    "GRIDSHARD_GOOGLE_PLAY_SERVICE_ACCOUNT_FILE", "GRIDSHARD_GOOGLE_PLAY_WIF_CONFIG_FILE",
    "GRIDSHARD_GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL", "GRIDSHARD_GOOGLE_PLAY_WIF_AUDIENCE",
    "GOOGLE_APPLICATION_CREDENTIALS", "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY",
    "AWS_SESSION_TOKEN", "AWS_REGION", "AWS_DEFAULT_REGION",
    "GRIDSHARD_GOOGLE_RTDN_AUDIENCE", "GRIDSHARD_GOOGLE_RTDN_SERVICE_ACCOUNT",
)


@pytest.fixture(autouse=True)
def no_operator_credentials(monkeypatch):
    for name in AUTH_ENV:
        monkeypatch.delenv(name, raising=False)


def config():
    return {
        "type": "external_account", "audience": AUDIENCE,
        "subject_token_type": AWS_SUBJECT_TYPE, "token_url": STS_URL,
        "service_account_impersonation_url": IAM_URL,
        "credential_source": {
            "environment_id": "aws1", "region_url": IMDS_REGION_URL,
            "url": IMDS_ROLE_URL, "regional_cred_verification_url": AWS_VERIFICATION_URL,
            "imdsv2_session_token_url": IMDS_TOKEN_URL,
        },
    }


def config_file(tmp_path, payload=None):
    path = tmp_path / "fixture-wif.json"
    path.write_text(json.dumps(config() if payload is None else payload), encoding="utf-8")
    return str(path)


def configure(monkeypatch, path):
    monkeypatch.setenv("GRIDSHARD_GOOGLE_PLAY_AUTH_MODE", "aws_wif")
    monkeypatch.setenv("GRIDSHARD_GOOGLE_PLAY_PACKAGE_NAME", "com.gridshardgame.app")
    monkeypatch.setenv("GRIDSHARD_GOOGLE_PLAY_WIF_CONFIG_FILE", path)
    monkeypatch.setenv("GRIDSHARD_GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL", EMAIL)
    monkeypatch.setenv("GRIDSHARD_GOOGLE_PLAY_WIF_AUDIENCE", AUDIENCE)


class FixtureNetwork:
    def __init__(self, *, failure="", purchase_status=200):
        self.calls = []
        self.iam_calls = 0
        self.failure = failure
        self.purchase_status = purchase_status
        self.client = httpx.Client(transport=httpx.MockTransport(self.handle), trust_env=False)

    def handle(self, request):
        url = str(request.url)
        self.calls.append(request)
        if self.failure == url:
            return httpx.Response(403, json={"error": "sensitive-fixture-response-not-for-logs"})
        if url == IMDS_TOKEN_URL:
            assert request.method == "PUT"
            return httpx.Response(200, content=b"fixture-imds-token")
        if url in {IMDS_REGION_URL, IMDS_ROLE_URL, IMDS_ROLE_URL + "/" + ROLE}:
            assert request.method == "GET"
            assert request.headers["x-aws-ec2-metadata-token"] == "fixture-imds-token"
            assert "authorization" not in request.headers
            if url == IMDS_REGION_URL:
                return httpx.Response(200, text="eu-central-1a")
            if url == IMDS_ROLE_URL:
                return httpx.Response(200, text=ROLE)
            return httpx.Response(200, json={
                "AccessKeyId": "FAKE_AWS_ACCESS_KEY_FOR_TEST_ONLY",
                "SecretAccessKey": "fixture-only-never-real",
                "Token": "fixture-aws-session-token",
            })
        if url == STS_URL:
            assert request.method == "POST"
            form = parse_qs(request.content.decode())
            assert form["audience"] == [AUDIENCE]
            assert form["subject_token_type"] == [AWS_SUBJECT_TYPE]
            signed = json.loads(unquote(form["subject_token"][0]))
            assert signed["url"] == "https://sts.eu-central-1.amazonaws.com?Action=GetCallerIdentity&Version=2011-06-15"
            signed_headers = {item["key"].lower(): item["value"] for item in signed["headers"]}
            assert signed_headers["x-goog-cloud-target-resource"] == AUDIENCE
            assert signed_headers["x-amz-security-token"] == "fixture-aws-session-token"
            return httpx.Response(200, json={
                "access_token": "fixture-federated-token", "expires_in": 3600,
                "token_type": "Bearer", "issued_token_type": "urn:ietf:params:oauth:token-type:access_token",
            })
        if url == IAM_URL:
            self.iam_calls += 1
            assert request.method == "POST"
            assert request.headers["authorization"] == "Bearer fixture-federated-token"
            body = json.loads(request.content)
            assert body["scope"] == [PUBLISHER_SCOPE]
            assert body["lifetime"] == "3600s"
            return httpx.Response(200, json={
                "accessToken": f"fixture-google-token-{self.iam_calls}",
                "expireTime": datetime.fromtimestamp(time.time() + 3600, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            })
        if url.startswith("https://androidpublisher.googleapis.com/androidpublisher/v3/applications/com.gridshardgame.app/"):
            assert request.headers["authorization"] == f"Bearer fixture-google-token-{self.iam_calls}"
            if self.purchase_status != 200:
                return httpx.Response(self.purchase_status)
            if url.endswith(":consume"):
                return httpx.Response(204)
            if "/purchases/voidedpurchases?" in url:
                return httpx.Response(200, json={"voidedPurchases": []})
            return httpx.Response(200, json={
                "purchaseState": 0, "consumptionState": 0, "purchaseType": 0,
                "orderId": "GPA.fixture-wif", "obfuscatedExternalAccountId": store_account_token("wif-fixture-player"),
            })
        raise AssertionError("Unexpected mocked auth endpoint")


def verifier(monkeypatch, tmp_path, network):
    configure(monkeypatch, config_file(tmp_path))
    return GooglePlayVerifier.from_environment(
        client_factory=lambda: network.client, wif_client_factory=lambda: network.client,
    )


def test_real_google_auth_imdsv2_sts_impersonation_and_store_flow(monkeypatch, tmp_path):
    network = FixtureNetwork()
    google = verifier(monkeypatch, tmp_path, network)
    assert google.key is None
    assert network.calls == []  # Construction/validation must not contact Google or EC2.
    purchase = google.verify("gridshard.credits_2200", "fixture-token-" + "a" * 32)
    assert purchase.provider == "google_play" and purchase.environment == "test"
    assert purchase.account_token == store_account_token("wif-fixture-player")
    profile = PlayerProfileService().get_or_create("wif-fixture-player")
    initial_credits = profile.circuit_credits
    now_iso = datetime.now(timezone.utc).isoformat()
    receipt = process_purchase(profile, "credits_2200", "google_play", "untrusted-id", test_mode=False, verified=purchase, now_iso=now_iso)
    assert receipt["test"] is True and profile.circuit_credits == initial_credits + 2200
    replay = process_purchase(profile, "credits_2200", "google_play", "different-id", test_mode=False, verified=purchase, now_iso=now_iso)
    assert replay["replayed"] is True and profile.circuit_credits == initial_credits + 2200
    with pytest.raises(StoreError):
        process_purchase(profile, "flux_120", "google_play", "different-product", test_mode=False, verified=purchase, now_iso=now_iso)
    assert google.consume(purchase) is True
    assert google.voided_purchases(1000, 2000) == []
    assert network.iam_calls == 1
    assert all(request.extensions["timeout"]["connect"] == 10 for request in network.calls if request.url.host != "androidpublisher.googleapis.com")
    assert not any("oauth2.googleapis.com" in str(request.url) for request in network.calls)


@pytest.mark.parametrize("rtdn_value", [None, ""])
def test_wif_only_full_verifier_configuration_reconciles_without_rtdn(monkeypatch, tmp_path, rtdn_value):
    """No Pub/Sub identity is needed for outbound verification or refund scans."""
    network = FixtureNetwork()
    configure(monkeypatch, config_file(tmp_path))
    if rtdn_value is not None:
        monkeypatch.setenv("GRIDSHARD_GOOGLE_RTDN_AUDIENCE", rtdn_value)
        monkeypatch.setenv("GRIDSHARD_GOOGLE_RTDN_SERVICE_ACCOUNT", rtdn_value)
    original = GooglePlayVerifier.from_environment
    monkeypatch.setattr(GooglePlayVerifier, "from_environment", classmethod(
        lambda cls: original(client_factory=lambda: network.client, wif_client_factory=lambda: network.client)
    ))
    verifiers = StoreVerifiers.from_environment()
    assert verifiers.google_play is not None and verifiers.google_notifications is None
    assert network.calls == []
    state = PlatformService(tmp_path / "polling-platform.json")
    now = time.time()
    reconciler = StoreReconciler(
        verifiers=lambda: verifiers, state=state, now_func=lambda: now,
        handle_google_voided=lambda _item: pytest.fail("Empty fixture page has no refunds"),
        handle_app_store_notification=lambda *_args, **_kwargs: pytest.fail("No Apple fixture"),
    )
    assert reconciler.enabled()
    result = reconciler.run_once()["google_play"]
    assert result["ok"] and result["seen"] == 0 and result["applied"] == 0
    assert state.store_reconciliation_checkpoint("google_play") == int(now * 1000) - END_MARGIN_MS
    assert network.iam_calls == 1
    # A cold process retains its checkpoint without a push subscription.
    restarted = PlatformService(tmp_path / "polling-platform.json")
    assert restarted.store_reconciliation_checkpoint("google_play") == state.store_reconciliation_checkpoint("google_play")
    assert not any("pubsub.googleapis.com" in str(request.url) for request in network.calls)


@pytest.mark.parametrize("operation,status", [("verify", 401), ("verify", 403), ("voided", 403), ("consume", 401)])
def test_publisher_auth_rejection_invalidates_cached_wif_token(monkeypatch, tmp_path, operation, status):
    network = FixtureNetwork()
    google = verifier(monkeypatch, tmp_path, network)
    purchase = google.verify("gridshard.credits_2200", "fixture-token-" + "b" * 32)
    network.purchase_status = status
    if operation == "consume":
        assert google.consume(purchase) is False
    else:
        with pytest.raises(StoreVerificationError) as error:
            if operation == "verify":
                google.verify("gridshard.credits_2200", "fixture-token-" + "b" * 32)
            else:
                google.voided_purchases(1000, 2000)
        assert error.value.retryable is True
    network.purchase_status = 200
    google.verify("gridshard.credits_2200", "fixture-token-" + "b" * 32)
    assert network.iam_calls == 2


@pytest.mark.parametrize("endpoint", [IMDS_TOKEN_URL, IMDS_ROLE_URL, STS_URL, IAM_URL])
def test_auth_failure_is_sanitized_retryable_and_never_calls_publisher(monkeypatch, tmp_path, caplog, endpoint):
    network = FixtureNetwork(failure=endpoint)
    google = verifier(monkeypatch, tmp_path, network)
    with pytest.raises(StoreVerificationError) as error:
        google.verify("gridshard.flux_120", "fixture-token-" + "c" * 32)
    assert error.value.retryable is True
    trace = "".join(traceback.format_exception(error.value))
    assert "sensitive-fixture-response" not in trace + caplog.text
    assert "fixture-aws-session-token" not in trace + caplog.text
    assert not any(request.url.host == "androidpublisher.googleapis.com" for request in network.calls)
    assert google.token_provider._token == ("", 0)


@pytest.mark.parametrize("change", [
    {"type": "authorized_user"}, {"type": "service_account", "private_key": "fixture-private-key"},
    {"audience": AUDIENCE.replace("aws-test", "another-provider")},
    {"token_url": "https://example.invalid/token"}, {"token_url": "http://sts.googleapis.com/v1/token"},
    {"subject_token_type": "urn:ietf:params:oauth:token-type:jwt"},
    {"service_account_impersonation_url": IAM_URL.replace("billing@", "other@")},
    {"service_account_impersonation_url": IAM_URL + "?target=other"},
    {"service_account_impersonation_url": "https://example.invalid/impersonate"},
    {"service_account_impersonation_url": None}, {"universe_domain": "example.invalid"},
    {"token_info_url": "https://example.invalid/token-info"},
    {"service_account_impersonation": {"token_lifetime_seconds": 3601}},
    {"service_account_impersonation": {"token_lifetime_seconds": True}},
    {"service_account_impersonation": {"token_lifetime_seconds": 0}},
    {"service_account_impersonation": {"delegates": ["someone"]}},
    {"quota_project_id": "unapproved-project"}, {"client_secret": "fixture-secret"},
    {"credential_source": {"executable": {"command": "must-not-execute"}}},
    {"credential_source": {"file": "must-not-read"}},
    {"credential_source": None},
])
def test_untrusted_or_ambiguous_config_is_rejected_before_sdk_and_http(tmp_path, monkeypatch, change):
    from google.auth import aws

    payload = config()
    payload.update(change)
    monkeypatch.setattr(aws.Credentials, "from_info", lambda *_args, **_kwargs: pytest.fail("SDK must not see rejected config"))
    with pytest.raises(ValueError, match="AWS WIF yapılandırması geçersiz"):
        AwsWifTokenProvider.from_file(config_file(tmp_path, payload), email=EMAIL, audience=AUDIENCE)


@pytest.mark.parametrize("field,value", [
    ("environment_id", "aws2"), ("url", "http://127.0.0.1/secrets"),
    ("region_url", "https://example.invalid/region"),
    ("imdsv2_session_token_url", None),
    ("regional_cred_verification_url", "https://example.invalid/?Action=GetCallerIdentity"),
    ("headers", {"Authorization": "fixture-secret"}),
])
def test_credential_source_is_exact_imdsv2_only(tmp_path, field, value):
    payload = config()
    payload["credential_source"][field] = value
    with pytest.raises(ValueError):
        load_aws_wif_config(config_file(tmp_path, payload), email=EMAIL, audience=AUDIENCE)


@pytest.mark.parametrize("name", ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"])
def test_static_aws_environment_credentials_are_not_a_keyless_fallback(tmp_path, monkeypatch, name):
    path = config_file(tmp_path)
    monkeypatch.setenv(name, "fixture-static-key")
    with pytest.raises(ValueError):
        load_aws_wif_config(path, email=EMAIL, audience=AUDIENCE)


def test_optional_generated_config_fields_are_accepted_without_network(tmp_path):
    payload = config()
    payload.update({
        "universe_domain": "googleapis.com", "token_info_url": "https://sts.googleapis.com/v1/introspect",
        "service_account_impersonation": {"token_lifetime_seconds": 3600},
    })
    assert load_aws_wif_config(config_file(tmp_path, payload), email=EMAIL, audience=AUDIENCE) == payload


@pytest.mark.parametrize("contents", ["[]", "{}", "not JSON", '{"type":"external_account","type":"service_account"}', " " * 65537], ids=["array", "empty", "invalid", "duplicate", "oversized"])
def test_malformed_duplicate_or_oversized_file_is_rejected(tmp_path, contents):
    path = tmp_path / "bad.json"
    path.write_text(contents, encoding="utf-8")
    with pytest.raises(ValueError):
        load_aws_wif_config(str(path), email=EMAIL, audience=AUDIENCE)


def test_pins_missing_file_and_invalid_encoding_are_rejected(tmp_path):
    path = config_file(tmp_path)
    for email, audience in [("", AUDIENCE), (EMAIL, ""), (EMAIL, AUDIENCE.replace("projects/123456789012", "projects/test-project"))]:
        with pytest.raises(ValueError):
            load_aws_wif_config(path, email=email, audience=audience)
    with pytest.raises(ValueError):
        load_aws_wif_config(str(tmp_path / "missing"), email=EMAIL, audience=AUDIENCE)
    invalid = tmp_path / "encoding.json"
    invalid.write_bytes(b"\xff\xfe")
    with pytest.raises(ValueError):
        load_aws_wif_config(str(invalid), email=EMAIL, audience=AUDIENCE)


@pytest.mark.parametrize("url,method,headers", [
    ("https://example.invalid/token", "POST", {}),
    (IMDS_REGION_URL, "GET", {}), (IMDS_TOKEN_URL, "GET", {}),
    (IMDS_ROLE_URL + "/../other", "GET", {"X-aws-ec2-metadata-token": "fixture"}),
    (IMDS_ROLE_URL + "/" + ROLE, "GET", {"X-aws-ec2-metadata-token": "fixture", "Authorization": "Bearer fixture"}),
    (STS_URL, "GET", {}), (IAM_URL + "?redirect=1", "POST", {}),
])
def test_auth_transport_refuses_unpinned_urls_and_imdsv1(url, method, headers):
    class NeverClient:
        def request(self, *_args, **_kwargs):
            pytest.fail("Rejected request must not reach the HTTP transport")

    with pytest.raises(WifTokenError):
        _BoundedAuthRequest(NeverClient(), IAM_URL)(url, method=method, headers=headers)


def test_auth_redirect_is_not_followed(monkeypatch, tmp_path):
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(302, headers={"Location": "https://example.invalid/steal"})

    client = httpx.Client(transport=httpx.MockTransport(handler), follow_redirects=True)
    configure(monkeypatch, config_file(tmp_path))
    google = GooglePlayVerifier.from_environment(client_factory=lambda: client, wif_client_factory=lambda: client)
    with pytest.raises(StoreVerificationError):
        google.verify("gridshard.flux_120", "fixture-token-" + "d" * 32)
    assert len(calls) == 1 and str(calls[0].url) == IMDS_TOKEN_URL


@pytest.mark.parametrize("status", [302, 400, 403, 429, 500])
def test_auth_error_body_is_not_returned_to_sdk_or_logged(status, caplog):
    client = httpx.Client(transport=httpx.MockTransport(
        lambda _request: httpx.Response(status, text="sensitive-fixture-response-not-for-logs"),
    ))
    with pytest.raises(WifTokenError) as error:
        _BoundedAuthRequest(client, IAM_URL)(STS_URL, method="POST")
    trace = "".join(traceback.format_exception(error.value))
    assert "sensitive-fixture-response" not in trace + caplog.text


def test_unconfigured_legacy_and_invalid_mode_or_partial_wif_fail_closed(monkeypatch, tmp_path):
    assert GooglePlayVerifier.from_environment() is None
    monkeypatch.setenv("GRIDSHARD_GOOGLE_PLAY_AUTH_MODE", "adc")
    with pytest.raises(ValueError):
        GooglePlayVerifier.from_environment()
    configure(monkeypatch, config_file(tmp_path))
    for name in ("GRIDSHARD_GOOGLE_PLAY_WIF_CONFIG_FILE", "GRIDSHARD_GOOGLE_PLAY_SERVICE_ACCOUNT_EMAIL", "GRIDSHARD_GOOGLE_PLAY_WIF_AUDIENCE", "GRIDSHARD_GOOGLE_PLAY_PACKAGE_NAME"):
        with monkeypatch.context() as context:
            context.delenv(name)
            with pytest.raises(ValueError):
                GooglePlayVerifier.from_environment()
    monkeypatch.setenv("GRIDSHARD_GOOGLE_PLAY_SERVICE_ACCOUNT_FILE", "must-not-read-private-key.json")
    with pytest.raises(ValueError):
        GooglePlayVerifier.from_environment()
    monkeypatch.delenv("GRIDSHARD_GOOGLE_PLAY_SERVICE_ACCOUNT_FILE")
    monkeypatch.setenv("GRIDSHARD_GOOGLE_PLAY_AUTH_MODE", "service_account")
    with pytest.raises(ValueError):
        GooglePlayVerifier.from_environment()


def test_existing_service_account_path_remains_compatible(monkeypatch, tmp_path):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    path = tmp_path / "fixture-service-account.json"
    path.write_text(json.dumps({
        "type": "service_account", "client_email": EMAIL,
        "private_key": key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode(),
    }), encoding="utf-8")
    monkeypatch.setenv("GRIDSHARD_GOOGLE_PLAY_PACKAGE_NAME", "com.gridshardgame.app")
    monkeypatch.setenv("GRIDSHARD_GOOGLE_PLAY_SERVICE_ACCOUNT_FILE", str(path))
    google = GooglePlayVerifier.from_environment(client_factory=lambda: object())
    assert google.token_provider is None and isinstance(google.key, rsa.RSAPrivateKey)


class FakeCredentials:
    def __init__(self, now, *, lifetime=3600, token="fixture-token", error=False):
        self.now = now
        self.lifetime = lifetime
        self.value = token
        self.error = error
        self.calls = 0

    def refresh(self, _request):
        self.calls += 1
        if self.error:
            raise ValueError("sensitive-fixture-response-not-for-logs")
        self.token = self.value
        self.expiry = datetime.fromtimestamp(self.now[0] + self.lifetime, timezone.utc)


def test_token_cache_expiry_and_concurrent_refresh():
    now = [time.time()]
    credentials = FakeCredentials(now)
    provider = AwsWifTokenProvider(credentials, object(), now_func=lambda: now[0])
    with ThreadPoolExecutor(max_workers=8) as executor:
        assert list(executor.map(lambda _index: provider.token(), range(16))) == ["fixture-token"] * 16
    assert credentials.calls == 1
    now[0] += 3541
    assert provider.token() == "fixture-token" and credentials.calls == 2
    provider.invalidate()
    assert provider.token() == "fixture-token" and credentials.calls == 3


@pytest.mark.parametrize("lifetime,token", [
    (30, "fixture"), (7200, "fixture"), (3600, "fixture\r\nheader"),
    (3600, ""), (3600, None), (3600, "a" * 16385), (3600, "a" + "=" * 16384),
], ids=["too-short", "too-long-lived", "header-injection", "empty", "none", "oversized", "oversized-padding"])
def test_invalid_or_unbounded_tokens_are_never_used(lifetime, token):
    now = [time.time()]
    provider = AwsWifTokenProvider(FakeCredentials(now, lifetime=lifetime, token=token), object(), now_func=lambda: now[0])
    with pytest.raises(WifTokenError):
        provider.token()
    assert provider._token == ("", 0)


@pytest.mark.parametrize("cached", [False, True])
def test_static_credentials_added_after_validation_are_rejected(monkeypatch, cached):
    now = [time.time()]
    credentials = FakeCredentials(now)
    provider = AwsWifTokenProvider(credentials, object(), now_func=lambda: now[0])
    if cached:
        assert provider.token() == "fixture-token"
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "fixture-static-key")
    with pytest.raises(WifTokenError):
        provider.token()
    assert credentials.calls == int(cached)
    assert provider._token == ("", 0)
