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
assert.strictEqual(i18n.translateText("TAKIM", "en"), "TEAM");
assert.strictEqual(i18n.translateText("Aşırı Yük Çipi", "en"), "Overcharge Chip");
assert.strictEqual(
  i18n.translateText("Devrede 4 · Boş Hak 0 · Sınır 4/10 · Yeni Hak 15 sn", "en"),
  "On Circuit 4 · Open Slots 0 · Limit 4/10 · New Slot in 15 sec"
);
assert.strictEqual(
  i18n.translateText("Oyuncu · Seviye 2 · Gümüş · 1020 Derece Puanı · 120 XP", "en"),
  "Oyuncu · Level 2 · Silver · 1020 Rating Points · 120 XP"
);
assert.strictEqual(
  i18n.translateText("En Çok Kullanılan Modüller", "en"),
  "Most-Used Modules"
);
assert.strictEqual(
  i18n.translateText("Henüz tamamlanmış maç verisi yok.", "en"),
  "No completed match data yet."
);
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
assert.strictEqual(i18n.translateText("Güçlendiriciler", "en"), "Boosters");
assert.strictEqual(i18n.translateText("Maç sonucu", "en"), "Match result");
assert.strictEqual(
  i18n.translateText("18 modül · Henüz kullanılmadı", "en"),
  "18 modules · Never used"
);

console.log("gridshard i18n test passed");
