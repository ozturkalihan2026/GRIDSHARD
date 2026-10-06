"use strict";

// Çocuk hedef kitle kararı (docs/CHILD_AUDIENCE_AUDIT.md): takım sohbeti ve
// özel mesaj yalnız hazır mesajlarla çalışır, takım açıklaması hazır
// seçeneklerden seçilir. İstemci listesi sunucu listesiyle aynı olmalı ve
// arayüzde serbest yazı kutusu kalmamalıdır.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("../src/i18n-catalog.js");
const i18n = require("../src/i18n.js");
const { GridshardSafeChat: safeChat } = require("../src/social/safe-chat.js");

const CLIENT_ROOT = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(CLIENT_ROOT, ...parts), "utf8");
const serverCatalog = read("..", "server", "app", "safe_chat.py");
const html = read("index.html");
const app = read("src", "app.js");

// Python listesindeki ("kimlik", ..., "metin") satırlarını okur.
function serverRows(name) {
  const start = serverCatalog.indexOf(`${name}:`);
  assert.notEqual(start, -1, `${name} sunucu dosyasında yok`);
  const block = serverCatalog.slice(start, serverCatalog.indexOf("\n)", start));
  return block.split("\n")
    .filter((line) => line.trim().startsWith("("))
    .map((line) => [...line.matchAll(/"([^"]*)"/g)].map((match) => match[1]));
}

// İstemci listesi sunucu listesiyle birebir aynıdır (kimlik, grup, metin, sıra).
assert.deepEqual(
  safeChat.messages.map((item) => [item.id, item.group, item.text]),
  serverRows("_MESSAGES")
);
assert.deepEqual(
  safeChat.teamDescriptions.map((item) => [item.id, item.text]),
  serverRows("_TEAM_DESCRIPTIONS")
);
assert.ok(safeChat.messages.length >= 25);
assert.deepEqual(
  [...new Set(safeChat.messages.map((item) => item.group))],
  safeChat.groups.map((group) => group.id)
);

// Gösterilen metin listeden gelir; kayıtta ne yazdığına güvenilmez.
assert.equal(safeChat.messageText({ preset_id:"hello", text:"0555 111 22 33" }), "Selam!");
assert.equal(safeChat.messageText({ text:"Okulum Atatürk Ortaokulu" }), "");
assert.equal(safeChat.messageText({ preset_id:"", text:"Selam!" }), "");
assert.equal(safeChat.messageText(null), "");
// Sunucu daha yeni bir hazır mesaj gönderdiyse onun hazır metni gösterilir.
assert.equal(safeChat.messageText({ preset_id:"yeni_kimlik", text:"Yeni hazır mesaj" }), "Yeni hazır mesaj");
assert.equal(safeChat.teamDescriptionText({ description_id:"tournament", description:"x" }), "Turnuva için oynuyoruz.");
assert.equal(safeChat.teamDescriptionText({ description:"Okulumdan arkadaşlar" }), "");

// Her hazır metin İngilizceye çevrilir ve Türkçeye birebir geri döner.
const hasLetters = (text) => /\p{L}/u.test(text);
for (const text of [
  ...safeChat.messages.map((item) => item.text),
  ...safeChat.teamDescriptions.map((item) => item.text),
  ...safeChat.groups.map((group) => group.label),
  "Hazır mesajlar",
  "Açıklama yok",
  "Güvenli sohbet: yalnız hazır mesajlar gönderilir.",
  "Sohbeti başlatmak için aşağıdan bir mesaj seç.",
  "Adını herkes görür. Gerçek adını, okulunu ya da telefon numaranı yazma.",
  "Takım adını herkes görür. Gerçek ad, okul ya da telefon numarası yazma.",
]) {
  const english = i18n.translateText(text, "en");
  if (hasLetters(text)) assert.notEqual(english, text, `çevirisi yok: ${text}`);
  assert.equal(i18n.translateText(english, "tr"), text, `geri dönmüyor: ${text}`);
}
// Sunucunun ad süzgeci nedenleri de çevrilir (server/app/text_safety.py).
for (const label of ["Oyuncu adı", "Takım adı"]) {
  for (const reason of [
    "en fazla 4 rakam içerebilir; telefon ya da numara yazma.",
    "e-posta, internet adresi ya da kullanıcı adı içeremez.",
    "sosyal ağ ya da iletişim bilgisi içeremez.",
    "uygun değil; başka bir ad seç.",
  ]) {
    const text = `${label} ${reason}`;
    assert.notEqual(i18n.translateText(text, "en"), text, `çevirisi yok: ${text}`);
  }
}

// Arayüzde serbest yazı kutusu yoktur; seçiciler vardır.
for (const removed of [
  'id="team-message-input"',
  'id="team-message-send"',
  'id="direct-message-text"',
  'id="direct-message-form"',
  "<textarea",
]) {
  assert.ok(!html.includes(removed), `kaldırılmış olmalı: ${removed}`);
}
assert.ok(html.includes('id="team-message-picker"'));
assert.ok(html.includes('id="direct-message-picker"'));
assert.match(html, /<select id="team-create-description">/);
assert.ok(html.indexOf('src="./src/social/safe-chat.js"') > 0);
assert.ok(html.indexOf('src="./src/social/safe-chat.js"') < html.indexOf('src="./src/app.js"'));

// Sunucuya yalnız kimlik gider.
assert.ok(app.includes('{ preset_id:presetId, requestKind:"message" }'));
assert.ok(app.includes("recipient_id:peer,preset_id:presetId,"));
assert.ok(app.includes('description_id:description?.value || "",'));
assert.ok(!app.includes("recipient_id:peer,text:"));
assert.ok(!app.includes('{ message, requestKind:"message" }'));
// Mesaj metni kayıttan değil listeden çizilir.
assert.ok(!/text\.textContent = message\.text/.test(app));
assert.ok(!/textContent = (team|teamState)\.description\b/.test(app));

console.log("gridshard safe chat client test passed");
