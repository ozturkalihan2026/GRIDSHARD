const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8").replace(/\r\n/g, "\n");
const app = read("src", "app.js");
const css = read("src", "canon.css");
const html = read("index.html");
const block = css.slice(css.indexOf("/* === Görsel tur 5 "));

function cardView() {
  const sandbox = {};
  vm.runInNewContext(read("src", "module-device-art.js"), sandbox);
  vm.runInNewContext(read("src", "battle", "module-card-view.js"), sandbox);
  vm.runInNewContext(read("src", "canon-data.js"), sandbox);
  return { view: sandbox.GridshardModuleCardView, modules: sandbox.GRIDSHARD_CANON_MODULES };
}

test("her modülün kendi amblemi vardır ve sınıfının rengini taşır", () => {
  const { view, modules } = cardView();
  assert.equal(modules.length, 36);
  const fallback = view.emblemFor({ nameTr: "Bilinmeyen" });
  const drawings = new Set();
  for (const module of modules) {
    const svg = view.emblemFor({ definition_id:module.id, nameTr: module.name_tr });
    const physical = svg.includes('class="module-emblem module-device-icon"');
    assert.ok(physical, `${module.name_tr}: approved physical painting`);
    assert.equal(view.emblemFor({nameTr:module.name_tr}), svg, `${module.id}: name-only collection path`);
    assert.equal(view.emblemFor({name_tr:module.name_tr}), svg, `${module.id}: server reward path`);
    const asset = /src="\.\/([^"]+)"/.exec(svg)?.[1];
    assert.ok(asset && fs.existsSync(path.join(root, asset)), `${module.id}: physical asset exists`);
    assert.ok(physical || svg.startsWith(`<svg class="module-emblem" data-cat="${module.category}" viewBox="0 0 48 48"`), module.name_tr);
    assert.ok(physical || svg.includes('class="me-ink"') || svg.includes('class="me-rail"'), `${module.name_tr}: kontur`);
    assert.notEqual(svg.slice(svg.indexOf(">")), fallback.slice(fallback.indexOf(">")), `${module.name_tr}: genel yonga değil`);
    drawings.add(physical ? svg : svg.slice(svg.indexOf(">")));
  }
  assert.equal(drawings.size, 36, "her çizim farklı");
  // Çekirdek, koleksiyondaki "Onarım Modülü" adı ve tanım kimliği de çizimini bulur.
  assert.ok(view.emblemFor({ nameTr: "Çekirdek" }).includes('data-cat="sistem"'));
  assert.equal(view.emblemFor({ nameTr: "Onarım Modülü" }), view.emblemFor({ nameTr: "Onarım" }));
  assert.equal(view.emblemFor({ definition_id: "repair", nameTr: "Başka" }), view.emblemFor({ nameTr: "Onarım" }));
});

test("bilinmeyen modül genel yongayla çizilir; sınıf yalnız bilinen beş değerden biri olabilir", () => {
  const { view } = cardView();
  assert.ok(view.emblemFor({ nameTr: "Bilinmeyen", category: "savunma" }).includes('data-cat="savunma"'));
  assert.ok(view.emblemFor({ nameTr: "Bilinmeyen", category: '"><script>' }).includes('data-cat=""'));
  assert.ok(view.emblemFor(null).includes('data-cat=""'));
  assert.equal(typeof view.iconFor, "undefined", "retired text drawings are not a second fallback family");
});

test("oyun modülü her yerde resimle çizer; eski tek harfli simge yolu yoktur", () => {
  assert.doesNotMatch(app,/moduleIconFor|GridshardModuleCardView\.iconFor/);
  assert.ok(app.includes("element.innerHTML = moduleEmblemMarkup(module);"));
  // The retired counter-grid builder no longer adds an unused mounting site.
  assert.equal((app.match(/mountModuleEmblem\(/g) || []).length, 17);
  assert.ok(app.includes('else mountModuleEmblem(icon, model.module);'), "both battle boards share the persistent artwork path");
  assert.ok(app.includes('element.innerHTML = moduleEmblemMarkup(module);'));
  assert.ok(app.includes('element.classList.add("has-module-emblem");'));
  // Parça kaynağı artık yapboz değil karttır; evrensel kart ortak deste çizimidir.
  assert.ok(app.includes('piece.className = "resource-symbol module-reward-card";'));
  assert.ok(app.includes('piece.innerHTML = glyph || uiIconMarkup("deck");'));
});

test("amblem stilleri: sınıf renkleri, yapboz parçası, bilgi penceresi", () => {
  for (const category of ["saldırı", "savunma", "destek", "sistem", "sabotaj"]) {
    assert.ok(block.includes(`.module-emblem[data-cat="${category}"] {`), category);
  }
  assert.match(block, /\.module-emblem \.me-ink \{ fill:none; stroke:var\(--me-ink\); stroke-width:2\.6;/);
  // Parçanın solunda ve altında girinti var: amblem dolu alanın ortasında durur.
  assert.match(block, /\.resource-symbol-module-piece > b\.mp-emblem \{ left:46\.6%; top:53\.2%;/);
  assert.match(block, /\.resource-symbol-module-piece > b\.mp-emblem > \.module-emblem \{[^}]*--me-c:#fff;[^}]*width:1\.24em;/);
  // Bilgi penceresi: yerleşim eskisi gibi; amblem karartma katmanının üstünde, rengini yayar.
  assert.match(block, /#module-detail-dialog \.module-detail-art\.has-module-emblem \{\n  z-index:2;[^}]*opacity:1 !important;/);
  assert.match(block, /#module-detail-dialog \.module-detail-art\.has-module-emblem \.module-emblem \{\n  width:54px;\n  height:54px;\n  filter:drop-shadow\(0 0 12px var\(--module-accent,#48f4e0\)\)/);
  assert.equal(block.includes("color-mix("), false);
  assert.equal(block.includes(":has("), false);
});

test("çekirdeklerde enderlik, modüldeki rozetle aynı dilde yazar", () => {
  assert.ok(app.includes('rarity.className = "rarity-chip";'));
  assert.ok(app.includes('rarity.textContent = moduleRarityLabel(core.rarity).toLocaleUpperCase("tr-TR");'));
  assert.ok(app.includes('setRarityBadge("core-detail-rarity", String(core.rarity || "common").toLowerCase(), moduleRarityLabel(core.rarity).toLocaleUpperCase("tr-TR"));'));
  for (const rarity of ["rare", "epic", "legendary"]) {
    assert.ok(block.includes(`.core-collection-copy > em.rarity-chip[data-rarity="${rarity}"] {`), rarity);
  }
});

test("ev ekranı: panel her ekranda aynı boyda, artan yükseklik lig kartı ile panel arasına gider", () => {
  assert.ok(css.includes('body[data-app-screen="menu"] .mobile-home-hub { grid-template-rows:auto auto minmax(10px,1fr) auto clamp(6px,calc(32px + (100dvh - 640px) * .35),36px) auto !important; }'));
  assert.match(css, /body\[data-app-screen="menu"\] \.home-loadout-card \{\n  height:clamp\(150px,calc\(14\.6dvh \+ 67px\),161px\) !important;\n  min-height:150px !important;\n  align-self:end;/);
  assert.equal(css.includes("max-height:290px"), false);
  // Uzun ekrandaki çekirdek adı satırı kalktı (panel kısa ekrandakiyle aynı).
  assert.equal(html.includes("home-core-hero-name"), false);
  assert.equal(app.includes("home-core-hero-name"), false);
  assert.equal(css.includes(".home-core-hero-name"), false);
});

test("mağaza ölçüleri küçüldü: dört sandık kartı ilk ekrana sığar", () => {
  assert.ok(css.includes(".shop-screen .chest-store-card > .chest-visual { grid-row:2;width:63px;height:54px;margin:7px 0 4px; }"));
  assert.ok(css.includes(".shop-screen .shop-chest-action { min-height:30px;font:900 .56rem var(--gs-font-display) !important;letter-spacing:.03em; }"));
  assert.ok(css.includes(".shop-screen .chest-store-list { gap:11px 9px !important;padding:0 3px 4px; }"));
  assert.ok(css.includes(".shop-screen .paid-product-card > .resource-symbol { width:32px !important;height:32px !important; }"));
  assert.match(css, /\.shop-screen \.paid-product-card > button \{\n  align-self:end;\n  width:100%;\n  min-height:30px;/);
  assert.match(css, /\.shop-screen \.shop-section > \.mobile-section-heading > div \{\n  min-height:34px;/);
});

test("çekirdek bilgi penceresi modüldeki yerleşimdedir: ad üstte, amblem arkada aşağıda", () => {
  assert.match(block, /\.core-detail-dialog \.core-detail-art\.is-emblem \{\n  position:absolute !important;\n  inset:0 !important;\n  z-index:2;[^}]*align-items:end !important;\n  justify-items:center !important;/);
  assert.ok(block.includes(".core-detail-dialog .core-detail-art.is-emblem .core-emblem-set { width:50px; height:50px; aspect-ratio:auto; }"));
  // Tur 4'ün sol yerleşimi kalmadı.
  assert.equal(css.includes("left:114px !important;"), false);
});

test("mağazadaki yenilenme notları Ödül Listesi penceresindedir", () => {
  const dialog = /<dialog id="chest-odds-dialog"[\s\S]*?<\/dialog>/.exec(html)[0];
  const shop = /<section class="shop-section chest-store-section"[\s\S]*?<\/section>/.exec(html)[0];
  assert.ok(dialog.includes('<p class="chest-odds-note chest-odds-refresh-note">Bronz Sandık hediyesi 8 saatte bir yenilenir.</p>'));
  assert.ok(dialog.includes('<p id="chest-store-limit-note" class="chest-odds-note chest-odds-refresh-note" hidden></p>'));
  assert.ok(dialog.indexOf("chest-odds-refresh-note") < dialog.indexOf('id="chest-odds-list"'));
  assert.equal(shop.includes("yenilenir"), false);
  assert.equal(shop.includes("chest-store-limit-note"), false);
  assert.equal(css.includes(".shop-screen .shop-gift-note"), false);
});
