"use strict";

const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("./index.html", "utf8");
const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");

assert.ok(html.includes('id="leaderboard-current-group"'));
assert.ok(!html.includes('id="leaderboard-arena-filter"'));
assert.ok(app.includes('/leaderboards?player_id=${encodeURIComponent(participantPlayerId)}'));
assert.ok(app.includes("viewer_trophy_group"));
assert.ok(css.includes("grid-template-rows:auto auto auto minmax(0,1fr) auto"));

assert.ok(css.includes("--wheel-label-radius:82px"));
assert.ok(css.includes("--wheel-label-radius:58px"));
assert.ok(css.includes("translateY(-50%)"));

assert.ok(app.includes("const poweredPositions = modules"));
assert.ok(app.includes("poweredPositions.filter((position) => position.x === column)"));
assert.ok(app.includes("while (cursor.y !== target.y)"));

assert.ok(html.includes('data-team-panel="management"'));
assert.ok(!html.includes('id="team-management-dialog"'));
assert.ok(app.includes('isSelf ? "TAKIMDAN AYRIL" : "TAKIMDAN ÇIKAR"'));
assert.ok(app.includes('/leave`'));
assert.ok(html.includes('id="battle-emoji-button"'));
assert.ok(app.includes('kind:"send_battle_emoji"'));
assert.ok(app.includes('event?.type === "battle_emoji"'));
assert.ok(html.includes('id="account-data-export"'));
assert.ok(html.includes('id="account-data-delete"'));
assert.ok(html.includes('id="account-recovery-confirm"'));
assert.ok(html.includes('id="account-push-enable"'));
assert.ok(html.includes('id="direct-message-form"'));
assert.ok(html.includes('id="friend-invite-create"'));
assert.ok(app.includes("function parseGridshardDeepLink"));
assert.ok(app.includes("gridshard:deep-link"));
assert.ok(app.includes("invite-codes/accept"));
assert.ok(app.includes('"appUrlOpen"'));
assert.ok(app.includes('PushNotifications'));
assert.ok(app.includes("function createLeaderboardRewardPopover"));
assert.ok(!app.includes('preview.className = "leaderboard-reward-preview"'));
assert.ok(!html.includes('id="daily-meta-effect"'));
assert.ok(!html.includes('id="event-period-copy"'));

console.log("beta62 regression contract passed");
