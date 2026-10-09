"""Beta.72 tur 10: gerçek mağaza ve ödüllü reklam doğrulaması.

Ağ yoktur: Google Play, App Store ve AdMob uçları sahte HTTP istemcisiyle
taklit edilir; Apple zinciri test içinde üretilen sertifikalarla kurulur.
"""

from __future__ import annotations

import base64
from datetime import datetime, timedelta, timezone
import json
from urllib.parse import quote, unquote, urlencode

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa, utils
from cryptography.x509.oid import NameOID, ObjectIdentifier

from app.platform_services import PlatformService
from app.player_profile import PlayerProfileService
from app.store_catalog import (
    StoreError,
    process_purchase,
    record_verified_ad_view,
    restore_refunded_purchase,
    revoke_purchase,
    store_account_token,
    store_refund_message,
    verified_ad_view_for_battle,
)
from app.store_verification import (
    ADMOB_KEYS_URL,
    APPLE_INTERMEDIATE_OID,
    APPLE_LEAF_OID,
    AdMobSsvVerifier,
    AppStoreVerifier,
    GooglePlayNotificationVerifier,
    GooglePlayVerifier,
    StoreVerificationError,
    VerifiedPurchase,
)

NOW = 1_790_000_000.0
NOW_ISO = datetime.fromtimestamp(NOW, tz=timezone.utc).isoformat()


class FakeResponse:
    def __init__(self, status_code: int, payload: dict | None = None):
        self.status_code = status_code
        self._payload = payload or {}
        self.headers = {}

    def json(self):
        return self._payload


class FakeClient:
    def __init__(self, routes: dict):
        self.routes = routes
        self.calls = []

    def _answer(self, method: str, url: str):
        self.calls.append((method, url))
        for (route_method, fragment), response in self.routes.items():
            if route_method == method and fragment in url:
                return response(url) if callable(response) else response
        return FakeResponse(404)

    def get(self, url, **_kwargs):
        return self._answer("GET", url)

    def post(self, url, **_kwargs):
        return self._answer("POST", url)


def _b64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


# --- Google Play -------------------------------------------------------------

def _google_verifier(purchase: dict | FakeResponse) -> tuple[GooglePlayVerifier, FakeClient]:
    response = purchase if isinstance(purchase, FakeResponse) else FakeResponse(200, purchase)
    client = FakeClient({
        ("POST", "oauth2.googleapis.com/token"): FakeResponse(200, {"access_token": "token", "expires_in": 3600}),
        ("POST", ":consume"): FakeResponse(204),
        ("GET", "/purchases/products/"): response,
    })
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    verifier = GooglePlayVerifier(
        package_name="com.gridshard.app",
        email="store@example.iam.gserviceaccount.com",
        key=key,
        client=client,
        now_func=lambda: NOW,
    )
    return verifier, client


def test_google_play_purchase_is_verified_granted_once_and_consumed():
    verifier, client = _google_verifier({"purchaseState": 0, "consumptionState": 0, "orderId": "GPA.1234-5678"})
    profiles = PlayerProfileService()
    profile = profiles.get_or_create("google-buyer")
    credits = profile.circuit_credits
    token = "tok_" + "a" * 40

    verified = verifier.verify("gridshard.credits_2200", token)
    assert verified.transaction_id == "GPA.1234-5678"
    assert verified.environment == "production"
    receipt = process_purchase(
        profile, "credits_2200", "google_play", "client-says-anything",
        test_mode=False, now_iso=NOW_ISO, verified=verified,
    )
    assert receipt["transaction_id"] == "GPA.1234-5678"
    assert receipt["consumed"] is False
    assert profile.circuit_credits == credits + 2200

    replay = process_purchase(
        profile, "credits_2200", "google_play", "other",
        test_mode=False, now_iso=NOW_ISO, verified=verifier.verify("gridshard.credits_2200", token),
    )
    assert replay["replayed"] is True
    assert profile.circuit_credits == credits + 2200
    assert verifier.consume(verified) is True
    assert any(url.endswith(":consume") for method, url in client.calls if method == "POST")


def test_google_play_rejects_pending_missing_and_mismatched_purchases():
    # Bekleyen ödeme geçicidir (istemci saklar, tamamlanınca yeniden gönderir);
    # iptal edilmiş alım kalıcı rettir.
    pending, _ = _google_verifier({"purchaseState": 2, "orderId": "GPA.1"})
    with pytest.raises(StoreVerificationError, match="henüz tamamlanmadı") as waiting:
        pending.verify("gridshard.flux_120", "tok_" + "b" * 40)
    assert waiting.value.retryable is True
    cancelled, _ = _google_verifier({"purchaseState": 1, "orderId": "GPA.1c"})
    with pytest.raises(StoreVerificationError, match="iptal") as refused:
        cancelled.verify("gridshard.flux_120", "tok_" + "b" * 40)
    assert refused.value.retryable is False
    unreachable, _ = _google_verifier(FakeResponse(503))
    with pytest.raises(StoreVerificationError, match="ulaşılamıyor") as outage:
        unreachable.verify("gridshard.flux_120", "tok_" + "b" * 40)
    assert outage.value.retryable is True
    missing, _ = _google_verifier(FakeResponse(404))
    with pytest.raises(StoreVerificationError, match="bulunamadı"):
        missing.verify("gridshard.flux_120", "tok_" + "c" * 40)
    with pytest.raises(StoreVerificationError, match="belirteci geçersiz"):
        missing.verify("gridshard.flux_120", "short")

    verifier, _ = _google_verifier({"purchaseState": 0, "orderId": "GPA.2"})
    verified = verifier.verify("gridshard.flux_120", "tok_" + "d" * 40)
    profile = PlayerProfileService().get_or_create("google-mismatch")
    with pytest.raises(StoreError, match="bu ürüne ait değil"):
        process_purchase(
            profile, "flux_1050", "google_play", "x",
            test_mode=False, now_iso=NOW_ISO, verified=verified,
        )


def test_google_play_returns_the_account_token_bound_at_checkout():
    token = store_account_token("google-bound-player")
    verifier, _ = _google_verifier({
        "purchaseState": 0,
        "orderId": "GPA.bound",
        "obfuscatedExternalAccountId": token.upper(),
    })
    assert verifier.verify("gridshard.flux_120", "tok_" + "g" * 40).account_token == token
    unbound, _ = _google_verifier({"purchaseState": 0, "orderId": "GPA.unbound"})
    assert unbound.verify("gridshard.flux_120", "tok_" + "h" * 40).account_token == ""


def test_google_play_license_test_purchase_is_marked_as_test():
    verifier, _ = _google_verifier({"purchaseState": 0, "purchaseType": 0, "orderId": "GPA.3"})
    verified = verifier.verify("gridshard.flux_120", "tok_" + "e" * 40)
    profile = PlayerProfileService().get_or_create("google-license-test")
    receipt = process_purchase(
        profile, "flux_120", "google_play", "x",
        test_mode=False, now_iso=NOW_ISO, verified=verified,
    )
    assert receipt["environment"] == "test"
    assert receipt["test"] is True


# --- App Store ---------------------------------------------------------------

def _certificate(subject: str, issuer_name: str, public_key, signing_key, *, ca: bool, oid: str | None):
    builder = (
        x509.CertificateBuilder()
        .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, subject)]))
        .issuer_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, issuer_name)]))
        .public_key(public_key)
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.fromtimestamp(NOW, tz=timezone.utc) - timedelta(days=1))
        .not_valid_after(datetime.fromtimestamp(NOW, tz=timezone.utc) + timedelta(days=30))
        .add_extension(x509.BasicConstraints(ca=ca, path_length=None), critical=True)
    )
    if oid:
        builder = builder.add_extension(
            x509.UnrecognizedExtension(ObjectIdentifier(oid), b"\x05\x00"),
            critical=False,
        )
    return builder.sign(signing_key, hashes.SHA256())


def _apple_chain():
    root_key = ec.generate_private_key(ec.SECP256R1())
    intermediate_key = ec.generate_private_key(ec.SECP256R1())
    leaf_key = ec.generate_private_key(ec.SECP256R1())
    root = _certificate("Test Root", "Test Root", root_key.public_key(), root_key, ca=True, oid=None)
    intermediate = _certificate(
        "Test WWDR", "Test Root", intermediate_key.public_key(), root_key, ca=True, oid=APPLE_INTERMEDIATE_OID
    )
    leaf = _certificate(
        "Test Signer", "Test WWDR", leaf_key.public_key(), intermediate_key, ca=False, oid=APPLE_LEAF_OID
    )
    return root, intermediate, leaf, leaf_key


def _signed_transaction(payload: dict, chain) -> str:
    root, intermediate, leaf, leaf_key = chain
    header = {
        "alg": "ES256",
        "x5c": [
            base64.b64encode(cert.public_bytes(serialization.Encoding.DER)).decode("ascii")
            for cert in (leaf, intermediate, root)
        ],
    }
    signing_input = f"{_b64url(json.dumps(header).encode())}.{_b64url(json.dumps(payload).encode())}"
    der = leaf_key.sign(signing_input.encode("ascii"), ec.ECDSA(hashes.SHA256()))
    r_value, s_value = utils.decode_dss_signature(der)
    return f"{signing_input}.{_b64url(r_value.to_bytes(32, 'big') + s_value.to_bytes(32, 'big'))}"


def _app_store_verifier(payload: dict, *, trusted_chain=True):
    chain = _apple_chain()
    other_root = _apple_chain()[0]
    signed = _signed_transaction(payload, chain)
    client = FakeClient({
        ("GET", "/inApps/v1/transactions/"): FakeResponse(200, {"signedTransactionInfo": signed}),
    })
    trusted_root = chain[0] if trusted_chain else other_root
    verifier = AppStoreVerifier(
        issuer_id="12345678-1234-1234-1234-123456789012",
        key_id="ABCDEFGHIJ",
        key=ec.generate_private_key(ec.SECP256R1()),
        bundle_id="com.gridshard.app",
        environment="production",
        root_certificates=[trusted_root.public_bytes(serialization.Encoding.DER)],
        client=client,
        now_func=lambda: NOW,
    )
    return verifier


BASE_TRANSACTION = {
    "bundleId": "com.gridshard.app",
    "productId": "gridshard.season_pass_premium",
    "transactionId": "2000000123456789",
    "environment": "Production",
    "type": "Consumable",
}


def test_app_store_transaction_with_trusted_chain_is_accepted():
    token = store_account_token("apple-buyer")
    verifier = _app_store_verifier({**BASE_TRANSACTION, "appAccountToken": token})
    verified = verifier.verify("gridshard.season_pass_premium", "2000000123456789")
    assert verified.provider == "app_store"
    assert verified.transaction_id == "2000000123456789"
    assert verified.account_token == token
    profile = PlayerProfileService().get_or_create("apple-buyer")
    receipt = process_purchase(
        profile, "season_pass_premium", "app_store", "2000000123456789",
        test_mode=False, now_iso=NOW_ISO, verified=verified,
    )
    assert profile.premium_pass_active() is True
    assert receipt["consumed"] is True


@pytest.mark.parametrize(
    ("overrides", "message"),
    [
        ({"bundleId": "com.other.app"}, "eşleşmiyor"),
        ({"productId": "gridshard.flux_120"}, "eşleşmiyor"),
        ({"environment": "Sandbox"}, "eşleşmiyor"),
        ({"revocationDate": 1_790_000_100_000}, "iade"),
    ],
)
def test_app_store_rejects_mismatched_or_revoked_transactions(overrides, message):
    verifier = _app_store_verifier({**BASE_TRANSACTION, **overrides})
    with pytest.raises(StoreVerificationError, match=message):
        verifier.verify("gridshard.season_pass_premium", "2000000123456789")


def test_app_store_rejects_untrusted_root_and_bad_transaction_ids():
    verifier = _app_store_verifier(dict(BASE_TRANSACTION), trusted_chain=False)
    with pytest.raises(StoreVerificationError, match="imzası doğrulanamadı"):
        verifier.verify("gridshard.season_pass_premium", "2000000123456789")
    with pytest.raises(StoreVerificationError, match="kimliği geçersiz"):
        verifier.verify("gridshard.season_pass_premium", "../../etc")


# --- AdMob SSV -----------------------------------------------------------------

def _admob(now=NOW):
    key = ec.generate_private_key(ec.SECP256R1())
    pem = key.public_key().public_bytes(
        serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo
    ).decode("ascii")
    client = FakeClient({("GET", ADMOB_KEYS_URL): FakeResponse(200, {"keys": [{"keyId": 77, "pem": pem}]})})
    verifier = AdMobSsvVerifier(
        ad_unit_ids=frozenset({"1111111111"}),
        ad_units_by_platform={"android": "ca-app-pub-1234567890/1111111111"},
        client=client,
        now_func=lambda: now,
    )
    return verifier, key


def _ssv_query(key, **overrides) -> str:
    fields = {
        "ad_network": "5450213213286189855",
        "ad_unit": "1111111111",
        "custom_data": "battle-42",
        "reward_amount": "1",
        "reward_item": "x2",
        "timestamp": str(int(NOW * 1000)),
        "transaction_id": "ssv-tx-1",
        "user_id": "wt-player-1",
        **overrides,
    }
    message = urlencode(fields, quote_via=quote)
    # Match Google's URI.getQuery() signature format, including escaped UTF-8.
    signature = key.sign(unquote(message).encode("utf-8"), ec.ECDSA(hashes.SHA256()))
    return f"{message}&signature={_b64url(signature)}&key_id=77"


def test_admob_ssv_signature_is_verified_and_recorded_once():
    verifier, key = _admob()
    view = verifier.verify(_ssv_query(key))
    assert view == {
        "transaction_id": "ssv-tx-1",
        "user_id": "wt-player-1",
        "battle_id": "battle-42",
        "ad_unit": "1111111111",
        "reward_amount": "1",
        "reward_item": "x2",
        "timestamp_ms": int(NOW * 1000),
    }
    profile = PlayerProfileService().get_or_create("wt-player-1")
    with pytest.raises(StoreError, match="henüz ulaşmadı"):
        verified_ad_view_for_battle(profile, "battle-42")
    assert record_verified_ad_view(profile, view, now_iso=NOW_ISO) is True
    assert record_verified_ad_view(profile, view, now_iso=NOW_ISO) is False
    assert verified_ad_view_for_battle(profile, "battle-42") == "ssv-tx-1"


def test_admob_ssv_rejects_tampered_stale_and_foreign_callbacks():
    verifier, key = _admob()
    tampered = _ssv_query(key).replace("battle-42", "battle-43")
    with pytest.raises(StoreVerificationError, match="imzası geçersiz"):
        verifier.verify(tampered)
    with pytest.raises(StoreVerificationError, match="süresi geçmiş"):
        verifier.verify(_ssv_query(key, timestamp=str(int((NOW - 7200) * 1000))))
    with pytest.raises(StoreVerificationError, match="reklam birimi"):
        verifier.verify(_ssv_query(key, ad_unit="9999999999"))
    with pytest.raises(StoreVerificationError, match="imzasız"):
        verifier.verify("user_id=wt-player-1&transaction_id=x")


def test_ssv_full_unit_must_match_exact_publisher_and_unit():
    verifier, key = _admob()
    full = verifier.ad_units_by_platform["android"]
    assert verifier.verify(_ssv_query(key, ad_unit=full))["ad_unit"] == full
    with pytest.raises(StoreVerificationError) as error:
        verifier.verify(_ssv_query(key, ad_unit="ca-app-pub-9999999999/1111111111"))
    assert error.value.reason == "unknown_ad_unit"


@pytest.mark.parametrize("user_id,custom_data", sorted(AdMobSsvVerifier.CONFIGURATION_PROBES))
def test_signed_configuration_probe_is_distinct_from_real_reward(user_id, custom_data):
    verifier, key = _admob()
    query = _ssv_query(key, user_id=user_id, custom_data=custom_data, ad_unit="synthetic-panel-unit")
    assert verifier.verify(query)["configuration_probe"] is True
    for changed in ({"user_id":"real-player"}, {"custom_data":"real-battle"}):
        with pytest.raises(StoreVerificationError) as error:
            verifier.verify(_ssv_query(key, **{"user_id":user_id,"custom_data":custom_data,
                                              "ad_unit":"synthetic-panel-unit",**changed}))
        assert error.value.reason == "unknown_ad_unit"
    with pytest.raises(StoreVerificationError) as error:
        verifier.verify(query.replace("synthetic-panel-unit", "tampered-panel-unit"))
    assert error.value.reason == "invalid_signature"
    with pytest.raises(StoreVerificationError) as error:
        verifier.verify(_ssv_query(key, user_id=user_id, custom_data=custom_data,
                                  ad_unit="synthetic-panel-unit",timestamp=str(int((NOW-7200)*1000))))
    assert error.value.reason == "stale_callback"


@pytest.mark.parametrize("reward_item,custom_data", [
    ("Savaş ödülü artırımı", "probe-no-battle-20261004"),
    ("hello world", "user@example.com"),
    ("A+B", "battle%2F42"),
    ("ödül 🎁", "e\u0301%"),
])
def test_admob_ssv_matches_google_reference_percent_decoding(reward_item,custom_data):
    verifier,key=_admob()
    view=verifier.verify(_ssv_query(key,reward_item=reward_item,custom_data=custom_data))
    assert view["reward_item"]==reward_item and view["battle_id"]==custom_data
    assert view["user_id"]=="wt-player-1"


def test_admob_ssv_accepts_independently_signed_decoded_reference_query():
    verifier,key=_admob()
    timestamp=str(int(NOW*1000))
    # Independent expected bytes: do not build the signing message with the
    # same percent-decoder as the implementation or the shared helper.
    prefix="ad_network=5450213213286189855&ad_unit=1111111111&custom_data=battle-42&reward_amount=1&reward_item="
    suffix="&timestamp="+timestamp+"&transaction_id=ssv-tx-1&user_id=wt-player-1"
    message=prefix+"Sava%C5%9F%20%C3%B6d%C3%BCl%C3%BC%20art%C4%B1r%C4%B1m%C4%B1"+suffix
    expected=(prefix+"Savaş ödülü artırımı"+suffix).encode("utf-8")
    signature=key.sign(expected,ec.ECDSA(hashes.SHA256()))
    view=verifier.verify(message+"&signature="+_b64url(signature)+"&key_id=77")
    assert view["reward_item"]=="Savaş ödülü artırımı" and view["battle_id"]=="battle-42"


def test_admob_ssv_preserves_literal_plus_in_signed_bytes():
    verifier,key=_admob()
    query=_ssv_query(key,reward_item="A+B",custom_data="battle+42").replace("%2B","+")
    # URI.getQuery() preserves '+', unlike form decoding with unquote_plus().
    view=verifier.verify(query)
    assert view["reward_item"]=="A+B" and view["battle_id"]=="battle+42"


@pytest.mark.parametrize("custom_data", ["battle&note=value", "battle&user_id=other-player"])
def test_admob_ssv_rejects_escaped_parameter_boundary_ambiguity(custom_data):
    verifier,key=_admob()
    with pytest.raises(StoreVerificationError) as error:
        verifier.verify(_ssv_query(key,custom_data=custom_data))
    assert error.value.reason=="ambiguous_parameters"


def test_admob_ssv_rejects_duplicate_business_field_even_with_valid_signature():
    verifier,key=_admob()
    query=_ssv_query(key)
    message=query.split("&signature=",1)[0]+"&user_id=other-player"
    signature=key.sign(unquote(message).encode("utf-8"),ec.ECDSA(hashes.SHA256()))
    with pytest.raises(StoreVerificationError) as error:
        verifier.verify(message+"&signature="+_b64url(signature)+"&key_id=77")
    assert error.value.reason=="ambiguous_parameters"


@pytest.mark.parametrize("trailing", ["&key_id=77", "&signature=fake", "&user_id=other-player"])
def test_admob_ssv_requires_signature_and_key_id_to_be_last(trailing):
    verifier,key=_admob()
    with pytest.raises(StoreVerificationError) as error:
        verifier.verify(_ssv_query(key)+trailing)
    assert error.value.reason=="missing_signature"


def test_admob_ssv_rejects_turkish_value_tampering_after_decoding():
    verifier,key=_admob()
    query=_ssv_query(key,reward_item="Savaş ödülü artırımı")
    with pytest.raises(StoreVerificationError) as error:
        verifier.verify(query.replace(quote("Savaş"),quote("Başka")))
    assert error.value.reason=="invalid_signature"


def test_admob_ssv_does_not_accept_old_encoded_byte_signature():
    verifier,key=_admob()
    query=_ssv_query(key,reward_item="hello world")
    message=query.split("&signature=",1)[0]
    signature=key.sign(message.encode("utf-8"),ec.ECDSA(hashes.SHA256()))
    with pytest.raises(StoreVerificationError) as error:
        verifier.verify(message+"&signature="+_b64url(signature)+"&key_id=77")
    assert error.value.reason=="invalid_signature"


def test_admob_ssv_rejects_invalid_utf8_without_server_error():
    verifier,key=_admob()
    with pytest.raises(StoreVerificationError) as error:
        verifier.verify(_ssv_query(key).replace("battle-42","battle-%FF"))
    assert error.value.reason=="invalid_encoding"


# --- Hesap bağı ve geçici hatalar (uç nokta) -------------------------------------

class _StubVerifiers:
    google_play = None
    app_store = None
    admob = None
    google_notifications = None

    def __init__(self, result):
        self.result = result

    def verify_purchase(self, provider, store_product_id, *, transaction_id, purchase_token):
        if isinstance(self.result, Exception):
            raise self.result
        return self.result

    def platform_view(self):
        return {
            "purchase_platforms": {"google_play": True, "app_store": False},
            "ad_platforms": {"admob": False},
            "ad_units": {},
        }


def test_store_account_token_is_a_stable_uuid_per_player():
    token = store_account_token("wt-123")
    assert token == store_account_token("wt-123")
    assert token != store_account_token("wt-124")
    assert len(token) == 36 and token.count("-") == 4


def test_purchase_endpoint_rejects_receipts_bound_to_another_account(monkeypatch):
    from fastapi.testclient import TestClient

    from app import main as gateway

    client = TestClient(gateway.app)
    player = "store-binding-player"
    purchase_token = "tok_" + "k" * 40
    body = {
        "product_id": "flux_120",
        "provider": "google_play",
        "transaction_id": "GPA.bind-1",
        "purchase_token": purchase_token,
    }

    def verified_for(token):
        return VerifiedPurchase(
            provider="google_play",
            transaction_id="GPA.bind-1",
            store_product_id="gridshard.flux_120",
            environment="production",
            purchase_token=purchase_token,
            account_token=token,
        )

    # Başka hesaba bağlı makbuz (ya da bağsız makbuz) kalıcı olarak reddedilir.
    for foreign in (store_account_token("someone-else"), ""):
        monkeypatch.setattr(gateway, "STORE_VERIFIERS", _StubVerifiers(verified_for(foreign)))
        rejected = client.post(f"/store/{player}/purchases", json=body)
        assert rejected.status_code == 422
        assert "hesaba ait değil" in rejected.json()["detail"]

    # Mağazaya ulaşılamıyorsa 503: istemci alımı saklar ve yeniden gönderir.
    monkeypatch.setattr(gateway, "STORE_VERIFIERS", _StubVerifiers(
        StoreVerificationError("Google Play doğrulamasına şu anda ulaşılamıyor.", retryable=True)
    ))
    assert client.post(f"/store/{player}/purchases", json=body).status_code == 503

    monkeypatch.setattr(gateway, "STORE_VERIFIERS", _StubVerifiers(verified_for(store_account_token(player))))
    granted = client.post(f"/store/{player}/purchases", json=body)
    assert granted.status_code == 200
    assert granted.json()["receipt"]["replayed"] is False
    assert granted.json()["store"]["account_token"] == store_account_token(player)
    replay = client.post(f"/store/{player}/purchases", json=body)
    assert replay.status_code == 200
    assert replay.json()["receipt"]["replayed"] is True


# --- İade ve iptal (Beta.72 tur 11) ---------------------------------------------

def test_app_store_falls_back_to_sandbox_for_review_purchases():
    chain = _apple_chain()
    signed = _signed_transaction({**BASE_TRANSACTION, "environment": "Sandbox"}, chain)
    client = FakeClient({
        ("GET", "api.storekit-sandbox.itunes.apple.com/inApps/v1/transactions/"): FakeResponse(
            200, {"signedTransactionInfo": signed}
        ),
        ("GET", "api.storekit.itunes.apple.com/inApps/v1/transactions/"): FakeResponse(404),
    })
    verifier = AppStoreVerifier(
        issuer_id="12345678-1234-1234-1234-123456789012",
        key_id="ABCDEFGHIJ",
        key=ec.generate_private_key(ec.SECP256R1()),
        bundle_id="com.gridshard.app",
        environment="production",
        root_certificates=[chain[0].public_bytes(serialization.Encoding.DER)],
        client=client,
        now_func=lambda: NOW,
    )
    verified = verifier.verify("gridshard.season_pass_premium", "2000000123456789")
    # Uygulama incelemesi/TestFlight alımı: önce üretim, bulunamazsa sandbox.
    assert verified.environment == "sandbox"
    assert [url.split("/inApps")[0] for _method, url in client.calls] == [
        "https://api.storekit.itunes.apple.com",
        "https://api.storekit-sandbox.itunes.apple.com",
    ]


def _app_store_verifier_for(chain, *, environment="production"):
    return AppStoreVerifier(
        issuer_id="12345678-1234-1234-1234-123456789012",
        key_id="ABCDEFGHIJ",
        key=ec.generate_private_key(ec.SECP256R1()),
        bundle_id="com.gridshard.app",
        environment=environment,
        root_certificates=[chain[0].public_bytes(serialization.Encoding.DER)],
        client=FakeClient({}),
        now_func=lambda: NOW,
    )


def _refund_notification(chain, *, kind="REFUND", bundle="com.gridshard.app", environment="Production"):
    transaction = _signed_transaction({**BASE_TRANSACTION, "revocationDate": 1_790_000_100_000}, chain)
    return _signed_transaction({
        "notificationType": kind,
        "notificationUUID": "11111111-2222-3333-4444-555555555555",
        "data": {
            "bundleId": bundle,
            "environment": environment,
            "signedTransactionInfo": transaction,
        },
        "version": "2.0",
    }, chain)


def test_app_store_notification_is_verified_and_scoped_to_this_app():
    chain = _apple_chain()
    verifier = _app_store_verifier_for(chain)
    view = verifier.verify_notification(_refund_notification(chain))
    assert view["type"] == "REFUND"
    assert view["notification_id"] == "11111111-2222-3333-4444-555555555555"
    assert view["transaction_id"] == "2000000123456789"
    assert view["revoked"] is True
    assert view["ignored"] == ""
    # Üretim sunucusu inceleme/TestFlight (sandbox) bildirimlerini de işler.
    assert verifier.verify_notification(_refund_notification(chain, environment="Sandbox"))["ignored"] == ""
    assert verifier.verify_notification(_refund_notification(chain, bundle="com.other.app"))["ignored"] == "bundle"
    sandbox_only = _app_store_verifier_for(chain, environment="sandbox")
    assert sandbox_only.verify_notification(_refund_notification(chain))["ignored"] == "environment"
    with pytest.raises(StoreVerificationError):
        _app_store_verifier_for(_apple_chain()).verify_notification(_refund_notification(chain))


def _google_oidc(**claim_overrides):
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    numbers = key.public_key().public_numbers()
    jwks = {"keys": [{
        "kty": "RSA",
        "kid": "kid-1",
        "alg": "RS256",
        "n": _b64url(numbers.n.to_bytes((numbers.n.bit_length() + 7) // 8, "big")),
        "e": _b64url(numbers.e.to_bytes(3, "big")),
    }]}
    verifier = GooglePlayNotificationVerifier(
        package_name="com.gridshard.app",
        audience="https://api.gridshard.example/billing/google/rtdn",
        service_account_email="rtdn-push@gridshard.iam.gserviceaccount.com",
        client=FakeClient({("GET", "oauth2/v3/certs"): FakeResponse(200, jwks)}),
        now_func=lambda: NOW,
    )
    claims = {
        "iss": "https://accounts.google.com",
        "aud": verifier.audience,
        "email": verifier.service_account_email,
        "email_verified": True,
        "iat": int(NOW) - 10,
        "exp": int(NOW) + 3600,
        **claim_overrides,
    }
    header = {"alg": "RS256", "kid": "kid-1", "typ": "JWT"}
    signing_input = f"{_b64url(json.dumps(header).encode())}.{_b64url(json.dumps(claims).encode())}"
    signature = key.sign(signing_input.encode("ascii"), padding.PKCS1v15(), hashes.SHA256())
    return verifier, f"Bearer {signing_input}.{_b64url(signature)}"


VOIDED_NOTIFICATION = {
    "version": "1.0",
    "packageName": "com.gridshard.app",
    "eventTimeMillis": "1790000000000",
    "voidedPurchaseNotification": {
        "purchaseToken": "tok_" + "v" * 40,
        "orderId": "GPA.void-1",
        "productType": 2,
        "refundType": 1,
    },
}


def _rtdn_body(notification: dict, message_id: str = "msg-1") -> bytes:
    data = base64.b64encode(json.dumps(notification).encode()).decode()
    return json.dumps({
        "message": {"data": data, "messageId": message_id},
        "subscription": "projects/gridshard/subscriptions/play-rtdn",
    }).encode()


def test_google_rtdn_requires_a_valid_pubsub_oidc_token():
    verifier, authorization = _google_oidc()
    view = verifier.verify(authorization, _rtdn_body(VOIDED_NOTIFICATION))
    assert view["voided"] is True
    assert view["ignored"] == ""
    assert view["notification_id"] == "msg-1"
    assert view["order_id"] == "GPA.void-1"
    assert view["purchase_token"] == "tok_" + "v" * 40
    other_package = {**VOIDED_NOTIFICATION, "packageName": "com.other.app"}
    assert verifier.verify(authorization, _rtdn_body(other_package))["ignored"] == "package"
    for overrides in (
        {"aud": "https://evil.example/rtdn"},
        {"email": "someone@evil.example"},
        {"email_verified": False},
        {"exp": int(NOW) - 1},
        {"iss": "https://evil.example"},
    ):
        bad_verifier, bad_authorization = _google_oidc(**overrides)
        with pytest.raises(StoreVerificationError):
            bad_verifier.verify(bad_authorization, _rtdn_body(VOIDED_NOTIFICATION))
    with pytest.raises(StoreVerificationError, match="kimlik belirteci"):
        verifier.verify(None, _rtdn_body(VOIDED_NOTIFICATION))
    tampered = authorization[:-4] + ("AAAA" if not authorization.endswith("AAAA") else "BBBB")
    with pytest.raises(StoreVerificationError):
        verifier.verify(tampered, _rtdn_body(VOIDED_NOTIFICATION))


def test_refund_revokes_what_the_purchase_granted():
    profile = PlayerProfileService().get_or_create("refund-rules")
    profile.flux_shards = 100
    entry = {
        "key": "google_play:GPA.r-1",
        "product_id": "flux_1050",
        "granted": {"currency": "flux_shards", "amount": 1050},
    }
    profile.purchase_receipts[entry["key"]] = {"key": entry["key"], "refunded": False}
    # Harcanmış para da geri alınır; bakiye eksiye iner, harcama kapanır.
    assert revoke_purchase(profile, entry, now_iso=NOW_ISO) == {
        "currency": "flux_shards", "amount": -1050, "balance": -950,
    }
    assert profile.flux_shards == -950
    assert profile.purchase_receipts[entry["key"]]["refunded"] is True
    restore_refunded_purchase(profile, entry, now_iso=NOW_ISO)
    assert profile.flux_shards == 100
    assert profile.purchase_receipts[entry["key"]]["refunded"] is False

    season = profile.active_meta_season_id
    profile.season_premium_pass_season_id = season
    pass_entry = {
        "key": "app_store:1",
        "product_id": "season_pass_premium",
        "granted": {"season_pass_season_id": season},
    }
    revoke_purchase(profile, pass_entry, now_iso=NOW_ISO)
    assert profile.premium_pass_active() is False
    restore_refunded_purchase(profile, pass_entry, now_iso=NOW_ISO)
    assert profile.premium_pass_active() is True
    # Geçmiş sezonun geçişi iade edilince bu sezonun geçişine dokunulmaz.
    old_entry = {**pass_entry, "key": "app_store:2", "granted": {"season_pass_season_id": "old-season"}}
    assert revoke_purchase(profile, old_entry, now_iso=NOW_ISO) == {}
    assert profile.premium_pass_active() is True

    title, body = store_refund_message(entry, reversed_refund=False, changes={
        "currency": "flux_shards", "amount": -1050, "balance": -950,
    })
    assert title == "Alım iade edildi"
    assert "1.050 Akı" in body and "Geri alınan: 1050; açık: 950" in body
    title, body = store_refund_message(pass_entry, reversed_refund=True, changes={"active": True})
    assert title == "İade geri alındı"
    assert "Ücretli Sezon Geçişi" in body and "Premium hak açıldı" in body


def test_store_ledger_records_owner_once_and_erases_with_account(tmp_path):
    platform = PlatformService(tmp_path / "platform.json", now_func=lambda: NOW)
    receipt = {
        "provider": "google_play",
        "product_id": "flux_1050",
        "transaction_id": "GPA.l-1",
        "granted": {"currency": "flux_shards", "amount": 1050},
        "environment": "production",
        "purchased_at": NOW_ISO,
    }
    first = platform.record_store_receipt(
        "google_play:GPA.l-1", player_id="ledger-a", receipt=receipt, purchase_token="tok-ledger"
    )
    again = platform.record_store_receipt(
        "google_play:GPA.l-1", player_id="ledger-b", receipt=receipt, purchase_token="tok-ledger"
    )
    assert first["player_id"] == again["player_id"] == "ledger-a"
    # Satın alma belirteci yalnız özetiyle saklanır.
    assert "tok-ledger" not in json.dumps(platform._read())
    assert platform.find_store_receipt("google_play", transaction_id="GPA.l-1")["key"] == "google_play:GPA.l-1"
    assert platform.find_store_receipt("google_play", purchase_token="tok-ledger")["player_id"] == "ledger-a"
    assert platform.find_store_receipt("app_store", transaction_id="GPA.l-1") is None
    platform.mark_store_receipt_refunded("google_play:GPA.l-1", refunded=True, source="test", at=NOW_ISO)
    assert platform.store_receipt("google_play:GPA.l-1")["refunded"] is True
    assert platform.store_notification_seen("google:m1") is False
    platform.remember_store_notification("google:m1")
    assert platform.store_notification_seen("google:m1") is True
    platform.erase("ledger-a")
    assert platform.store_receipt("google_play:GPA.l-1") is None
    assert platform.find_store_receipt("google_play", purchase_token="tok-ledger") is None


class _Notifier:
    def __init__(self, view):
        self.view = view

    def verify(self, _authorization, _body):
        return dict(self.view)

    def verify_notification(self, _signed_payload):
        return dict(self.view)


def test_refund_notifications_take_back_and_restore_granted_items(monkeypatch):
    from fastapi.testclient import TestClient

    from app import main as gateway

    client = TestClient(gateway.app)

    # Google Play: alım deftere yazılır, RTDN iadesi Akı'yı geri alır.
    player = "refund-flow-google"
    purchase_token = "tok_" + "r" * 40
    stub = _StubVerifiers(VerifiedPurchase(
        provider="google_play",
        transaction_id="GPA.refund-1",
        store_product_id="gridshard.flux_1050",
        environment="production",
        purchase_token=purchase_token,
        account_token=store_account_token(player),
    ))
    monkeypatch.setattr(gateway, "STORE_VERIFIERS", stub)
    body = {
        "product_id": "flux_1050",
        "provider": "google_play",
        "transaction_id": "GPA.refund-1",
        "purchase_token": purchase_token,
    }
    assert client.post(f"/store/{player}/purchases", json=body).status_code == 200
    profile = gateway.player_profile_service.get(player)
    after_purchase = profile.flux_shards

    stub.google_notifications = _Notifier({
        "notification_id": "pubsub-1",
        "ignored": "",
        "test": False,
        "voided": True,
        "order_id": "GPA.refund-1",
        "purchase_token": purchase_token,
        "product_type": 2,
        "refund_type": 1,
    })
    headers = {"authorization": "Bearer test"}
    refunded = client.post("/billing/google/rtdn", headers=headers, content=b"{}")
    assert refunded.status_code == 200
    assert refunded.json()["changed"] is True
    assert profile.flux_shards == after_purchase - 1050
    # Pub/Sub aynı iletiyi yeniden gönderirse ikinci kez düşülmez.
    assert client.post("/billing/google/rtdn", headers=headers, content=b"{}").json()["duplicate"] is True
    assert profile.flux_shards == after_purchase - 1050
    # İade edilmiş makbuz yeniden gönderilemez.
    assert client.post(f"/store/{player}/purchases", json=body).status_code == 422

    # App Store: REFUND geri alır, REFUND_REVERSED yeniden verir.
    apple_player = "refund-flow-apple"
    apple_stub = _StubVerifiers(VerifiedPurchase(
        provider="app_store",
        transaction_id="2000000999",
        store_product_id="gridshard.credits_9000",
        environment="production",
        account_token=store_account_token(apple_player),
    ))
    monkeypatch.setattr(gateway, "STORE_VERIFIERS", apple_stub)
    assert client.post(f"/store/{apple_player}/purchases", json={
        "product_id": "credits_9000",
        "provider": "app_store",
        "transaction_id": "2000000999",
    }).status_code == 200
    apple_profile = gateway.player_profile_service.get(apple_player)
    credits = apple_profile.circuit_credits
    notification = {
        "notification_id": "uuid-1",
        "type": "REFUND",
        "subtype": "",
        "transaction_id": "2000000999",
        "store_product_id": "gridshard.credits_9000",
        "account_token": "",
        "revoked": True,
        "ignored": "",
    }
    apple_stub.app_store = _Notifier(notification)
    assert client.post(
        "/billing/app-store/notifications", json={"signedPayload": "x"}
    ).json()["changed"] is True
    assert apple_profile.circuit_credits == credits - 9000
    apple_stub.app_store = _Notifier({**notification, "notification_id": "uuid-2", "type": "REFUND_REVERSED"})
    assert client.post(
        "/billing/app-store/notifications", json={"signedPayload": "x"}
    ).json()["changed"] is True
    assert apple_profile.circuit_credits == credits
    apple_stub.app_store = _Notifier({**notification, "notification_id": "uuid-3", "type": "CONSUMPTION_REQUEST"})
    assert client.post(
        "/billing/app-store/notifications", json={"signedPayload": "x"}
    ).json()["ignored"] == "consumption_request"

