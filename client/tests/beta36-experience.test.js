"use strict";

// Beta.36'da eklenen Devre Laboratuvarı Beta.72 tur 8'de kaldırıldı:
// kalibrasyonun savaşa etkisi yoktu ve yeni arayüzde girişi kalmamıştı.
const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const relay = fs.readFileSync("./src/relay-client.js", "utf8");
const css = fs.readFileSync("./src/styles.css", "utf8");
const canon = fs.readFileSync("./src/canon.css", "utf8");
const html = fs.readFileSync("./index.html", "utf8");
const i18n = fs.readFileSync("./src/i18n.js", "utf8");

assert.ok(!html.includes('data-screen-panel="laboratory"'));
assert.ok(!html.includes('id="laboratory-screen"'));
assert.ok(!html.includes('data-roadmap-feature="store"'));
assert.ok(!relay.includes('LABORATORY: "laboratory"'));
assert.ok(!relay.includes("loadLaboratory"));
assert.ok(!app.includes("renderLaboratory"));
assert.ok(!app.includes("selectedLaboratoryModuleId"));
// İşlem kimliği üreticisi meta ve günlük meta isteklerinde kullanılmaya devam eder.
assert.ok(app.includes("function operationRequestId(prefix)"));
assert.ok(app.includes('operationRequestId("daily-meta")'));
assert.ok(!/\.laboratory-|data-app-screen="laboratory"/.test(css + canon));
assert.ok(!i18n.includes("Devre Laboratuvarı"));

console.log("beta36 laboratory removal test passed");
