const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");
const i18n = fs.readFileSync("./src/i18n.js", "utf8");

// Çekirdek enderliği güç eğrisi değildir; bilgi ekranı imzayı gösterir.
const coreDetail = app.slice(app.indexOf("  function renderCoreDetailTab("), app.indexOf("  function openCoreDetail("));
assert.ok(coreDetail.includes("Seviyeyle gelişir; enderlik ek güç çarpanı katmaz."));
assert.ok(coreDetail.includes("const signature = createStatSignature(core);"));
assert.ok(coreDetail.includes("if (signature) host.appendChild(signature);"));
assert.ok(app.includes("const signature = item.signature_mechanic;"));

const vfx=fs.readFileSync('./src/battle/core-vfx-v6.js','utf8');
assert.ok(vfx.includes('receive(events,s)'));
assert.ok(!app.includes('core_signature_triggered'));
assert.ok(app.includes('moduleVfx.receive(batch.events,batch.snapshot)'));

// Rakip çekirdeğin imza rozeti de çizilir (Anka doğuşu karşı oyun için görünür).
assert.ok(app.includes("mockEnemyCoreBadges=normalizeSignatureBadges(enemyCore?.signature_badges);"));
assert.ok(app.includes('signatureBadges:mockEnemyCoreBadges,'));
assert.ok(app.includes('enemyBattleBoardView.render(modules, {'));
assert.ok(app.includes('signatureBadges = normalizeSignatureBadges(moduleLike.signatureBadges)'));
for (const badge of ["ember", "static", "last_stand", "chain"]) {
  assert.ok(css.includes(`.module-signature-badge[data-badge="${badge}"]`), `${badge} rozeti yok`);
}

// Kuantum Yarım Faz: güç yarım dolumda kullanılabilir ve gösterge bunu yazar.
assert.ok(app.includes('corePowerButtonEl.dataset.halfPhase="false"'));
assert.ok(i18n.includes('"YARIM":"HALF"'));

// Current hero audio is checked by core-hero-vfx-v6.test.js.
