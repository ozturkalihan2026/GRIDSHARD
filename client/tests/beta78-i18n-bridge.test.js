const assert = require("node:assert/strict");
require("../src/i18n-catalog.js");
const i18n = require("../src/i18n.js");

assert.equal(i18n.translateText("BU ARENADA AÇILAN MODÜLLER", "en"), "MODULES UNLOCKED IN THIS ARENA");
assert.equal(i18n.t("arena.reward_targeted_shards", {name:"Laser", amount:"12"}, "en"), "Laser · 12 Module Shards");
assert.equal(i18n.t("arena.reward_core_shards", {name:"Resonance Core", amount:"4"}, "en"), "Resonance Core · 4 Core Shards");
assert.equal(i18n.formatNumber(1234, {}, "tr"), "1.234");
assert.equal(i18n.formatNumber(1234, {}, "en"), "1,234");
assert.equal(i18n.translateText("Ayarlar", "en"), "Settings");
assert.equal(i18n.translateText("Settings", "tr"), "Ayarlar");
