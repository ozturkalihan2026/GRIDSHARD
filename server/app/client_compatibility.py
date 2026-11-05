"""Reviewed API compatibility, independent of product release numbering.

Old 2.2.1/2.3 clients cannot negotiate: their literal health comparisons must
remain usable while their APIs remain supported. New clients read the actual
runtime version and this explicit policy; it never overrides PvP/readiness.
"""
from .version import LEGACY_HEALTH_VERSION, LEGACY_RELEASE_VERSION, LEGACY_SERVER_RELEASE_VERSION

API_CONTRACT_VERSION = 1
MINIMUM_CLIENT_VERSION = "2.2.1"
SUPPORTED_CLIENT_VERSIONS = ("2.2.1", "2.3.0", "2.4.0")
SUPPORTED_CLIENT_RELEASE_LINES = ("2.2", "2.3", "2.4")
CAPABILITIES = ("game.v1", "profile.v1", "season.stock.v1", "season.missions.v1", "reward-inbox.open.v1")


def health_release_fields(runtime_version):
    supported = list(dict.fromkeys((*SUPPORTED_CLIENT_VERSIONS, runtime_version)))
    lines = list(dict.fromkeys((*SUPPORTED_CLIENT_RELEASE_LINES, runtime_version.rsplit('.', 1)[0])))
    return {
        "version": LEGACY_HEALTH_VERSION,
        "release_version": LEGACY_RELEASE_VERSION,
        "server_release_version": LEGACY_SERVER_RELEASE_VERSION,
        "runtime_release_version": runtime_version,
        "compatible_client_releases": supported,
        "client_compatibility": {
            "schema_version": 1,
            "api_contract_version": API_CONTRACT_VERSION,
            "minimum_client_version": MINIMUM_CLIENT_VERSION,
            "supported_client_versions": list(supported),
            "supported_client_release_lines": lines,
            "capabilities": list(CAPABILITIES),
        },
    }
