"""Fixed HTTPS App Link targets and public signing certificates, never secrets."""
from __future__ import annotations

import base64
import hashlib
import os
import re
from urllib.parse import urlsplit


NATIVE_AUTH_TARGETS = {
    "android": ("/native-auth/android", "com.gridshardgame.app", "GRIDSHARD_ANDROID_AUTH_CERT_SHA256"),
    "android-test": ("/native-auth/android-test", "com.gridshard.remotedebug", "GRIDSHARD_ANDROID_TEST_AUTH_CERT_SHA256"),
}


def signing_fingerprints(target: str) -> list[str]:
    raw = os.environ.get(NATIVE_AUTH_TARGETS[target][2], "").strip()
    if not raw:
        return []
    result = []
    for value in raw.split(","):
        compact = value.strip().replace(":", "")
        if not re.fullmatch(r"[0-9a-fA-F]{64}", compact):
            raise ValueError("Android OAuth sertifika parmak izi geçersiz.")
        result.append(":".join(compact[i:i + 2].upper() for i in range(0, 64, 2)))
    return sorted(set(result))


def asset_links() -> list[dict]:
    result = []
    for target, (_, package, _) in NATIVE_AUTH_TARGETS.items():
        fingerprints = signing_fingerprints(target)
        if fingerprints:
            result.append({
                "relation": ["delegate_permission/common.handle_all_urls"],
                "target": {"namespace": "android_app", "package_name": package,
                           "sha256_cert_fingerprints": fingerprints},
            })
    return result


def native_return_url(base: str, target: str) -> str:
    if target not in NATIVE_AUTH_TARGETS:
        raise ValueError("Desteklenmeyen native OAuth dönüş hedefi.")
    url = urlsplit(base)
    if (url.scheme != "https" or not url.hostname or url.username or url.password
            or url.port not in {None, 443} or url.query or url.fragment or url.path not in {"", "/"}):
        raise ValueError("Native OAuth için HTTPS oyun kökeni gerekli.")
    if not signing_fingerprints(target):
        raise ValueError("Android doğrulanmış giriş bağlantısı henüz yapılandırılmadı.")
    return base.rstrip("/") + NATIVE_AUTH_TARGETS[target][0]


def pkce_challenge(verifier: str) -> str:
    if not re.fullmatch(r"[A-Za-z0-9._~-]{43,128}", verifier):
        raise ValueError("OAuth cihaz doğrulama anahtarı geçersiz.")
    return base64.urlsafe_b64encode(hashlib.sha256(verifier.encode("ascii")).digest()).rstrip(b"=").decode("ascii")

