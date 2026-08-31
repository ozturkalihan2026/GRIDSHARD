const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/styles.css", "utf8");
const html = fs.readFileSync("./index.html", "utf8");
const packager = fs.readFileSync("../tools/package_release.py", "utf8");

assert.ok(css.includes("Beta.38 Fix — one stable content cell"));
assert.ok(css.includes("--gs-fix-shell-top:110px"));
assert.ok(css.includes(".menu-action.is-active .menu-action-title"));
assert.ok(css.includes(".menu-action:not(.is-active) .lobby-dock-icon"));
assert.ok(html.includes('data-shell-screen="profile" aria-label="Profil"'));
assert.ok(html.includes('data-shell-screen="settings" aria-label="Ayarlar"'));

assert.ok(app.includes('requestOwnedAudioState("online_status_update")'));
assert.ok(app.includes("GridshardAudioStateOwner"));
assert.ok(app.includes('["idle", "cancelled", "error", ""]'));
assert.ok(app.includes("getAudioState:() =>"));

assert.ok(html.includes("Yeni modül hakkı · 15 sn"));
assert.ok(app.includes("function modulePlacementSlotState()"));
assert.ok(app.includes('shelf.dataset.placementReady = String(placement.ready)'));
assert.ok(app.includes('"placement-locked"'));

assert.ok(app.includes("updateFloatingFeedbackImportance"));
assert.ok(app.includes("CAN · ONARIM"));
assert.ok(app.includes("ENGELLENDİ ·"));
assert.ok(app.includes("YANSITMA · YANSITICI"));
assert.ok(app.includes("EMP · ENERJİ KESİLDİ"));
assert.ok(app.includes("AŞIRI ISI!"));
assert.ok(css.includes('.battle-floating-feedback.sabotage'));
assert.ok(css.includes('[data-impact="large"]'));

assert.ok(packager.includes('PACKAGE_LABEL = "fix"'));
assert.ok(!fs.existsSync("../RELEASE_MANIFEST.json"));

console.log("beta38 fix regression test passed");
