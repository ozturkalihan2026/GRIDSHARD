from copy import deepcopy
from datetime import datetime, timezone
import json
from pathlib import Path

import pytest

from app.arena_canon import MODULES
from app.meta_progression import CORE_TYPES, MetaProgressionError, MetaProgressionService, module_upgrade_cost
from app.player_profile import LOGIN_PERIOD_REWARDS, PlayerProfileService


DOCUMENT_TABLE = json.loads((Path(__file__).parent / "fixtures/level_costs_seviye_20261025.json").read_text(encoding="utf-8"))


@pytest.mark.parametrize("counter", range(14))
def test_all_module_and_core_level_views_match_the_user_word_table(counter):
    service, profile = MetaProgressionService(), PlayerProfileService().get_or_create(f"word-cost-{counter}")
    profile.rating = profile.highest_rating = 10000
    profile.module_upgrade_levels = {key:counter for key in MODULES}
    profile.core_upgrade_levels = {c["id"]:counter for c in CORE_TYPES}
    view = service.view(profile)
    for item in view["module_collection"]:
        cost = {k:v for k,v in item["next_upgrade_cost"].items() if k != "next_level"}
        assert cost == DOCUMENT_TABLE["costs"][item["rarity"]][counter]
    for core in view["cores"]["types"]:
        assert core["next_upgrade_cost"] == DOCUMENT_TABLE["costs"][core["rarity"]][counter]


def test_login_calendar_uses_base_pieces_and_weekly_bonuses_stay_bounded():
    ordinary = [r["module_shards"] for r in LOGIN_PERIOD_REWARDS if not r["is_major"]]
    weekly = [r["module_shards"] for r in LOGIN_PERIOD_REWARDS if r["is_major"]]
    assert min(ordinary) == 3 and max(ordinary) == 7
    assert weekly == [21, 28, 35, 42]


def test_old_claimed_login_receipt_keeps_its_original_amount_without_regrant():
    service = PlayerProfileService(now_func=lambda: datetime(2026, 10, 25, tzinfo=timezone.utc))
    profile = service.get_or_create("old-login-receipt")
    receipt = service.claim_login_reward(profile.player_id, 28, "old-request")
    # A saved receipt from the old economy must stay historical, not be edited
    # or charged back when the current calendar value changes.
    profile.engagement_claim_receipts["old-request"] = {**receipt, "module_shards": 126}
    before = deepcopy(profile.module_shards)
    assert service.claim_login_reward(profile.player_id, 28, "old-request")["module_shards"] == 126
    assert profile.module_shards == before
    assert profile.engagement_view()["daily_login"]["rewards"][27]["module_shards"] == 126


@pytest.mark.parametrize("module_id", [next(k for k, v in MODULES.items() if v["rarity"] == r)
                                      for r in ("common", "rare", "epic", "legendary")])
def test_each_module_level_charges_the_published_cost_exactly_once(module_id):
    service, profile = MetaProgressionService(), PlayerProfileService().get_or_create(module_id)
    profile.rating = profile.highest_rating = 10000
    profile.module_shards[module_id] = 100000
    profile.circuit_credits = profile.flux_shards = 10000000
    for counter in range(14):
        shown = next(m for m in service.view(profile)["module_collection"] if m["definition_id"] == module_id)
        assert shown["level"] == counter
        assert shown["next_upgrade_cost"] == module_upgrade_cost(module_id, counter)
        cost = shown["next_upgrade_cost"]
        before = (profile.circuit_credits, profile.flux_shards, profile.module_shards[module_id])
        receipt = service.upgrade_module(profile, module_id, f"level-{counter}")
        after = (profile.circuit_credits, profile.flux_shards, profile.module_shards[module_id])
        assert tuple(a-b for a,b in zip(before, after)) == (cost["circuit_credits"], cost["flux_shards"], cost["shards"])
        assert service.upgrade_module(profile, module_id, f"level-{counter}") == receipt
        assert (profile.circuit_credits, profile.flux_shards, profile.module_shards[module_id]) == after
    assert next(m for m in service.view(profile)["module_collection"] if m["definition_id"] == module_id)["next_upgrade_cost"] is None


@pytest.mark.parametrize("core_id", [c["id"] for c in CORE_TYPES])
def test_each_core_level_matches_its_module_rarity_and_charges_exactly_once(core_id):
    service, profile = MetaProgressionService(), PlayerProfileService().get_or_create(core_id)
    profile.rating = profile.highest_rating = 10000
    rarity = next(c["rarity"] for c in CORE_TYPES if c["id"] == core_id)
    module_id = next(k for k,v in MODULES.items() if v["rarity"] == rarity)
    costs = [module_upgrade_cost(module_id, counter) for counter in range(14)]
    profile.core_shards_by_type[core_id] = sum(c["shards"] for c in costs)
    profile.flux_shards = sum(c["flux_shards"] for c in costs)
    profile.circuit_credits = sum(c["circuit_credits"] for c in costs)
    module_pieces = deepcopy(profile.module_shards)
    for counter, cost in enumerate(costs):
        shown = next(c for c in service.view(profile)["cores"]["types"] if c["id"] == core_id)
        assert shown["level"] == counter + 1
        assert shown["next_upgrade_cost"] == {k:v for k,v in cost.items() if k != "next_level"}
        before = (profile.circuit_credits, profile.flux_shards, profile.core_shards_by_type[core_id])
        receipt = service.upgrade_core(profile, core_id, f"core-{counter}")
        after = (profile.circuit_credits, profile.flux_shards, profile.core_shards_by_type[core_id])
        assert tuple(a-b for a,b in zip(before,after)) == (cost["circuit_credits"], cost["flux_shards"], cost["shards"])
        assert (receipt["circuit_credits_spent"], receipt["flux_shards_spent"], receipt["shards_spent"]) == (cost["circuit_credits"], cost["flux_shards"], cost["shards"])
        assert service.upgrade_core(profile, core_id, f"core-{counter}") == receipt
        assert (profile.circuit_credits, profile.flux_shards, profile.core_shards_by_type[core_id]) == after
    assert profile.circuit_credits == profile.flux_shards == profile.core_shards_by_type[core_id] == 0
    assert profile.module_shards == module_pieces
    assert next(c for c in service.view(profile)["cores"]["types"] if c["id"] == core_id)["next_upgrade_cost"] is None
    with pytest.raises(MetaProgressionError, match="azami"):
        service.upgrade_core(profile, core_id, "max-level")


@pytest.mark.parametrize("missing", ["circuit_credits", "flux_shards", "pieces"])
def test_core_upgrade_checks_all_costs_before_changing_any_balance(missing):
    service, profile = MetaProgressionService(), PlayerProfileService().get_or_create("core-insufficient")
    profile.rating = profile.highest_rating = 10000
    profile.core_upgrade_levels["core_quantum"] = 13
    profile.circuit_credits, profile.flux_shards = 80000, 10000
    profile.core_shards_by_type["core_quantum"] = 90
    profile.core_shards = 0
    if missing == "pieces":
        profile.core_shards_by_type["core_quantum"] -= 1
    else:
        setattr(profile, missing, getattr(profile, missing)-1)
    before = deepcopy((profile.circuit_credits, profile.flux_shards, profile.core_shards_by_type,
                       profile.core_shards, profile.core_upgrade_levels, profile.core_receipts))
    with pytest.raises(MetaProgressionError, match="Gerekli"):
        service.upgrade_core(profile, "core_quantum", "insufficient")
    assert (profile.circuit_credits, profile.flux_shards, profile.core_shards_by_type,
            profile.core_shards, profile.core_upgrade_levels, profile.core_receipts) == before


def test_old_core_receipt_is_not_repriced_or_charged_again():
    service, profile = MetaProgressionService(), PlayerProfileService().get_or_create("old-core-receipt")
    profile.core_upgrade_levels["core_resonance"] = 1
    old = {"request_id":"old-upgrade", "operation":"upgrade", "core_type_id":"core_resonance", "level":2}
    profile.core_receipts["old-upgrade"] = old
    before = deepcopy((profile.circuit_credits, profile.flux_shards, profile.core_shards_by_type, profile.core_upgrade_levels))
    assert service.upgrade_core(profile, "core_resonance", "old-upgrade") == old
    assert (profile.circuit_credits, profile.flux_shards, profile.core_shards_by_type, profile.core_upgrade_levels) == before


def test_core_upgrade_combines_only_own_and_legacy_core_pieces():
    service, profile = MetaProgressionService(), PlayerProfileService().get_or_create("core-piece-sources")
    profile.circuit_credits, profile.flux_shards = 100, 0
    profile.core_shards_by_type["core_resonance"] = 1
    profile.core_shards = 1
    modules = deepcopy(profile.module_shards)
    receipt = service.upgrade_core(profile, "core_resonance", "mixed-pieces")
    assert (receipt["core_shards_spent"], receipt["legacy_core_shards_spent"]) == (1, 1)
    assert profile.module_shards == modules
    assert profile.core_shards_by_type["core_resonance"] == profile.core_shards == 0
