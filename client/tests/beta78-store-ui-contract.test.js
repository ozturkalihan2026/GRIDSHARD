const assert = require("node:assert/strict");
const fs = require("node:fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const html = fs.readFileSync("./index.html", "utf8");
const catalog = fs.readFileSync("../server/app/store_catalog.py", "utf8");

// Mağaza kartları ve maç sonu teklifleri, sunucunun etkin sağlayıcısı yoksa
// ücretli veya reklamlı bir işlemi başlatamaz.
for (const id of [
  "paid-store-mode",
  "paid-store-premium",
  "paid-flux-packs",
  "paid-credit-packs",
  "season-premium-buy",
  "post-match-premium-buy",
  "post-match-ad-button",
]) {
  assert.ok(html.includes(`id="${id}"`), `${id} eksik`);
}
assert.match(app, /if \(!provider\) \{\s*setStatus\("Ödeme altyapısı hazırlanıyor/);
assert.ok(app.includes('button.disabled = Boolean(!currentPurchaseProvider() || purchaseInFlight)'));
assert.ok(app.includes('buy.disabled = Boolean(!currentPurchaseProvider() || purchaseInFlight)'));
assert.ok(app.includes('host.hidden = !battleId || !hasRewards || !provider'));

// Sunucu yalnız açıkça etkinleştirilmiş deneme sağlayıcısını duyurur. Gerçek
// mağaza ve reklam doğrulaması gelmeden istemci bunları var saymamalıdır.
assert.match(catalog, /"purchase": "test" if purchase_test_mode else None/);
assert.match(catalog, /"ads": "test" if ad_test_mode else None/);
assert.match(catalog, /if provider in \{"google_play", "app_store"\}:/);
assert.match(app, /pendingPurchaseIds\.get\(productId\)/);
assert.match(app, /pendingPurchaseIds\.set\(productId, transactionId\)/);
assert.match(app, /pendingPurchaseIds\.delete\(productId\)/);
assert.match(app, /adRewardReceipts\.has\(battleId\)/);
assert.ok(app.includes('await nativeStore.showRewardedAd({ storeState, userId:participantPlayerId, battleId })'));
assert.ok(app.includes('await playTestRewardAd()'));
