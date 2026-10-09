"""Server-only decisions for the approved refund/negative-balance policy.

Provider reason codes and client requests are NOT publisher-error evidence.
Only a reviewed case recorded by a trusted server operator grants the exception.
"""

from __future__ import annotations


CURRENCIES = {"flux_shards", "circuit_credits"}


def publisher_error_verified(entry: dict) -> bool:
    review = entry.get("refund_review") or {}
    return (
        isinstance(review, dict)
        and review.get("decision") == "publisher_error_verified"
        and bool(review.get("case_id"))
        and bool(review.get("reviewed_by"))
        and bool(review.get("reviewed_at"))
    )


def refund_debit(entry: dict, balance: int) -> tuple[int, int]:
    amount = max(0, int((entry.get("granted") or {}).get("amount", 0)))
    # Do not create new debt for verified publisher failures, or erase debt
    # belonging to another purchase. Recover any still-unspent grant normally.
    debit = min(amount, max(0, balance)) if publisher_error_verified(entry) else amount
    return debit, amount - debit


def refund_effect(entry: dict, changes: dict, balance_before: int) -> dict:
    currency = str((entry.get("granted") or {}).get("currency") or "")
    if currency not in CURRENCIES or changes.get("currency") != currency:
        return {}
    return {
        "currency": currency,
        "balance_before": balance_before,
        "balance_after": int(changes["balance"]),
        "debited_amount": max(0, -int(changes["amount"])),
        "waived_amount": int(changes.get("waived_amount", 0)),
    }


def publisher_error_correction(entry: dict) -> tuple[int, dict]:
    """Correct only the deficit caused by this receipt, even after later earning.

    Old receipts without a causal balance snapshot fail closed: an operator
    must inspect their delivery/balance history instead of guessing an amount.
    """
    effect = dict(entry.get("refund_effect") or {})
    granted = entry.get("granted") or {}
    if granted.get("currency") not in CURRENCIES or not entry.get("refunded"):
        return 0, effect
    if publisher_error_verified(entry):
        return 0, effect
    try:
        before = int(effect["balance_before"])
        after = int(effect["balance_after"])
        debit = int(effect["debited_amount"])
        waived = int(effect["waived_amount"])
        amount = int(granted["amount"])
        valid = (
            effect["currency"] == granted["currency"]
            and 0 <= debit <= amount
            and waived >= 0 and debit + waived == amount
            and before - after == debit
        )
    except (KeyError, TypeError, ValueError):
        valid = False
    if not valid:
        raise ValueError("İade bakiye kaydı inceleme gerektiriyor; otomatik düzeltme yapılmadı.")
    correction = max(0, -after) - max(0, -before)
    effect["debited_amount"] = debit - correction
    effect["waived_amount"] = waived + correction
    # The snapshot remains the original refund decision, not today's balance.
    effect["balance_after"] = after + correction
    return correction, effect
