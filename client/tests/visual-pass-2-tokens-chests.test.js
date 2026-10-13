"use strict";

// Görsel tur 2 (13 Ekim 2026): mağaza sandıkları, Akı ve Devre Kredisi simgeleri,
// ödül sayfalarındaki görseller ve yapboz parçası lig sandıklarının diliyle
// (dolu gövde, aydınlık ve gölge yüzey, koyu kontur) yeniden çizildi.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const CLIENT_ROOT = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(CLIENT_ROOT, ...parts), "utf8");
const html = read("index.html");
const app = read("src", "app.js");
const css = read("src", "canon.css");

function slice(startMarker, endMarker) {
  const start = app.indexOf(startMarker);
  const end = app.indexOf(endMarker, start);
  assert.ok(start > 0 && end > start, `bölüm bulunamadı: ${startMarker}`);
  return app.slice(start, end);
}

function svgElement(tag) {
  return {
    tag, children: [], attributes: {}, dataset: {}, className: "", textContent: "",
    setAttribute(key, value) { this.attributes[key] = String(value); },
    appendChild(node) { this.children.push(node); return node; },
  };
}

function tokenSandbox() {
  const sandbox = { createModulePuzzlePiece: () => ({ outerHTML: "<span data-piece></span>" }) };
  vm.runInNewContext(`${slice("  const tokenFacets = ", "  // Maliyet rozeti:")}
${slice("  function resourceSymbolMarkup(kind) {", "  // Modül kartı parçaları her yerde")}
Object.assign(this, { RESOURCE_TOKEN_SVG, RESOURCE_TOKEN_CLASS, resourceTokenSvg, resourceTokenMarkup, resourceSymbolMarkup });`, sandbox);
  return sandbox;
}

function chestSandbox() {
  const sandbox = {};
  vm.runInNewContext(`${slice("  const SHOP_CHEST_GROOVES = ", "  // Lig sandığı fiziksel bir kasadır")}
${slice("  function chestVisualMarkup(", "  function shopChestAction(")}
Object.assign(this, { shopChestSvg, chestVisualMarkup, SHOP_CHEST_ORNAMENTS });`, sandbox);
  return sandbox;
}

// --- Kaynak simgeleri -------------------------------------------------------------
test("Akı, Devre Kredisi ve diğer kaynaklar dolu çizilir; her birinin rengi tanımlıdır", () => {
  const sandbox = tokenSandbox();
  const kinds = Object.keys(sandbox.RESOURCE_TOKEN_SVG);
  assert.deepEqual(kinds, ["flux", "credit", "current", "core", "chest", "experience", "trophy", "team_point", "premium"]);
  for (const kind of kinds) {
    const drawing = sandbox.RESOURCE_TOKEN_SVG[kind];
    assert.ok(sandbox.RESOURCE_TOKEN_CLASS[kind], `${kind}: sınıfı yok`);
    // Gövde rengi ve koyu kontur her çizimde vardır; eski ince çizgi simge yoktur.
    assert.match(drawing, /class="tk-m[ "]/, `${kind}: gövde yok`);
    assert.match(drawing, /class="(?:tk-o|tk-[a-z] tk-ink)"/, `${kind}: kontur yok`);
    const markup = sandbox.resourceTokenMarkup(kind);
    assert.ok(markup.startsWith(`<span class="resource-symbol ${sandbox.RESOURCE_TOKEN_CLASS[kind]} is-token" data-token="${kind}" aria-hidden="true"><svg viewBox="0 0 24 24"`));
  }
  // Altın renkli olanlar varsayılan paleti kullanır; diğerlerinin kendi paleti vardır.
  for (const kind of ["flux", "current", "core", "team_point", "experience"]) {
    assert.match(css, new RegExp(`\\.is-token\\[data-token="${kind}"\\][^{]*\\{ --tk-m:#[0-9a-f]{6};--tk-l:#[0-9a-f]{6};--tk-d:#[0-9a-f]{6};`), kind);
  }
  const base = css.match(/\.resource-symbol\.is-token,\s*\.cost-chip-icon\.is-token \{([^}]*)\}/)[1];
  // Eski halka (kenarlık, zemin, renkli parıltı) kalkar.
  for (const rule of ["border:0 !important;", "background:none !important;", "box-shadow:none !important;"]) assert.ok(base.includes(rule), rule);
  assert.match(css, /\.is-token > svg \{ width:100% !important;height:100% !important;/);
  // Bilinmeyen tür boş çizmez.
  assert.ok(sandbox.resourceTokenMarkup("yok").includes('data-token="credit"'));
});

test("ödül satırlarının simgeleri aynı çizimi kullanır", () => {
  const sandbox = tokenSandbox();
  for (const [kind, token] of [["flux_shards", "flux"], ["circuit_credits", "credit"], ["core_shards", "core"], ["chest", "chest"], ["experience", "experience"]]) {
    assert.equal(sandbox.resourceSymbolMarkup(kind), sandbox.resourceTokenMarkup(token), kind);
  }
  // Tanınmayan tür modül parçasıdır.
  assert.equal(sandbox.resourceSymbolMarkup("module_shards"), "<span data-piece></span>");
  // Mağaza paketleri ve maliyet rozetleri de aynı çizimdir.
  assert.match(app, /const PAID_ICON_TOKENS = Object\.freeze\(\{ flux_shards:"flux", circuit_credits:"credit" \}\);/);
  assert.match(app, /const token = PAID_ICON_TOKENS\[product\.currency\] \|\| "premium";/);
  assert.match(app, /icon\.innerHTML = resourceTokenSvg\(kind\);/);
  // Eski halka içi çizimler kodda kalmadı.
  assert.ok(!app.includes('<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M7 12h3l2-4 2 8 2-4h2"/></svg>'));
});

test("sabit sayfadaki simgeler koddaki çizimle aynıdır", () => {
  const sandbox = tokenSandbox();
  const expected = { flux: 1, credit: 2, current: 2, experience: 1, trophy: 1, team_point: 1 };
  for (const [kind, count] of Object.entries(expected)) {
    const markup = sandbox.resourceTokenMarkup(kind, "i");
    assert.equal(html.split(markup).length - 1, count, `${kind}: sayfada ${count} kez olmalı`);
  }
  // Sayfada eski halka simgesi ve emoji kupa kalmadı.
  assert.equal((html.match(/class="resource-symbol [a-z-]+"/g) || []).length, 0);
  assert.ok(!html.includes('resource-symbol-trophy" aria-hidden="true">🏆'));
});

// --- Mağaza sandığı -----------------------------------------------------------------
test("mağaza sandıkları lig sandıklarının diliyle çizilir ama aynı sandık değildir", () => {
  const sandbox = chestSandbox();
  const league = slice("  function leagueChestMarkup(", "  // Lig sandığının açılışı");
  const drawings = {};
  for (const tier of ["bronze", "silver", "gold", "diamond"]) {
    const markup = sandbox.chestVisualMarkup(tier);
    assert.ok(markup.startsWith(`<span class="chest-visual chest-visual-${tier}" aria-hidden="true"><svg class="shop-chest" viewBox="0 0 100 86"`), tier);
    // Lig sandığının sınıfı ve parçaları kullanılmaz.
    assert.ok(!/league-chest|class="lc-/.test(markup), tier);
    drawings[tier] = markup;
    // Bronz, sınıfın varsayılan paletidir.
    assert.match(css, tier === "bronze" ? /\.chest-visual \{\s*--sc-main:#[0-9a-f]{6};/ : new RegExp(`\\.chest-visual-${tier} \\{ --sc-main:#[0-9a-f]{6};`), tier);
  }
  // Kapak kubbe değil pahlı düz kapaktır; ortada tek kuşak ve baklava kilit vardır.
  assert.match(drawings.bronze, /<path class="sc-lid-top" d="M12 44V29L23 15h54l11 14v15Z"\/>/);
  assert.match(league, /<path class="lc-lid-top" d="M11 46 17 24Q50 10 83 24l6 22Z"\/>/);
  assert.match(drawings.bronze, /<path class="sc-lock" d="M50 30\.5 63\.5 44 50 57\.5 36\.5 44Z"\/>/);
  assert.equal((drawings.bronze.match(/class="sc-band"/g) || []).length, 2);
  // Kademe yükseldikçe süs artar; dört çizim birbirinden farklıdır.
  assert.equal(new Set(Object.values(drawings)).size, 4);
  assert.ok(drawings.bronze.includes("sc-groove") && !drawings.bronze.includes("sc-cap"));
  assert.ok(drawings.silver.includes("sc-groove") && drawings.silver.includes("sc-cap") && drawings.silver.includes("sc-rivet"));
  assert.ok(drawings.gold.includes("sc-crest") && !drawings.gold.includes("sc-groove"));
  assert.ok(drawings.diamond.includes("sc-crystal") && drawings.diamond.includes("sc-spark"));
  // Açılış için kapak ayrı gruptur; içinde ışık ve ışınlar vardır.
  for (const part of ['<g class="sc-lid">', 'class="sc-inside-glow"', '<g class="sc-rays">']) assert.ok(drawings.gold.includes(part), part);
});

test("turnuva sandıkları kendi rengini ve kilit taşını taşır; bilinmeyen kademe Bronz çizilir", () => {
  const sandbox = chestSandbox();
  const team = sandbox.chestVisualMarkup("team_first", { visualId: "team_reactor_crown" });
  assert.ok(team.startsWith('<span class="chest-visual chest-visual-diamond chest-visual-event chest-visual-team_reactor_crown"'));
  assert.ok(team.includes('<path class="sc-gem" d="M50 36 57 40v8l-7 4-7-4v-8Z"/>'));
  const weekly = sandbox.chestVisualMarkup("weekly_second", { visualId: "weekly_prism" });
  assert.ok(weekly.startsWith('<span class="chest-visual chest-visual-gold chest-visual-event chest-visual-weekly_prism"'));
  assert.ok(weekly.includes('<path class="sc-gem" d="m50 35.4 2.5 6.1'));
  for (const visual of ["weekly_circuit_crown", "weekly_prism", "weekly_pulse", "team_reactor_crown", "team_prism_relay", "team_signal_cache"]) {
    assert.match(css, new RegExp(`\\.chest-visual-${visual} \\{ --sc-main:#[0-9a-f]{6};--sc-dark:#[0-9a-f]{6};--sc-light:#[0-9a-f]{6};`), visual);
  }
  assert.ok(sandbox.chestVisualMarkup("yok").startsWith('<span class="chest-visual chest-visual-bronze" aria-hidden="true">'));
  assert.ok(sandbox.chestVisualMarkup("gold", { large: true }).includes("chest-visual-gold chest-visual-large"));
  // Görsel kimliği sınıfa yazılmadan önce süzülür.
  assert.ok(!sandbox.chestVisualMarkup("gold", { visualId: 'x" onload="y' }).includes('"y'));
});

test("mağaza sandığı açılırken kapağı kalkar; hareket azaltma ve düşük grafik animasyonsuzdur", () => {
  assert.match(css, /\.chest-reveal-card\[data-state="opening"\] \.chest-visual-large \.sc-lid \{ animation:sc-lid-rattle/);
  assert.match(css, /\.chest-reveal-card\[data-state="revealed"\] \.chest-visual-large \.sc-lid \{ transform:translateY\(-19px\) rotate\(-7deg\) scaleY\(\.8\); \}/);
  assert.match(css, /\.chest-reveal-card\[data-state="revealed"\] \.chest-visual-large \.sc-inside-glow \{ opacity:1; \}/);
  for (const keyframes of ["sc-lid-rattle", "sc-reveal-pop", "sc-rays-burst"]) assert.ok(css.includes(`@keyframes ${keyframes} `), keyframes);
  assert.match(css, /@media \(prefers-reduced-motion:reduce\) \{\s*\.shop-chest \.sc-lid,\.shop-chest \.sc-inside-glow \{ transition:none; \}/);
  assert.match(css, /body\[data-graphics="dusuk"\] \.chest-reveal-card\[data-state="opening"\] \.chest-visual-large \.sc-lid,/);
  // Pencerenin çizimini kod doldurur; sayfa kaynağında eski üç parçalı çizim kalmadı.
  assert.match(html, /<div id="chest-reveal-visual" class="chest-visual chest-visual-large chest-visual-bronze" aria-hidden="true"><\/div>/);
  assert.match(app, /visual\.innerHTML = shopChestSvg\(tier\);/);
  assert.ok(!app.includes("<i></i><b></b><em>"));
  // Küçük çizimde kontur kalınlaşır.
  assert.match(css, /\.season-reward-chest \.chest-visual,\s*\.reward-preview-chest \.chest-visual,[^{]*\{ --sc-stroke:2\.6; \}/);
});

test("mağazada sandık fiyatı kaynağın simgesiyle yazılır", () => {
  const render = slice("  function renderShop() {", "  function giftChestActionLabel(");
  assert.match(render, /action\.replaceChildren\(createCostChip\(item\.currency === "flux_shards" \? "flux" : "credit", item\.cost\)\);/);
  // Adı ekran okuyucu için etikette durur ("Altın Sandık · 500 Akı").
  assert.match(render, /action\.setAttribute\("aria-label", `\$\{item\.name_tr\} · \$\{selectedAction\.label\}`\);/);
  // Hak bitince düğme yazıya döner.
  assert.match(render, /if \(selectedAction\.kind === "buy" && !limitReached\) \{/);
});

// --- Yapboz parçası ------------------------------------------------------------------
test("modül parçası dolu çizilir: gövde, gölge, ışık ve kontur", () => {
  const sandbox = {
    document: { createElement: svgElement, createElementNS: (_, tag) => svgElement(tag) },
  };
  vm.runInNewContext(`${slice("  const MODULE_PIECE_OUTLINE = ", "  function moduleShardSymbolMarkup(")}
Object.assign(this, { createModulePuzzlePiece, MODULE_PIECE_OUTLINE });`, sandbox);
  const piece = sandbox.createModulePuzzlePiece({ category: "savunma", glyph: "<svg></svg>" });
  assert.equal(piece.className, "resource-symbol resource-symbol-module-piece");
  assert.equal(piece.dataset.category, "savunma");
  const [svg, glyph] = piece.children;
  assert.deepEqual(svg.children.map((child) => child.attributes.class), ["mp-body", "mp-shade", "mp-shine", "mp-outline"]);
  assert.equal(svg.children[0].attributes.d, sandbox.MODULE_PIECE_OUTLINE);
  assert.equal(svg.children[3].attributes.d, sandbox.MODULE_PIECE_OUTLINE);
  // Parçanın üstünde modülün amblemi durur (SVG; bkz. visual-pass-5-module-emblems.test.js).
  assert.equal(glyph.innerHTML, "<svg></svg>");
  assert.equal(glyph.className, "mp-emblem");
  // Evrensel parça yıldızlıdır; simgesiz parça yalnız şekildir.
  const universal = sandbox.createModulePuzzlePiece({ universal: true, category: "saldırı" });
  assert.equal(universal.dataset.category, "universal");
  assert.equal(universal.children[1].textContent, "✦");
  assert.equal(sandbox.createModulePuzzlePiece().children.length, 1);
  // Gövde sınıf rengiyle doludur; kontur koyudur (eskiden yalnız renkli çizgiydi).
  assert.match(css, /\.resource-symbol-module-piece > svg \.mp-body \{ fill:var\(--piece-color\); \}/);
  assert.match(css, /\.resource-symbol-module-piece > svg \.mp-outline \{ stroke:#0a1024;stroke-width:3;stroke-linejoin:round; \}/);
  for (const category of ["saldırı", "savunma", "destek", "sabotaj", "universal"]) {
    assert.match(css, new RegExp(`\\.resource-symbol-module-piece\\[data-category="${category}"\\] \\{ --piece-color:#[0-9a-f]{6}; \\}`), category);
  }
});

// --- Ödül bölümleri -------------------------------------------------------------------
test("ödül bölümleri sayfasında her satırın kendi simgesi vardır", () => {
  for (const [screen, icon, label] of [
    ["daily-rewards", "calendar:gold", "Günlük Ödüller"],
    ["daily-missions", "target:red", "Günlük Devre Emirleri"],
    ["rewards", "trophy:violet", "Sezon Ödülleri"],
  ]) {
    assert.ok(html.includes(`<button type="button" data-ui-icon="${icon}" data-open-screen="${screen}"><strong>${label}</strong></button>`), screen);
    assert.ok(app.includes(`    ${icon.split(":")[0]}:'`), `${icon} simgesi yok`);
  }
  assert.match(css, /\.rewards-hub-links button\.has-ui-icon \{ display:flex;/);
});
