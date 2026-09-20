"use strict";

const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("./index.html", "utf8");
const app = fs.readFileSync("./src/app.js", "utf8");
const relayClient = fs.readFileSync("./src/relay-client.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");

assert.ok(html.includes('id="profile-rank-trophy-collection"'));
assert.ok(html.includes('id="profile-badge-collection"'));
assert.ok(html.includes('id="profile-honor-title"'));
assert.ok(app.includes("function renderProfileHonorShowcase"));
assert.ok(app.includes("PROFILE_RANK_TROPHIES"));
assert.ok(app.includes("PROFILE_BADGES"));
assert.ok(relayClient.includes("unlockedRankTrophyIds"));
assert.ok(relayClient.includes("unlockedBadgeIds"));
assert.ok(css.includes(".leaderboard-row:hover,.leaderboard-row:focus-within { z-index:60; }"));
assert.ok(css.includes(".leaderboard-reward-chest:focus .leaderboard-reward-popover"));
assert.ok(css.includes(".profile-honor-showcase"));
assert.ok(!css.includes(".leaderboard-reward-chest { position:relative;width:30px;height:24px;min-height:0;padding:0;display:inline-grid;place-items:center;margin-left:5px;border:1px solid var(--reward-chest,#ffe170);border-radius:6px;color:var(--reward-chest,#ffe170);background:color-mix(in srgb,var(--reward-chest,#ffe170) 13%,#08172a);font-size:.75rem;filter:drop-shadow"));

console.log("beta64 profile honors contract passed");
