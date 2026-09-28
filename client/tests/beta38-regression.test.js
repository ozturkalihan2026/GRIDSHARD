const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/styles.css", "utf8");
const html = fs.readFileSync("./index.html", "utf8");



assert.ok(css.includes("GRIDSHARD Beta.38 — connected circuit board"));
assert.ok(css.includes('body[data-app-screen="play"][data-local-status="battle"] .board'));
assert.ok(css.includes("gap:0 !important"));
assert.ok(css.includes("aspect-ratio:auto !important"));
assert.ok(css.includes(".profile-summary-panel > .panel-title-row"));
assert.ok(css.includes(".statistics-summary-panel > .panel-title-row"));
assert.ok(css.includes(".settings-summary-panel > .panel-title-row"));

assert.ok(!html.includes('id="settings-save"'));
assert.ok(!html.includes('id="settings-save-status"'));
assert.ok(!html.includes('id="settings-persistence-status"'));

console.log("beta38 circuit interaction regression test passed");
