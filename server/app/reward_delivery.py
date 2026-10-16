"""Durable mailbox delivery, separate from collecting and opening a chest.

Keep claimed messages as private deduplication witnesses; never truncate an
unclaimed reward. All callers persist under the player's transaction/lock.
"""
from copy import deepcopy
from hashlib import sha256

from .premium_reward_recovery import POLICY_VERSION, PremiumRecoveryError, wallet_snapshot


TIER_DEFINITIONS = {
    "bronze": "field_3h", "silver": "circuit_8h", "gold": "core_24h", "diamond": "diamond_24h",
    "weekly_first": "diamond_24h", "weekly_second": "core_24h", "weekly_third": "circuit_8h",
    "team_first": "diamond_24h", "team_second": "core_24h", "team_third": "circuit_8h",
}
PLAYER_UNLOCKS = {
    "avatar_id": "unlocked_avatar_ids", "avatar_frame_id": "unlocked_avatar_frame_ids",
    "emoji_id": "unlocked_battle_emoji_ids", "profile_background_id": "unlocked_profile_background_ids",
    "badge_id": "unlocked_badge_ids", "rank_trophy_id": "unlocked_rank_trophy_ids",
}


def public_chest(chest: dict) -> dict:
    result = {key: deepcopy(value) for key, value in chest.items()
              if key not in {"premium_origin", "fixed_reward", "team_reward"}}
    # Display identity only. Keep the fixed contents and refund provenance
    # private while letting the client show the same crate before opening.
    fixed = chest.get("fixed_reward")
    if isinstance(fixed, dict) and fixed.get("chest_visual_id"):
        result["chest_visual_id"] = str(fixed["chest_visual_id"])
    return result


def premium_origin(profile) -> dict | None:
    season = profile.active_meta_season_id
    key = profile.season_premium_purchase_key
    root = profile.premium_reward_recovery.get(season)
    if not root or key not in root.get("purchases", {}):
        return None  # legacy rewards remain exempt
    if root.get("policy_version") != POLICY_VERSION or root.get("recovered") or root["purchases"][key].get("refunded"):
        raise PremiumRecoveryError("İade edilmiş premium alımdan yeni sandık alınamaz.")
    return {"season_id": season, "purchase_key": key}


def chest_available(profile, chest: dict) -> bool:
    origin = chest.get("premium_origin")
    if not origin:
        return True
    root = profile.premium_reward_recovery.get(origin.get("season_id"), {})
    return bool(root.get("policy_version") == POLICY_VERSION
                and origin.get("purchase_key") in root.get("purchases", {})
                and not root.get("recovered")
                and any(not item.get("refunded") for item in root.get("purchases", {}).values()))


def record_opened_premium_chest(profile, chest: dict, before: dict) -> None:
    origin = chest.get("premium_origin")
    if not origin:
        return
    if not chest_available(profile, chest):
        raise PremiumRecoveryError("İade edilmiş premium sandık açılamaz.")
    root = profile.premium_reward_recovery[origin["season_id"]]
    claim_id = f"delivered-chest:{chest['chest_id']}"
    if claim_id in root["claims"]:
        raise PremiumRecoveryError("Premium sandık kaynak kaydı yinelendi.")
    after = wallet_snapshot(profile)
    root["claims"][claim_id] = {
        "purchase_key": origin["purchase_key"],
        "resources": {resource: amount - before.get(resource, 0)
                      for resource, amount in after.items() if amount > before.get(resource, 0)},
    }


def queue_chest(profile, chest: dict, *, message_id: str, title: str, category: str = "reward") -> dict:
    previous = next((item for item in profile.reward_inbox if item.get("message_id") == message_id), None)
    if previous:
        return {"message_id": message_id, "definition_id": chest["definition_id"], "delivered": True}
    tier = next((tier for tier, definition in TIER_DEFINITIONS.items() if definition == chest["definition_id"]), "bronze")
    profile.reward_inbox.append({
        "message_id": message_id, "source": chest.get("source", "reward"), "category": category,
        "title_tr": title, "body_tr": "Topla ile mağazadaki sandık stoğuna ekle; içeriği açtığında verilir.",
        "status": "unclaimed", "created_at": chest.get("awarded_at"),
        "chest": {"chest_tier": tier, "chest_name_tr": chest["name_tr"], "definition_id": chest["definition_id"]},
        "inventory_chest": deepcopy(chest),
    })
    return {"message_id": message_id, "definition_id": chest["definition_id"], "delivered": True}


def collect_chest(profile, message: dict, request_id: str, now_iso: str) -> dict:
    chest = deepcopy(message.get("inventory_chest"))
    if not chest:
        # Competition crates have fixed contents and cosmetics, not a random
        # store roll. Preserve their payload until the actual opening.
        reward = deepcopy(message.get("chest") or {})
        definition_id = TIER_DEFINITIONS.get(reward.get("chest_tier"), "field_3h")
        chest = {"chest_id": "mail-" + sha256(message["message_id"].encode()).hexdigest()[:32],
                 "definition_id": definition_id, "name_tr": reward.get("chest_name_tr", "Ödül Kasası"),
                 "source": message.get("source"), "source_battle_id": None,
                 "awarded_at": now_iso, "unlocks_at": now_iso, "fixed_reward": reward}
        if message.get("source") == "team_tournament" and message.get("team_id"):
            chest["team_reward"] = {"team_id": message["team_id"],
                                    "grant_id": f"team_tournament:{message.get('period_id')}:{message['team_id']}"}
    if not chest_available(profile, chest):
        raise PremiumRecoveryError("İade edilmiş premium sandık toplanamaz.")
    if message.get("status") == "unclaimed" and not any(item.get("chest_id") == chest["chest_id"] for item in profile.chest_slots):
        profile.chest_slots.append(chest)
    message["status"] = "claimed"
    return {"request_id": request_id, "message_id": message["message_id"], "source": message.get("source"),
            "chest": public_chest(chest), "collected": True}


def queue_purchase_notice(profile, receipt: dict, *, product_name: str, product_id: str) -> None:
    key = str(receipt.get("key") or receipt["request_id"])
    identity = "purchase:" + sha256(key.encode()).hexdigest()[:32]
    if any(item.get("message_id") == identity for item in profile.reward_inbox):
        return
    profile.reward_inbox.append({
        "message_id": identity, "category": "purchase", "status": "delivered", "source": "store",
        "title_tr": f"Satın alım tamamlandı · {product_name}",
        "body_tr": "Satın alımın doğrulandı ve hesabına işlendi.", "product_id": product_id,
        "created_at": receipt.get("purchased_at"),
    })


# Mesaj kutusunun her alanı (savaş sandıkları, ödül sandıkları, satın alım
# mesajları, bildirimler, davetler) en çok bu kadar kayıt gösterir (13 Ekim 2026,
# kullanıcı kararı). Sınırın dışına düşen satın alım mesajı kutudan kalkar; kaydı
# yinelenmeyi önleyen tanık olarak durur. Toplanmamış sandık silinmez: yenileri
# toplandıkça sıradaki eskiler kutuya girer.
MAILBOX_AREA_LIMIT = 20


def mailbox_messages(profile) -> tuple[list[dict], list[dict]]:
    rewards, purchases = [], []
    shown = {"battle": 0, "reward": 0}
    seen = set(profile.seen_inbox_notice_ids)
    dismissed = set(profile.dismissed_inbox_notice_ids)
    for item in reversed(profile.reward_inbox):
        if item.get("category") == "purchase":
            if item.get("message_id") in dismissed:
                continue
            if len(purchases) < MAILBOX_AREA_LIMIT:
                purchases.append({**deepcopy(item), "notice_id": item["message_id"], "seen": item["message_id"] in seen})
        elif item.get("status") == "unclaimed" and chest_available(profile, item.get("inventory_chest") or {}):
            area = "battle" if item.get("category") == "battle" else "reward"
            if shown[area] >= MAILBOX_AREA_LIMIT:
                continue
            shown[area] += 1
            rewards.append({key: deepcopy(value) for key, value in item.items() if key != "inventory_chest"})
    return rewards, purchases


def apply_fixed_contents(profile, rewards: dict) -> None:
    for field in ("circuit_credits", "flux_shards", "universal_module_shards"):
        setattr(profile, field, getattr(profile, field) + max(0, int(rewards.get(field, 0))))
    for key, attribute in PLAYER_UNLOCKS.items():
        value = str(rewards.get(key) or "").strip()
        if value:
            setattr(profile, attribute, tuple(dict.fromkeys((*getattr(profile, attribute), value))))
