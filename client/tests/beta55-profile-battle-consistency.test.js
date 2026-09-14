"use strict";

const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");

assert.ok(app.includes('const medal = { 1:"🥇", 2:"🥈", 3:"🥉" }'));
assert.ok(app.includes('rank.classList.toggle("is-medal", Boolean(medal))'));
assert.match(css, /\.leaderboard-identity \.public-player-link \{[\s\S]*padding-inline:2px/);

assert.match(css, /\.lobby-profile-button \.profile-avatar\[data-frame="neon_cyan"\]/);
assert.match(css, /\.lobby-profile-button \.profile-avatar\[data-frame="season_gold"\]/);
assert.match(css, /\.core-quick-actions \{ min-width:96px;max-width:none; \}/);
assert.match(css, /\.core-detail-dialog \.core-detail-art \{[\s\S]*translateY\(14px\)/);
assert.match(css, /\.season-reward-action > small \{[\s\S]*font-size:\.44rem/);

assert.ok(app.includes('circuitCredits: 6'));
assert.ok(app.includes('mockServerCredits = Math.min(12, mockServerCredits + gainedPulses)'));
assert.ok(app.includes('container.classList.add("battle-module-card")'));
assert.ok(!app.includes('bar.classList.add("battle-module-hp-bar")'));

console.log("beta55 profile and battle consistency contract passed");
