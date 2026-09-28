"use strict";

const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("./index.html", "utf8");
const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");
const relay = fs.readFileSync("./src/relay-client.js", "utf8");

assert.ok(html.includes('data-screen-panel="friends"'));
assert.ok(html.includes('id="friend-search-form"'));
assert.ok(html.includes('id="public-profile-friend-action"'));
assert.ok(app.includes('`/players/search?player_id=${encodeURIComponent(participantPlayerId)}&q=${encodeURIComponent(query)}`'));
assert.ok(app.includes('match_type:"friend_battle"') || app.includes('opponent_type:"human"'));
assert.ok(relay.includes("connectSession("));

assert.ok(!html.includes("<h2>Turnuvalar</h2>"));
assert.ok(html.includes('id="daily-meta-card" class="events-hero daily-meta-card"'));
assert.ok(html.includes('id="weekly-tournament-register"'));
assert.ok(html.includes('id="team-tournament-register"'));
// Ödüller ayrı sayfada değil, sıralamada ilk üçün yanında sandık olarak görünür.
assert.ok(app.includes("function appendTournamentPrizeChest"));
assert.ok(app.includes("function renderTeamFixtures"));

assert.ok(app.includes("destroyedCore.hp = 0"));
assert.ok(app.includes("mockEnemyCoreHp = 0"));
assert.match(css, /#team-hub \.team-tabs \{[\s\S]*?position:fixed !important;/);
assert.match(css, /\.profile-terminal-tabs \{[\s\S]*?grid-template-columns:repeat\(5,minmax\(0,1fr\)\) !important;/);
assert.match(css, /\.reward-preview-panel \{/);

console.log("beta59 social and event contract passed");
