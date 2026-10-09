const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");
const i18n = fs.readFileSync("./src/i18n.js", "utf8");

// Çekirdek enderliği güç eğrisi değildir; bilgi ekranı imzayı gösterir.
assert.ok(app.includes('"Enderlik CAN, enerji üretimi, dolum hızı veya güç etkisi avantajı vermez."'));
assert.ok(app.includes("host.appendChild(createModuleIdentityPanel(core, {"));
assert.ok(app.includes('["İMZA", core.signature_name_tr || "—"]'));

// Motorun çekirdek imza olayı sahnede ve şeritte görünür.
assert.ok(app.includes('"core_signature_triggered"'));
for (const signatureId of [
  "ember_rebirth",
  "last_stand",
  "overdrive_chain",
  "static_charge",
  "reserve_discharge",
  "half_phase",
]) {
  assert.ok(app.includes(`${signatureId}:{`), `${signatureId} sunumu yok`);
}
for (const effect of [
  "core_rebirth",
  "core_last_stand",
  "core_chain",
  "core_static",
  "core_discharge",
  "core_half_phase",
]) {
  assert.ok(app.includes(`${effect}:{ priority:`), `${effect} efekti yok`);
  assert.ok(css.includes(`[data-signature="${effect}"]`), `${effect} rengi yok`);
}

// Rakip çekirdeğin imza rozeti de çizilir (Anka doğuşu karşı oyun için görünür).
assert.ok(app.includes("mockEnemyCoreBadges=normalizeSignatureBadges(enemyCore?.signature_badges);"));
assert.ok(app.includes('enemyCard("enemy-core","Çekirdek",mockEnemyCoreHp,mockEnemyCoreMaxHp,"core",{ signatureBadges:mockEnemyCoreBadges })'));
for (const badge of ["ember", "static", "last_stand", "chain"]) {
  assert.ok(css.includes(`.module-signature-badge[data-badge="${badge}"]`), `${badge} rozeti yok`);
}

// Kuantum Yarım Faz: güç yarım dolumda kullanılabilir ve gösterge bunu yazar.
assert.ok(app.includes('(halfPhaseReady ? "YARIM" : "HAZIR")'));
assert.ok(i18n.includes('"YARIM":"HALF"'));

// Sesler mevcut dosyalara bağlanır.
require("../src/gridshard-audio.js");
for (const cue of ["core_rebirth", "overdrive_chain"]) {
  assert.ok(global.GRIDSHARD_SFX_CUES[cue], `${cue} ipucu yok`);
}
