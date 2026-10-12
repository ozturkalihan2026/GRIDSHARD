"use strict";

// Günlük meta "Akım Desteği": etki satırı "Akım üretimi +%15" yazar; oyunda
// "Akım modülü" diye bir modül yoktur.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

require("../src/i18n-catalog.js");
const i18n = require("../src/i18n.js");

const read = (...parts) => fs.readFileSync(path.join(__dirname, "..", ...parts), "utf8");
const app = read("src", "app.js");
const server = read("..", "server", "app", "season_competition.py");

// Metin sunucudan gelir; istemci onu olduğu gibi gösterir.
assert.ok(server.includes('"effect_tr": "Akım üretimi +%15"'));
assert.ok(!server.includes("Akım modülü etkisi"));
assert.ok(app.includes('effect.textContent = selected?.effect_tr || "";'));

assert.deepEqual(
  globalThis.GridshardI18nCatalog.messages["meta.current_support.effect"],
  { tr:"Akım üretimi +%15", en:"Current generation +15%" }
);
assert.equal(i18n.translateText("Akım üretimi +%15", "en"), "Current generation +15%");
assert.equal(i18n.translateText("Current generation +15%", "tr"), "Akım üretimi +%15");
// Güncellenmemiş sunucunun gönderdiği eski metin de çevrilir.
assert.equal(i18n.translateText("Akım modülü etkisi +%15", "en"), "Current module effect +15%");

console.log("daily meta current text contract passed");
