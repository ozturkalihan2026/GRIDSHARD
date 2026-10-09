"""Trusted server operator CLI; no public API or new account permissions.

Run in the existing application's private runtime after reviewing delivery
evidence. Default is read-only/dry-run; --apply is a balance-changing action.
Never provide purchase tokens, log bodies, customer emails or secrets as args.
"""

from __future__ import annotations

import argparse
import json


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("receipt_key", help="Existing ledger receipt key, not a purchase token")
    parser.add_argument("--case-id", required=True, help="Non-sensitive support/evidence case reference")
    parser.add_argument("--reviewed-by", required=True, help="Operator handle, not an email or credential")
    parser.add_argument("--apply", action="store_true", help="Apply verified publisher-error correction")
    args = parser.parse_args(argv)
    from .main import _review_store_refund_publisher_error

    try:
        result = _review_store_refund_publisher_error(
            args.receipt_key, case_id=args.case_id, reviewed_by=args.reviewed_by, apply=args.apply,
        )
    except ValueError as exc:
        parser.error(str(exc))
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
