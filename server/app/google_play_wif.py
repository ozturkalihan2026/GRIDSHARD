"""Opt-in, keyless Google Play auth for an EC2 IMDSv2 workload.

Only an explicitly pinned AWS WIF configuration is accepted. No ADC/user
credential discovery, executable credential sources, or service-account keys.
AWS request signing/token exchange is delegated to Google's auth library.
"""

from __future__ import annotations

from datetime import timezone
import json
import os
from pathlib import Path
import re
from threading import Lock
import time


PUBLISHER_SCOPE = "https://www.googleapis.com/auth/androidpublisher"
STS_URL = "https://sts.googleapis.com/v1/token"
IMDS_TOKEN_URL = "http://169.254.169.254/latest/api/token"
IMDS_REGION_URL = "http://169.254.169.254/latest/meta-data/placement/availability-zone"
IMDS_ROLE_URL = "http://169.254.169.254/latest/meta-data/iam/security-credentials"
AWS_VERIFICATION_URL = "https://sts.{region}.amazonaws.com?Action=GetCallerIdentity&Version=2011-06-15"
AWS_SUBJECT_TYPE = "urn:ietf:params:aws:token-type:aws4_request"
CONFIG_ERROR = "Google Play AWS WIF yapılandırması geçersiz; docs/GOOGLE_PLAY_AWS_WIF.md belgesine bakın."
TOKEN_ERROR = "Google Play anahtarsız doğrulama yetkisi şu anda alınamadı."
_AUDIENCE = re.compile(
    r"//iam\.googleapis\.com/projects/[1-9][0-9]{0,19}/locations/global/"
    r"workloadIdentityPools/[a-z][a-z0-9-]{2,31}/providers/[a-z][a-z0-9-]{2,31}"
)
_EMAIL = re.compile(r"[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}@[a-zA-Z0-9][a-zA-Z0-9.-]{0,127}\.iam\.gserviceaccount\.com")
_ROLE = re.compile(r"[a-zA-Z0-9_+=,.@-]{1,64}")
_BEARER = re.compile(r"[a-zA-Z0-9._~+/-]{1,16384}=*")
_CONFIG_KEYS = frozenset({
    "type", "audience", "subject_token_type", "token_url", "credential_source",
    "service_account_impersonation_url", "service_account_impersonation",
    "token_info_url", "universe_domain",
})
_SOURCE = {
    "environment_id": "aws1",
    "region_url": IMDS_REGION_URL,
    "url": IMDS_ROLE_URL,
    "regional_cred_verification_url": AWS_VERIFICATION_URL,
    "imdsv2_session_token_url": IMDS_TOKEN_URL,
}
_AWS_SECRET_ENV = ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN")


class WifTokenError(ValueError):
    """Sanitized auth failure: never include config, credentials, or replies."""


def _no_duplicate_keys(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError("duplicate key")
        result[key] = value
    return result


def load_aws_wif_config(path: str, *, email: str, audience: str) -> dict:
    """Local-only validation before handing any config to the auth library."""
    try:
        config_path = Path(path)
        if not path or config_path.is_symlink() or not config_path.is_file() or config_path.stat().st_size > 65536:
            raise ValueError("file")
        if not _EMAIL.fullmatch(email) or not _AUDIENCE.fullmatch(audience):
            raise ValueError("pin")
        config = json.loads(config_path.read_text(encoding="utf-8"), object_pairs_hook=_no_duplicate_keys)
        impersonation_url = f"https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/{email}:generateAccessToken"
        if (
            not isinstance(config, dict) or not set(config) <= _CONFIG_KEYS
            or config.get("type") != "external_account"
            or config.get("audience") != audience
            or config.get("subject_token_type") != AWS_SUBJECT_TYPE
            or config.get("token_url") != STS_URL
            or config.get("service_account_impersonation_url") != impersonation_url
            or config.get("credential_source") != _SOURCE
            or config.get("universe_domain", "googleapis.com") != "googleapis.com"
            or config.get("token_info_url", "https://sts.googleapis.com/v1/introspect") != "https://sts.googleapis.com/v1/introspect"
        ):
            raise ValueError("config")
        options = config.get("service_account_impersonation", {})
        lifetime = options.get("token_lifetime_seconds", 3600) if isinstance(options, dict) else None
        if (
            not isinstance(options, dict) or not set(options) <= {"token_lifetime_seconds"}
            or type(lifetime) is not int or not 300 <= lifetime <= 3600
            or any(os.environ.get(name) for name in _AWS_SECRET_ENV)
        ):
            raise ValueError("lifetime or static credentials")
        return config
    except (OSError, UnicodeError, ValueError, TypeError, AttributeError):
        raise ValueError(CONFIG_ERROR) from None


class _AuthResponse:
    def __init__(self, response):
        self.status = response.status_code
        self.data = response.content
        self.headers = response.headers


class _BoundedAuthRequest:
    """google.auth transport using pinned URLs and the existing httpx stack."""

    def __init__(self, client, impersonation_url: str):
        self.client = client
        self.impersonation_url = impersonation_url

    def __call__(self, url, method="GET", body=None, headers=None, timeout=None, **_kwargs):
        method = method.upper()
        headers = headers or {}
        metadata = url in {IMDS_TOKEN_URL, IMDS_REGION_URL, IMDS_ROLE_URL}
        if url.startswith(IMDS_ROLE_URL + "/"):
            metadata = _ROLE.fullmatch(url[len(IMDS_ROLE_URL) + 1:]) is not None
        if metadata:
            lowered = {key.lower(): value for key, value in headers.items()}
            allowed = (
                method == "PUT" if url == IMDS_TOKEN_URL else
                method == "GET" and bool(lowered.get("x-aws-ec2-metadata-token"))
            ) and "authorization" not in lowered
        else:
            allowed = method == "POST" and url in {STS_URL, self.impersonation_url}
        if not allowed:
            raise WifTokenError(TOKEN_ERROR)
        try:
            response = self.client.request(
                method, url, content=body, headers=headers, timeout=10, follow_redirects=False,
            )
            # Do not pass metadata/IAM error bodies into SDK exceptions or logs.
            if response.status_code != 200:
                raise WifTokenError(TOKEN_ERROR)
            return _AuthResponse(response)
        except Exception:
            raise WifTokenError(TOKEN_ERROR) from None


class AwsWifTokenProvider:
    def __init__(self, credentials, request, *, now_func=time.time):
        self.credentials = credentials
        self.request = request
        self.now = now_func
        self._token = ("", 0)
        self._lock = Lock()

    @classmethod
    def from_file(cls, path: str, *, email: str, audience: str, client_factory=None):
        config = load_aws_wif_config(path, email=email, audience=audience)
        try:
            from google.auth import aws

            credentials = aws.Credentials.from_info(config, scopes=[PUBLISHER_SCOPE])
            if credentials.service_account_email != email or not credentials.has_scopes([PUBLISHER_SCOPE]):
                raise ValueError("identity")
        except Exception:
            raise ValueError(CONFIG_ERROR) from None
        if client_factory is None:
            import httpx

            # Never send EC2 metadata/auth exchanges through environment proxies.
            client = httpx.Client(timeout=10, follow_redirects=False, trust_env=False)
        else:
            client = client_factory()
        request = _BoundedAuthRequest(client, config["service_account_impersonation_url"])
        return cls(credentials, request)

    def invalidate(self):
        with self._lock:
            self._token = ("", 0)

    def token(self) -> str:
        with self._lock:
            now = self.now()
            token, expires = self._token
            try:
                if any(os.environ.get(name) for name in _AWS_SECRET_ENV):
                    raise ValueError("static credentials")
                if token and expires > now + 60:
                    return token
                self.credentials.refresh(self.request)
                token = self.credentials.token
                expiry = self.credentials.expiry
                if expiry is None:
                    raise ValueError("expiry")
                if expiry.tzinfo is None:
                    expiry = expiry.replace(tzinfo=timezone.utc)
                expires = expiry.timestamp()
                if not isinstance(token, str) or len(token) > 16384 or not _BEARER.fullmatch(token) or not now + 60 < expires <= self.now() + 3605:
                    raise ValueError("token")
                self._token = (token, expires)
                return token
            except Exception:
                self._token = ("", 0)
                raise WifTokenError(TOKEN_ERROR) from None
