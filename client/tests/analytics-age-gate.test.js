"use strict";

// Ürün analitiği yaş sorusu (docs/CHILD_AUDIENCE_AUDIT.md): izin kapalı gelir,
// açmak isteyene doğum yılı sorulur. Karar sunucudadır; istemci yalnız sorar,
// sonucu gösterir ve yılı cihazda tutmaz.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

require("../src/i18n-catalog.js");
const i18n = require("../src/i18n.js");
require("../src/relay-client.js");

const CLIENT_ROOT = path.join(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(CLIENT_ROOT, ...parts), "utf8");
const html = read("index.html");
const app = read("src", "app.js");
const css = read("src", "canon.css");
const server = read("..", "server", "app", "player_settings.py");
const gateway = read("..", "server", "app", "main.py");

// Görünüm modeli sunucunun yanıtını taşır; bilinmeyen değer "sorulmadı" sayılır.
const state = new globalThis.RelaySettingsClientState();
const base = { player_id:"p", sound_volume:100, music_volume:70, vibration_enabled:true, graphics_quality:"yuksek", language:"tr" };
state.applySettings({ ...base, analytics_consent:false });
assert.deepEqual(
  [state.viewModel().analyticsConsent, state.viewModel().analyticsAgeGate, state.viewModel().analyticsAgeAskedYear],
  [false, "", 0]
);
state.applySettings({ ...base, analytics_consent:true, analytics_age_gate:"adult", analytics_age_asked_year:2026 });
assert.deepEqual(
  [state.viewModel().analyticsConsent, state.viewModel().analyticsAgeGate, state.viewModel().analyticsAgeAskedYear],
  [true, "adult", 2026]
);
state.applySettings({ ...base, analytics_consent:false, analytics_age_gate:"teen" });
assert.equal(state.viewModel().analyticsAgeGate, "");

// Soru yönlendirmesizdir: alan boş gelir, gereken yaşı ya da bir yıl aralığını söylemez.
const panel = html.slice(html.indexOf('id="analytics-age-panel"'), html.indexOf('id="analytics-age-status"'));
assert.ok(panel.length > 0);
assert.match(html, /<div id="analytics-age-panel" class="analytics-age-panel" hidden>/);
assert.match(panel, /<input id="analytics-age-year" type="text" inputmode="numeric" maxlength="4" autocomplete="off" placeholder="Doğum yılı" aria-label="Doğum yılı">/);
assert.ok(!/\bvalue=|\bmin=|\bmax=|18|yaşından|yetişkin/i.test(panel), "soru gereken yaşı ele vermemeli");
assert.ok(html.indexOf('id="settings-analytics-consent"') < html.indexOf('id="analytics-age-panel"'));
assert.match(css, /\.analytics-age-panel\[hidden\] \{ display:none; \}/);

// İzin kutusu yanıt gelmeden kaydı tetiklemez; yıl yalnız istekle gider.
const gate = app.slice(app.indexOf("let analyticsBirthYearAnswer = null;"), app.indexOf("function scheduleSettingsAutoSave"));
assert.ok(gate.length > 0);
assert.ok(!/localStorage|sessionStorage|secureStorage/i.test(gate), "doğum yılı cihazda saklanmaz");
assert.ok(gate.includes('settingsState.viewModel()?.analyticsAgeGate !== "adult"'));
assert.ok(gate.includes('if (input) input.value = "";'));
assert.ok(app.includes("&& (analyticsAnswered || analyticsBirthYear !== null),"));
assert.ok(app.includes("...(analyticsBirthYear !== null ? { analytics_birth_year:analyticsBirthYear } : {}),"));
assert.match(app, /if \(controlId === "settings-analytics-consent"\) \{\s*onAnalyticsConsentChanged\(\);/);

// Kilit kuralı sunucudakiyle aynıdır: "minor" yanıtı sorulduğu takvim yılı boyunca geçerlidir.
const sandbox = { settingsState:{ viewModel:() => sandbox.view }, view:null, Date:class { getFullYear() { return 2026; } } };
vm.runInNewContext(`${gate.slice(gate.indexOf("function analyticsAgeLocked"), gate.indexOf("function renderAnalyticsAgeGate"))}; this.locked = analyticsAgeLocked;`, sandbox);
const locked = (gateValue, askedYear) => {
  sandbox.view = { analyticsAgeGate:gateValue, analyticsAgeAskedYear:askedYear };
  return sandbox.locked();
};
assert.equal(locked("minor", 2026), true);
assert.equal(locked("minor", 2025), false);
assert.equal(locked("adult", 2026), false);
assert.equal(locked("", 0), false);
assert.ok(server.includes("and asked_year >= year"));

// Sunucu yılı ister, saklamaz; analitik kaydı yetişkin yanıtına bağlıdır.
assert.ok(gateway.includes("analytics_birth_year: int | None = None"));
assert.ok(gateway.includes("and analytics_enabled(snapshot.settings)"));
assert.ok(!/birth_year/.test(server.slice(server.indexOf("def to_view"), server.indexOf("class PlayerSettingsError"))));

// Yeni metinlerin ve sunucu yanıtlarının İngilizcesi vardır.
for (const text of [
  "Bu ayarı açmadan önce doğum yılını soruyoruz. Yıl kaydedilmez.",
  "Doğum yılı",
  "ONAYLA",
  "VAZGEÇ",
  "Doğum yılını dört rakamla yaz.",
  "Ürün analitiği bu hesapta açılamıyor.",
  "Ürün analitiğini açmadan önce doğum yılı sorulur. Bunun için uygulamayı güncelle.",
  "Doğum yılı geçersiz.",
]) {
  const english = i18n.translateText(text, "en");
  assert.notEqual(english, text, `çevirisi yok: ${text}`);
  assert.equal(i18n.translateText(english, "tr"), text, `geri dönmüyor: ${text}`);
}
for (const text of [
  "Ürün analitiğini açmadan önce doğum yılı sorulur. Bunun için uygulamayı güncelle.",
  "Doğum yılı geçersiz.",
]) {
  assert.ok(server.includes(`"${text}"`), text);
}

console.log("gridshard analytics age gate client test passed");
