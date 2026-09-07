"use strict";

const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");
const html = fs.readFileSync("./index.html", "utf8");

assert.ok(!html.includes('id="capacity-indicator"'));
assert.ok(html.includes('id="post-match-sync-retry"'));
assert.ok(html.includes('id="post-match-persistence-status"'));
assert.ok(app.includes("function fetchWithDeadline"));
assert.ok(app.includes("function requestJsonWithDeadline"));
assert.ok(app.includes("void finishWebTestSessionAudit"));
assert.ok(app.includes("localServerFinalResult"));
assert.ok(app.includes("arena-league-reward-road"));
assert.ok(app.includes("energizedEdges"));
assert.ok(css.includes("gap: 8px !important"));
assert.ok(css.includes(".post-match-player-body"));
assert.ok(!html.includes(">Hesaplanıyor<"));
assert.ok(!app.includes("DP hesaplanıyor"));
assert.ok(!app.includes("XP hesaplanıyor"));

console.log("beta43.1 runtime fixes test passed");
