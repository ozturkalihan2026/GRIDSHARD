"""Personal data copies are signed reports, never restorable game saves."""
from copy import deepcopy
import hashlib
import hmac
import json
import time


EXPORT_PURPOSE = "personal_data_copy_not_game_save"


def _signature(payload: dict, signing_key: bytes) -> str:
    # Domain separation prevents export signatures being usable as auth tokens.
    key = hmac.new(signing_key, b"gridshard:personal-export:v1", hashlib.sha256).digest()
    message = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False)
    return hmac.new(key, message.encode("utf-8"), hashlib.sha256).hexdigest()


def build_personal_export(player_data: dict, platform_data: dict, signing_key: bytes, *, product_analytics: list[dict] | None = None) -> dict:
    payload = {
        "schema_version": 2,
        "purpose": EXPORT_PURPOSE,
        "restorable": False,
        "progression_authority": "server",
        "exported_at": int(time.time()),
        "player_data": deepcopy(player_data),
        "platform_data": deepcopy(platform_data),
        "product_analytics": deepcopy(product_analytics or []),
    }
    return {**payload, "integrity": {"algorithm": "HMAC-SHA256", "signature": _signature(payload, signing_key)}}


def verify_personal_export(document: dict, signing_key: bytes) -> bool:
    """Operator-side integrity check only; deliberately does not import data."""
    if not isinstance(document, dict):
        return False
    payload = {key: value for key, value in document.items() if key != "integrity"}
    integrity = document.get("integrity")
    if (payload.get("schema_version") != 2 or payload.get("purpose") != EXPORT_PURPOSE
            or payload.get("restorable") is not False
            or not isinstance(integrity, dict) or integrity.get("algorithm") != "HMAC-SHA256"):
        return False
    signature = integrity.get("signature")
    if not isinstance(signature, str) or len(signature) != 64:
        return False
    try:
        return hmac.compare_digest(signature, _signature(payload, signing_key))
    except (ValueError, TypeError, UnicodeError):
        return False
