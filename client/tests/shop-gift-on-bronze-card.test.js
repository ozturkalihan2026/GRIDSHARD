"use strict";

// Mağazada ayrı bir "Hediye Sandık" bölümü ve ayrı bir hediye düğmesi yoktur:
// Bronz Sandık kartındaki tek açma düğmesi hediye hazırken HEDİYE SANDIK AÇ,
// sonra SANDIK AÇ olur; elde sandık yokken hediyenin kalan süresini yazar.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

require("../src/i18n-catalog.js");
const i18n = require("../src/i18n.js");

const CLIENT_ROOT = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(CLIENT_ROOT, ...parts), "utf8");
const html = read("index.html");
const app = read("src", "app.js");
const css = read("src", "canon.css");
const styles = read("src", "styles.css");

// Sayfada hediye bölümü kalmadı; sandık bölümünde 8 saat notu durur.
const shop = html.slice(html.indexOf('<section id="shop-screen"'), html.indexOf('<dialog id="reward-ad-dialog"'));
assert.ok(shop.length > 0);
assert.ok(!shop.includes("gift-chest-list"));
assert.ok(!shop.includes("Hediye Sandık"));
assert.match(shop, /<p class="shop-gift-note">Bronz Sandık hediyesi 8 saatte bir yenilenir\.<\/p>/);
assert.ok(shop.indexOf('id="chest-store-list"') < shop.indexOf('class="shop-gift-note"'));
for (const source of [css, styles]) {
  assert.ok(!/\.gift-chest-(list|card)\b/.test(source), "eski hediye bölümünün stili kalmamalı");
}

// Düğme mağaza kartında satın alma düğmesinden sonra, yalnız hediye tanımıyla
// eşleşen sandıkta eklenir. Geri sayım zamanlayıcısı kartı iki öznitelikle bulur.
const render = app.slice(app.indexOf("function renderShop()"), app.indexOf("function giftChestActionLabel"));
assert.ok(!render.includes("gift-chest-list"));
assert.ok(render.includes("const gift = giftDefinitions.find((definition) => definition.id === item.definition_id);"));
assert.ok(render.indexOf("actions.appendChild(buy);") < render.indexOf("actions.appendChild(giftAction);"));
assert.ok(render.indexOf("actions.appendChild(giftAction);") < render.indexOf("actions.appendChild(openAllAction);"));
assert.ok(render.includes("card.dataset.definitionId = gift.id;"));
assert.ok(render.includes("card.dataset.claimRemaining = String(remaining);"));
assert.ok(render.includes("const giftReady = Boolean(gift && remaining === 0 && gift.claim_available !== false);"));
assert.ok(render.includes("giftAction.disabled = Boolean(state.unavailable || !giftReady);"));
// Tek düğme: hediye hazırsa (ya da elde sandık yoksa) hediye düğmesi, değilse açma düğmesi.
assert.match(render, /if \(gift && \(giftReady \|\| ownedCount === 0\)\) \{[\s\S]*?actions\.appendChild\(giftAction\);\s*\} else if \(ownedCount > 0\) \{[\s\S]*?actions\.appendChild\(openAllAction\);/);
assert.ok(render.includes('openAllAction.textContent = "SANDIK AÇ";'));
assert.ok(!render.includes('"HEPSİNİ AÇ"'));
assert.equal(i18n.translateText("SANDIK AÇ", "en"), "OPEN CHEST");
assert.equal(i18n.translateText("OPEN CHEST", "tr"), "SANDIK AÇ");
assert.ok(render.includes('giftAction.addEventListener("click", () => claimGiftChest(gift.id));'));
const timer = app.slice(app.indexOf("function ensureShopCountdownTimer()"), app.indexOf("async function metaProgressionMutation"));
assert.ok(timer.includes('document.querySelectorAll("[data-definition-id][data-claim-remaining]")'));
assert.ok(timer.includes("if (button && next > 0) button.textContent = giftChestActionLabel(next);"));
// Hediye düğmesi görünmezken de süre dolunca mağaza yenilenir.
assert.ok(timer.includes("if (next === 0 && previous > 0) becameAvailable = true;"));

// Eğitimin hediye adımı yeni düğmeyi gösterir.
assert.match(app, /id:"gift-chest",[\s\S]{0,200}?target:"#chest-store-list \.gift-chest-action",/);

// Düğmenin yazısı: hazırken çağrı, beklerken kalan süre. İki dilde de okunur.
const labels = {};
vm.runInNewContext(`${app.slice(app.indexOf("function giftChestActionLabel"), app.indexOf("// Mağaza sandığının içerik olasılıkları."))}
${app.slice(app.indexOf("function formatChestCountdown"), app.indexOf("let shopCountdownTimer = null;"))}
this.label = giftChestActionLabel;`, labels);
for (const [seconds, turkish, english] of [
  [0, "HEDİYE SANDIK AÇ", "OPEN GIFT CHEST"],
  [28799, "HEDİYE · 7s 59dk", "GIFT · 7h 59m"],
  [3600, "HEDİYE · 1s 00dk", "GIFT · 1h 00m"],
  [249, "HEDİYE · 4dk 09sn", "GIFT · 4m 09s"],
  [12, "HEDİYE · 12sn", "GIFT · 12s"],
]) {
  assert.equal(labels.label(seconds), turkish);
  assert.equal(i18n.translateText(turkish, "en"), english);
  assert.equal(i18n.translateText(english, "tr"), turkish);
}
const note = "Bronz Sandık hediyesi 8 saatte bir yenilenir.";
assert.notEqual(i18n.translateText(note, "en"), note);
assert.equal(i18n.translateText(i18n.translateText(note, "en"), "tr"), note);

// Başarısız işlemden sonra yalnız o işlemin düğmesi açılır; geri sayımı süren
// hediye düğmesi kapalı kalır.
const cards = [];
const makeCard = (attributes, claimRemaining) => {
  const buttons = {
    ".chest-store-buy": { disabled:true },
    ".gift-chest-action": { disabled:true },
    ".chest-open-all-action": { disabled:true },
  };
  const card = {
    buttons,
    dataset: { claimRemaining },
    getAttribute: (name) => attributes[name] ?? null,
    querySelector: (selector) => buttons[selector] || null,
  };
  cards.push(card);
  return card;
};
const restore = {
  document: {
    querySelectorAll: (selector) => cards.filter((card) => card.getAttribute(selector.slice(1, -1)) !== null),
  },
};
vm.runInNewContext(`${app.slice(app.indexOf("function restoreShopAction"), app.indexOf("function showClaimedChest"))}
this.restore = restoreShopAction;`, restore);
const disabled = (card) => Object.values(card.buttons).map((button) => button.disabled);

let bronze = makeCard({ "data-definition-id":"field_3h", "data-store-chest-id":"field_3h" }, "120");
const silver = makeCard({ "data-store-chest-id":"circuit_8h" }, undefined);
restore.restore({ definitionId:"field_3h", action:"gift" });
assert.deepEqual(disabled(bronze), [true, true, true], "bekleyen hediye düğmesi açılmamalı");
restore.restore({ storeChestId:"field_3h", action:"buy" });
assert.deepEqual(disabled(bronze), [false, true, true]);
restore.restore({ definitionId:"field_3h", action:"open-all" });
assert.deepEqual(disabled(bronze), [false, true, false]);
restore.restore({ definitionId:"circuit_8h", action:"open-all" });
assert.deepEqual(disabled(silver), [true, true, false]);

cards.length = 0;
bronze = makeCard({ "data-definition-id":"field_3h", "data-store-chest-id":"field_3h" }, "0");
restore.restore({ definitionId:"field_3h", action:"gift" });
assert.deepEqual(disabled(bronze), [true, false, true]);

console.log("gridshard shop gift on bronze card test passed");
