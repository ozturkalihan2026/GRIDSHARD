"use strict";

// Statik regresyon sözleşmesi. Görsel oyun denemeleri kullanıcıda.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const read = (file) => fs.readFileSync(path.join(__dirname, "..", file), "utf8");
const css = read("src/ui-components-v2.css");
const html = read("index.html");

test("approved shared controls precede the screen-specific package in web/native", () => {
  const styles = html.match(/<!-- build:styles -->([\s\S]*?)<!-- \/build:styles -->/)[1];
  const links = [...styles.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  const shared = ["./src/ui-components-v2.css", "./src/home-interface-v3.css", "./src/competition-v4.css", "./src/reward-chest-art-v5.css", "./src/social-profile-v5.css", "./src/shop-rewards-v6.css", "./src/battle-utility-v7.css"];
  const start = links.indexOf(shared[0]);
  assert.ok(start >= 0);
  assert.deepEqual(links.slice(start, start + shared.length), shared);
  for (const skin of ["module-device-v8", "visual-polish-v9", "detail-cards-v10", "modules-yaw-v12", "module-layers-v15", "battle-platform-v17"]) {
    assert.ok(links.indexOf(`./src/${skin}.css`) > start + shared.length - 1);
  }
  assert.equal(links.filter((name) => name.includes("ui-components-v2")).length, 1);
  for (const label of ["01–03 /", "04 /", "05 /", "06 /", "07 /", "08 /", "09 /", "10 /"]) assert.ok(css.includes(label));
});

test("action skins are scoped and leave notification ::after pseudo-elements alone", () => {
  assert.ok(!/^\s*button\s*\{/m.test(css));
  assert.ok(!/\)::after\s*\{/.test(css), "button face must not occupy notification pseudo-element");
  assert.match(css, /\)::before \{[^}]*clip-path:polygon/);
  const faceBase=css.slice(css.indexOf('/* 01–03 /'),css.indexOf(')::before {'));
  assert.match(faceBase,/background:transparent !important/);
  assert.ok(!faceBase.includes('background:var(--gs2-ink)'));
  for (const selector of [".shop-chest-action", "#module-detail-upgrade", ".module-quick-actions > button", ".reward-inbox-card button:not(.reward-chest-button)"]) assert.ok(css.includes(selector));
  assert.match(css, /:active:not\(:disabled\):not\(\[aria-disabled="true"\]\)/);
  assert.match(css, /--gs2-depth:1px/);
  assert.match(css, /--gs2-letter:#d4deea/);
  assert.ok(!/\.menu-action|#app-bottom-dock|\.collection-module-tile|\.board-cell/.test(css));
});

test("all standalone icon actions stay unframed, including expanded/pressed states", () => {
  const icons = css.slice(css.indexOf("/* 10 /"), css.indexOf("/* Aynı küçük"));
  for (const selector of ["#reward-inbox-button", "#lobby-menu-button", "#team-menu-button", "#battle-settings-button", "#team-profile-close", ".friend-search-form > button", ".gs-icon-action"]) assert.ok(icons.includes(selector));
  assert.match(icons, /border:0 !important/);
  assert.match(icons, /background:transparent !important/);
  assert.match(icons, /box-shadow:none !important/);
  assert.match(icons, /\[aria-expanded="true"\]/);
  assert.match(icons, /\[aria-pressed="true"\]/);
  assert.match(icons, /:focus-visible/);
  assert.ok(!/content:none|::after/.test(icons));
});

test("native inputs, checkbox state and progress values are not replaced by synthetic controls", () => {
  assert.match(css, /input\[type="checkbox"\]:checked::before/);
  assert.match(css, /content:"✓"/);
  assert.match(css, /content:"−"/);
  assert.match(css, /::-webkit-progress-value/);
  assert.match(css, /::-moz-progress-bar/);
  assert.match(css, /var\(--mission-progress,0%\)/);
  assert.ok(!/:has\(|color-mix\(|backdrop-filter|filter:blur|@keyframes|url\(/.test(css));
  assert.match(css, /min-height:44px !important/);
  assert.match(css, /prefers-reduced-motion:reduce/);
});

test("semantic cosmetic swatches and rarity are preserved", () => {
  assert.ok(css.includes('var(--profile-bg-a,#0c2944)'));
  for (const rarity of ["legendary", "epic", "rare"]) assert.ok(css.includes(`.team-request-card[data-rarity="${rarity}"]`));
  assert.match(css, /\[aria-checked="true"\]/);
  assert.match(css, /\[data-state="locked"\]/);
  assert.match(css, /border-style:dashed !important/);
});
