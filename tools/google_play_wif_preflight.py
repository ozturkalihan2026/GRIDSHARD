"""Validate the pinned AWS WIF configuration without network or token access."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parents[1]


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--config", required=True)
    parser.add_argument("--email", required=True, help="Previously verified Play billing service account")
    parser.add_argument("--audience", required=True, help="Previously verified full AWS workload provider audience")
    args = parser.parse_args(argv)
    sys.path.insert(0, str(ROOT / "server"))
    from app.google_play_wif import load_aws_wif_config

    try:
        config = load_aws_wif_config(args.config, email=args.email, audience=args.audience)
    except ValueError:
        print(json.dumps({"config_valid": False, "network_calls": 0, "external_connection_verified": False}))
        return 2
    print(json.dumps({
        "config_valid": True, "auth_mode": "aws_wif", "identity_pinned": True,
        "imdsv2_required": True, "private_key_present": False,
        "max_token_lifetime_seconds": config.get("service_account_impersonation", {}).get("token_lifetime_seconds", 3600),
        "network_calls": 0, "external_connection_verified": False,
    }))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
