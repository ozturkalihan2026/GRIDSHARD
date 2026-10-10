(function (global) {
  "use strict";
  const VERSION = "season-rewards-v1";
  function query(adQuery = "") {
    return `${adQuery}${adQuery ? "&" : "?"}premium_refund_policy=${VERSION}`;
  }
  function confirmation(language = "tr") {
    return language === "en"
      ? "Season Pass refund: only the premium resources and actual chest contents gained from this pass are reclaimed. Spent amounts may become deficits in the same in-game resources, which you can clear by playing; no cash debt or forced purchase. Free rewards, XP, trophies and completed upgrades stay unchanged. Verified publisher errors are reviewed without adding a deficit. Continue? Terms: https://gridshardgame.com/terms/"
      : "Ücretli Sezon Geçişi iadesinde yalnız bu geçişten kazanılan premium kaynaklar ve gerçek sandık içerikleri geri alınır. Harcanmış miktar aynı oyun kaynağında oynayarak kapatılabilen açık oluşturabilir; para borcu veya zorunlu alım değildir. Ücretsiz ödüller, XP, kupalar ve tamamlanmış geliştirmeler değişmez. Doğrulanmış yayıncı hatası yeni açık yüklemeden incelenir. Devam edilsin mi? Koşullar: https://gridshardgame.com/terms/";
  }
  function acknowledge(product, confirm, language = "tr") {
    if (product?.id !== "season_pass_premium" || !product.reward_recovery_on_refund) return "";
    // Unknown versions must not be silently accepted by an older application.
    if (product.refund_policy_version !== VERSION) return null;
    return confirm(confirmation(language)) ? VERSION : null;
  }
  function deficits(status, language = "tr", nameForResource = (key) => key) {
    const english = language === "en";
    const labels = english
      ? {flux_shards:"Flux", circuit_credits:"Circuit Credits", universal_module_shards:"Universal Pieces"}
      : {flux_shards:"Akı", circuit_credits:"Devre Kredisi", universal_module_shards:"Evrensel Parça"};
    return Object.entries(status?.deficits || {})
      .filter(([key, value]) => Number.isSafeInteger(value) && value > 0
        && (Object.hasOwn(labels, key) || /^(module_shards|core_shards_by_type):[A-Za-z0-9_-]{1,100}$/.test(key)))
      .map(([key, value]) => `${labels[key] || nameForResource(key)}: ${value.toLocaleString(english ? "en-US" : "tr-TR")}`);
  }
  const api = {VERSION, query, confirmation, acknowledge, deficits};
  global.GridshardPremiumRefundPolicy = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
