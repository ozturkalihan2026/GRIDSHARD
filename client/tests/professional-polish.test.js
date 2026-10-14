"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const css = fs.readFileSync(path.join(__dirname, "../src/canon.css"), "utf8");
const start = css.indexOf("/* === Profesyonel rötuş (13 Ekim 2026)");
const end = css.indexOf("/* === Görsel geri bildirim düzeltmeleri (13 Ekim 2026)", start);
const polish = css.slice(start, end < 0 ? undefined : end);
const rule = (selector) => {
  const at = polish.lastIndexOf(`${selector} {`);
  assert.ok(at >= 0, selector);
  return polish.slice(at, polish.indexOf("}", at) + 1);
};
const luminance = (hex) => {
  const rgb = hex.match(/\w\w/g).map((channel) => parseInt(channel, 16) / 255);
  return rgb.map((c) => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
    .reduce((total, c, i) => total + c * [.2126, .7152, .0722][i], 0);
};

test("polish is isolated after pass 6 and preserves layout and dialog controls", () => {
  assert.ok(start > css.indexOf("/* === Görsel tur 6"));
  assert.ok(polish.length > 4000);
  assert.ok(!/color-mix\(|:has\(|grid-template-columns|grid-area:|position:|(?<![-\w])(?:height|width):|close-button|detail-close/.test(polish));
  assert.match(rule(".shop-screen .chest-store-card"), /grid-template-rows:auto auto minmax\(32px,1fr\) auto/);
});

test("copy, labels and prices have distinct readable sizes and supported weights", () => {
  for (const token of ["--gs-polish-copy:.75rem", "--gs-polish-label:.6875rem", "--gs-polish-action:.875rem", "--gs-polish-title:1rem"]) {
    assert.ok(polish.includes(token), token);
  }
  assert.ok(polish.includes(".module-detail-tab-content .module-effect-panel li,"));
  assert.ok(polish.includes(".shop-screen .paid-product-card > button,"));
  assert.ok(!/font-weight:(?:850|900)/.test(polish));
});

test("both active-tab gradient endpoints meet normal-text contrast", () => {
  const token = (name) => polish.match(new RegExp(`${name}:#([0-9a-f]{6});`))[1];
  const ink = luminance(token("--gs-polish-tab-ink"));
  for (const name of ["--gs-polish-tab-a", "--gs-polish-tab-b"]) {
    const ratio = (luminance(token(name)) + .05) / (ink + .05);
    assert.ok(ratio >= 4.5, `${name}: ${ratio}`);
  }
  assert.match(polish, /\.cards-page-tabs button\.is-active \* \{ color:var\(--gs-polish-tab-ink\) !important;/);
});

test("surface polish does not recolor rarity, category or tier semantics", () => {
  assert.ok(!/data-rarity|data-tier|--module-accent:|--core-accent:|--me-c:/.test(polish));
  assert.match(polish, /--gs3-slab-shadow:var\(--gs-polish-shadow\);/);
  assert.match(polish, /rgba\(255,255,255,\.018\)/);
  assert.match(rule(".shop-screen .paid-product-card.is-premium"), /background:linear-gradient\(180deg,#343457,#292e4c\)/);
});

test("compact icons preserve structural marks and are consistent across slots", () => {
  const compact = polish.slice(polish.indexOf("/* Küçük SVG varyantı"), polish.indexOf("/* Savaş metni"));
  for (const slot of ["#module-shelf", "#enemy-deck-preview", "#home-active-deck", "#module-deck-strip", ".collection-module-tile"]) {
    assert.ok(compact.includes(slot), slot);
  }
  assert.match(compact, /:is\(\.me-shine,\.me-light,\.me-dark\) \{ display:none; \}/);
  assert.ok(!/me-cut|me-fill|me-line|me-rail/.test(compact), "mechanical/silhouette paths must survive");
});

test("idle combat feedback is quiet while heavy and destruction effects survive", () => {
  assert.match(rule('body[data-app-screen="play"] .battle-floating-feedback'), /-webkit-text-stroke:1\.25px/);
  assert.match(rule('body[data-app-screen="play"] .core-power-button[data-ready="true"]'), /animation:none !important/);
  assert.match(polish, /\.duel-hit-impact:not\(\[data-impact="heavy"\]\) i \{ box-shadow:none;/);
  assert.ok(!/core-explosion|module-explosion|data-impact="heavy"\] \{/.test(polish));
});
