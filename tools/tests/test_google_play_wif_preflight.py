from __future__ import annotations

import json
import sys

import pytest

from tools.google_play_wif_preflight import ROOT, main
from tools.package_release import is_release_input


EMAIL = "billing@test-project.iam.gserviceaccount.com"
AUDIENCE = "//iam.googleapis.com/projects/123456789012/locations/global/workloadIdentityPools/gridshard-test/providers/aws-test"


def write_config(tmp_path):
    path = tmp_path / "fixture-config.json"
    path.write_text(json.dumps({
        "type": "external_account", "audience": AUDIENCE,
        "subject_token_type": "urn:ietf:params:aws:token-type:aws4_request",
        "token_url": "https://sts.googleapis.com/v1/token",
        "service_account_impersonation_url": f"https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/{EMAIL}:generateAccessToken",
        "credential_source": {
            "environment_id": "aws1",
            "region_url": "http://169.254.169.254/latest/meta-data/placement/availability-zone",
            "url": "http://169.254.169.254/latest/meta-data/iam/security-credentials",
            "regional_cred_verification_url": "https://sts.{region}.amazonaws.com?Action=GetCallerIdentity&Version=2011-06-15",
            "imdsv2_session_token_url": "http://169.254.169.254/latest/api/token",
        },
    }), encoding="utf-8")
    return path


@pytest.fixture(autouse=True)
def no_static_aws_keys(monkeypatch):
    for key in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN"):
        monkeypatch.delenv(key, raising=False)


def test_offline_preflight_never_loads_sdk_or_requests_tokens(tmp_path, capsys, monkeypatch):
    path = write_config(tmp_path)
    # A deployment preflight must work without loading/discovering credentials.
    monkeypatch.setitem(sys.modules, "google.auth.aws", None)
    assert main(["--config", str(path), "--email", EMAIL, "--audience", AUDIENCE]) == 0
    output = capsys.readouterr()
    summary = json.loads(output.out)
    assert summary == {
        "config_valid": True, "auth_mode": "aws_wif", "identity_pinned": True,
        "imdsv2_required": True, "private_key_present": False, "max_token_lifetime_seconds": 3600,
        "network_calls": 0, "external_connection_verified": False,
    }
    assert str(path) not in output.out and EMAIL not in output.out and AUDIENCE not in output.out
    assert output.err == ""


def test_rejected_preflight_does_not_print_raw_config_or_exception(tmp_path, capsys):
    path = tmp_path / "bad-config.json"
    path.write_text('{"private_key":"fixture-not-for-stdout"}', encoding="utf-8")
    assert main(["--config", str(path), "--email", EMAIL, "--audience", AUDIENCE]) == 2
    output = capsys.readouterr()
    assert json.loads(output.out) == {"config_valid": False, "network_calls": 0, "external_connection_verified": False}
    assert "fixture-not-for-stdout" not in output.out + output.err
    assert "Traceback" not in output.out + output.err


def test_unapplied_compose_layer_is_api_only_without_test_or_ad_changes():
    yaml = pytest.importorskip("yaml")
    layer = yaml.safe_load((ROOT / "docker-compose.google-play-wif.yml").read_text(encoding="utf-8"))
    assert set(layer) == {"services", "secrets"}
    assert set(layer["services"]) == {"relay-web"}
    api = layer["services"]["relay-web"]
    assert set(api) == {"environment", "secrets"}
    assert api["secrets"] == ["google_play_wif_config"]
    assert api["environment"]["GRIDSHARD_GOOGLE_PLAY_AUTH_MODE"] == "aws_wif"
    assert api["environment"]["GRIDSHARD_GOOGLE_PLAY_PACKAGE_NAME"] == "com.gridshardgame.app"
    assert all(name.startswith("GRIDSHARD_GOOGLE_PLAY_") for name in api["environment"])
    assert "/run/secrets/google_play_wif_config" == api["environment"]["GRIDSHARD_GOOGLE_PLAY_WIF_CONFIG_FILE"]
    assert layer["secrets"]["google_play_wif_config"]["file"].startswith("${GRIDSHARD_SECRETS_DIR:?")


@pytest.mark.parametrize("path", [
    "secrets/billing/google_play_wif_config.json", "deploy/google_play_wif_config",
    "deploy/google_play_wif_config.json", "deploy/google_play_service_account.json",
])
def test_auth_configuration_cannot_enter_release_archive_even_if_tracked(path):
    assert not is_release_input(path)


def test_source_and_operator_templates_remain_release_inputs():
    assert is_release_input("server/app/google_play_wif.py")
    assert is_release_input("docker-compose.google-play-wif.yml")
    assert is_release_input("tools/google_play_wif_preflight.py")
