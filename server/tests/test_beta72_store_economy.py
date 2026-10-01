"""Beta.72 tur 9: ücretli alım, Savaş Premium, reklamla x2, sandık mağazası."""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.game.engine import BattleEngine
from app.game.models import BattleState, BattleStatus
from app.main import app
from app.meta_progression import (
    GIFT_CHEST_ID,
    STORE_CHEST_PRICES,
    MetaProgressionError,
    MetaProgressionService,
    archive_and_soft_reset_season,
    chest_sale_day,
    store_chest_price,
)
from app.player_profile import PlayerProfileService
from app.player_progression import PlayerProgressionError, PlayerProgressionService
from app.store_catalog import (
    PAID_PRODUCTS,
    StoreError,
    price_label_tr,
    process_purchase,
    store_view,
)


client = TestClient(app)
NOW_ISO = "2026-09-28T12:00:00+00:00"


def _finished_state(battle_id: str, match_type: str = "arena_ai") -> BattleState:
    state = BattleState(battle_id=battle_id, match_type=match_type, ranked_eligible=True)
    engine = BattleEngine(state)
    for player_id in ("a", "b"):
        engine.add_player(player_id)
    state.status = BattleStatus.FINISHED
    state.winner_player_id = "a"
    state.loser_player_id = "b"
    state.finish_reason = "core_destroyed"
    state.finished_at_ms = 120_000
    state.result_summary = {"a": {"damage_dealt": 900}, "b": {"damage_dealt": 450}}
    return state


def _non_sale_moment() -> datetime:
    moment = datetime(2026, 10, 1, 12, tzinfo=timezone.utc)
    if moment.day == chest_sale_day(moment.year, moment.month):
        moment += timedelta(days=1)
    return moment


def test_catalog_has_four_flux_and_four_credit_packs_and_99_99_premiums():
    packs = [product for product in PAID_PRODUCTS if product["kind"] == "currency"]
    assert len([p for p in packs if p["currency"] == "flux_shards"]) == 4
    assert len([p for p in packs if p["currency"] == "circuit_credits"]) == 4
    by_id = {product["id"]: product for product in PAID_PRODUCTS}
    assert price_label_tr(by_id["season_pass_premium"]["price_kurus"]) == "99,99 TL"
    assert price_label_tr(by_id["battle_rewards_premium"]["price_kurus"]) == "99,99 TL"
    for currency in ("flux_shards", "circuit_credits"):
        ordered = [p for p in packs if p["currency"] == currency]
        rates = [p["amount"] / p["price_kurus"] for p in ordered]
        assert rates == sorted(rates), "Büyük paket TL başına daha çok vermeli"


def test_test_purchase_grants_once_and_rejects_reuse_for_other_product():
    profile = PlayerProfileService().get_or_create("store-pack")
    flux_before = profile.flux_shards
    first = process_purchase(profile, "flux_260", "test", "tx-1", test_mode=True, now_iso=NOW_ISO)
    replay = process_purchase(profile, "flux_260", "test", "tx-1", test_mode=True, now_iso=NOW_ISO)
    assert first["granted"] == {"currency": "flux_shards", "amount": 260}
    assert replay["replayed"] is True
    assert profile.flux_shards == flux_before + 260
    with pytest.raises(StoreError, match="farklı bir ürüne"):
        process_purchase(profile, "credits_1000", "test", "tx-1", test_mode=True, now_iso=NOW_ISO)


def test_production_rejects_test_purchases_and_unverified_store_receipts():
    profile = PlayerProfileService().get_or_create("store-prod")
    credits = profile.circuit_credits
    with pytest.raises(StoreError, match="kapalı"):
        process_purchase(profile, "credits_1000", "test", "tx", test_mode=False, now_iso=NOW_ISO)
    for provider in ("google_play", "app_store"):
        with pytest.raises(StoreError, match="doğrulanmadan"):
            process_purchase(profile, "credits_1000", provider, "tx", test_mode=True, now_iso=NOW_ISO)
    assert profile.circuit_credits == credits
    view = store_view(profile, purchase_test_mode=False, ad_test_mode=False)
    assert view["providers"]["purchase"] is None
    assert view["providers"]["ads"] is None
    assert view["providers"]["purchase_platforms"] == {"google_play": False, "app_store": False}
    assert view["providers"]["ad_platforms"] == {"admob": False}


def test_season_pass_purchase_opens_premium_track_for_this_season_only():
    profiles = PlayerProfileService()
    profile = profiles.get_or_create("store-pass")
    assert profile.engagement_view()["premium_pass"]["purchasable"] is True
    process_purchase(profile, "season_pass_premium", "test", "pass-1", test_mode=True, now_iso=NOW_ISO)
    assert profile.premium_pass_active() is True
    assert profile.engagement_view()["premium_pass"]["purchasable"] is False
    with pytest.raises(StoreError, match="zaten etkin"):
        process_purchase(profile, "season_pass_premium", "test", "pass-2", test_mode=True, now_iso=NOW_ISO)
    archive_and_soft_reset_season(profile, "store-pass-next-season")
    assert profile.premium_pass_active() is False


def test_battle_premium_boosts_credits_and_xp_but_not_trophies():
    base_profiles = PlayerProfileService()
    base = PlayerProgressionService(base_profiles)
    base.process_finished_battle(_finished_state("premium-base"))
    plain = base.player_result("premium-base", "a")

    profiles = PlayerProfileService()
    profile = profiles.get_or_create("a")
    process_purchase(profile, "battle_rewards_premium", "test", "bp-1", test_mode=True, now_iso=NOW_ISO)
    progression = PlayerProgressionService(profiles)
    progression.process_finished_battle(_finished_state("premium-boost"))
    boosted = progression.player_result("premium-boost", "a")

    assert boosted["battle_premium_applied"] is True
    assert plain["battle_premium_applied"] is False
    assert boosted["circuit_credits_awarded"] == round(plain["circuit_credits_awarded"] * 1.5)
    assert boosted["xp_awarded"] == round(plain["xp_awarded"] * 1.5)
    assert boosted["rating_delta"] == plain["rating_delta"]


def test_ad_bonus_doubles_credits_and_xp_once_per_battle():
    profiles = PlayerProfileService()
    progression = PlayerProgressionService(profiles)
    progression.process_finished_battle(_finished_state("ad-battle"))
    result = progression.player_result("ad-battle", "a")
    profile = profiles.get_or_create("a")
    credits, experience, rating = profile.circuit_credits, profile.experience, profile.rating

    receipt = progression.grant_ad_bonus("ad-battle", "a", now_iso=NOW_ISO)
    replay = progression.grant_ad_bonus("ad-battle", "a", now_iso=NOW_ISO)

    assert receipt["circuit_credits"] == result["circuit_credits_awarded"]
    assert receipt["xp"] == result["xp_awarded"]
    assert replay["replayed"] is True
    assert profile.circuit_credits == credits + result["circuit_credits_awarded"]
    assert profile.experience == experience + result["xp_awarded"]
    assert profile.rating == rating
    with pytest.raises(PlayerProgressionError):
        progression.grant_ad_bonus("unknown-battle", "a", now_iso=NOW_ISO)


def test_only_bronze_is_a_gift_every_eight_hours():
    clock = [datetime(2026, 9, 28, tzinfo=timezone.utc)]
    service = MetaProgressionService(now_func=lambda: clock[0])
    profile = PlayerProfileService().get_or_create("gift-bronze")
    assert GIFT_CHEST_ID == "field_3h"
    service.claim_and_open_gift_chest(profile, "field_3h", "gift-1")
    for definition_id in ("circuit_8h", "core_24h", "diamond_24h"):
        with pytest.raises(MetaProgressionError, match="yalnız Bronz"):
            service.claim_and_open_gift_chest(profile, definition_id, f"gift-{definition_id}")
    definitions = {item["id"]: item for item in service.view(profile)["chests"]["definitions"]}
    assert definitions["field_3h"]["gift"] is True
    assert definitions["field_3h"]["claim_remaining_seconds"] == 8 * 3600
    assert not any(definitions[key]["gift"] for key in ("circuit_8h", "core_24h", "diamond_24h"))
    clock[0] += timedelta(hours=8, seconds=1)
    service.claim_and_open_gift_chest(profile, "field_3h", "gift-2")


def test_store_chest_prices_and_monthly_sale_day():
    assert STORE_CHEST_PRICES == {
        "field_3h": ("circuit_credits", 300),
        "circuit_8h": ("circuit_credits", 1000),
        "core_24h": ("flux_shards", 250),
        "diamond_24h": ("flux_shards", 1000),
    }
    for year, month in ((2026, 10), (2026, 11), (2027, 2)):
        day = chest_sale_day(year, month)
        assert day == chest_sale_day(year, month)
        sale = datetime(year, month, day, 9, tzinfo=timezone.utc)
        assert store_chest_price("field_3h", sale) == ("circuit_credits", 180, 300)
        assert store_chest_price("diamond_24h", sale) == ("flux_shards", 600, 1000)
    normal = _non_sale_moment()
    assert store_chest_price("core_24h", normal) == ("flux_shards", 250, 250)


def test_store_chest_purchase_spends_currency_opens_real_chest_and_is_idempotent():
    moment = _non_sale_moment()
    service = MetaProgressionService(now_func=lambda: moment)
    profile = PlayerProfileService().get_or_create("store-chest")
    profile.flux_shards = 300
    receipt = service.purchase_store_chest(profile, "core_24h", "chest-1")
    replay = service.purchase_store_chest(profile, "core_24h", "chest-1")
    assert replay == receipt
    assert receipt["cost"] == 250 and receipt["sale"] is False
    assert receipt["rewards"]["circuit_credits"] > 0
    assert profile.flux_shards == 50 + receipt["rewards"]["flux_shards"]
    assert profile.chest_slots == []
    second = service.purchase_store_chest(profile, "field_3h", "chest-2") if profile.circuit_credits >= 300 else None
    if second is not None:
        assert second["chest"]["chest_id"] != receipt["chest"]["chest_id"]
    profile.flux_shards = 10
    with pytest.raises(MetaProgressionError, match="250 Akı"):
        service.purchase_store_chest(profile, "core_24h", "chest-3")
    store = service.view(profile)["shop"]["chest_store"]
    assert [item["definition_id"] for item in store["items"]] == list(STORE_CHEST_PRICES)


def test_store_endpoints_use_test_provider_in_development():
    player_id = f"store-api-{uuid4()}"
    view = client.get(f"/store/{player_id}").json()
    assert view["providers"]["purchase"] == "test"
    assert view["season_pass"]["price_label_tr"] == "99,99 TL"
    response = client.post(
        f"/store/{player_id}/purchases",
        json={"product_id": "credits_2200", "provider": "test", "transaction_id": "api-tx-1"},
    )
    assert response.status_code == 200
    assert response.json()["receipt"]["granted"]["amount"] == 2200
    rejected = client.post(
        f"/store/{player_id}/purchases",
        json={"product_id": "credits_2200", "provider": "google_play", "transaction_id": "api-tx-2"},
    )
    assert rejected.status_code == 422
    assert client.post(
        f"/profile/{player_id}/meta-progression/shop/bronze_daily/purchase",
        json={"request_id": "old-weekly"},
    ).status_code in {404, 405}
