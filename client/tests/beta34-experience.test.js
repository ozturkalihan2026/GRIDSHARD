const assert = require("assert");
const fs = require("fs");

require("../src/i18n.js");

const app = fs.readFileSync("./src/app.js", "utf8");
const audio = fs.readFileSync("./src/gridshard-audio.js", "utf8");
const html = fs.readFileSync("./index.html", "utf8");
const styles = fs.readFileSync("./src/styles.css", "utf8");

assert.strictEqual(
  global.GridshardI18n.translateText("Günlük Görevler", "en"),
  "Daily Missions"
);
assert.strictEqual(
  global.GridshardI18n.translateText("Ödül Yolu", "en"),
  "Reward Track"
);
assert.strictEqual(
  global.GridshardI18n.translateText("KAYNAK 11 Ü", "en"),
  "SOURCE 11 U"
);
assert.strictEqual(
  global.GridshardI18n.translateText("FLOW 3 U", "tr"),
  "AKIŞ 3 Ü"
);
assert.strictEqual(
  global.GridshardI18n.translateText("3 devre emri aktif", "en"),
  "3 circuit orders active"
);
assert.strictEqual(
  global.GridshardI18n.translateText("SEZON SIFIR", "en"),
  "SEASON ZERO"
);
assert.strictEqual(
  global.GridshardI18n.translateText("Eşleştiriliyor", "en"),
  "Matching"
);

assert.ok(app.includes('settingsLanguageEl.addEventListener('));
assert.ok(app.includes('await saveSettingsForm();'));
assert.ok(app.includes('const collapsedShelfCategories = new Set();'));
assert.ok(/document\.createElement\(\s*"details"\s*\)/u.test(app));
assert.ok(/trackBattleUiInteraction\(\s*"tap_rotate_module"/u.test(app));

assert.ok(html.includes('id="battle-pool-detail-preview"'));
assert.ok(styles.includes('.pool-detail-preview-card > .port-dot'));
assert.ok(styles.includes('.module-shelf .module-card > .port-dot'));
assert.ok(styles.includes('.shelf-module-tooltip'));

assert.ok(audio.includes("class GridshardSeamlessLoopTrack"));
assert.ok(audio.includes("createBufferSource"));
assert.ok(audio.includes("GRIDSHARD_AUDIO_STATES.MATCHMAKING"));
assert.ok(
  app.includes('["matchmaking", "matched", "connecting", "readying"]')
);

console.log("beta34 client experience test passed");
