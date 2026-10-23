// Görsel tur 3: mağaza ve sayfaların yeni yüzey dili (levha, yuva, düğme, şerit),
// ilk oyun deneyimi katmanı, ev ekranındaki Çekirdek amblemi, enderlik rengi,
// ayrı yazılan parça stokları. Sayfa yerleşimi tarayıcıda ayrıca denetlenir.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const read = (...parts) => fs.readFileSync(path.join(__dirname, "..", ...parts), "utf8").replace(/\r\n/g, "\n");
const app = read("src", "app.js");
const css = read("src", "canon.css");
const html = read("index.html");
const i18n = read("src", "i18n.js");

const blockStart = css.indexOf("/* === Görsel tur 3 ");
const block = css.slice(blockStart);
const rule = (selector) => {
  const at = block.indexOf(`${selector} {`);
  assert.ok(at >= 0, `${selector} kuralı bulunamadı`);
  return block.slice(at, block.indexOf("}", at) + 1);
};

test("stil bloğu dosyanın sonundadır ve derleme hedefinde olmayan color-mix kullanmaz", () => {
  assert.ok(blockStart > 0, "Görsel tur 3 bloğu bulunamadı");
  assert.ok(blockStart > css.indexOf("/* === Görsel tur 2 "), "blok tur 2'den sonra gelmeli");
  assert.equal(block.includes("color-mix("), false);
  assert.match(block, /--gs3-ink:#0a1024;/);
});

test("mağaza: bölüm kutuları kalkar, kartlar kademe renginde levhadır", () => {
  const section = rule(".shop-screen .shop-section");
  assert.match(section, /background:none !important;/);
  assert.match(section, /border:0 !important;/);
  const card = rule(".shop-screen .chest-store-card");
  assert.match(card, /border:1\.5px solid var\(--t-b\) !important;/);
  assert.match(card, /0 2px 0 1px var\(--t-c\)/, "kartın alt dudağı kademe renginde");
  for (const tier of ["silver", "gold", "diamond"]) {
    assert.ok(block.includes(`.shop-screen .chest-store-card[data-tier="${tier}"] {`), `${tier} kademesinin renkleri tanımlı`);
  }
  // Ad plakası üstte, sandık ortada, düğme altta.
  assert.match(rule(".shop-screen .chest-store-card > strong"), /grid-row:1;/);
  assert.match(rule(".shop-screen .chest-store-card > .chest-visual"), /grid-row:2;/);
  assert.match(rule(".shop-screen .chest-store-card > .shop-chest-actions"), /grid-row:4;/);
});

test("mağaza: satın alma yeşil, hediye ve premium altın, ikincil eylem turkuaz", () => {
  assert.match(block, /\.shop-chest-action\.chest-store-buy,\n\.paid-product-card:not\(\.is-premium\) > button \{ --b-a:#74d384;--b-b:#31a95d;/);
  assert.match(block, /\.shop-chest-action\.gift-chest-action,\n\.paid-product-card\.is-premium > button \{ --b-a:#fbd26f;--b-b:#f0ad35;/);
  assert.match(block, /\.shop-chest-action\.chest-open-all-action,\n\.chest-odds-tab \{ --b-a:#59ccc3;--b-b:#1ca09a;/);
});

test("mağaza: paket kartı bonusu ve sırasını bilir, alt başlıklar simgelidir", () => {
  assert.ok(app.includes("card.dataset.bonus = String(Boolean(product.bonus_percent));"));
  assert.ok(app.includes("card.dataset.packRank = String(Math.max(0, Math.min(3, Number(rank) || 0)));"));
  assert.ok(app.includes("for (const [rank, pack] of (packs || []).entries()) host.appendChild(createPaidProductCard(pack, { provider, rank }));"));
  assert.ok(html.includes('<h4 class="paid-pack-heading" data-ui-icon="flux:violet">Akı Paketleri</h4>'));
  assert.ok(html.includes('<h4 class="paid-pack-heading" data-ui-icon="credit:gold">Devre Kredisi Paketleri</h4>'));
  assert.ok(block.includes('.shop-screen .paid-product-card[data-bonus="true"] small {'));
});

test("sayfalar: düz koyu bölüm kutuları kalkar, öğeler levhadır", () => {
  assert.match(block, /\.avatar-picker-section,\n\.monthly-login-panel,\n\.daily-mission-panel,\n\.season-reward-panel \{[^}]*background:none !important;/);
  for (const selector of [
    ".engagement-summary-panel .monthly-login-card",
    ".daily-missions-screen .daily-mission-card",
    ".season-reward-panel .season-pass-row",
    ".avatar-choice-list button",
  ]) {
    assert.match(rule(selector), /background:var\(--gs3-slab\) !important;/, selector);
  }
});

test("geri düğmesi liste kayarken görünür kalır", () => {
  const back = block.slice(block.indexOf("/* --- Geri düğmesi: liste kayarken"));
  assert.match(back, /\.engagement-summary-panel \.reward-back-link,[^{]*\{[^}]*position:sticky !important;[^}]*bottom:5px;/);
});

test("ilk oyun deneyimi: rehber kartı levha, İleri düğmesi altın", () => {
  assert.match(block, /\.guide-card,\n\.tutorial-card \{[^}]*border:1\.5px solid #ffd45e !important;/);
  assert.match(block, /#daily-meta-roll,\n\.chest-reveal-card > button,\n\.guide-next,\n\.tutorial-actions \[data-tutorial-next\],\n\.module-unlock-dialog button \{ --b-a:#fbd26f;--b-b:#f0ad35;/);
  assert.match(rule(".guide-next"), /min-height:44px !important;/);
});

// Tur 4: lig kartı ile panel arasına boşluk geri geldi, panel 290 pikselde durur
// (ayrıntı: visual-pass-4-emblem-surfaces.test.js).
// Görsel tur 5: panel her ekranda aynı boyda; artan yükseklik lig kartı ile panel arasına gider.
test("ev ekranı: artan yükseklik lig kartı ile deste paneli arasındaki boşluğa gider", () => {
  assert.match(block, /body\[data-app-screen="menu"\] \.mobile-home-hub \{ grid-template-rows:auto auto minmax\(10px,1fr\) auto clamp\(6px,calc\(32px \+ \(100dvh - 640px\) \* \.35\),36px\) auto !important; \}/);
  assert.match(rule('body[data-app-screen="menu"] .home-loadout-card'), /height:clamp\(150px,calc\(14\.6dvh \+ 67px\),161px\) !important;/);
});

test("Çekirdek amblemi yedi çekirdek için çizilir ve ev ekranına konur", () => {
  const start = app.indexOf("  const CORE_EMBLEM_MARKS = Object.freeze({");
  const end = app.indexOf("  function renderHomeCoreHero() {");
  assert.ok(start > 0 && end > start);
  const sandbox = {};
  vm.runInNewContext(`${app.slice(start, end)}\nObject.assign(this, { CORE_EMBLEM_MARKS, coreEmblemSvg });`, sandbox);
  const ids = ["core_resonance", "core_guardian", "core_overdrive", "core_disruptor", "core_capacitor", "core_phoenix", "core_quantum"];
  assert.deepEqual(Object.keys(sandbox.CORE_EMBLEM_MARKS), ids);
  const drawings = ids.map((id) => sandbox.coreEmblemSvg(id));
  assert.equal(new Set(drawings).size, ids.length, "her çekirdeğin işareti ayrı");
  for (const svg of drawings) {
    assert.match(svg, /^<svg class="core-emblem" viewBox="0 0 120 120"/);
    for (const part of ["ce-frame", "ce-gem", "ce-gem-light", "ce-gem-dark", "ce-ink", "ce-bolt"]) assert.ok(svg.includes(`class="${part}"`), part);
    assert.equal(/\d\.\d{4,}/.test(svg), false, "koordinatlar kısa yazılır");
  }
  assert.equal(sandbox.coreEmblemSvg("bilinmeyen"), sandbox.coreEmblemSvg("core_resonance"));
  assert.ok(app.includes("mountCoreEmblem(glyph, coreId);"));
  assert.match(rule(".core-emblem .ce-gem"), /fill:var\(--core-accent,#56f1df\);/);
});

test("enderlik rengi tek dildir: sıradan çelik, ender mavi, destansı mor, efsanevi altın", () => {
  assert.ok(app.includes('const RARITY_ICON_TONES = Object.freeze({ common:"steel", rare:"blue", epic:"violet", legendary:"gold" });'));
  assert.ok(app.includes('setRarityBadge("module-detail-rarity", String(item.rarity || "common").toLowerCase(),'));
  assert.ok(app.includes('setRarityBadge("core-detail-rarity", String(core.rarity || "common").toLowerCase(),'));
  assert.match(block, /#module-detail-rarity\[data-rarity="epic"\],\n#core-detail-rarity\[data-rarity="epic"\] \{ --r-a:#ba95ef;--r-b:#915ddd;/);
  assert.match(block, /#module-detail-rarity\[data-rarity="legendary"\],\n#core-detail-rarity\[data-rarity="legendary"\] \{ --r-a:#fbd26f;--r-b:#f0ad35;/);
  // Rozet: sahte belgeyle çalıştırılır.
  const start = app.indexOf("  const RARITY_ICON_TONES = Object.freeze(");
  const end = app.indexOf("  function serverCopy(",start);
  const badge = { textContent:"", dataset:{} };
  const sandbox = { document:{ getElementById:(id) => (id === "var" ? badge : null) } };
  vm.runInNewContext(`${app.slice(start, end)}\nObject.assign(this, { setRarityBadge });`, sandbox);
  sandbox.setRarityBadge("var", "epic", "EPİK");
  assert.deepEqual([badge.textContent, badge.dataset.rarity], ["EPİK", "epic"]);
  sandbox.setRarityBadge("var", "tanımsız", "?");
  assert.equal(badge.dataset.rarity, "common");
  sandbox.setRarityBadge("yok", "epic", "EPİK"); // eksik öğe hataya yol açmaz
});

test("parça ve evrensel parça ayrı yazılır", () => {
  assert.equal(app.includes("evrensel / ${required}"), false, "eski birleşik yazım kalmamalı");
  assert.ok(app.includes('setText("module-detail-shards", cost ? `${Number(item.shards || 0).toLocaleString(uiLocale())} / ${required.toLocaleString(uiLocale())}` : "AZAMİ SEVİYE");'));
  assert.ok(app.includes("universalBadge.replaceChildren(createModulePuzzlePiece({ universal:true }), count);"));
  assert.ok(html.includes('<span id="module-detail-universal" class="module-detail-universal" role="img" hidden></span>'));
  assert.ok(i18n.includes('"Evrensel parça":"Universal pieces",'));
  assert.match(block, /#module-detail-dialog \.module-detail-level-row div \{ grid-template-columns:auto auto minmax\(0,1fr\) auto !important; \}/);
});

test("Devre Yolu: Lider Panosu sakin mavidir, altın değildir", () => {
  assert.match(block, /\n#arena-leaderboard-button \{ --b-a:#446fa7;--b-b:#284e84;/);
  assert.ok(html.includes('id="arena-leaderboard-button"'));
});
