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
  const AD_PROTOCOL = "child-safe-v1";

  // Until a reviewed mixed-audience age flow exists, do not infer adulthood
  // from Play Games, an analytics checkbox or a saved UMP consent. Treat all
  // ad requests conservatively, including users whose age is unknown.
  // UMP's TFUA signal is separate from the advertising SDK's request config.
  const AD_CONSENT_CONFIGURATION = Object.freeze({ tagForUnderAgeOfConsent: true });
  const AD_REQUEST_CONFIGURATION = Object.freeze({
    tagForChildDirectedTreatment: true,
    maxAdContentRating: "General",
  }); // Do not set the legacy TFCD and TFUA flags together on ad requests.

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
      this.adsConsent = null;
      this.adsConsentFlight = null;
      this.adsPrivacyOptionsRequired = false;
      this.adsBusy = false;
      this.storePrices = new Map();
      this.storePriceFlight = null;
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
        && storeState?.providers?.ad_policy?.protocol === AD_PROTOCOL
        && ["test", "live"].includes(storeState?.providers?.ad_policy?.mode)
        && storeState?.providers?.ad_units?.[this.platform]
        && this.plugin("AdMob")
      ) {
        return "admob";
      }
      return storeState?.providers?.ads || null;
    }

    adCapability() {
      return this.plugin("AdMob")
        ? {ad_protocol:AD_PROTOCOL, ad_platform:this.platform} : {};
    }

    adQuery() {
      const capability = this.adCapability();
      return capability.ad_protocol
        ? `?ad_protocol=${encodeURIComponent(capability.ad_protocol)}&ad_platform=${encodeURIComponent(capability.ad_platform)}` : "";
    }

    // Mağazanın ödeme penceresini açar. Oyuncu vazgeçerse eklenti hata verir.
    // Otomatik onay kapalı: sunucu reddederse Google onaylanmamış alımı 3 gün
    // içinde iade eder; önceden onaylanan alım iade edilmez.
    async refreshProductPrices(products, storeState) {
      const provider = this.purchaseProvider(storeState);
      if (!["google_play","app_store"].includes(provider)) return;
      while (this.storePriceFlight) {
        try { await this.storePriceFlight; } catch (_error) { /* Prior query failed closed. */ }
      }
      const ids = [...new Set(products.map(product => product?.store_product_id).filter(Boolean))];
      if (!ids.length) return;
      // One batch: the native billing client does not support parallel queries.
      const flight = (async () => {
        for (const id of ids) this.storePrices.delete(id);
        const plugin = this.plugin("NativePurchases");
        if (!plugin?.getProducts) return;
        const result = await plugin.getProducts({productIdentifiers:ids,productType:"inapp"});
        const grouped = new Map();
        for (const product of result?.products || []) {
          if (!ids.includes(product?.identifier)) continue;
          const entries = grouped.get(product.identifier) || [];
          entries.push(product); grouped.set(product.identifier,entries);
        }
        for (const [id, entries] of grouped) {
          // An ambiguous offer needs explicit selection; never show one price
          // and buy another. Current catalog uses one normal purchase option.
          if (entries.length !== 1) continue;
          const product = entries[0];
          if (typeof product.priceString !== "string" || !product.priceString.trim()
              || !Number.isFinite(product.price) || product.price < 0) continue;
          this.storePrices.set(id,{priceLabel:product.priceString,
            offerToken:typeof product.offerToken === "string" ? product.offerToken : ""});
        }
      })();
      this.storePriceFlight = flight;
      try { await flight; } catch (_error) { /* Unavailable price = no new charge. */ }
      finally { if (this.storePriceFlight === flight) this.storePriceFlight = null; }
    }

    priceForProduct(product) { return this.storePrices.get(product?.store_product_id) || null; }

    async purchase(product, { accountToken = "" } = {}) {
      const plugin = this.plugin("NativePurchases");
      if (!plugin) throw new Error("Mağaza eklentisi bu cihazda yok.");
      const price = this.priceForProduct(product);
      if (!price) throw new Error("Ürün veya güncel mağaza fiyatı alınamadı; ödeme başlatılmadı.");
      const options = {
        productIdentifier: product.store_product_id,
        productType: "inapp",
        quantity: 1,
        autoAcknowledgePurchases: false,
        isConsumable: false,
      };
      if (this.platform === "android" && price.offerToken) options.offerToken = price.offerToken;
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

    _rememberAdsConsent(info) {
      // UMP is the source of truth; never persist or infer consent ourselves.
      this.adsConsent = {
        status: String(info?.status || "UNKNOWN"),
        canRequestAds: info?.canRequestAds === true,
        privacyOptionsRequired: info?.privacyOptionsRequirementStatus === "REQUIRED",
      };
      this.adsPrivacyOptionsRequired = this.adsConsent.privacyOptionsRequired;
      return this.adsConsent;
    }

    async refreshAdsConsent({ storeState, force = false } = {}) {
      if (this.adProvider(storeState) !== "admob") return null;
      if (this.adsConsentFlight) return this.adsConsentFlight;
      if (this.adsConsent && !force) return this.adsConsent;
      const plugin = this.plugin("AdMob");
      if (typeof plugin?.requestConsentInfo !== "function") {
        throw new Error("Reklam gizlilik desteği bu cihazda kullanılamıyor.");
      }
      this.adsConsentFlight = Promise.resolve().then(() => plugin.requestConsentInfo({ ...AD_CONSENT_CONFIGURATION }))
        .then(info => this._rememberAdsConsent(info))
        .catch(error => {
          this.adsConsent = null; // An unsuccessful refresh never permits ads.
          throw error;
        }).finally(() => { this.adsConsentFlight = null; });
      return this.adsConsentFlight;
    }

    async showAdsPrivacyOptions({ storeState } = {}) {
      if (this.adsBusy) throw new Error("Reklam işlemi zaten devam ediyor.");
      this.adsBusy = true;
      try {
        if (this.adProvider(storeState) !== "admob") return false;
        if (!this.adsPrivacyOptionsRequired) await this.refreshAdsConsent({ storeState });
        if (!this.adsPrivacyOptionsRequired) return false;
        // No ad can race a revocation while the native form is on screen.
        this.adsConsent = null;
        await this.plugin("AdMob").showPrivacyOptionsForm();
        await this.refreshAdsConsent({ storeState, force:true });
        return true;
      } finally { this.adsBusy = false; }
    }

    async _showRewardUntilClosed(plugin, adId) {
      // SDK 8.1.0 resolves showRewardVideoAd on earned reward, but not on
      // dismissal/failure without a reward. Observe those terminal events too.
      const handles = [];
      let earned = null, settled = false;
      let finish;
      const result = new Promise((resolve, reject) => {
        finish = (error, reward) => {
          if (settled) return;
          settled = true;
          if (error) reject(error); else resolve(reward);
        };
      });
      // Install listeners before show, including synchronous test/native events.
      try {
        handles.push(await plugin.addListener("onRewardedVideoAdReward", reward => { earned = reward; }));
        handles.push(await plugin.addListener("onRewardedVideoAdDismissed", () => {
          finish(earned ? null : new Error("Reklam tamamlanmadan kapatıldı; ek ödül verilmedi."), earned);
        }));
        handles.push(await plugin.addListener("onRewardedVideoAdFailedToShow", () => {
          finish(new Error("Reklam gösterilemedi. Daha sonra yeniden deneyebilirsin."));
        }));
        Promise.resolve().then(() => plugin.showRewardVideoAd({ adId }))
          .then(reward => { if (!settled && reward) earned = reward; }, error => finish(error));
        return await result;
      } finally {
        await Promise.allSettled(handles.map(async handle => handle.remove()));
      }
    }

    // Ödüllü reklamı gösterir. SSV isteğine oyuncu ve savaş kimliği gömülür;
    // sunucu ödülü yalnız bu imzalı geri çağrı ulaştığında verir.
    async showRewardedAd({ storeState, userId, battleId }) {
      const plugin = this.plugin("AdMob");
      const adId = storeState?.providers?.ad_units?.[this.platform];
      if (this.adProvider(storeState) !== "admob" || !plugin || !adId) {
        throw new Error("Ödüllü reklam henüz etkin değil.");
      }
      if (this.adsBusy) throw new Error("Reklam işlemi zaten devam ediyor.");
      this.adsBusy = true;
      try {
        const info = await this.refreshAdsConsent({ storeState });
        // UMP should not request consent under the conservative age tag. An
        // unexpected REQUIRED result must not ask a child/unknown user to
        // authorize personal-data processing or reuse a previous permission.
        if (info?.status === "REQUIRED" || !info?.canRequestAds) {
          throw new Error("Reklam için gizlilik onayı tamamlanamadı. Oynamaya devam edebilirsin.");
        }
        const testMode = storeState?.providers?.ad_policy?.mode === "test";
        let testSettings = null;
        const safety = this.plugin("GridshardAdSafety");
        if (testMode) {
          if (!safety?.getTestSettings || !safety?.verifyTestDevice) throw new Error("Güvenli reklam test paketi gerekli.");
          testSettings = await safety.getTestSettings();
          if (testSettings?.mode !== "test" || testSettings?.adUnitId !== adId
              || !Array.isArray(testSettings?.testingDevices) || !testSettings.testingDevices.length
              || testSettings.testingDevices.some(id => typeof id !== "string" || !/^[A-F0-9]{32}$/.test(id))) {
            throw new Error("Reklam test yapılandırması doğrulanamadı.");
          }
        } else if (this.platform === "android" && adId !== "ca-app-pub-3940256099942544/5224354917") {
          // The official demo unit is harmless; our publisher unit needs a
          // reviewed release build. Server policy cannot authorize debug ads.
          if (!safety?.verifyLiveBuild) throw new Error("Bu paket canlı reklam için yetkilendirilmedi.");
          const liveBuild = await safety.verifyLiveBuild({adId});
          if (liveBuild?.verified !== true || liveBuild?.mode !== "live") {
            throw new Error("Bu paket canlı reklam için yetkilendirilmedi.");
          }
        }
        if (!this.adsInitialized) {
          // AdMob 8.1.0 applies these flags BEFORE MobileAds.initialize/start.
          this.adsInitialized = Promise.resolve().then(() => plugin.initialize({ ...AD_REQUEST_CONFIGURATION,
            ...(testMode ? {initializeForTesting:true,testingDevices:[...testSettings.testingDevices]} : {}),
          })).catch((error) => {
            this.adsInitialized = null;
            throw error;
          });
        }
        await this.adsInitialized;
        if (testMode) {
          const verified = await safety.verifyTestDevice({adId});
          if (verified?.verified !== true || verified?.mode !== "test") throw new Error("Test cihazı doğrulanamadı.");
        }
        const loaded = await plugin.prepareRewardVideoAd({
          adId,
          immersiveMode:true,
          npa:true,
          ...(testMode ? {isTesting:true} : {}),
          ssv: { userId: String(userId), customData: String(battleId) },
        });
        if (loaded?.adUnitId !== adId) throw new Error("Yüklenen reklam birimi beklenen birim değil.");
        return await this._showRewardUntilClosed(plugin, adId);
      } finally { this.adsBusy = false; }
    }
  }

  global.GridshardNativeStore = Object.freeze({ NativeStoreBridge });
  if (typeof module !== "undefined" && module.exports) {
    module.exports = { NativeStoreBridge };
  }
})(typeof window !== "undefined" ? window : globalThis);

