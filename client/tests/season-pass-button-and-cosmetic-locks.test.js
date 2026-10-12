"use strict";

// Sezon ödülleri: "Ücretli geçişi aç" düğmesi sağ sütunda, "ÜCRETLİ GEÇİŞ"
// başlığının hemen altında durur; üstündeki bilgilendirme satırı yoktur.
// Kozmetikler: kilitli seçeneğin altında nereden kazanıldığı yazmaz.
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

// --- Sezon ödülleri ---------------------------------------------------------
const panelStart = html.indexOf('<section id="season-reward-panel"');
const panel = html.slice(panelStart, html.indexOf('id="season-reward-track"', panelStart));
const columnsStart = panel.indexOf('<div class="season-pass-columns">');
assert.ok(columnsStart > 0, "sütun başlıkları bulunamadı");
const columns = panel.slice(columnsStart, panel.indexOf("</div>", columnsStart));
// Düğme başlık satırının içinde, "ÜCRETLİ GEÇİŞ" yazısından sonra gelir.
assert.match(
  columns,
  /<span aria-hidden="true">ÜCRETSİZ<\/span><span class="is-premium" aria-hidden="true">ÜCRETLİ GEÇİŞ<\/span>\s*<button id="season-premium-buy" class="season-premium-buy" type="button" hidden>ÜCRETLİ GEÇİŞİ AÇ · 199,99 TL<\/button>/
);
// Düğme odaklanabilir olduğu için satırın tamamı ekran okuyucudan gizlenmez.
assert.ok(!/<div class="season-pass-columns"[^>]*aria-hidden/.test(html));
// Bilgilendirme satırı şablonda, betikte ve stilde yok.
for (const source of [html, app, css]) {
  assert.ok(!source.includes("season-premium-status"), "bilgilendirme satırı kalmamalı");
}
assert.ok(!app.includes("premiumPass.status_tr"));
// Başlık satırı üç sütunludur (kademe, ücretsiz, ücretli); düğme üçüncü sütundadır.
assert.match(css, /\.season-pass-columns,\s*\.season-pass-row \{[^}]*grid-template-columns:minmax\(62px,\.8fr\) minmax\(0,1fr\) minmax\(0,1fr\);/);
const buyRule = css.match(/\.season-premium-buy \{[^}]*\}/)?.[0] || "";
assert.match(buyRule, /grid-column:3;/);
assert.ok(!buyRule.includes("width:100%"), "düğme bütün genişliği kaplamamalı");
// Dar sütunda yazı kesilmez, iki satıra iner; yazı .5rem altına inmez.
assert.match(buyRule, /white-space:normal;/);
assert.match(buyRule, /font:900 \.5rem\/1\.25 var\(--gs-font-display\);/);
assert.match(buyRule, /min-height:36px;/);
assert.equal(i18n.translateText("ÜCRETLİ GEÇİŞİ AÇ · 199,99 TL", "en"), "UNLOCK PAID PASS · 199,99 TL");

// --- Kozmetik kilit etiketi -------------------------------------------------
const labelStart = app.indexOf("  function cosmeticStateLabel(");
const labelSource = app.slice(labelStart, app.indexOf("  function renderBattleEmojiVisual(", labelStart));
const sandbox = {
  document: { createElement: () => ({ textContent:"", className:"" }) },
};
vm.runInNewContext(`${labelSource}\nthis.cosmeticStateLabel = cosmeticStateLabel;`, sandbox);
const label = (state) => {
  const node = sandbox.cosmeticStateLabel(state);
  return [node.textContent, node.className];
};
assert.deepEqual(label({ unlocked:true, selected:true }), ["SEÇİLİ", ""]);
assert.deepEqual(label({ unlocked:true, selected:false }), ["SEÇ", ""]);
assert.deepEqual(label({ unlocked:false, selected:false }), ["KİLİTLİ", "cosmetic-locked-label"]);
// Kaynak notu üreten kod ve stili kalmadı (oyuncu ve takım kozmetikleri).
for (const gone of ["cosmeticUnlockLabels", "cosmetic-lock-source", "SEZON YOLU ${", "LİDER PANOSU ${", "HAFTALIK TURNUVA ${", "TAKIM TURNUVASI ${", "TURNUVA ${", '"TURNUVA ÖDÜLÜ"', '"REKABET ÖDÜLÜ"', "appearance_unlock_sources"]) {
  assert.ok(!app.includes(gone), `${gone} kalmamalı`);
}
assert.ok(!css.includes("cosmetic-lock-source"));
assert.match(css, /\.cosmetic-locked-label::before \{ content:"🔒 ";font-size:\.9em; \}/);
assert.ok(app.includes('state.textContent = locked ? "KİLİTLİ" : selected ? "SEÇİLİ" : "SEÇ";'));
assert.equal(i18n.translateText("KİLİTLİ", "en"), "LOCKED");

console.log("season pass button and cosmetic lock contract passed");
