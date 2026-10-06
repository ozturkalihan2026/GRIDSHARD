"use strict";

// Mağaza sandıklarının olasılıkları satın almadan önce gösterilir (Google Play
// ödeme politikası; docs/CHILD_AUDIENCE_AUDIT.md). Tablo sunucudan gelir;
// gerçek açılışla uyuştuğunu server/tests/test_chest_odds_disclosure.py denetler.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("../src/i18n-catalog.js");
const i18n = require("../src/i18n.js");

const CLIENT_ROOT = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(CLIENT_ROOT, ...parts), "utf8");
const html = read("index.html");
const app = read("src", "app.js");
const server = read("..", "server", "app", "meta_progression.py");

// Pencere ve kapatma düğmesi sayfadadır.
const dialog = /<dialog id="chest-odds-dialog"[\s\S]*?<\/dialog>/.exec(html)?.[0] || "";
for (const id of ["chest-odds-title", "chest-odds-list", "chest-odds-close"]) {
  assert.ok(dialog.includes(`id="${id}"`), id);
}

// Her mağaza kartında özet satırı ve satın alma düğmesinin yanında OLASILIKLAR düğmesi vardır.
const card = app.slice(app.indexOf('card.className = "shop-chest-card chest-store-card";'), app.indexOf("renderPaidStore();"));
assert.ok(card.indexOf('odds.className = "chest-store-odds";') > 0);
assert.ok(card.indexOf("actions.appendChild(buy);") < card.indexOf('oddsAction.textContent = "OLASILIKLAR";'));
assert.ok(card.includes("openChestOdds(item.definition_id)"));

// İstemcinin gösterdiği her alan sunucunun mağaza görünümünde vardır.
const storeView = server.slice(server.indexOf("def _chest_store_view"), server.indexOf("def _owned_chest_inventory_view"));
for (const field of ["reward_preview", "module_drop_chance", "core_drop_chance", "module_rarity_drop_odds", "shards_by_rarity"]) {
  assert.ok(storeView.includes(`"${field}"`), `sunucu görünümünde yok: ${field}`);
  assert.ok(app.includes(field), `istemci kullanmıyor: ${field}`);
}

// Satırlar iki dilde de doğru kurulur.
const line = (key, params, language) => i18n.t(key, params, language);
assert.equal(line("store.odds_card", { module:"35" }, "tr"), "Modül parçası %35");
assert.equal(line("store.odds_card", { module:"35" }, "en"), "Module shards 35%");
assert.equal(line("store.odds_card_core", { module:"53", core:"6" }, "tr"), "Modül parçası %53 · Çekirdek parçası %6");
assert.equal(line("store.odds_card_core", { module:"53", core:"6" }, "en"), "Module shards 53% · Core shard 6%");
assert.equal(line("store.odds_guaranteed", { label:"Akı", range:"5–9" }, "tr"), "Akı: %100 · 5–9");
assert.equal(line("store.odds_guaranteed", { label:"Flux", range:"5–9" }, "en"), "Flux: 100% · 5–9");
assert.equal(line("store.odds_module", { chance:"50" }, "tr"), "Modül parçası: %50");
assert.equal(line("store.odds_rarity", { rarity:"Nadir", chance:"15", range:"2–3" }, "tr"), "Nadir: %15 · 2–3 parça");
assert.equal(line("store.odds_rarity", { rarity:"Rare", chance:"15", range:"2–3", count:3 }, "en"), "Rare: 15% · 2–3 shards");
// Tek parçalık aralık "1–1" diye yazılmaz.
assert.equal(line("store.odds_rarity", { rarity:"Efsanevi", chance:"3", range:"1", count:1 }, "tr"), "Efsanevi: %3 · 1 parça");
assert.equal(line("store.odds_rarity", { rarity:"Legendary", chance:"3", range:"1", count:1 }, "en"), "Legendary: 3% · 1 shard");
assert.ok(app.includes("return low === high ? localizedNumber(low)"));
assert.equal(line("store.odds_core", { chance:"6" }, "tr"), "Çekirdek parçası: %6 · 1 parça");
assert.equal(line("store.odds_core", { chance:"6" }, "en"), "Core shard: 6% · 1 shard");

for (const text of [
  "OLASILIKLAR",
  "İÇERİK VE OLASILIKLAR",
  "Yüzde, sandığın o ödülü içerme olasılığıdır. Modül parçası, açılmış modüllerinden rastgele birine verilir; o enderlikte açılmış modülün yoksa başka enderlikteki bir modülüne verilir.",
]) {
  assert.ok(html.includes(text) || app.includes(`"${text}"`), `kullanılmıyor: ${text}`);
  const english = i18n.translateText(text, "en");
  assert.notEqual(english, text, `çevirisi yok: ${text}`);
  assert.equal(i18n.translateText(english, "tr"), text, `geri dönmüyor: ${text}`);
}

console.log("gridshard chest odds client test passed");
