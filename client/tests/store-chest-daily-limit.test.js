"use strict";

// Sandık mağazasında günlük alım sınırı (7 Ekim 2026): Devre Kredisi ve Akı ile
// alınan her sandık türü günde sınırlı sayıda satın alınır. Sayımı sunucu yapar
// (server/tests/test_store_chest_daily_limit.py); istemci kalan hakkı kartta
// gösterir ve hak bitince satın alma düğmesini kapatır. Hediye Bronz Sandık ve
// eldeki sandıkları açmak sınıra bağlı değildir.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("../src/i18n-catalog.js");
const i18n = require("../src/i18n.js");

const CLIENT_ROOT = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(CLIENT_ROOT, ...parts), "utf8");
const html = read("index.html");
const app = read("src", "app.js");
const css = read("src", "canon.css");
const server = read("..", "server", "app", "meta_progression.py");

const render = app.slice(
  app.indexOf('card.className = "shop-chest-card chest-store-card";'),
  app.indexOf("renderPaidStore();")
);
assert.ok(render.length > 0);

// Kartta "kalan / sınır" satırı, olasılık özetinin altında ve düğmelerin üstünde.
assert.ok(render.includes('limitStatus.className = "chest-store-limit";'));
assert.ok(render.includes("limitStatus.textContent = `Günlük alım hakkı ${remainingToday} / ${dailyLimit}`;"));
assert.ok(render.indexOf('odds.className = "chest-store-odds";') < render.indexOf('limitStatus.className = "chest-store-limit";'));
assert.ok(render.indexOf('limitStatus.className = "chest-store-limit";') < render.indexOf("actions.appendChild(buy);"));

// Hak bitince düğme kapanır ve fiyat yerine durumu yazar.
assert.ok(render.includes("const limitReached = remainingToday === 0;"));
assert.ok(render.includes('buy.textContent = "SINIR DOLDU";'));
assert.match(
  render,
  /buy\.disabled = Boolean\(\s*state\.unavailable\s*\|\| limitReached\s*\|\| Number\(state\[item\.currency\] \|\| 0\) < Number\(item\.cost\)\s*\);/
);

// Sınır alanlarını göndermeyen eski sunucuda satır çıkmaz, düğme kapanmaz.
assert.ok(render.includes("const dailyLimit = Math.max(0, Number(item.daily_limit || 0));"));
assert.match(render, /const remainingToday = dailyLimit > 0\s*\? Math\.max\(0, Number\(item\.remaining_today \?\? dailyLimit\)\)\s*: null;/);
assert.match(render, /if \(dailyLimit > 0\) \{\s*const limitStatus/);

// Hediye düğmesi ve HEPSİNİ AÇ sınıra bakmaz.
const gift = render.slice(render.indexOf("giftAction.disabled = Boolean("), render.indexOf("giftAction.addEventListener"));
const openAll = render.slice(render.indexOf("openAllAction.disabled = "), render.indexOf("openAllAction.addEventListener"));
assert.ok(gift.length > 0 && openAll.length > 0);
assert.ok(!gift.includes("limitReached") && !openAll.includes("limitReached"));

// Yenilenme notu sandıkların altında, hediye notunun yanında; saati istemci yazar.
const section = /<section class="shop-section chest-store-section"[\s\S]*?<\/section>/.exec(html)?.[0] || "";
assert.match(section, /<p id="chest-store-limit-note" class="shop-gift-note shop-limit-note" hidden><\/p>/);
assert.ok(section.indexOf('class="shop-gift-note"') < section.indexOf('id="chest-store-limit-note"'));
assert.ok(render.includes("chestStore?.limit_resets_at"));
assert.ok(render.includes("limitNote.hidden = !known;"));
assert.ok(render.includes("`Alım hakları her gün yenilenir (saat ${String(resetsAt.getHours()).padStart(2, \"0\")}:${String(resetsAt.getMinutes()).padStart(2, \"0\")}).`"));

// İstemcinin okuduğu her alan sunucunun mağaza görünümünde vardır.
const storeView = server.slice(server.indexOf("def _chest_store_view"), server.indexOf("def _owned_chest_inventory_view"));
for (const field of ["daily_limit", "remaining_today", "limit_resets_at"]) {
  assert.ok(storeView.includes(`"${field}"`), `sunucu görünümünde yok: ${field}`);
  assert.ok(render.includes(field), `istemci kullanmıyor: ${field}`);
}

// Yazı Android web görünümünün en küçük boyunun (8 piksel) altına inmez.
assert.match(css, /\.chest-store-limit \{ color:#8fe8dc;font-size:\.5rem;/);
assert.match(css, /\.chest-store-limit\[data-exhausted="true"\] \{ color:#ffb84d; \}/);
assert.match(css, /\.shop-limit-note\[hidden\] \{ display:none; \}/);

// Metinler iki dilde de doğru kurulur ve geri döner.
const pairs = [
  ["Günlük alım hakkı 3 / 5", "Daily purchases left 3 / 5"],
  ["Günlük alım hakkı 0 / 1", "Daily purchases left 0 / 1"],
  ["SINIR DOLDU", "LIMIT REACHED"],
  ["Alım hakları her gün yenilenir (saat 03:00).", "Purchase limits reset every day (at 03:00)."],
  [
    "Bugünkü alım sınırına ulaştın: Elmas Sandık günde en çok 1 kez alınır.",
    "You've reached today's purchase limit: Diamond Chest can be bought once a day.",
  ],
  [
    "Bugünkü alım sınırına ulaştın: Bronz Sandık günde en çok 5 kez alınır.",
    "You've reached today's purchase limit: Bronze Chest can be bought 5 times a day.",
  ],
];
for (const [turkish, english] of pairs) {
  assert.equal(i18n.translateText(turkish, "en"), english);
  assert.equal(i18n.translateText(english, "tr"), turkish);
}

console.log("gridshard store chest daily limit client test passed");
