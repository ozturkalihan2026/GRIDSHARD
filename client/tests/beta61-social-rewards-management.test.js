"use strict";

const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("./index.html", "utf8");
const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");

assert.ok(html.includes('id="reward-inbox-button"'));
assert.ok(html.includes('id="reward-inbox-dialog"'));
assert.ok(html.includes('data-leaderboard-scope="general"'));
assert.ok(html.includes('data-leaderboard-scope="group"'));
assert.ok(html.includes('id="leaderboard-current-group"'));
assert.ok(!html.includes('id="leaderboard-arena-filter"'));
assert.ok(html.includes('id="module-detail-prev"'));
assert.ok(html.includes('id="module-detail-next"'));
assert.ok(html.includes('id="core-detail-prev"'));
assert.ok(html.includes('id="core-detail-next"'));
assert.ok(html.includes('data-team-panel="management"'));
assert.ok(!html.includes('id="team-management-dialog"'));
assert.ok(html.includes('id="battle-emoji-choice-list"'));
assert.ok(html.includes('id="profile-background-choice-list"'));

const pointerIndex = html.indexOf('class="daily-meta-wheel-pointer"');
const wheelIndex = html.indexOf('id="daily-meta-wheel"');
assert.ok(pointerIndex >= 0 && pointerIndex < wheelIndex, "fixed pointer must be outside the rotating wheel");
assert.ok(css.includes(".daily-meta-wheel-pointer"));
assert.ok(!css.includes(".daily-meta-wheel::before"));

assert.ok(app.includes("const poweredPositions = modules"));
assert.ok(app.includes("new Set(poweredPositions.map((position) => position.x))"));
assert.ok(app.includes("while (cursor.y !== target.y)"));

assert.ok(app.includes('challenge.status === "accepted" && challenge.battle_session_id'));
assert.ok(app.includes('invite.status === "accepted" && invite.battle_session_id'));
assert.ok(app.includes("activeTrophyLeaderboardScope"));
assert.ok(app.includes("viewer_trophy_group"));
assert.ok(app.includes("top_ten_rewards"));
assert.ok(app.includes("loadRewardInbox"));
assert.ok(app.includes("renderTeamManagement"));
assert.ok(app.includes('? "BAŞVURU BEKLİYOR" : "BAŞVUR"'));

console.log("beta61 social rewards and management contract passed");
