(function (global) {
  "use strict";

  // Yerel uygulamada mağaza satın alması ve ödüllü reklam köprüsü (Beta.72 tur 10).
  // Eklentiler Capacitor üzerinden çalışma anında aranır; web'de ve eklenti
  // kurulu değilken köprü yoktur, oyun sunucunun deneme sağlayıcısını kullanır.
  // - Satın alma: @capgo/native-purchases 8.x ("NativePurchases"). Ürün kimliği
  //   sunucudaki store_product_id'dir; makbuz sunucuda mağazadan doğrulanır.
  //   Alım ödeme penceresinde hesaba bağlanır (appAccountToken) ve otomatik
  //   onaylanmaz: Android'de sunucu tüketir, iOS'ta işlem sunucu yanıtından
  //   sonra bitirilir. Yarım kalan alımlar açılışta yeniden gönderilir.
  // - Reklam: @capacitor-community/admob 8.x ("AdMob"). Ödül, AdMob'un sunucuya
  //   gönderdiği imzalı SSV geri çağrısıyla verilir; istemcinin "izledim"
  //   bilgisine güvenilmez. Kurulum: docs/STORE_PURCHASES.md.
  const PURCHASE_PROVIDER_BY_PLATFORM = Object.freeze({ android: "google_play", ios: "app_store" });
  // Sunucuya işlenmiş alımlar (cihaza özel); açılış kurtarması aynı alımı
  // yeniden göndermesin. Sunucu zaten ikinci kez ürün vermez.
  const PROCESSED_PURCHASES_KEY = "gridshard.store.processed-purchases";
  const PROCESSED_PURCHASES_LIMIT = 100;

  function purchaseKey(native) {
    return String(native?.purchaseToken || native?.transactionId || "");
  }

  function nativePurchase(transaction, platform) {
    const value = transaction?.transaction || transaction || {};
    return {
      transactionId: String(value.transactionId || value.orderId || "").trim(),
      purchaseToken: String(value.purchaseToken || "").trim(),
      productIdentifier: String(value.productIdentifier || "").trim(),
      accountToken: String(value.appAccountToken || "").trim().toLowerCase(),
      platform,
    };
  }

  function defaultStorage() {
    try {
      return global.localStorage || null;
    } catch (_error) {
      return null;
    }
  }

  class NativeStoreBridge {
    constructor({ capacitor = global.Capacitor, storage = defaultStorage() } = {}) {
      this.capacitor = capacitor || null;
      this.platform = this.capacitor?.getPlatform?.() || "web";
      this.native = ["android", "ios"].includes(this.platform);
      this.storage = storage;
      this.adsInitialized = null;
    }

    plugin(name) {
      if (!this.native) return null;
      return this.capacitor?.Plugins?.[name] || null;
    }

    // Sunucu bu platformun doğrulayıcısını açtıysa ve eklenti varsa gerçek
    // mağaza; aksi hâlde sunucunun deneme sağlayıcısı (yoksa null).
    purchaseProvider(storeState) {
      const provider = PURCHASE_PROVIDER_BY_PLATFORM[this.platform];
      if (
        provider
        && storeState?.providers?.purchase_platforms?.[provider]
        && this.plugin("NativePurchases")
      ) {
        return provider;
      }
      return storeState?.providers?.purchase || null;
    }

    adProvider(storeState) {
      if (
        storeState?.providers?.ad_platforms?.admob
        && storeState?.providers?.ad_units?.[this.platform]
        && this.plugin("AdMob")
      ) {
        return "admob";
      }
      return storeState?.providers?.ads || null;
    }

    // Mağazanın ödeme penceresini açar. Oyuncu vazgeçerse eklenti hata verir.
    // Otomatik onay kapalı: sunucu reddederse Google onaylanmamış alımı 3 gün
    // içinde iade eder; önceden onaylanan alım iade edilmez.
    async purchase(product, { accountToken = "" } = {}) {
      const plugin = this.plugin("NativePurchases");
      if (!plugin) throw new Error("Mağaza eklentisi bu cihazda yok.");
      const options = {
        productIdentifier: product.store_product_id,
        productType: "inapp",
        quantity: 1,
        autoAcknowledgePurchases: false,
        isConsumable: false,
      };
      if (accountToken) options.appAccountToken = accountToken;
      const native = nativePurchase(await plugin.purchaseProduct(options), this.platform);
      if (!native.transactionId && !native.purchaseToken) throw new Error("Mağaza alım bilgisi döndürmedi.");
      if (!native.productIdentifier) native.productIdentifier = product.store_product_id;
      return native;
    }

    // Sunucu kararından sonra alımı mağazada kapatır. iOS: işlem bitirilir
    // (bitmeyen işlem kuyrukta kalıp sonraki alımları engeller; reddedilen
    // alımın iadesini oyuncu Apple'dan ister). Android: sunucu tüketemediyse
    // verilen ürün burada tüketilir; reddedilen alıma dokunulmaz.
    async finishPurchase(native, { granted = false, consumed = false } = {}) {
      const plugin = this.plugin("NativePurchases");
      if (!plugin || !native) return false;
      try {
        if (this.platform === "ios" && native.transactionId) {
          await plugin.acknowledgePurchase({ purchaseToken: native.transactionId });
          return true;
        }
        if (this.platform === "android" && granted && !consumed && native.purchaseToken) {
          await plugin.consumePurchase({ purchaseToken: native.purchaseToken });
          return true;
        }
      } catch (_error) {
        // Bitirilemeyen alım açılış kurtarmasında yeniden gönderilir; sunucu
        // aynı makbuzu ikinci kez vermez.
      }
      return false;
    }

    // Mağazada ödenmiş ama bitirilmemiş, bu hesaba bağlı alımlar (uygulama
    // ödeme ile sunucu yanıtı arasında kapandıysa). Yalnız bilinen ürünler.
    async unfinishedPurchases(storeProductIds = [], { accountToken = "" } = {}) {
      const plugin = this.plugin("NativePurchases");
      if (!plugin?.getPurchases || !accountToken) return [];
      const known = new Set(storeProductIds);
      const options = { appAccountToken: accountToken };
      if (this.platform === "android") options.productType = "inapp";
      let result;
      try {
        result = await plugin.getPurchases(options);
      } catch (_error) {
        return [];
      }
      return (result?.purchases || [])
        // Android'de "0" bekleyen ödemedir; tamamlanınca yeniden bildirilir.
        .filter((item) => this.platform !== "android" || String(item?.purchaseState ?? "1") === "1")
        .map((item) => nativePurchase(item, this.platform))
        .filter((item) => (
          known.has(item.productIdentifier)
          && purchaseKey(item)
          && (!item.accountToken || item.accountToken === accountToken)
          && !this.isProcessed(item)
        ));
    }

    // Uygulama açıkken mağazanın bildirdiği işlemler (bekleyen ödemenin
    // tamamlanması, aile onayı). Başka hesaba bağlı işlem bildirilmez.
    onTransactionUpdated(handler, { accountToken = "" } = {}) {
      const plugin = this.plugin("NativePurchases");
      if (!plugin?.addListener || !accountToken) return false;
      plugin.addListener("transactionUpdated", (transaction) => {
        const native = nativePurchase(transaction, this.platform);
        if (native.accountToken && native.accountToken !== accountToken) return;
        if (!purchaseKey(native) || this.isProcessed(native)) return;
        handler(native);
      });
      return true;
    }

    purchaseKey(native) {
      return purchaseKey(native);
    }

    isProcessed(native) {
      const key = purchaseKey(native);
      return Boolean(key) && this._processed().includes(key);
    }

    markProcessed(native) {
      const key = purchaseKey(native);
      if (!key) return;
      const list = this._processed().filter((item) => item !== key);
      list.push(key);
      try {
        this.storage?.setItem(
          PROCESSED_PURCHASES_KEY,
          JSON.stringify(list.slice(-PROCESSED_PURCHASES_LIMIT))
        );
      } catch (_error) {
        // Depolama kapalıysa kurtarma aynı alımı yeniden gönderebilir.
      }
    }

    _processed() {
      try {
        const value = JSON.parse(this.storage?.getItem(PROCESSED_PURCHASES_KEY) || "[]");
        return Array.isArray(value) ? value.map(String) : [];
      } catch (_error) {
        return [];
      }
    }

    // Ödüllü reklamı gösterir. SSV isteğine oyuncu ve savaş kimliği gömülür;
    // sunucu ödülü yalnız bu imzalı geri çağrı ulaştığında verir.
    async showRewardedAd({ storeState, userId, battleId }) {
      const plugin = this.plugin("AdMob");
      const adId = storeState?.providers?.ad_units?.[this.platform];
      if (!plugin || !adId) throw new Error("Reklam eklentisi bu cihazda yok.");
      if (!this.adsInitialized) {
        this.adsInitialized = Promise.resolve(plugin.initialize?.({})).catch((error) => {
          this.adsInitialized = null;
          throw error;
        });
      }
      await this.adsInitialized;
      await plugin.prepareRewardVideoAd({
        adId,
        ssv: { userId: String(userId), customData: String(battleId) },
      });
      return plugin.showRewardVideoAd();
    }
  }

  global.GridshardNativeStore = Object.freeze({ NativeStoreBridge });
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { NativeStoreBridge };
  }
})(typeof window !== "undefined" ? window : globalThis);

