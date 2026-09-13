const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/styles.css", "utf8");
const canonCss = fs.readFileSync("./src/canon.css", "utf8");
const html = fs.readFileSync("./index.html", "utf8");
const packager = fs.readFileSync("../tools/package_release.py", "utf8");

assert.ok(css.includes("Beta.38 Fix — one stable content cell"));
assert.ok(css.includes("--gs-fix-shell-top:110px"));
assert.ok(css.includes(".menu-action.is-active .menu-action-title"));
assert.ok(css.includes(".menu-action:not(.is-active) .lobby-dock-icon"));
assert.ok(html.includes('data-shell-screen="shop" aria-label="Mağaza"'));
assert.ok(html.includes('data-shell-screen="modules" aria-label="Kartlar"'));
assert.ok(html.includes('data-shell-screen="events" aria-label="Etkinlik"'));

assert.ok(app.includes('requestOwnedAudioState("online_status_update")'));
assert.ok(app.includes("GridshardAudioStateOwner"));
assert.ok(app.includes('["idle", "cancelled", "error", ""]'));
assert.ok(app.includes("getAudioState:() =>"));

assert.ok(!html.includes('id="capacity-indicator"'));
assert.ok(app.includes("function modulePlacementSlotState()"));
assert.ok(app.includes('shelf.dataset.placementReady = String(anyAffordable)'));
assert.ok(app.includes("client.circuitCredits >= Number(module.circuitCreditCost"));

assert.ok(app.includes("updateFloatingFeedbackImportance"));
assert.ok(!app.includes("CAN · ONARIM"));
assert.ok(!app.includes("CAN · DARBE"));
assert.match(app, /event\?\.type === "module_damaged"[\s\S]{0,900}`-\$\{damage\}`/);
assert.match(app, /event\?\.type === "module_repaired"[\s\S]{0,900}`\+\$\{repair\}`/);
assert.match(app, /preventedDamage[\s\S]{0,500}`\$\{preventedDamage\}`/);
assert.match(app, /event\?\.type === "sabotage_applied"[\s\S]{0,900}`-\$\{durationSeconds\}`/);
assert.ok(app.includes("AŞIRI ISI!"));
assert.ok(css.includes('.battle-floating-feedback.sabotage'));
assert.ok(css.includes('[data-impact="large"]'));
assert.ok(canonCss.includes("gs-beta50-combat-number"));

assert.ok(packager.includes('PACKAGE_LABEL = "cards-season"'));
if (fs.existsSync("../RELEASE_MANIFEST.json")) {
  const manifest = JSON.parse(fs.readFileSync("../RELEASE_MANIFEST.json", "utf8"));
  assert.ok(!manifest.files.includes("RELEASE_MANIFEST.json"));
}

console.log("beta38 fix regression test passed");
