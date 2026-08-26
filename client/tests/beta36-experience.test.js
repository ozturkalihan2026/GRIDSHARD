"use strict";

const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const relay = fs.readFileSync("./src/relay-client.js", "utf8");
const css = fs.readFileSync("./src/styles.css", "utf8");
const html = fs.readFileSync("./index.html", "utf8");
const i18n = fs.readFileSync("./src/i18n.js", "utf8");

assert.ok(html.includes('data-open-screen="laboratory"'));
assert.ok(html.includes('id="laboratory-screen"'));
assert.ok(html.includes('id="laboratory-module-list"'));
assert.ok(html.includes('id="laboratory-transaction-list"'));
assert.ok(html.includes('id="laboratory-reset-button"'));
assert.ok(html.includes("normalized=true"));
assert.ok(!html.includes('data-roadmap-feature="store"'));
assert.ok(relay.includes('LABORATORY: "laboratory"'));
assert.ok(relay.includes("async loadLaboratory()"));
assert.ok(relay.includes("async upgradeLaboratoryModule"));
assert.ok(relay.includes("async resetLaboratory"));
assert.ok(app.includes("function renderLaboratory()"));
assert.ok(app.includes("laboratoryRequestId"));
assert.ok(app.includes("selectedLaboratoryModuleId"));
assert.ok(css.includes("Beta.36 — Devre Laboratuvarı V1"));
assert.ok(css.includes(".laboratory-workbench"));
assert.ok(css.includes(".laboratory-compare"));
assert.ok(i18n.includes('"Devre Laboratuvarı":"Circuit Laboratory"'));

console.log("beta36 client experience test passed");
