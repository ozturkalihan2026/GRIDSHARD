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
assert.ok(html.includes('id="capacity-indicator" role="status"'));
assert.ok(!html.includes('capacity-indicator battle-capacity-hidden'));
assert.ok(html.includes("lobby-dock-trophy"));
assert.ok(html.includes("dock-home-crack"));
assert.ok(html.includes("lobby-feature-icon-daily"));
assert.ok(html.includes("lobby-feature-icon-reward"));

assert.ok(app.includes("function isOnlineMatchmakingCancelable"));
assert.ok(app.includes('localizedUiText("İptal Et")'));
assert.ok(app.includes("Yeni modül hakkı · ${nextSlotSeconds} sn"));
assert.ok(app.includes("Yerleştirme hakkı hazır · ${available}"));
assert.ok(app.includes("catalog?.effect_lines_en"));
assert.ok(app.includes("booster.nameEn"));
assert.ok(css.includes("GRIDSHARD Beta.37"));
assert.ok(css.includes('#battle-pool-confirm[data-matchmaking="true"]'));
assert.ok(i18n.includes('"TAKIM":"TEAM"'));
assert.ok(i18n.includes('"Aşırı Yük Çipi":"Overcharge Chip"'));
assert.ok(app.includes("function resetBattleVisualSurface"));
assert.ok(app.includes("client.cancelDrag?.()"));
assert.ok(app.includes("createBoard();"));
assert.ok(app.includes("function renderLaboratoryModulePreview"));
assert.ok(html.includes('id="laboratory-detail-icon" class="laboratory-detail-icon"'));
assert.ok(css.includes("Beta.37 hotfix v3"));
assert.ok(css.includes("Beta.37 hotfix v4"));
assert.ok(html.includes('id="ai-archetype-picker"'));
assert.ok(html.includes('lobby-dock-home'));
assert.ok(app.includes("ai_archetype"));

console.log("beta37 client experience test passed");
