"""Gerçek parayla satılan ürünler, fiyatlar ve doğrulama sağlayıcıları.

Beta.72 tur 9 (kullanıcı kararı, 28 Eylül 2026): ücretli sezon geçişi 99,99 TL,
Savaş Premium 99,99 TL, dört Akı ve dört Devre Kredisi paketi.

Ödeme yalnız sunucuda doğrulanır ve işlenir; istemci hiçbir zaman kendi
başına ürün veremez. Sağlayıcılar:
- ``test``: geliştirmede açık, üretimde kapalı. Gerçek ödeme alınmaz,
  arayüzde açıkça "deneme alımı" yazar.
- ``google_play`` / ``app_store``: makbuz ``store_verification`` ile mağazanın
  sunucusundan doğrulanır (Beta.72 tur 10); doğrulayıcı yapılandırılmadıysa
  reddedilir. Bkz. docs/STORE_PURCHASES.md.
Aynı sağlayıcı + doğrulanmış işlem kimliği ikinci kez ürün vermez.
"""

from __future__ import annotations

import os
import uuid


CURRENCY = "TRY"
BATTLE_PREMIUM_BONUS_PERCENT = 50
PURCHASE_RECEIPT_LIMIT = 200
PURCHASE_PROVIDERS = ("test", "google_play", "app_store")
STORE_PROVIDERS = ("google_play", "app_store")
VERIFIED_AD_VIEW_LIMIT = 100


# Mağaza alımını oyuncu hesabına bağlayan belirtecin ad alanı (UUID v5).
# Değişirse daha önce yapılmış ama işlenmemiş alımlar eşleşmez; değiştirilmez.
STORE_ACCOUNT_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "https://gridshard.game/store-account")


class StoreError(ValueError):
    pass


def store_account_token(player_id: str) -> str:
    """Ödeme penceresinde alıma bağlanan hesap belirteci.

    iOS StoreKit ``appAccountToken`` UUID ister; Google Play aynı değeri
    ``obfuscatedAccountId`` olarak saklar. Mağaza bu değeri imzalı alım
    verisinde döndürür; sunucu başka hesabın makbuzunu böylece reddeder.
    """
    return str(uuid.uuid5(STORE_ACCOUNT_NAMESPACE, str(player_id)))


def _pack(product_id: str, currency: str, amount: int, price_kurus: int, bonus_percent: int = 0) -> dict:
    label = "Akı" if currency == "flux_shards" else "Devre Kredisi"
    return {
        "id": product_id,
        "kind": "currency",
        "currency": currency,
        "amount": amount,
        "name_tr": f"{amount:,} {label}".replace(",", "."),
        "price_kurus": price_kurus,
        "bonus_percent": bonus_percent,
    }


PAID_PRODUCTS: tuple[dict, ...] = (
    {
        "id": "season_pass_premium",
        "kind": "season_pass",
        "name_tr": "Ücretli Sezon Geçişi",
        "description_tr": "Bu sezonun premium ödül hattını açar; premium ödüller iki kattır.",
        "price_kurus": 9999,
    },
    {
        "id": "battle_rewards_premium",
        "kind": "battle_premium",
        "name_tr": "Savaş Premium",
        "description_tr": (
            f"Bu sezon savaş sonu Devre Kredisi ve Deneyim ödülleri "
            f"%{BATTLE_PREMIUM_BONUS_PERCENT} artar (kupa hariç)."
        ),
        "price_kurus": 9999,
    },
    # Paket bonusu en küçük paketin TL başına miktarına göredir.
    _pack("flux_120", "flux_shards", 120, 2999),
    _pack("flux_260", "flux_shards", 260, 5999, 8),
    _pack("flux_480", "flux_shards", 480, 9999, 20),
    _pack("flux_1050", "flux_shards", 1050, 19999, 31),
    _pack("credits_1000", "circuit_credits", 1000, 2999),
    _pack("credits_2200", "circuit_credits", 2200, 5999, 10),
    _pack("credits_4000", "circuit_credits", 4000, 9999, 20),
    _pack("credits_9000", "circuit_credits", 9000, 19999, 35),
)
PRODUCTS_BY_ID = {product["id"]: product for product in PAID_PRODUCTS}


def price_label_tr(price_kurus: int) -> str:
    return f"{int(price_kurus) // 100},{int(price_kurus) % 100:02d} TL"


def store_product_id(product: dict) -> str:
    """Google Play / App Store ürün kimliği (mağaza kayıtları bununla açılır)."""
    return f"gridshard.{product['id']}"


def _flag(name: str, default: bool) -> bool:
    raw = os.environ.get(name, "").strip().lower()
    if not raw:
        return default
    return raw in {"1", "true", "yes", "on"}


def purchase_test_mode_enabled(strict: bool) -> bool:
    return _flag("GRIDSHARD_PURCHASE_TEST_MODE", not strict)


def ad_test_mode_enabled(strict: bool) -> bool:
    return _flag("GRIDSHARD_AD_TEST_MODE", not strict)


def verify_purchase(provider: str, *, test_mode: bool) -> dict:
    if provider == "test":
        if not test_mode:
            raise StoreError("Deneme alımı bu sunucuda kapalı; gerçek mağaza doğrulaması gerekir.")
        return {"provider": "test", "test": True}
    if provider in {"google_play", "app_store"}:
        raise StoreError(
            "Mağaza makbuz doğrulaması henüz yapılandırılmadı; gerçek ödeme kabul edilmiyor."
        )
    raise StoreError("Bilinmeyen ödeme sağlayıcısı.")


def verify_ad_view(provider: str, *, test_mode: bool) -> dict:
    if provider == "test":
        if not test_mode:
            raise StoreError("Deneme reklamı bu sunucuda kapalı.")
        return {"provider": "test", "test": True}
    if provider in {"admob", "applovin"}:
        raise StoreError("Reklam sağlayıcısının sunucu doğrulaması henüz yapılandırılmadı.")
    raise StoreError("Bilinmeyen reklam sağlayıcısı.")


def _grant(profile, product: dict) -> dict:
    kind = product["kind"]
    if kind == "season_pass":
        if profile.premium_pass_active():
            raise StoreError("Bu sezonun ücretli geçişi zaten etkin.")
        profile.season_premium_pass_season_id = profile.active_meta_season_id
        return {"season_pass_season_id": profile.season_premium_pass_season_id}
    if kind == "battle_premium":
        if profile.battle_premium_active():
            raise StoreError("Savaş Premium bu sezon zaten etkin.")
        profile.battle_premium_season_id = profile.active_meta_season_id
        return {"battle_premium_season_id": profile.battle_premium_season_id}
    if kind == "currency":
        currency = str(product["currency"])
        amount = int(product["amount"])
        setattr(profile, currency, int(getattr(profile, currency)) + amount)
        return {"currency": currency, "amount": amount}
    raise StoreError("Ürün türü desteklenmiyor.")


def product_by_id(product_id: str) -> dict:
    product = PRODUCTS_BY_ID.get(str(product_id))
    if product is None:
        raise StoreError("Ürün bulunamadı.")
    return product


def process_purchase(
    profile,
    product_id: str,
    provider: str,
    transaction_id: str,
    *,
    test_mode: bool,
    now_iso: str,
    verified=None,
) -> dict:
    """Ürünü bir kez verir. Gerçek mağazada ``verified`` mağaza sunucusunun
    doğruladığı alımdır (``store_verification.VerifiedPurchase``); işlem
    kimliği istemcinin gönderdiği değil, doğrulanmış kimliktir."""
    product = product_by_id(product_id)
    if provider in STORE_PROVIDERS:
        if verified is None or verified.provider != provider:
            raise StoreError("Mağaza makbuzu doğrulanmadan gerçek ödeme kabul edilmez.")
        if verified.store_product_id != store_product_id(product):
            raise StoreError("Mağaza makbuzu bu ürüne ait değil.")
        transaction_id = verified.transaction_id
        environment = verified.environment
    else:
        transaction_id = str(transaction_id or "").strip()
        if not transaction_id or len(transaction_id) > 128:
            raise StoreError("Ödeme işlem kimliği geçersiz.")
        environment = "test" if verify_purchase(provider, test_mode=test_mode).get("test") else "production"
    key = f"{provider}:{transaction_id}"
    existing = profile.purchase_receipts.get(key)
    if existing is not None:
        if existing.get("product_id") != product["id"]:
            raise StoreError("İşlem kimliği farklı bir ürüne ait.")
        return {**existing, "replayed": True}
    granted = _grant(profile, product)
    receipt = {
        "key": key,
        "product_id": product["id"],
        "provider": provider,
        "transaction_id": transaction_id,
        "price_kurus": product["price_kurus"],
        "currency": CURRENCY,
        "granted": granted,
        "purchased_at": now_iso,
        "environment": environment,
        "test": environment != "production",
        "consumed": provider != "google_play",
        "replayed": False,
    }
    profile.purchase_receipts[key] = dict(receipt)
    while len(profile.purchase_receipts) > PURCHASE_RECEIPT_LIMIT:
        profile.purchase_receipts.pop(next(iter(profile.purchase_receipts)))
    return receipt


def mark_purchase_consumed(profile, key: str) -> None:
    receipt = profile.purchase_receipts.get(key)
    if receipt is not None:
        receipt["consumed"] = True


def _mark_receipt_refund(profile, key: str, *, refunded: bool, now_iso: str) -> None:
    receipt = profile.purchase_receipts.get(key)
    if receipt is not None:
        receipt["refunded"] = refunded
        receipt["refund_updated_at"] = now_iso


def revoke_purchase(profile, entry: dict, *, now_iso: str) -> dict:
    """İade edilen alımın verdiğini geri alır (docs/STORE_PURCHASES.md).

    ``entry`` makbuz defterindeki kayıttır (``granted`` alımın verdiğini
    tutar). Para birimi harcanmış olsa bile tamamı düşülür: bakiye eksiye
    inebilir ve oyuncu yeniden kazanana kadar o para birimini harcayamaz
    (sunucudaki bütün harcama denetimleri bakiyeyi karşılaştırır). Ücretli
    geçiş ve Savaş Premium yalnız iade edilen sezon için etkinse kapatılır;
    önceden alınmış premium ödüller geri alınmaz.
    """
    granted = dict(entry.get("granted") or {})
    changes: dict = {}
    currency = str(granted.get("currency") or "")
    if currency in {"flux_shards", "circuit_credits"}:
        amount = max(0, int(granted.get("amount", 0)))
        setattr(profile, currency, int(getattr(profile, currency)) - amount)
        changes = {"currency": currency, "amount": -amount, "balance": int(getattr(profile, currency))}
    elif granted.get("season_pass_season_id"):
        season_id = str(granted["season_pass_season_id"])
        if profile.season_premium_pass_season_id == season_id:
            profile.season_premium_pass_season_id = ""
            changes = {"season_pass_season_id": season_id, "active": False}
    elif granted.get("battle_premium_season_id"):
        season_id = str(granted["battle_premium_season_id"])
        if profile.battle_premium_season_id == season_id:
            profile.battle_premium_season_id = ""
            changes = {"battle_premium_season_id": season_id, "active": False}
    _mark_receipt_refund(profile, str(entry.get("key", "")), refunded=True, now_iso=now_iso)
    return changes


def restore_refunded_purchase(profile, entry: dict, *, now_iso: str) -> dict:
    """Mağaza iadeyi geri çevirdiyse (App Store REFUND_REVERSED) geri alınanı
    yeniden verir. Geçiş ve Savaş Premium yalnız aynı sezon sürüyorsa açılır."""
    granted = dict(entry.get("granted") or {})
    changes: dict = {}
    currency = str(granted.get("currency") or "")
    if currency in {"flux_shards", "circuit_credits"}:
        amount = max(0, int(granted.get("amount", 0)))
        setattr(profile, currency, int(getattr(profile, currency)) + amount)
        changes = {"currency": currency, "amount": amount, "balance": int(getattr(profile, currency))}
    elif granted.get("season_pass_season_id"):
        season_id = str(granted["season_pass_season_id"])
        if season_id == profile.active_meta_season_id and not profile.premium_pass_active():
            profile.season_premium_pass_season_id = season_id
            changes = {"season_pass_season_id": season_id, "active": True}
    elif granted.get("battle_premium_season_id"):
        season_id = str(granted["battle_premium_season_id"])
        if season_id == profile.active_meta_season_id and not profile.battle_premium_active():
            profile.battle_premium_season_id = season_id
            changes = {"battle_premium_season_id": season_id, "active": True}
    _mark_receipt_refund(profile, str(entry.get("key", "")), refunded=False, now_iso=now_iso)
    return changes


def store_refund_message(entry: dict, *, reversed_refund: bool) -> tuple[str, str]:
    """Oyuncunun gelen kutusuna düşen iade bildirimi (başlık, metin)."""
    product = PRODUCTS_BY_ID.get(str(entry.get("product_id") or ""), {})
    name = str(product.get("name_tr") or "Mağaza alımı")
    currency = product.get("kind") == "currency"
    if reversed_refund:
        return (
            "İade geri alındı",
            f"{name} yeniden hesabına eklendi." if currency else f"{name} yeniden açıldı.",
        )
    return (
        "Alım iade edildi",
        f"İade edilen {name} hesabından düşüldü." if currency else f"İade edilen {name} kapatıldı.",
    )


def record_verified_ad_view(profile, view: dict, *, now_iso: str) -> bool:
    """AdMob SSV'nin imzasını doğruladığı izlemeyi kaydeder; tekrar gelen
    geri çağrı (aynı işlem kimliği) ikinci kayıt oluşturmaz."""
    transaction_id = str(view["transaction_id"])
    if transaction_id in profile.verified_ad_views:
        return False
    profile.verified_ad_views[transaction_id] = {
        "battle_id": str(view["battle_id"]),
        "ad_unit": str(view.get("ad_unit", "")),
        "verified_at": now_iso,
        "claimed": False,
    }
    while len(profile.verified_ad_views) > VERIFIED_AD_VIEW_LIMIT:
        profile.verified_ad_views.pop(next(iter(profile.verified_ad_views)))
    return True


def verified_ad_view_for_battle(profile, battle_id: str) -> str:
    """Bu savaş için doğrulanmış ve henüz kullanılmamış izleme; yoksa hata."""
    for transaction_id, view in profile.verified_ad_views.items():
        if view.get("battle_id") == battle_id and not view.get("claimed"):
            return transaction_id
    raise StoreError("Reklam doğrulaması henüz ulaşmadı; birkaç saniye sonra yeniden dene.")


def mark_ad_view_claimed(profile, transaction_id: str) -> None:
    view = profile.verified_ad_views.get(transaction_id)
    if view is not None:
        view["claimed"] = True


def _product_view(product: dict) -> dict:
    return {
        "id": product["id"],
        "kind": product["kind"],
        "name_tr": product["name_tr"],
        "description_tr": product.get("description_tr", ""),
        "currency": product.get("currency"),
        "amount": product.get("amount"),
        "bonus_percent": product.get("bonus_percent", 0),
        "price_kurus": product["price_kurus"],
        "price_label_tr": price_label_tr(product["price_kurus"]),
        "store_product_id": store_product_id(product),
    }


def store_view(profile, *, purchase_test_mode: bool, ad_test_mode: bool, platforms: dict | None = None) -> dict:
    packs = [_product_view(product) for product in PAID_PRODUCTS if product["kind"] == "currency"]
    platforms = platforms or {}
    return {
        "currency": CURRENCY,
        # Yerel uygulama ödeme penceresine geçirir (appAccountToken).
        "account_token": store_account_token(profile.player_id),
        "providers": {
            # Web ve geliştirme: yalnız deneme sağlayıcıları. Yerel uygulama
            # mağaza/reklam eklentisini, sunucuda doğrulayıcısı açık platformda kullanır.
            "purchase": "test" if purchase_test_mode else None,
            "ads": "test" if ad_test_mode else None,
            "purchase_platforms": dict(platforms.get("purchase_platforms") or {"google_play": False, "app_store": False}),
            "ad_platforms": dict(platforms.get("ad_platforms") or {"admob": False}),
            "ad_units": dict(platforms.get("ad_units") or {}),
        },
        "season_pass": {
            **_product_view(PRODUCTS_BY_ID["season_pass_premium"]),
            "active": profile.premium_pass_active(),
        },
        "battle_premium": {
            **_product_view(PRODUCTS_BY_ID["battle_rewards_premium"]),
            "active": profile.battle_premium_active(),
            "bonus_percent": BATTLE_PREMIUM_BONUS_PERCENT,
        },
        "flux_packs": [pack for pack in packs if pack["currency"] == "flux_shards"],
        "credit_packs": [pack for pack in packs if pack["currency"] == "circuit_credits"],
    }
