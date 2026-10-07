"""Sandık mağazasında günlük alım sınırı (7 Ekim 2026, kullanıcı kararı).

Devre Kredisi ve Akı ile alınan her sandık türü bir UTC gününde sınırlı sayıda
satın alınır. Hediye Bronz Sandık ve savaşta kazanılan sandıklar sınıra girmez.
"""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException

from app import main as gateway
from app.meta_progression import (
    STORE_CHEST_DAILY_LIMITS,
    STORE_CHEST_PRICES,
    STORE_RECEIPT_LIMIT,
    MetaProgressionError,
    MetaProgressionService,
    chest_sale_day,
    store_chest_purchases_today,
)
from app.player_data_store import InMemoryPlayerDataRepository
from app.player_profile import PlayerProfileService


def _moment(hour: int = 9) -> datetime:
    day = 10 if chest_sale_day(2026, 10) != 10 else 11
    return datetime(2026, 10, day, hour, tzinfo=timezone.utc)


def _rich_profile(player_id: str):
    profile = PlayerProfileService().get_or_create(player_id)
    profile.circuit_credits = profile.flux_shards = 10**6
    return profile


def _store(service, profile) -> dict:
    return service.view(profile)["shop"]["chest_store"]


def _items(service, profile) -> dict:
    return {item["definition_id"]: item for item in _store(service, profile)["items"]}


def test_every_store_chest_has_a_small_daily_limit():
    assert set(STORE_CHEST_DAILY_LIMITS) == set(STORE_CHEST_PRICES)
    assert STORE_CHEST_DAILY_LIMITS == {"field_3h": 5, "circuit_8h": 3, "core_24h": 2, "diamond_24h": 1}
    # Sayım makbuzlardan yapılır: bir günün alımları makbuz sınırına sığmalıdır.
    assert sum(STORE_CHEST_DAILY_LIMITS.values()) < STORE_RECEIPT_LIMIT


def test_store_view_reports_limit_usage_and_reset_time():
    clock = [_moment()]
    service = MetaProgressionService(now_func=lambda: clock[0])
    profile = _rich_profile("limit-view")
    store = _store(service, profile)
    assert store["limit_resets_at"] == (clock[0] + timedelta(days=1)).replace(hour=0).isoformat().replace("+00:00", "Z")
    for definition_id, limit in STORE_CHEST_DAILY_LIMITS.items():
        item = _items(service, profile)[definition_id]
        assert (item["daily_limit"], item["purchased_today"], item["remaining_today"]) == (limit, 0, limit)
    service.purchase_store_chest(profile, "circuit_8h", "view-1")
    item = _items(service, profile)["circuit_8h"]
    assert (item["purchased_today"], item["remaining_today"]) == (1, 2)
    assert _items(service, profile)["field_3h"]["remaining_today"] == 5


@pytest.mark.parametrize("definition_id", sorted(STORE_CHEST_PRICES))
def test_purchase_stops_at_the_daily_limit_without_charging(definition_id):
    clock = [_moment()]
    service = MetaProgressionService(now_func=lambda: clock[0])
    profile = _rich_profile(f"limit-{definition_id}")
    limit = STORE_CHEST_DAILY_LIMITS[definition_id]
    receipts = [service.purchase_store_chest(profile, definition_id, f"buy-{index}") for index in range(limit)]
    balances = (profile.circuit_credits, profile.flux_shards)
    slots = list(profile.chest_slots)
    with pytest.raises(MetaProgressionError, match=f"günde en çok {limit} kez"):
        service.purchase_store_chest(profile, definition_id, "buy-over")
    assert (profile.circuit_credits, profile.flux_shards) == balances
    assert profile.chest_slots == slots
    assert "buy-over" not in profile.shop_receipts
    assert _items(service, profile)[definition_id]["remaining_today"] == 0
    # Sınır dolduktan sonra da eski isteğin yinelenmesi makbuzdan yanıtlanır.
    assert service.purchase_store_chest(profile, definition_id, "buy-0") == receipts[0]
    # Diğer sandıkların hakkı etkilenmez.
    other = next(key for key in STORE_CHEST_PRICES if key != definition_id)
    assert _items(service, profile)[other]["remaining_today"] == STORE_CHEST_DAILY_LIMITS[other]
    service.purchase_store_chest(profile, other, "buy-other")


def test_limit_resets_on_the_next_utc_day_not_after_24_hours():
    clock = [_moment(hour=23)]
    service = MetaProgressionService(now_func=lambda: clock[0])
    profile = _rich_profile("limit-reset")
    service.purchase_store_chest(profile, "diamond_24h", "day1")
    with pytest.raises(MetaProgressionError, match="alım sınırına"):
        service.purchase_store_chest(profile, "diamond_24h", "day1-again")
    clock[0] += timedelta(hours=1, minutes=5)  # ertesi UTC günü, 00.05
    assert store_chest_purchases_today(profile, "diamond_24h", clock[0]) == 0
    assert _items(service, profile)["diamond_24h"]["remaining_today"] == 1
    service.purchase_store_chest(profile, "diamond_24h", "day2")
    with pytest.raises(MetaProgressionError, match="alım sınırına"):
        service.purchase_store_chest(profile, "diamond_24h", "day2-again")


def test_gift_chest_and_owned_chests_stay_outside_the_limit():
    clock = [_moment()]
    service = MetaProgressionService(now_func=lambda: clock[0])
    profile = _rich_profile("limit-gift")
    for index in range(STORE_CHEST_DAILY_LIMITS["field_3h"]):
        service.purchase_store_chest(profile, "field_3h", f"bronze-{index}")
    # Hediye Bronz Sandık sınır doluyken de alınır ve sayıma girmez.
    service.claim_and_open_gift_chest(profile, "field_3h", "gift-1")
    assert store_chest_purchases_today(profile, "field_3h", clock[0]) == STORE_CHEST_DAILY_LIMITS["field_3h"]
    # Hediye alınmadan önce de alım hakkı tamdır.
    fresh = _rich_profile("limit-gift-first")
    service.claim_and_open_gift_chest(fresh, "field_3h", "gift-first")
    assert _items(service, fresh)["field_3h"]["remaining_today"] == STORE_CHEST_DAILY_LIMITS["field_3h"]


def test_endpoint_rejects_over_the_limit_and_the_limit_survives_a_reload(monkeypatch):
    repository = InMemoryPlayerDataRepository()
    monkeypatch.setattr(gateway, "player_data_repository", repository)
    monkeypatch.setattr(gateway.player_data_store_service, "repository", repository)
    player_id = "limit-endpoint"

    def forget() -> None:
        gateway.player_profile_service._profiles.pop(player_id, None)
        gateway.player_statistics_service._statistics.pop(player_id, None)
        gateway.player_settings_service._settings.pop(player_id, None)

    forget()
    try:
        gateway.player_profile_service.get_or_create(player_id).flux_shards = 10**6
        payload = gateway.buy_store_chest(
            player_id, "diamond_24h", gateway.MetaOperationRequest(request_id="limit-endpoint-1"),
        )
        item = next(
            entry for entry in payload["meta_progression"]["shop"]["chest_store"]["items"]
            if entry["definition_id"] == "diamond_24h"
        )
        assert (item["daily_limit"], item["purchased_today"], item["remaining_today"]) == (1, 1, 0)
        with pytest.raises(HTTPException) as rejected:
            gateway.buy_store_chest(
                player_id, "diamond_24h", gateway.MetaOperationRequest(request_id="limit-endpoint-2"),
            )
        assert rejected.value.status_code == 422
        assert rejected.value.detail == "Bugünkü alım sınırına ulaştın: Elmas Sandık günde en çok 1 kez alınır."

        # Kayıttan yeniden yüklenen oyuncu için de sınır doludur (sayım makbuzlardan).
        forget()
        gateway.player_data_store_service.load_player(player_id)
        with pytest.raises(HTTPException) as after_reload:
            gateway.buy_store_chest(
                player_id, "diamond_24h", gateway.MetaOperationRequest(request_id="limit-endpoint-3"),
            )
        assert after_reload.value.status_code == 422
    finally:
        forget()
