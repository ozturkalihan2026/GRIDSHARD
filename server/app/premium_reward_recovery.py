"""Prospective season-pass reward recovery. Never infer liability for old receipts.

The rollout defaults to legacy. A server-written receipt version is required;
claims are server wallet deltas, including the actual opened chest contents.
All callers must commit this private ledger and the wallet atomically.
"""

from copy import deepcopy
from datetime import datetime
import os
import re

from .store_refund_policy import publisher_error_verified


POLICY_VERSION = "season-rewards-v1"
LEGACY_POLICY = "legacy"
SCALARS = {"flux_shards", "circuit_credits", "universal_module_shards"}
MAPS = {"module_shards", "core_shards_by_type"}


class PremiumRecoveryError(ValueError):
    pass


def policy_from_environment(environ=None) -> str:
    environ = os.environ if environ is None else environ
    value = environ.get("GRIDSHARD_SEASON_PASS_REFUND_POLICY", LEGACY_POLICY).strip()
    if value not in {LEGACY_POLICY, POLICY_VERSION}:
        raise RuntimeError("GRIDSHARD_SEASON_PASS_REFUND_POLICY: legacy veya season-rewards-v1 olmalıdır.")
    return value


def cutover_from_environment(policy: str, environ=None) -> int:
    """An explicit UTC effective date is mandatory before enabling the draft."""
    if policy == LEGACY_POLICY:
        return 0
    environ = os.environ if environ is None else environ
    value = environ.get("GRIDSHARD_SEASON_PASS_REFUND_POLICY_FROM", "").strip()
    try:
        date = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if date.tzinfo is None or date.utcoffset().total_seconds() != 0:
            raise ValueError("UTC required")
        milliseconds = int(date.timestamp() * 1000)
        if milliseconds <= 0:
            raise ValueError("positive timestamp required")
        return milliseconds
    except (ValueError, OverflowError):
        raise RuntimeError("GRIDSHARD_SEASON_PASS_REFUND_POLICY_FROM: açık bir UTC yürürlük tarihi gereklidir.") from None


def policy_for_purchase(policy: str, cutover_ms: int, purchased_at_ms: int, acknowledgement: str) -> str:
    """Use only the provider-verified date, never the client submission date."""
    if policy == LEGACY_POLICY:
        return LEGACY_POLICY
    if not isinstance(purchased_at_ms, int) or isinstance(purchased_at_ms, bool) or purchased_at_ms <= 0:
        raise PremiumRecoveryError("Mağazanın doğruladığı satın alma zamanı eksik; alım henüz işlenmedi.")
    if purchased_at_ms < cutover_ms:
        return LEGACY_POLICY
    if acknowledgement != POLICY_VERSION:
        raise PremiumPolicyAcknowledgementRequired("Yeni sezon geçişi iade koşulunu uygulama içinde onayla; alım henüz işlenmedi.")
    return POLICY_VERSION


class PremiumPolicyAcknowledgementRequired(PremiumRecoveryError):
    pass


def _resource_parts(resource: str) -> tuple[str, str]:
    if resource in SCALARS:
        return resource, ""
    field, separator, identity = resource.partition(":")
    if separator and field in MAPS and re.fullmatch(r"[A-Za-z0-9_-]{1,100}", identity):
        return field, identity
    raise PremiumRecoveryError("Premium ödül kaynak kaydı inceleme gerektiriyor.")


def _amounts(resources: dict) -> dict:
    if not isinstance(resources, dict):
        raise PremiumRecoveryError("Premium ödül miktar kaydı inceleme gerektiriyor.")
    for resource, amount in resources.items():
        _resource_parts(resource)
        if not isinstance(amount, int) or isinstance(amount, bool) or amount < 0:
            raise PremiumRecoveryError("Premium ödül miktar kaydı inceleme gerektiriyor.")
    return resources


def _balance(profile, resource: str) -> int:
    field, identity = _resource_parts(resource)
    return int(getattr(profile, field).get(identity, 0) if identity else getattr(profile, field))


def _add(profile, resource: str, amount: int) -> None:
    field, identity = _resource_parts(resource)
    if identity:
        wallet = getattr(profile, field)
        wallet[identity] = int(wallet.get(identity, 0)) + amount
    else:
        setattr(profile, field, int(getattr(profile, field)) + amount)


def wallet_snapshot(profile) -> dict:
    result = {resource: _balance(profile, resource) for resource in SCALARS}
    for field in MAPS:
        result.update({f"{field}:{identity}": int(amount) for identity, amount in getattr(profile, field).items()})
    return result


def _root(profile, season_id: str) -> dict:
    root = profile.premium_reward_recovery.get(season_id)
    if not isinstance(root, dict) or root.get("policy_version") != POLICY_VERSION:
        raise PremiumRecoveryError("Premium satın alma kaynak kaydı inceleme gerektiriyor.")
    if not isinstance(root.get("purchases"), dict) or not isinstance(root.get("claims"), dict):
        raise PremiumRecoveryError("Premium satın alma kaynak kaydı inceleme gerektiriyor.")
    if any(not isinstance(item, dict) or not isinstance(item.get("refunded"), bool) for item in root["purchases"].values()):
        raise PremiumRecoveryError("Premium satın alma kaynak kaydı inceleme gerektiriyor.")
    return root


def active_reward_snapshot(profile) -> dict | None:
    key = profile.season_premium_purchase_key
    root = profile.premium_reward_recovery.get(profile.active_meta_season_id)
    if not root or key not in root.get("purchases", {}):
        return None  # legacy rights and all previously claimed rewards are untouched
    root = _root(profile, profile.active_meta_season_id)
    if root["purchases"][key].get("refunded") or root.get("recovered"):
        raise PremiumRecoveryError("İade edilmiş premium alımdan yeni ödül alınamaz.")
    return wallet_snapshot(profile)


def record_reward_delta(profile, claim_id: str, before: dict | None) -> None:
    if before is None:
        return
    root = _root(profile, profile.active_meta_season_id)
    if claim_id in root["claims"]:
        raise PremiumRecoveryError("Premium ödül kaynak kaydı yinelendi.")
    after = wallet_snapshot(profile)
    resources = {
        resource: amount - before.get(resource, 0)
        for resource, amount in after.items() if amount > before.get(resource, 0)
    }
    _amounts(resources)
    root["claims"][claim_id] = {"purchase_key": profile.season_premium_purchase_key, "resources": resources}


def _liability(root: dict) -> dict:
    total = {}
    for claim in root["claims"].values():
        if not isinstance(claim, dict) or claim.get("purchase_key") not in root["purchases"]:
            raise PremiumRecoveryError("Premium ödül kaynak kaydı inceleme gerektiriyor.")
        for resource, amount in _amounts(claim["resources"]).items():
            total[resource] = total.get(resource, 0) + amount
    for resource, amount in _amounts(root.get("waived_resources", {})).items():
        if amount > total.get(resource, 0):
            raise PremiumRecoveryError("Premium iade muafiyeti inceleme gerektiriyor.")
        total[resource] -= amount
    return {resource: amount for resource, amount in total.items() if amount}


def _validated_effect(effect: dict) -> dict:
    if not isinstance(effect, dict):
        raise PremiumRecoveryError("Premium iade düzeltme kaydı inceleme gerektiriyor.")
    for resource, item in effect.items():
        _resource_parts(resource)
        if not isinstance(item, dict):
            raise PremiumRecoveryError("Premium iade düzeltme kaydı inceleme gerektiriyor.")
        try:
            before, after, debit, waived = (item[name] for name in (
                "balance_before", "balance_after", "debited_amount", "waived_amount",
            ))
            valid = all(isinstance(value, int) and not isinstance(value, bool) for value in (before, after, debit, waived))
            valid = valid and debit >= 0 and waived >= 0 and before - after == debit
        except KeyError:
            valid = False
        if not valid:
            raise PremiumRecoveryError("Premium iade düzeltme kaydı inceleme gerektiriyor.")
    return effect


def _restore_resources(profile, root: dict) -> dict:
    if not root.get("recovered"):
        return {}
    effect = _validated_effect(root.get("refund_effect", {}))
    liability = _liability(root)
    if any(item["debited_amount"] > liability.get(resource, 0) for resource, item in effect.items()):
        raise PremiumRecoveryError("Premium iade miktarı kaynak kaydını aşıyor.")
    restored = {resource: item["debited_amount"] for resource, item in effect.items() if item["debited_amount"]}
    for resource, amount in restored.items():
        _add(profile, resource, amount)
    root["recovered"] = False
    return restored


def register_purchase(profile, key: str, season_id: str) -> dict:
    existing = profile.premium_reward_recovery.get(season_id)
    root = deepcopy(_root(profile, season_id)) if existing is not None else {
        "policy_version": POLICY_VERSION, "purchases": {}, "claims": {},
        "waived_resources": {}, "recovered": False, "refund_effect": {},
    }
    if key in root["purchases"]:
        raise PremiumRecoveryError("Premium satın alma kaynak kaydı yinelendi.")
    _liability(root)  # validate before any wallet mutation
    restored = _restore_resources(profile, root)
    root["purchases"][key] = {"refunded": False}
    profile.premium_reward_recovery[season_id] = root
    profile.season_premium_purchase_key = key
    return restored


def _paid_keys(profile, root: dict, season_id: str, excluded_key: str = "") -> list[str]:
    keys = {key for key, purchase in root["purchases"].items() if not purchase.get("refunded") and key != excluded_key}
    # A valid legacy pass preserves the entitlement, not the separate v1
    # reward liability. It must never exempt a later v1 purchase from recovery.
    keys.update(key for key, receipt in profile.purchase_receipts.items()
                if key != excluded_key and receipt.get("product_id") == "season_pass_premium"
                and not receipt.get("refunded")
                and (receipt.get("granted") or {}).get("season_pass_season_id") == season_id)
    return sorted(keys)


def adjust_refund(profile, entry: dict, *, reversed_refund: bool) -> dict | None:
    if entry.get("refund_policy_version") != POLICY_VERSION:
        return None
    season_id = str((entry.get("granted") or {}).get("season_pass_season_id") or "")
    root = deepcopy(_root(profile, season_id))
    key = str(entry["key"])
    if key not in root["purchases"]:
        raise PremiumRecoveryError("Premium satın alma kaynak kaydı inceleme gerektiriyor.")
    total = _liability(root)
    root["purchases"][key]["refunded"] = not reversed_refund
    # The profile receipt is marked after this decision, so explicitly exclude
    # the just-refunded purchase from both durable and legacy witnesses.
    paid_keys = _paid_keys(profile, root, season_id, "" if reversed_refund else key)
    effect = {}
    restored = {}
    if reversed_refund:
        restored = _restore_resources(profile, root)
    elif not any(not purchase.get("refunded") for purchase in root["purchases"].values()) and not root.get("recovered"):
        reviewed = publisher_error_verified(entry)
        for resource, amount in total.items():
            before = _balance(profile, resource)
            debit = min(amount, max(0, before)) if reviewed else amount
            effect[resource] = {"balance_before": before, "balance_after": before - debit,
                                "debited_amount": debit, "waived_amount": amount - debit}
        _validated_effect(effect)
        for resource, item in effect.items():
            _add(profile, resource, -item["debited_amount"])
            root["waived_resources"][resource] = root["waived_resources"].get(resource, 0) + item["waived_amount"]
        root.update(recovered=True, refund_effect=effect, recovery_receipt_key=key)
    profile.premium_reward_recovery[season_id] = root
    changes = {"season_pass_season_id": season_id, "premium_refund_policy": POLICY_VERSION,
               "premium_resources": effect, "restored_premium_resources": restored}
    if season_id == profile.active_meta_season_id:
        active_key = paid_keys[0] if paid_keys else ""
        profile.season_premium_purchase_key = active_key
        profile.season_premium_pass_season_id = season_id if active_key else ""
        changes["active"] = bool(active_key)
    return changes


def publisher_error_correction(profile, entry: dict) -> tuple[dict, dict]:
    """Trusted operator preview; no mutation and no inference from reason codes."""
    effect = deepcopy(entry.get("refund_effect") or {})
    if entry.get("refund_policy_version") != POLICY_VERSION or not entry.get("refunded") or publisher_error_verified(entry):
        return {}, effect
    season_id = str((entry.get("granted") or {}).get("season_pass_season_id") or "")
    root = _root(profile, season_id)
    if not root.get("recovered") or root.get("recovery_receipt_key") != entry["key"]:
        return {}, effect  # another paid pass already restored these benefits
    resources = _validated_effect(effect.get("premium_resources"))
    if resources != root.get("refund_effect"):
        raise PremiumRecoveryError("Premium iade düzeltme kaydı inceleme gerektiriyor.")
    corrections = {}
    for resource, item in resources.items():
        correction = max(0, -item["balance_after"]) - max(0, -item["balance_before"])
        if correction:
            corrections[resource] = correction
            item["debited_amount"] -= correction
            item["waived_amount"] += correction
            item["balance_after"] += correction
    return corrections, effect


def apply_publisher_error_correction(profile, entry: dict, corrections: dict, effect: dict) -> None:
    _amounts(corrections)
    resources = _validated_effect(effect["premium_resources"])
    season_id = str(entry["granted"]["season_pass_season_id"])
    root = _root(profile, season_id)
    for resource, amount in corrections.items():
        _add(profile, resource, amount)
        root["waived_resources"][resource] = root["waived_resources"].get(resource, 0) + amount
    root["refund_effect"] = deepcopy(resources)


def refund_status_view(profile) -> dict:
    """Public amounts only; never expose purchase keys, tokens or claim owners."""
    wallet = wallet_snapshot(profile)
    return {"deficits": {resource: -amount for resource, amount in wallet.items() if amount < 0}}
