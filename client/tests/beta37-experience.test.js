"use strict";

const assert = require("assert");
const fs = require("fs");

const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/styles.css", "utf8");
const html = fs.readFileSync("./index.html", "utf8");
const i18n = fs.readFileSync("./src/i18n.js", "utf8");

assert.ok(!html.includes('id="tutorial-replay"'));
assert.ok(!html.includes('id="battle-pool-title"'));
assert.ok(!html.includes('id="matchmaking-cancel"'));
assert.ok(html.includes('class="initial-circuit-kicker"'));
assert.ok(html.indexOf('id="battle-pool-preset-open"') > html.indexOf('class="initial-circuit-picker"'));
assert.ok(html.includes('class="selected-pool-heading"'));
assert.ok(!html.includes('id="capacity-indicator"'));
assert.ok(html.includes('data-shell-screen="shop"'));
assert.ok(html.includes('data-shell-screen="modules"'));
assert.ok(html.includes("dock-home-crack"));
// Eski lobi ızgarası kaldırıldı; Ev yalnız mobil savaş merkezini kullanır.
assert.ok(!html.includes("lobby-feature-grid"));
assert.ok(html.includes('id="home-battle-button"'));

assert.ok(app.includes("function isOnlineMatchmakingCancelable"));
assert.ok(app.includes('localizedUiText("İptal Et")'));
assert.ok(app.includes("function deployDeckModule"));
assert.ok(app.includes('"deploy_module"'));
assert.ok(app.includes("const limit = 15"));
assert.ok(app.includes("catalog?.effect_lines_en"));
assert.ok(css.includes("GRIDSHARD Beta.37"));
assert.ok(css.includes('#battle-pool-confirm[data-matchmaking="true"]'));
assert.ok(i18n.includes('"TAKIM":"TEAM"'));
assert.ok(app.includes("function resetBattleVisualSurface"));
assert.ok(app.includes("createBoard();"));
assert.ok(css.includes("Beta.37 hotfix v3"));
assert.ok(css.includes("Beta.37 hotfix v4"));
assert.ok(html.includes('id="ai-archetype-picker"'));
// Beta.72 tur 13: Sabotaj/Ekonomi Odaklı yerine Dengeli Kontrol ve Dengeli Ekonomi.
assert.ok(html.includes('data-ai-archetype="balanced_control"'));
assert.ok(html.includes('data-ai-archetype="balanced_economy"'));
assert.ok(!html.includes('data-ai-archetype="sabotage"'));
assert.ok(!html.includes('data-ai-archetype="economy"'));
assert.ok(app.includes("balanced_control:{"));
assert.ok(app.includes("balanced_economy:{"));
assert.ok(html.includes('lobby-dock-home'));
assert.ok(app.includes("ai_archetype"));

console.log("beta37 client experience test passed");
