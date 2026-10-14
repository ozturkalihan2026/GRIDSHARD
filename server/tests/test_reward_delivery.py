"""Mailbox/inventory regression tests. Only isolated, in-memory fixtures."""
from copy import deepcopy
from datetime import datetime, timezone
import json

import pytest

from app.meta_progression import MetaProgressionError, MetaProgressionService, archive_and_soft_reset_season
from app.player_profile import PlayerProfileService
from app.player_data_store import InMemoryPlayerDataRepository, PlayerDataStoreService
from app.player_settings import PlayerSettingsService
from app.player_statistics import PlayerStatisticsService
from app.premium_reward_recovery import POLICY_VERSION, PremiumRecoveryError, wallet_snapshot
from app.reward_delivery import MAILBOX_AREA_LIMIT, collect_chest, mailbox_messages, premium_origin, queue_purchase_notice
from app.store_catalog import process_purchase, revoke_purchase, restore_refunded_purchase

NOW = datetime(2026, 10, 11, 6, tzinfo=timezone.utc)


def fixture():
    profiles = PlayerProfileService(now_func=lambda: NOW)
    profile = profiles.get_or_create("mail-fixture")
    # Her sandık çekirdek parçası verebilir; iade o kaydı silmez, sıfıra indirir.
    # Kayıt baştan açılır ki cüzdan karşılaştırması şansa bağlı olmasın.
    profile.core_shards_by_type.setdefault("core_resonance", 0)
    return profiles, profile, MetaProgressionService(now_func=lambda: NOW)


def buy(profile, order="private-order", policy=POLICY_VERSION):
    return process_purchase(profile, "season_pass_premium", "test", order, test_mode=True,
                            now_iso=NOW.isoformat(), premium_refund_policy=policy)


def deliver(profile, meta, identity="reward", origin=None):
    return meta.deliver_reward_chest(profile, "core_24h", "season-fixture", identity, origin=origin)


def collect(profile, index=0):
    return collect_chest(profile, profile.reward_inbox[index], "collect-fixture", NOW.isoformat())


def test_battle_queue_collect_open_and_duplicate_delivery_never_double_grant():
    _, profile, meta = fixture()
    baseline = wallet_snapshot(profile)
    chest = meta.award_battle_chest(profile, "battle", True)
    assert not profile.chest_slots and not profile.chest_receipts
    assert wallet_snapshot(profile) == baseline
    assert len(mailbox_messages(profile)[0]) == 1
    assert mailbox_messages(profile)[0][0]["category"] == "battle"
    assert meta.award_battle_chest(profile, "battle", True)["chest_id"] == chest["chest_id"]
    assert len(profile.reward_inbox) == 1
    receipt = collect(profile)
    assert not mailbox_messages(profile)[0] and len(profile.chest_slots) == 1
    assert wallet_snapshot(profile) == baseline
    opened = meta.open_chest(profile, receipt["chest"]["chest_id"], "open")
    after = wallet_snapshot(profile)
    assert meta.open_chest(profile, receipt["chest"]["chest_id"], "open") == opened
    collect(profile)  # a replay after opening must never recreate inventory
    assert not profile.chest_slots and wallet_snapshot(profile) == after
    assert meta.award_battle_chest(profile, "battle", True) is None


@pytest.mark.parametrize("stage", ["mailbox", "inventory", "opened"])
def test_premium_refund_covers_every_delivery_stage_without_unearned_debt(stage):
    _, profile, meta = fixture()
    purchase = buy(profile)
    baseline = wallet_snapshot(profile)
    deliver(profile, meta, origin=premium_origin(profile))
    if stage != "mailbox":
        collect(profile)
    if stage == "opened":
        meta.open_chest(profile, profile.chest_slots[0]["chest_id"], "open")
    earned = wallet_snapshot(profile)
    revoke_purchase(profile, purchase, now_iso=NOW.isoformat())
    assert wallet_snapshot(profile) == baseline
    assert not mailbox_messages(profile)[0]
    assert not meta.view(profile)["chests"]["slots"]
    assert sum(item["count"] for item in meta.view(profile)["chests"]["inventory"]) == 0
    if stage == "mailbox":
        with pytest.raises(PremiumRecoveryError):
            collect(profile)
    if stage == "inventory":
        with pytest.raises(MetaProgressionError):
            meta.open_chest(profile, profile.chest_slots[0]["chest_id"], "new-open")
    # A reversal restores rights/state without rerolling, duplicating or
    # manufacturing contents for unopened chests.
    restore_refunded_purchase(profile, purchase, now_iso=NOW.isoformat())
    assert wallet_snapshot(profile) == earned
    if stage == "mailbox":
        assert len(mailbox_messages(profile)[0]) == 1
    if stage == "inventory":
        assert len(meta.view(profile)["chests"]["slots"]) == 1


def test_premium_chest_keeps_old_season_provenance_and_private_keys_off_wire():
    _, profile, meta = fixture()
    purchase = buy(profile)
    old_season = profile.active_meta_season_id
    deliver(profile, meta, origin=premium_origin(profile))
    public = json.dumps(mailbox_messages(profile))
    assert purchase["key"] not in public and "premium_origin" not in public
    collect(profile)
    assert purchase["key"] not in json.dumps(meta.view(profile)["chests"])
    archive_and_soft_reset_season(profile, "next-season")
    newer = buy(profile, "new-order")
    baseline = wallet_snapshot(profile)
    meta.open_chest(profile, profile.chest_slots[0]["chest_id"], "open-old-season")
    assert any(key.startswith("delivered-chest:") for key in profile.premium_reward_recovery[old_season]["claims"])
    revoke_purchase(profile, purchase, now_iso=NOW.isoformat())
    assert wallet_snapshot(profile) == baseline
    assert profile.season_premium_purchase_key == newer["key"]


def test_legacy_premium_chest_is_not_retroactively_recovered():
    _, profile, meta = fixture()
    purchase = buy(profile, policy="legacy")
    assert premium_origin(profile) is None
    deliver(profile, meta)
    revoke_purchase(profile, purchase, now_iso=NOW.isoformat())
    assert len(mailbox_messages(profile)[0]) == 1
    collect(profile)
    assert meta.open_chest(profile, profile.chest_slots[0]["chest_id"], "open")["rewards"]


def test_competition_contents_and_cosmetics_are_preserved_until_opening():
    _, profile, meta = fixture()
    prize = {"chest_tier": "weekly_first", "chest_name_tr": "Champion", "circuit_credits": 1200,
             "flux_shards": 90, "universal_module_shards": 5, "avatar_id": "weekly_champion"}
    profile.reward_inbox.append({"message_id": "competition", "status": "unclaimed", "source": "weekly_tournament", "chest": prize})
    baseline = wallet_snapshot(profile)
    collect(profile)
    assert wallet_snapshot(profile) == baseline and "weekly_champion" not in profile.unlocked_avatar_ids
    batch = meta.open_all_available_chests(profile, "diamond_24h", "open")
    assert batch["opened_count"] == 1 and batch["receipts"][0]["rewards"] == prize
    assert profile.circuit_credits == baseline["circuit_credits"] + 1200
    assert batch["reward_totals"]["universal_module_shards"] == 5
    assert "weekly_champion" in profile.unlocked_avatar_ids


def test_delivery_claim_open_receipts_and_notice_seen_survive_restart():
    profiles, profile, meta = fixture()
    purchase = buy(profile)
    deliver(profile, meta, origin=premium_origin(profile))
    queue_purchase_notice(profile, purchase, product_name="Season", product_id="season_pass_premium")
    queue_purchase_notice(profile, purchase, product_name="Season", product_id="season_pass_premium")
    purchases = mailbox_messages(profile)[1]
    assert len(purchases) == 1 and not purchases[0]["seen"]
    profile.seen_inbox_notice_ids = (purchases[0]["notice_id"],)
    collect(profile)
    store = PlayerDataStoreService(profile_service=profiles, statistics_service=PlayerStatisticsService(),
                                   settings_service=PlayerSettingsService(), repository=InMemoryPlayerDataRepository())
    store.save_player(profile.player_id)
    profiles._profiles.clear()
    store.load_player(profile.player_id)
    restored = profiles.get(profile.player_id)
    assert restored.chest_slots == profile.chest_slots
    assert restored.reward_inbox == profile.reward_inbox
    assert mailbox_messages(restored)[1][0]["seen"]
    revoke_purchase(restored, purchase, now_iso=NOW.isoformat())
    assert not meta.view(restored)["chests"]["slots"]


def test_more_than_sixty_unclaimed_deliveries_are_never_discarded():
    _, profile, meta = fixture()
    for index in range(75):
        deliver(profile, meta, identity=f"reward-{index}")

    def unclaimed():
        return sum(item.get("status") == "unclaimed" for item in profile.reward_inbox)

    # Kutu her alanda en çok MAILBOX_AREA_LIMIT kayıt gösterir (13 Ekim 2026, kullanıcı
    # kararı); toplanmamış sandık silinmez, yenileri toplandıkça sıradakiler kutuya girer.
    assert unclaimed() == 75
    assert len(mailbox_messages(profile)[0]) == MAILBOX_AREA_LIMIT
    collect(profile)
    assert unclaimed() == 74
    assert len(mailbox_messages(profile)[0]) == MAILBOX_AREA_LIMIT
    for index in range(1, 75 - MAILBOX_AREA_LIMIT + 1):
        collect(profile, index)
    assert unclaimed() == MAILBOX_AREA_LIMIT - 1
    assert len(mailbox_messages(profile)[0]) == MAILBOX_AREA_LIMIT - 1


def test_mailbox_areas_show_the_newest_entries_up_to_the_limit():
    _, profile, meta = fixture()
    for index in range(MAILBOX_AREA_LIMIT + 5):
        deliver(profile, meta, identity=f"reward-{index}")
        meta.award_battle_chest(profile, f"battle-{index}", True)
        queue_purchase_notice(profile, {"key": f"order-{index}", "request_id": f"order-{index}", "purchased_at": NOW.isoformat()},
                              product_name=f"Paket {index}", product_id="fixture")
    rewards, purchases = mailbox_messages(profile)
    # Savaş sandıkları, ödül sandıkları ve satın alım mesajları ayrı alanlardır; her biri kendi sınırını kullanır.
    assert sum(item.get("category") == "battle" for item in rewards) == MAILBOX_AREA_LIMIT
    assert sum(item.get("category") != "battle" for item in rewards) == MAILBOX_AREA_LIMIT
    assert len(purchases) == MAILBOX_AREA_LIMIT
    # En yeniler gösterilir; sınırın dışına düşen satın alım mesajının kaydı tanık olarak durur.
    assert purchases[0]["title_tr"].endswith(f"Paket {MAILBOX_AREA_LIMIT + 4}")
    assert all(not item["title_tr"].endswith("Paket 0") for item in purchases)
    stored = sum(item.get("category") == "purchase" for item in profile.reward_inbox)
    assert stored == MAILBOX_AREA_LIMIT + 5
    queue_purchase_notice(profile, {"key": "order-0", "request_id": "order-0", "purchased_at": NOW.isoformat()},
                          product_name="Paket 0", product_id="fixture")
    assert sum(item.get("category") == "purchase" for item in profile.reward_inbox) == stored
