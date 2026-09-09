"use strict";

const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const relay = fs.readFileSync("./src/relay-client.js", "utf8");
const audio = fs.readFileSync("./src/gridshard-audio.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");
const launcher = fs.readFileSync("../BASLAT_WEB_TEST.bat", "utf8");

assert.ok(app.includes("operationalDiagnosticsEnabled"));
assert.ok(app.includes("operationalChecks: operationalDiagnosticsEnabled"));
assert.ok(app.includes("operationalDiagnosticsEnabled\n          ? null"));
assert.ok(app.includes("diagnosticsSkipped:true"));
assert.ok(app.includes("function requestCanRetry"));
assert.ok(app.includes("body: JSON.stringify({ request_id: entry.requestId })"));
assert.ok(!app.includes("waitForChestOpening"));
assert.ok(app.includes("const preset = battlePoolPresets[index] || null"));
assert.ok(app.includes("function beginEmptyBattlePoolPreset"));
assert.ok(app.includes("deckEditorSlots = Array(6).fill(null)"));
assert.ok(app.includes("saved.presetPayload?.presets"));
assert.ok(app.includes("await persistBattlePoolDefinitionIds(\n        preset.module_definition_ids"));
assert.ok(app.includes("result?.manifest || null"));
assert.ok(relay.includes("operationalChecks = true"));
assert.ok(audio.includes('audio.preload="none"'));
assert.ok(!audio.includes("this._preloadAudioAssets(["));
assert.ok(css.includes(".module-preset-strip button.is-empty"));
assert.ok(css.includes('.season-rewards-screen > .profile-terminal-tabs'));
assert.ok(launcher.includes("web-test-beta.43-local"));

console.log("beta43.3 runtime resilience contract passed");
