"use strict";

// Ebeveyn denetimi (docs/CHILD_AUDIENCE_AUDIT.md): yetişkin, sohbeti, özel
// mesajı ve arkadaşlık isteklerini 4 haneli bir şifreyle kapatır. Karar
// sunucudadır; istemci yalnız durumu gösterir ve şifreyi istekle gönderir.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("../src/i18n-catalog.js");
const i18n = require("../src/i18n.js");

const CLIENT_ROOT = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(CLIENT_ROOT, ...parts), "utf8");
const html = read("index.html");
const app = read("src", "app.js");
const css = read("src", "canon.css");
const server = read("..", "server", "app", "main.py");

// Ayar, Hesap ve Gizlilik sekmesindedir; şifre alanları gizli yazılır.
const account = html.slice(html.indexOf('id="settings-panel-account"'), html.indexOf('class="profile-terminal-tabs"', html.indexOf('id="settings-panel-account"')));
assert.ok(account.includes('id="parental-controls-panel"'));
for (const id of ["parental-controls-pin", "parental-controls-pin-repeat"]) {
  assert.match(account, new RegExp(`<input id="${id}" type="password" inputmode="numeric" maxlength="4" autocomplete="off"`));
}
assert.ok(account.includes('id="parental-controls-submit"'));
assert.ok(html.includes('id="friends-social-closed"'));

// İstemcinin çağırdığı uçlar sunucuda vardır.
for (const action of ["close-social", "open-social"]) {
  assert.ok(server.includes(`@app.post("/accounts/{player_id}/parental-controls/${action}")`), action);
}
assert.ok(app.includes('/parental-controls/${closed ? "open-social" : "close-social"}'));
assert.ok(app.includes("body:JSON.stringify({player_id:participantPlayerId,pin})"));

// Şifre cihazda saklanmaz; alanlar her denemeden sonra temizlenir.
const submit = app.slice(app.indexOf("async function submitParentalControls"), app.indexOf("function renderAccountPlatform()"));
assert.ok(submit.length > 0);
assert.ok(!/localStorage|sessionStorage|secureStorage/i.test(submit));
assert.ok(submit.includes('if (pinInput) pinInput.value = "";'));
assert.ok(submit.includes('if (repeatInput) repeatInput.value = "";'));
// Durum yalnız sunucunun hesap görünümünden okunur.
assert.ok(app.includes("accountPlatformState?.parental?.social_closed"));
assert.ok(app.includes("socialState.social_closed"));
assert.ok(app.includes("teamState.social_closed"));

// Kapalıyken seçici gizlenir (display:grid, hidden özniteliğini ezmesin).
assert.match(css, /\.preset-message-picker\[hidden\],\s*\.preset-message-picker\[hidden\] \+ \.preset-message-hint \{ display:none; \}/);

// Yeni metinlerin ve sunucu yanıtlarının İngilizcesi vardır.
for (const text of [
  "Ebeveyn Denetimi",
  "Sosyal özellikler açık.",
  "Sosyal özellikler kapalı.",
  "SOSYAL ÖZELLİKLERİ KAPAT",
  "SOSYAL ÖZELLİKLERİ AÇ",
  "4 haneli şifre",
  "Şifreyi yinele",
  "Ebeveyn şifresi 4 rakam olmalıdır.",
  "Şifreler aynı değil.",
  "Sosyal özellikler açıldı.",
  "Sosyal özellikler kapatıldı.",
  "Sosyal özellikler ebeveyn ayarıyla kapalı.",
  "SOHBET KAPALI",
  "Ebeveyn şifresi yanlış.",
  "Çok fazla yanlış deneme yapıldı. Bir süre sonra yeniden dene.",
  "Bu oyuncu mesaj ve arkadaşlık isteği almıyor.",
  "E-posta ya da telefon bağlama kapalı. Hesabını Ayarlar'daki giriş yöntemlerinden biriyle koruyabilirsin.",
]) {
  const english = i18n.translateText(text, "en");
  assert.notEqual(english, text, `çevirisi yok: ${text}`);
  assert.equal(i18n.translateText(english, "tr"), text, `geri dönmüyor: ${text}`);
}
// Sunucunun gönderdiği metinler istemcinin çevirdiği metinlerle aynıdır.
for (const text of [
  "Sosyal özellikler ebeveyn ayarıyla kapalı.",
  "Bu oyuncu mesaj ve arkadaşlık isteği almıyor.",
]) {
  assert.ok(server.includes(`"${text}"`), text);
}

console.log("gridshard parental controls client test passed");
