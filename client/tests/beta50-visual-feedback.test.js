const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");
const html = fs.readFileSync("./index.html", "utf8");

assert.ok(app.includes("function renderTrophyValue"));
assert.ok(app.includes('renderTrophyValue("team-total-trophies"'));
assert.ok(!app.includes('renderTrophyValue("profile-current-trophies"'));
assert.match(app, /activeLeaderboardTab === "core_damage"[\s\S]{0,260}renderTrophyValue\(score/);
assert.ok(html.includes('class="trophy-value-icon" aria-hidden="true">🏆</span>'));
assert.ok(!html.includes('id="team-total-trophies">0 KUPA'));
assert.ok(!html.includes('id="profile-current-trophies"'));

assert.ok(app.includes('event?.type === "core_power_activated"'));
assert.ok(app.includes("presentCorePowerActivation(snapshot, data)"));
assert.ok(app.includes("window.setTimeout(feedback, 170)"));
assert.ok(app.includes('sourceModule?.category === "sabotaj" ? "sabotage" : "damage"'));
assert.ok(css.includes('font-size:.68rem !important'));
assert.ok(css.includes('background:transparent !important'));
assert.ok(css.includes('.battle-floating-feedback.defense { color:#73b9ff'));

assert.ok(app.includes("POST_MATCH_CORE_EXPLOSION_HOLD_MS = 2500"));
assert.ok(app.includes("!postMatchRevealReady"));
assert.ok(app.includes("core ? 2450 : 980"));
assert.ok(css.includes("animation-duration:2.25s !important"));

console.log("beta50 visual feedback contract passed");
