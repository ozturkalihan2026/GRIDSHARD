from copy import deepcopy
import json
from pathlib import Path

import pytest

from app.arena_canon import MODULES, module_talent_options
from app.meta_progression import CORE_TYPES, MetaProgressionError, MetaProgressionService
from app.player_profile import PlayerProfileService

DOCUMENT = json.loads((Path(__file__).parent / "fixtures/level_costs_seviye_20261025.json").read_text(encoding="utf-8"))
def prices(kind):
    return {rarity:[(n["circuit_credits_cost"],n["flux_cost"]) for n in nodes]
            for rarity,nodes in DOCUMENT[kind].items()}
EXPECTED = prices("module_talents")
CORE_EXPECTED = prices("core_talents")
MODULE_CASES = [(next(k for k, v in MODULES.items() if v["rarity"] == rarity), str(tier), *cost)
                for rarity, costs in EXPECTED.items() for tier, cost in enumerate(costs)]
CORE_CASES = [(core["id"], f"{tier}_energy", *cost)
              for core in CORE_TYPES for tier, cost in enumerate(CORE_EXPECTED[core["rarity"]])]


def ready_profile():
    profile = PlayerProfileService().get_or_create("talent-wallet-test")
    profile.rating = profile.highest_rating = 10000
    profile.module_upgrade_levels.update({key: 14 for key in MODULES})
    profile.core_upgrade_levels.update({core["id"]: 14 for core in CORE_TYPES})
    profile.coins = 123  # Retired wallet must never fund or pay for talents.
    return profile


def test_all_modules_and_core_choices_publish_exact_authoritative_costs():
    for key, spec in MODULES.items():
        assert [(n["circuit_credits_cost"], n["flux_cost"]) for n in module_talent_options(key)] == EXPECTED[spec["rarity"]]
    for core in CORE_TYPES:
        assert [(n["circuit_credits_cost"], n["flux_cost"]) for n in core["skills"]] == [cost for cost in CORE_EXPECTED[core["rarity"]] for _ in range(2)]


@pytest.mark.parametrize("kind,key,tier,credits,flux", [("module", *c) for c in MODULE_CASES] + [("core", *c) for c in CORE_CASES])
def test_exact_charge_and_idempotent_replay_preserve_old_wallet(kind, key, tier, credits, flux):
    service, profile = MetaProgressionService(), ready_profile()
    profile.circuit_credits, profile.flux_shards = credits + 13, flux + 7
    call = (lambda: service.choose_module_talent(profile, key, tier, "power", "price-request")) if kind == "module" else (lambda: service.unlock_core_skill(profile, key, tier, "price-request"))
    first = call()
    assert (profile.circuit_credits, profile.flux_shards, profile.coins) == (13, 7, 123)
    assert call() == first
    assert (profile.circuit_credits, profile.flux_shards, profile.coins) == (13, 7, 123)


@pytest.mark.parametrize("kind,key,tier,credits,flux,missing", [
    (*case, missing)
    for case in [("module", *c) for c in MODULE_CASES] + [("core", *c) for c in CORE_CASES]
    for missing in ("credits", "flux") if missing != "flux" or case[-1] > 0
])
def test_insufficient_currency_never_partially_charges_or_saves_selection(kind, key, tier, credits, flux, missing):
    service, profile = MetaProgressionService(), ready_profile()
    profile.circuit_credits = credits - 1 if missing == "credits" else credits
    profile.flux_shards = flux - 1 if missing == "flux" else flux
    before = deepcopy((profile.circuit_credits, profile.flux_shards, profile.module_talents,
                       profile.core_skills, profile.module_upgrade_receipts, profile.core_receipts))
    with pytest.raises(MetaProgressionError, match="yetersiz"):
        if kind == "module":
            service.choose_module_talent(profile, key, tier, "power", "insufficient")
        else:
            service.unlock_core_skill(profile, key, tier, "insufficient")
    after = (profile.circuit_credits, profile.flux_shards, profile.module_talents,
             profile.core_skills, profile.module_upgrade_receipts, profile.core_receipts)
    assert after == before


def test_existing_talent_selections_are_not_recharged_or_removed():
    service, profile = MetaProgressionService(), ready_profile()
    profile.module_talents["laser"] = {"0": "resilience"}
    profile.core_skills["core_resonance"] = ("0_charge",)
    view = service.view(profile)
    assert next(n for n in view["module_collection"] if n["definition_id"] == "laser")["talents"][0]["selected"] == "resilience"
    assert next(c for c in view["cores"]["types"] if c["id"] == "core_resonance")["skills"][1]["learned"]
