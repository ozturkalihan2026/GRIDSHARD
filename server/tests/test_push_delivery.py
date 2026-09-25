"""Isolated provider/outbox contracts; no real device, key or network access."""

import base64
import json
from concurrent.futures import ThreadPoolExecutor

import httpx
import pytest
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec, padding, rsa, utils

from app.platform_services import PlatformService, PlatformServiceError
from app.push_delivery import DeliveryResult, PushSender


class StubSender:
    platforms = ["android", "ios"]
    available_platforms = platforms

    def __init__(self, result=DeliveryResult("accepted", "stub_accepted")):
        self.result = result
        self.calls = []

    def send(self, subscription, item, *, expires_at):
        self.calls.append((subscription, item, expires_at))
        return self.result


@pytest.fixture
def setup(tmp_path):
    clock = [1000]
    sender = StubSender()
    service = PlatformService(tmp_path / "platform.json", now_func=lambda: clock[0], push_sender=sender)
    service.register_device("alice", "phone", "Phone", "android", "session", 100000)
    service.subscribe_push("alice", "phone", "android", "token-abcdefghijklmnop", token_id="session")
    return service, sender, clock


def notification(service):
    return service.queue_notification("alice", "Yeni mesaj", "Bir arkadaşın mesaj gönderdi.",
                                      "gridshard://friends/messages/bob", source_player_id="bob")


def test_inbox_enqueue_is_durable_and_no_network_inside_request(setup):
    service, sender, _ = setup
    item = notification(service)
    assert not sender.calls
    restarted = PlatformService(service.path, now_func=service.now_func, push_sender=sender)
    assert restarted.process_push_once()
    assert not service.process_push_once()
    assert sender.calls[0][1]["notification_id"] == item["notification_id"]
    assert sender.calls[0][1]["recipient_id"] == "alice"
    view = service.notification_view("alice")
    assert view["push"]["deliveries"] == {"accepted": 1}
    assert "token-abcdef" not in json.dumps(view)
    assert "push_jobs" not in json.dumps(service.export_data("alice"))


def test_retry_after_and_expiry_are_obeyed(setup):
    service, sender, clock = setup
    sender.result = DeliveryResult("retry", "fcm_unavailable", 600)
    notification(service)
    assert service.process_push_once()
    clock[0] += 599
    assert not service.process_push_once()
    clock[0] += 17
    sender.result = DeliveryResult("accepted", "fcm_accepted")
    assert service.process_push_once()
    notification(service)
    clock[0] += 86401
    assert not service.process_push_once()
    assert service.notification_view("alice")["push"]["deliveries"]["cancelled"] == 1


@pytest.mark.parametrize("action", ["unsubscribe", "revoke", "erase", "block", "refresh"])
def test_pending_jobs_cannot_outlive_owner_or_subscription(setup, action):
    service, sender, _ = setup
    notification(service)
    if action == "unsubscribe":
        service.unsubscribe_push("alice", "phone", token_id="session")
    elif action == "revoke":
        service.revoke_device("alice", "phone")
    elif action == "erase":
        service.erase("alice")
    elif action == "block":
        service.set_block("alice", "bob", True)
    else:
        service.subscribe_push("alice", "phone", "android", "new-token-abcdefghijklmnop")
    assert not service.process_push_once()
    assert not sender.calls


def test_new_token_survives_late_invalid_response(setup):
    service, _, _ = setup
    notification(service)
    claim = service._claim_push()
    service.subscribe_push("alice", "phone", "android", "new-token-abcdefghijklmnop")
    service._finish_push(claim, DeliveryResult("invalid", "fcm_unregistered"))
    assert service.notification_view("alice")["push"]["subscribed_devices"] == 1


def test_apple_invalidation_timestamp_cannot_remove_new_registration(setup):
    service, _, clock = setup
    service.subscribe_push("alice", "phone", "ios", "a" * 64)
    notification(service)
    claim = service._claim_push()
    clock[0] += 1
    service.subscribe_push("alice", "phone", "ios", "a" * 64)
    service._finish_push(claim, DeliveryResult("invalid", "apns_unregistered", invalidated_at=1000000))
    assert service.notification_view("alice")["push"]["subscribed_devices"] == 1


def test_token_transfer_removes_old_account_jobs(setup):
    service, sender, _ = setup
    notification(service)
    service.register_device("bob", "second", "Phone", "android", "bob-session", 2000)
    service.subscribe_push("bob", "second", "android", "token-abcdefghijklmnop")
    assert service.notification_view("alice")["push"]["subscribed_devices"] == 0
    assert not service.process_push_once()
    assert not sender.calls


def test_session_device_ownership_and_platform_validation(setup):
    service, _, _ = setup
    with pytest.raises(PlatformServiceError):
        service.subscribe_push("alice", "phone", "android", "token-abcdefghijklmnop", token_id="wrong-device")
    with pytest.raises(PlatformServiceError):
        service.unsubscribe_push("alice", "phone", token_id="wrong-device")
    for platform, token in [("web", "x" * 64), ("ios", "../evil"), ("android", "x\n" * 16)]:
        with pytest.raises(PlatformServiceError):
            service.subscribe_push("alice", "phone", platform, token)


def test_two_repository_instances_claim_only_once_and_recover_crashed_lease(setup):
    service, sender, clock = setup
    notification(service)
    second = PlatformService(service.path, now_func=service.now_func, push_sender=sender)
    with ThreadPoolExecutor(2) as executor:
        claims = list(executor.map(lambda repository: repository._claim_push(), [service, second]))
    claim = next(item for item in claims if item)
    assert sum(item is not None for item in claims) == 1
    clock[0] += 121
    replacement = second._claim_push()
    assert replacement and replacement["job"]["attempts"] == 2
    service._finish_push(claim, DeliveryResult("accepted", "late_response"))
    assert service.notification_view("alice")["push"]["deliveries"] == {"sending": 1}
    second._finish_push(replacement, DeliveryResult("accepted", "accepted"))


def test_legacy_inbox_is_not_replayed_and_stale_devices_expire(setup):
    service, sender, clock = setup
    with service._lock:
        data = service._read()
        data["accounts"]["alice"]["notifications"] = [{"notification_id": "old", "title": "old", "body": "old"}]
        service._write(data)
    assert not service.process_push_once()
    clock[0] += service.PUSH_STALE
    assert not service.process_push_once()
    assert not sender.calls
    assert service.notification_view("alice")["push"]["subscribed_devices"] == 0


def decode_jwt(value):
    header, claims, signature = value.split(".")
    decode = lambda part: base64.urlsafe_b64decode(part + "=" * (-len(part) % 4))
    return json.loads(decode(header)), json.loads(decode(claims)), decode(signature), f"{header}.{claims}".encode()


ITEM = {"title": "Title", "body": "Body", "notification_id": "id-123", "recipient_id": "alice", "deep_link": "gridshard://profile/bob"}


def test_fcm_oauth_signature_payload_and_access_token_reuse():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    seen = []

    def handle(request):
        seen.append(request)
        if request.url.path == "/token":
            from urllib.parse import parse_qs
            assertion = parse_qs(request.content.decode())["assertion"][0]
            header, claims, signature, signed = decode_jwt(assertion)
            key.public_key().verify(signature, signed, padding.PKCS1v15(), hashes.SHA256())
            assert header["alg"] == "RS256" and claims["exp"] == 4600
            assert claims["scope"].endswith("firebase.messaging")
            return httpx.Response(200, json={"access_token": "safe-fixture", "expires_in": 3600})
        payload = json.loads(request.content)["message"]
        assert payload["data"]["recipient_id"] == "alice"
        assert payload["android"]["notification"]["channel_id"] == "gridshard_social"
        assert request.headers["authorization"] == "Bearer safe-fixture"
        return httpx.Response(200, json={"name": "projects/fixture/messages/123"})

    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        sender = PushSender(fcm={"project": "fixture", "email": "fixture@example.test", "key": key}, client=client, now_func=lambda: 1000)
        for _ in range(2):
            assert sender.send({"platform": "android", "token": "fake-token"}, ITEM, expires_at=2000).status == "accepted"
    assert len(seen) == 3


@pytest.mark.parametrize("status,code,expected", [(404, "UNREGISTERED", "invalid"), (400, "INVALID_ARGUMENT", "failed"),
                                                  (403, "SENDER_ID_MISMATCH", "retry"), (429, "QUOTA_EXCEEDED", "retry")])
def test_fcm_failure_classification_never_deletes_on_auth_or_payload_error(status, code, expected):
    def handle(_request):
        return httpx.Response(status, headers={"Retry-After": "180"}, json={"error": {"details": [
            {"@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", "errorCode": code}]}})
    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        sender = PushSender(fcm={"project": "fixture"}, client=client, now_func=lambda: 1000)
        sender._google_token = ("fixture-token", 2000)
        result = sender.send({"platform": "android", "token": "fake-token"}, ITEM, expires_at=2000)
        assert result.status == expected
        if expected == "retry":
            assert result.retry_after >= 180 and sender.available_platforms == []


def test_apns_es256_signature_headers_payload_and_token_reuse():
    key = ec.generate_private_key(ec.SECP256R1())
    bearers = []

    def handle(request):
        bearer = request.headers["authorization"].split(" ", 1)[1]
        bearers.append(bearer)
        header, claims, signature, signed = decode_jwt(bearer)
        r, s = int.from_bytes(signature[:32], "big"), int.from_bytes(signature[32:], "big")
        key.public_key().verify(utils.encode_dss_signature(r, s), signed, ec.ECDSA(hashes.SHA256()))
        assert header == {"alg": "ES256", "kid": "KEY1234567"}
        assert claims == {"iss": "TEAM123456", "iat": 1000}
        assert request.headers["apns-topic"] == "test.gridshard"
        assert request.headers["apns-push-type"] == "alert"
        assert request.headers["apns-expiration"] == "2000"
        assert json.loads(request.content)["aps"]["alert"]["body"] == "Body"
        return httpx.Response(200)

    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        sender = PushSender(apns={"key": key, "team": "TEAM123456", "key_id": "KEY1234567", "topic": "test.gridshard", "host": "api.sandbox.push.apple.com"}, client=client, now_func=lambda: 1000)
        for _ in range(2):
            assert sender.send({"platform": "ios", "token": "a" * 64}, ITEM, expires_at=2000).status == "accepted"
    assert bearers[0] == bearers[1]


def test_disabled_sender_does_not_open_any_provider(monkeypatch):
    monkeypatch.setenv("GRIDSHARD_PUSH_ENABLED", "0")
    sender = PushSender.from_environment()
    assert sender.platforms == [] and sender.client is None
    assert sender.send({"platform": "android"}, ITEM, expires_at=2000).code == "provider_disabled"


@pytest.mark.parametrize("status,reason,expected", [(410, "Unregistered", "invalid"), (400, "BadDeviceToken", "failed"),
                                                    (403, "InvalidProviderToken", "retry"), (503, "Shutdown", "retry")])
def test_apns_response_classification(status, reason, expected):
    with httpx.Client(transport=httpx.MockTransport(lambda _request: httpx.Response(
        status, json={"reason": reason, "timestamp": 999000}, headers={"retry-after": "180"},
    ))) as client:
        sender = PushSender(apns={"topic": "test.gridshard", "host": "api.push.apple.com"}, client=client, now_func=lambda: 1000)
        sender._apple_token = ("fixture-token", 2000)
        result = sender.send({"platform": "ios", "token": "a" * 64}, ITEM, expires_at=2000)
        assert result.status == expected
        if expected == "invalid":
            assert result.invalidated_at == 999000


def test_finish_after_account_deletion_does_not_recreate_account(setup):
    service, _, _ = setup
    notification(service)
    claim = service._claim_push()
    service.erase("alice")
    service._finish_push(claim, DeliveryResult("accepted", "accepted"))
    with service._lock:
        assert "alice" not in service._read()["accounts"]


def test_definitively_invalid_token_is_removed_but_inbox_survives(setup):
    service, sender, _ = setup
    notification(service)
    sender.result = DeliveryResult("invalid", "fcm_unregistered")
    service.process_push_once()
    assert service.notification_view("alice")["push"]["subscribed_devices"] == 0
    assert len(service.notification_view("alice")["notifications"]) == 1


def test_live_provider_requires_credentials_but_does_not_echo_secret_paths(monkeypatch):
    monkeypatch.setenv("GRIDSHARD_PUSH_ENABLED", "1")
    monkeypatch.setenv("GRIDSHARD_FCM_SERVICE_ACCOUNT_FILE", "missing-sensitive-credential-path")
    with pytest.raises(ValueError) as error:
        PushSender.from_environment()
    assert "missing-sensitive" not in str(error.value)
