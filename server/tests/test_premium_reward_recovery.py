"""Local-only prospective policy tests; no Google/API/device/live mutations."""

from contextlib import contextmanager
from copy import deepcopy
from datetime import datetime, timezone
from dataclasses import fields

import pytest

from app import main as gateway
from app.meta_progression import MetaProgressionService, MetaProgressionError, archive_and_soft_reset_season
from app.platform_services import PlatformService, PlatformServiceError
from app.player_data_store import InMemoryPlayerDataRepository, PlayerDataStoreService
from app.player_profile import PlayerProfileService, PlayerProfileError, SEASON_PREMIUM_REWARD_TRACK
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService
from app.premium_reward_recovery import (
    POLICY_VERSION, PremiumRecoveryError, active_reward_snapshot, record_reward_delta,
    wallet_snapshot, policy_from_environment, refund_status_view,
    cutover_from_environment, policy_for_purchase, PremiumPolicyAcknowledgementRequired,
)
from app.store_catalog import process_purchase, revoke_purchase, restore_refunded_purchase, store_view, store_refund_message
from app.store_verification import VerifiedPurchase

NOW = datetime(2026, 10, 10, tzinfo=timezone.utc)
REVIEW = {"decision": "publisher_error_verified", "case_id": "fixture", "reviewed_by": "fixture", "reviewed_at": NOW.isoformat()}


def profiles():
    service = PlayerProfileService(now_func=lambda: NOW)
    profile = service.get_or_create("premium-fixture")
    profile.season_xp = 20000
    return service, profile


def profile_snapshot(profile):
    return {field.name: deepcopy(getattr(profile, field.name)) for field in fields(profile)}


def buy(profile, order="fixture-1", policy=POLICY_VERSION):
    return process_purchase(profile, "season_pass_premium", "test", order,
                            test_mode=True, now_iso=NOW.isoformat(), premium_refund_policy=policy)


def refund(profile, receipt):
    return revoke_purchase(profile, receipt, now_iso=NOW.isoformat())


def test_rollout_is_default_off_and_rejects_unknown_values():
    assert policy_from_environment({}) == "legacy"
    assert policy_from_environment({"GRIDSHARD_SEASON_PASS_REFUND_POLICY": POLICY_VERSION}) == POLICY_VERSION
    with pytest.raises(RuntimeError):
        policy_from_environment({"GRIDSHARD_SEASON_PASS_REFUND_POLICY": "true"})


def test_activation_requires_explicit_utc_date_and_verified_purchase_time():
    assert cutover_from_environment("legacy", {}) == 0
    env = {"GRIDSHARD_SEASON_PASS_REFUND_POLICY_FROM": "2026-11-01T00:00:00Z"}
    cutover = cutover_from_environment(POLICY_VERSION, env)
    assert cutover == 1793491200000
    for date in ("", "bad", "2026-11-01", "2026-11-01T00:00:00+03:00"):
        with pytest.raises(RuntimeError):
            cutover_from_environment(POLICY_VERSION, {"GRIDSHARD_SEASON_PASS_REFUND_POLICY_FROM": date})
    assert policy_for_purchase(POLICY_VERSION, cutover, cutover - 1, "") == "legacy"
    assert policy_for_purchase("legacy", 0, 0, "") == "legacy"
    for date in (0, -1, None, True):
        with pytest.raises(PremiumRecoveryError):
            policy_for_purchase(POLICY_VERSION, cutover, date, POLICY_VERSION)
    for ack in ("", "legacy", "true"):
        with pytest.raises(PremiumPolicyAcknowledgementRequired):
            policy_for_purchase(POLICY_VERSION, cutover, cutover, ack)
    assert policy_for_purchase(POLICY_VERSION, cutover, cutover, POLICY_VERSION) == POLICY_VERSION


@pytest.mark.parametrize("tier", range(1, 41))
def test_each_tier_recovers_only_its_real_premium_resources(tier):
    service, profile = profiles()
    receipt = buy(profile)
    service.claim_season_tier(profile.player_id, tier, f"free:{tier}")
    baseline = wallet_snapshot(profile)
    service.claim_premium_season_tier(profile.player_id, tier, f"paid:{tier}")
    xp, rating, level = profile.season_xp, profile.rating, profile.experience
    changes = refund(profile, receipt)
    assert wallet_snapshot(profile) == baseline
    assert (profile.season_xp, profile.rating, profile.experience) == (xp, rating, level)
    assert profile.claimed_season_tiers == (tier,)
    assert profile.claimed_premium_season_tiers == (tier,)
    assert not profile.premium_pass_active() and changes["active"] is False
    with pytest.raises(PlayerProfileError):
        service.claim_premium_season_tier(profile.player_id, 1 if tier != 1 else 2)


def test_old_receipt_and_claims_are_not_retroactively_recovered():
    service, profile = profiles()
    receipt = buy(profile, policy="legacy")
    service.claim_premium_season_tier(profile.player_id, 1)
    earned = wallet_snapshot(profile)
    assert not profile.premium_reward_recovery and "refund_policy_version" not in receipt
    assert buy(profile, policy=POLICY_VERSION)["replayed"]
    assert not profile.premium_reward_recovery  # a rollout cannot upgrade replayed old receipts
    refund(profile, receipt)
    assert wallet_snapshot(profile) == earned and not profile.premium_pass_active()


def test_spent_resources_create_only_same_resource_deficits_and_upgrades_remain():
    _, profile = profiles()
    receipt = buy(profile)
    before = active_reward_snapshot(profile)
    profile.flux_shards += 120
    profile.module_shards["laser"] += 8
    profile.core_shards_by_type["core_resonance"] = 4
    record_reward_delta(profile, "fixture-reward", before)
    profile.flux_shards = 10
    profile.module_shards["laser"] = 1
    profile.core_shards_by_type["core_resonance"] = 0
    profile.module_upgrade_levels["laser"] = 3
    other = profile.circuit_credits
    changes = refund(profile, receipt)
    assert profile.flux_shards == -110 and profile.module_shards["laser"] == -7
    assert profile.core_shards_by_type["core_resonance"] == -4
    assert profile.module_upgrade_levels["laser"] == 3 and profile.circuit_credits == other
    assert changes["premium_resources"]["flux_shards"]["debited_amount"] == 120
    profile.flux_shards += 110
    profile.module_shards["laser"] += 7
    profile.core_shards_by_type["core_resonance"] += 4
    assert refund_status_view(profile)["deficits"] == {}


def test_signed_piece_deficits_and_provenance_survive_restart():
    service, profile = profiles()
    receipt = buy(profile)
    before = active_reward_snapshot(profile)
    profile.module_shards["laser"] += 10
    profile.core_shards_by_type["core_resonance"] = 5
    profile.universal_module_shards += 3
    record_reward_delta(profile, "pieces", before)
    profile.module_shards["laser"] = 0
    profile.core_shards_by_type["core_resonance"] = 0
    profile.universal_module_shards = 0
    refund(profile, receipt)
    repo = InMemoryPlayerDataRepository()
    store = PlayerDataStoreService(profile_service=service, statistics_service=PlayerStatisticsService(),
                                   settings_service=PlayerSettingsService(), repository=repo)
    store.save_player(profile.player_id)
    ledger = deepcopy(profile.premium_reward_recovery)
    service._profiles.clear()
    store.load_player(profile.player_id)
    restored = service.get(profile.player_id)
    assert restored.module_shards["laser"] == -10 and restored.core_shards_by_type["core_resonance"] == -5
    assert restored.universal_module_shards == -3
    assert restored.premium_reward_recovery == ledger
    assert "premium_reward_recovery" not in restored.to_view()


def test_repurchase_restores_exact_removed_rewards_without_reroll_or_duplicate_claims():
    service, profile = profiles()
    first = buy(profile)
    baseline = wallet_snapshot(profile)
    service.claim_premium_season_tier(profile.player_id, 1, "paid-first")
    earned = wallet_snapshot(profile)
    refund(profile, first)
    second = buy(profile, "fixture-2")
    assert wallet_snapshot(profile) == earned and second["restored_premium_resources"]
    assert profile.claimed_premium_season_tiers == (1,)
    with pytest.raises(PlayerProfileError):
        service.claim_premium_season_tier(profile.player_id, 1, "paid-second")
    refund(profile, second)
    assert wallet_snapshot(profile) == baseline


def test_reversal_and_multiple_paid_receipts_never_double_restore_or_revoke_other_payment():
    service, profile = profiles()
    first = buy(profile)
    baseline = wallet_snapshot(profile)
    service.claim_premium_season_tier(profile.player_id, 1)
    earned = wallet_snapshot(profile)
    refund(profile, first)
    second = buy(profile, "fixture-2")
    restore_refunded_purchase(profile, first, now_iso=NOW.isoformat())
    assert wallet_snapshot(profile) == earned
    refund(profile, second)
    assert wallet_snapshot(profile) == earned and profile.premium_pass_active()
    refund(profile, first)
    assert wallet_snapshot(profile) == baseline and not profile.premium_pass_active()
    restore_refunded_purchase(profile, first, now_iso=NOW.isoformat())
    restore_refunded_purchase(profile, first, now_iso=NOW.isoformat())
    assert wallet_snapshot(profile) == earned


def test_legacy_reversal_does_not_exempt_new_rewards_from_recovery():
    service, profile = profiles()
    old = buy(profile, "old", policy="legacy")
    service.claim_premium_season_tier(profile.player_id, 1)
    old_earned = wallet_snapshot(profile)
    refund(profile, old)
    new = buy(profile, "new")
    service.claim_premium_season_tier(profile.player_id, 2)
    restore_refunded_purchase(profile, old, now_iso=NOW.isoformat())
    refund(profile, new)
    assert profile.premium_pass_active() and wallet_snapshot(profile) == old_earned
    assert profile.season_premium_purchase_key == old["key"]
    refund(profile, old)
    assert not profile.premium_pass_active() and wallet_snapshot(profile) == old_earned
    restore_refunded_purchase(profile, old, now_iso=NOW.isoformat())
    assert profile.premium_pass_active() and wallet_snapshot(profile) == old_earned


def test_new_provenance_survives_public_profile_receipt_pruning():
    service, profile = profiles()
    receipt = buy(profile)
    baseline = wallet_snapshot(profile)
    service.claim_premium_season_tier(profile.player_id, 1)
    profile.purchase_receipts.clear()  # The durable platform ledger still holds receipt.
    refund(profile, receipt)
    assert wallet_snapshot(profile) == baseline


def test_past_season_refund_recovers_only_old_recorded_resources_not_current_entitlement():
    service, profile = profiles()
    first = buy(profile)
    service.claim_premium_season_tier(profile.player_id, 1)
    old_resources = profile.premium_reward_recovery[profile.active_meta_season_id]["claims"]["tier:1"]["resources"]
    archive_and_soft_reset_season(profile, "future-season")
    second = buy(profile, "future-order")
    before = wallet_snapshot(profile)
    refund(profile, first)
    assert profile.premium_pass_active() and profile.season_premium_purchase_key == second["key"]
    assert profile.claimed_premium_season_tiers == ()
    after = wallet_snapshot(profile)
    assert all(after[resource] == amount - old_resources.get(resource, 0) for resource, amount in before.items())


def test_verified_publisher_failure_creates_no_new_deficit_or_reversal_overgrant():
    _, profile = profiles()
    receipt = buy(profile)
    before = active_reward_snapshot(profile)
    profile.flux_shards += 120
    record_reward_delta(profile, "reward", before)
    profile.flux_shards = 10
    entry = {**receipt, "refund_review": REVIEW}
    changes = refund(profile, entry)
    assert profile.flux_shards == 0 and changes["premium_resources"]["flux_shards"]["waived_amount"] == 110
    restore_refunded_purchase(profile, entry, now_iso=NOW.isoformat())
    assert profile.flux_shards == 10
    refund(profile, entry)
    assert profile.flux_shards == 0


def test_piece_deficit_cannot_be_erased_by_generic_upgrade_fallback():
    _, profile = profiles()
    progression = MetaProgressionService(now_func=lambda: NOW)
    profile.circuit_credits = 10000
    profile.flux_shards = 10000
    profile.module_shards["laser"] = -10
    profile.universal_module_shards = 1000
    with pytest.raises(MetaProgressionError, match="iade açığını"):
        progression.upgrade_module(profile, "laser", "module-deficit")
    profile.core_shards_by_type["core_resonance"] = -1
    profile.core_shards = 1000
    with pytest.raises(MetaProgressionError, match="iade açığını"):
        progression.upgrade_core(profile, "core_resonance", "core-deficit")
    assert profile.module_shards["laser"] == -10 and profile.core_shards_by_type["core_resonance"] == -1


def test_unrelated_piece_deficit_does_not_block_or_get_erased_by_specific_piece_upgrade():
    _, profile = profiles()
    progression = MetaProgressionService(now_func=lambda: NOW)
    profile.circuit_credits = 10000
    profile.flux_shards = 10000
    profile.module_shards["laser"] = 1000
    profile.universal_module_shards = -3
    progression.upgrade_module(profile, "laser", "specific-only")
    assert profile.universal_module_shards == -3
    profile.core_shards_by_type["core_resonance"] = 1000
    profile.core_shards = -2
    progression.upgrade_core(profile, "core_resonance", "specific-core-only")
    assert profile.core_shards == -2


@pytest.fixture
def runtime(monkeypatch, tmp_path):
    service, profile = profiles()
    receipt = buy(profile)
    platform = PlatformService(tmp_path / "platform.json")
    platform.record_store_receipt(receipt["key"], player_id=profile.player_id, receipt=receipt)
    monkeypatch.setattr(gateway, "player_profile_service", service)
    monkeypatch.setattr(gateway, "platform_service", platform)
    monkeypatch.setattr(gateway, "meta_progression_service", MetaProgressionService(now_func=lambda: NOW))
    monkeypatch.setattr(gateway, "_existing_player_profile", lambda _player: profile)
    monkeypatch.setattr(gateway, "persist_player_data", lambda _player: None)
    @contextmanager
    def transaction(_player):
        before, before_platform = profile_snapshot(profile), deepcopy(platform._read())
        try:
            yield
        except BaseException:
            for field, value in before.items():
                setattr(profile, field, value)
            platform._write(before_platform)
            raise
    monkeypatch.setattr(gateway, "_store_economy_transaction", transaction)
    return service, profile, receipt, platform


def apply_refund(receipt, event="event-1", reverse=False):
    return gateway._apply_store_refund(provider="test", source="fixture", transaction_id=receipt["transaction_id"],
                                      event_id=event, reversed_refund=reverse)


def test_endpoint_captures_chest_real_contents_and_replays_without_grant(runtime):
    _, profile, receipt, platform = runtime
    tier = next(item["tier"] for item in SEASON_PREMIUM_REWARD_TRACK if item.get("chest_tier"))
    baseline = wallet_snapshot(profile)
    request = gateway.MetaOperationRequest(request_id="premium-chest-fixture")
    gateway.claim_premium_season_tier_reward(profile.player_id, tier, request)
    earned = wallet_snapshot(profile)
    root = profile.premium_reward_recovery[profile.active_meta_season_id]
    assert any(":chest:" in key for key in root["claims"])
    gateway.claim_premium_season_tier_reward(profile.player_id, tier, request)
    assert wallet_snapshot(profile) == earned
    assert platform.store_receipt(receipt["key"])["refund_policy_version"] == POLICY_VERSION
    assert apply_refund(receipt)["changed"]
    assert wallet_snapshot(profile) == baseline
    assert platform.store_receipt(receipt["key"])["refund_effect"]["premium_resources"]
    assert not apply_refund(receipt, "event-repeat")["changed"]
    assert wallet_snapshot(profile) == baseline


def test_all_tiers_and_actual_chests_recover_once_and_preserve_free_wallet(runtime):
    service, profile, receipt, _ = runtime
    for tier in range(1, 41):
        service.claim_season_tier(profile.player_id, tier, f"free:{tier}")
    baseline = wallet_snapshot(profile)
    for tier in range(1, 41):
        request = gateway.MetaOperationRequest(request_id=f"all-premium:{tier}")
        gateway.claim_premium_season_tier_reward(profile.player_id, tier, request)
        earned = wallet_snapshot(profile)
        gateway.claim_premium_season_tier_reward(profile.player_id, tier, request)
        assert wallet_snapshot(profile) == earned
    assert len(profile.premium_reward_recovery[profile.active_meta_season_id]["claims"]) > 40
    apply_refund(receipt)
    assert wallet_snapshot(profile) == baseline
    assert profile.claimed_season_tiers == tuple(range(1, 41))
    apply_refund(receipt, "refund-again")
    assert wallet_snapshot(profile) == baseline


def test_failed_chest_roll_rolls_back_claim_and_provenance(runtime, monkeypatch):
    _, profile, _, _ = runtime
    tier = next(item["tier"] for item in SEASON_PREMIUM_REWARD_TRACK if item.get("chest_tier"))
    before = profile_snapshot(profile)
    award = gateway.meta_progression_service.award_instant_chest
    def fail(*args):
        award(*args)
        raise RuntimeError("fixture chest interruption")
    request = gateway.MetaOperationRequest(request_id="interrupted-chest")
    with monkeypatch.context() as patch:
        patch.setattr(gateway.meta_progression_service, "award_instant_chest", fail)
        with pytest.raises(RuntimeError, match="chest interruption"):
            gateway.claim_premium_season_tier_reward(profile.player_id, tier, request)
    assert profile_snapshot(profile) == before
    gateway.claim_premium_season_tier_reward(profile.player_id, tier, request)


@pytest.mark.parametrize("purchase_date,ack,expected", [(1, "", "legacy"), (100, "", "ack"),
                                                      (100, POLICY_VERSION, POLICY_VERSION), (0, POLICY_VERSION, "missing")])
def test_endpoint_cutover_ack_and_missing_date_never_grant_or_consume_early(runtime, monkeypatch, purchase_date, ack, expected):
    from fastapi import HTTPException
    from types import SimpleNamespace
    from app.store_catalog import store_account_token
    _, profile, prior, _ = runtime
    apply_refund(prior)
    monkeypatch.setattr(gateway, "SEASON_PASS_REFUND_POLICY", POLICY_VERSION)
    monkeypatch.setattr(gateway, "SEASON_PASS_REFUND_CUTOVER_MS", 100)
    verified = VerifiedPurchase("google_play", "fixture-timestamp", "gridshard.season_pass_premium", "test",
                                account_token=store_account_token(profile.player_id), purchased_at_ms=purchase_date)
    calls = []
    monkeypatch.setattr(gateway, "STORE_VERIFIERS", SimpleNamespace(
        verify_purchase=lambda *_args, **_kwargs: verified,
        google_play=SimpleNamespace(consume=lambda _purchase: calls.append("consume") or True),
        platform_view=lambda: {},
    ))
    request = gateway.PurchaseRequest(product_id="season_pass_premium", provider="google_play",
                                      transaction_id="client-date-ignored", premium_policy_ack=ack)
    before = profile_snapshot(profile)
    if expected in {"ack", "missing"}:
        with pytest.raises(HTTPException) as error:
            gateway.purchase_store_product(profile.player_id, request)
        assert error.value.status_code == 503
        if expected == "ack":
            assert error.value.detail["code"] == "premium_policy_ack_required"
        assert profile_snapshot(profile) == before and not calls
    else:
        result = gateway.purchase_store_product(profile.player_id, request, premium_refund_policy=POLICY_VERSION)
        assert result["receipt"].get("refund_policy_version", "legacy") == expected
        assert calls == ["consume"]
        # Replays never upgrade old purchases or demand a new acknowledgement.
        replay = gateway.purchase_store_product(profile.player_id, request.model_copy(update={"premium_policy_ack": ""}))
        assert replay["receipt"]["replayed"]
        assert replay["receipt"].get("refund_policy_version", "legacy") == expected


def test_old_client_checkout_is_gated_but_other_products_and_entitlement_stay(runtime, monkeypatch):
    _, profile, _, _ = runtime
    monkeypatch.setattr(gateway, "SEASON_PASS_REFUND_POLICY", POLICY_VERSION)
    monkeypatch.setattr(gateway, "SEASON_PASS_REFUND_CUTOVER_MS", 1)
    old = gateway._player_store_view(profile)
    assert old["season_pass"]["active"] and old["season_pass"]["store_product_id"] is None
    assert len(old["flux_packs"]) == 4 and len(old["credit_packs"]) == 4
    assert old["battle_premium"]["store_product_id"]
    new = gateway._player_store_view(profile, premium_refund_policy=POLICY_VERSION)
    assert new["season_pass"]["store_product_id"]


def test_notification_failure_rolls_back_wallet_receipt_and_provenance(runtime, monkeypatch):
    service, profile, receipt, platform = runtime
    service.claim_premium_season_tier(profile.player_id, 1)
    baseline = profile_snapshot(profile)
    def fail(*_args):
        raise PlatformServiceError("fixture notification failure")
    with monkeypatch.context() as patch:
        patch.setattr(platform, "queue_notification", fail)
        with pytest.raises(PlatformServiceError):
            apply_refund(receipt)
    assert profile_snapshot(profile) == baseline
    assert not platform.store_receipt(receipt["key"])["refunded"]
    assert not platform.store_notification_seen("event-1")
    assert apply_refund(receipt)["changed"]


def test_publisher_error_review_is_private_dry_run_and_causally_scoped(runtime):
    _, profile, receipt, platform = runtime
    before = active_reward_snapshot(profile)
    profile.flux_shards += 120
    record_reward_delta(profile, "reviewed-fixture", before)
    profile.flux_shards = 10
    apply_refund(receipt)
    assert profile.flux_shards == -110
    profile.flux_shards += 70
    kwargs = {"case_id": "case-fixture", "reviewed_by": "operator-fixture"}
    preview = gateway._review_store_refund_publisher_error(receipt["key"], **kwargs)
    assert preview["premium_corrections"] == {"flux_shards": 110} and profile.flux_shards == -40
    gateway._review_store_refund_publisher_error(receipt["key"], **kwargs, apply=True)
    assert profile.flux_shards == 70
    assert gateway._review_store_refund_publisher_error(receipt["key"], **kwargs, apply=True)["duplicate"]
    apply_refund(receipt, "reverse-event", reverse=True)
    assert profile.flux_shards == 80  # only the recovered 10 is regranted


def test_corrupt_provenance_fails_closed_without_wallet_mutation():
    _, profile = profiles()
    receipt = buy(profile)
    profile.premium_reward_recovery[profile.active_meta_season_id]["claims"]["bad"] = {"resources": {"rating": 9000}}
    baseline = wallet_snapshot(profile)
    with pytest.raises(PremiumRecoveryError):
        refund(profile, receipt)
    assert wallet_snapshot(profile) == baseline and profile.premium_pass_active()


def test_store_and_notifications_disclose_policy_without_private_provenance():
    _, profile = profiles()
    receipt = buy(profile)
    view = store_view(profile, purchase_test_mode=True, ad_test_mode=False, premium_refund_policy=POLICY_VERSION)
    assert view["season_pass"]["reward_recovery_on_refund"]
    assert "İadede premium kazanımlar" in view["season_pass"]["description_tr"]
    assert profile.season_premium_purchase_key not in str(view)
    changes = refund(profile, receipt)
    for language in ("tr", "en"):
        title, body = store_refund_message(receipt, reversed_refund=False, changes=changes, language=language)
        assert len(title) <= 80 and len(body) <= 240
