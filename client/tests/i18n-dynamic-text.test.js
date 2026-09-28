const assert = require("assert");
const i18n = require("../src/i18n.js");

const en = (value) => i18n.translateText(value, "en");
const tr = (value) => i18n.translateText(value, "tr");

// Birleşik ve sayı içeren metinler parça parça çevrilir.
assert.strictEqual(
  en("300 Devre Kredisi + 20 Akı + 20 Modül Parçası"),
  "300 Circuit Credits + 20 Flux + 20 Module Shards"
);
assert.strictEqual(en("Darbe Topu · 4 Modül Parçası"), "Pulse Cannon · 4 Module Shards");
assert.strictEqual(en("Devre Kredisi +38"), "Circuit Credits +38");
assert.strictEqual(en("★ Başlangıç Devresi · 6"), "★ Starting Circuit · 6");
assert.strictEqual(en("Sonraki: Röle Sokakları · 1500 Kupa"), "Next: Relay Streets · 1500 Trophies");
assert.strictEqual(en("4. hafta · Oct 01 tarihinde yenilenir"), "Week 4 · Resets on Oct 01");
assert.strictEqual(
  en("Savunma etkisi +%3 · SV 5 GEREKLİ · Açıklamayı göster"),
  "Defense effect +3% · LV 5 REQUIRED · Show description"
);
assert.strictEqual(en("Eylül 2026 Sezonu"), "September 2026 Season");
assert.strictEqual(en("Darbe Topu (Nadir, saldırı, 3 Akım)"), "Pulse Cannon (Rare, attack, 3 Current)");

// Kozmetik kilit kaynakları ve savaş kaydı.
assert.strictEqual(en("SEZON YOLU 15"), "SEASON ROAD 15");
assert.strictEqual(en("LİDER PANOSU 1."), "LEADERBOARD #1");
assert.strictEqual(en("TURNUVA 2."), "TOURNAMENT #2");
assert.strictEqual(
  en("Lazer → Çekirdek · Final 12 · Azaltılan 3 · Savunma Faz Zırhı · Faz"),
  "Laser → Core · Final 12 · Reduced 3 · Defense Phase Armor · Phase"
);
const log = "Modül yerleştirme isteği\nBilgi · Lazer için sunucu uygun hücreyi seçiyor.\nMAÇ BİTTİ · Berabere";
const englishLog = en(log);
assert.strictEqual(
  englishLog,
  "Module deploy request\nInfo · The server is choosing a suitable cell for Laser.\nMATCH OVER · Draw"
);

// İngilizceye çevrilen her metin Türkçeye birebir geri döner.
for (const source of [
  log,
  "Sezon Kupası · Genel · ilk 50",
  "Avatar Çerçevesi · Şampiyon Tacı",
  "Maç: Tek Oyunculu · Saldırgan AI",
  "Kilit sürerken hedef yok olursa ya da değişirse kilit baştan başlar; Kalkan hasarı azaltır.",
]) {
  assert.strictEqual(tr(en(source)), source, source);
}

// Oyuncu yazısı çevrilmez; yalnız "Sen:" öneki çevrilir.
assert.strictEqual(en("Sen: Çekirdek 250/300"), "You: Core 250/300");
assert.strictEqual(en("Sen:"), "You:");

console.log("gridshard i18n dynamic text test passed");
