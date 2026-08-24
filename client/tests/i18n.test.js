const assert = require("assert");
const i18n = require("../src/i18n.js");

assert.strictEqual(i18n.translateText("Ayarlar", "en"), "Settings");
assert.strictEqual(i18n.translateText("Settings", "tr"), "Ayarlar");
assert.strictEqual(
  i18n.translateText("Hazırlık Ekranına Dön", "en"),
  "Return to Preparation"
);
assert.strictEqual(
  i18n.translateText("Modül Rafı", "en"),
  "Module Shelf"
);
assert.strictEqual(i18n.translateText("Enerji", "en"), "Energy");
assert.strictEqual(i18n.translateText("Lazer", "en"), "Laser");
assert.strictEqual(
  i18n.translateText(
    "Maç 3 · Galibiyet 2 · Mağlubiyet 1 · Beraberlik 0 · Galibiyet %67",
    "en"
  ),
  "Matches 3 · Wins 2 · Losses 1 · Draws 0 · Win rate 67%"
);
assert.strictEqual(
  i18n.translateText("Circuit Credits: 550 DK", "tr"),
  "Devre Kredisi: 550 DK"
);

console.log("gridshard i18n test passed");
