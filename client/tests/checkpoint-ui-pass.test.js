"use strict";

const assert = require("assert");
const fs = require("fs");

const html = fs.readFileSync("./index.html", "utf8");
const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");

const seasonPanel = html.match(
  /<section id="season-reward-panel"[\s\S]*?<\/section>\s*<nav class="profile-terminal-tabs"/
)?.[0] || "";

assert.ok(seasonPanel.includes('id="season-reward-track"'));
assert.ok(seasonPanel.includes('class="reward-back-link"'));
assert.ok(
  seasonPanel.indexOf('id="season-reward-track"')
    < seasonPanel.indexOf('class="reward-back-link"')
);
assert.match(
  css,
  /\.season-reward-panel > \.reward-back-link[\s\S]*margin:14px auto 5px/
);
assert.match(
  css,
  /#module-detail-dialog \.module-detail-art[\s\S]*align-items:end !important[\s\S]*padding:42px 0 8px !important/
);
assert.ok(app.includes("const CORE_VISUALS = Object.freeze"));
assert.match(
  app,
  /core_overdrive: Object\.freeze\(\{ nameTr:"Aşırı Yük Çekirdeği", glyph:"ϟ", accent:"#ff6e82" \}\)/
);
assert.ok(app.includes("function applyCoreVisualIdentity"));
assert.ok(app.includes("applyCoreVisualIdentity(button, coreId)"));
assert.ok(app.includes("applyCoreVisualIdentity(tile, core.id)"));
assert.ok(app.includes("applyCoreVisualIdentity(dialog, core.id)"));
assert.ok(app.includes("applyCoreVisualIdentity(corePowerButtonEl, selectedCore)"));
assert.ok(app.includes('applyCoreVisualIdentity(coreHost, core?.id || "core_resonance")'));
assert.ok(app.includes("function createRewardRows"));
assert.ok(app.includes("function moduleRewardIdentity"));
assert.ok(app.includes("function coreRewardIdentity"));
assert.ok(app.includes("host.appendChild(createRewardRows(rewards))"));
assert.ok(app.includes("const prize = createRewardRows(reward, { compact:true })"));
assert.ok(app.includes("prize.append(rewardLabel, createRewardRows(reward, { compact:true }))"));
assert.match(css, /\.reward-resource-row[\s\S]*grid-template-columns:auto minmax\(0,1fr\) auto/);
assert.match(css, /\.resource-symbol-core-card[\s\S]*var\(--core-accent,#56f1df\)/);
assert.match(css, /\.core-detail-art \{ color:var\(--core-accent,#56f1df\) !important; \}/);
assert.ok(app.includes("function markScreenNotificationsSeen"));
assert.ok(app.includes('"daily-rewards": "daily"'));
assert.ok(app.includes('rewards: "season"'));
assert.ok(app.includes("has-persistent-notification"));
assert.ok(app.includes('action.textContent = ownedCount > 0'));
assert.ok(app.includes('"HEPSİNİ AÇ"'));
assert.ok(app.includes("function openAllAvailableChests"));
assert.ok(app.includes("function showBulkChestReveal"));
assert.match(css, /\[data-open-screen\]\.has-persistent-notification::after/);
assert.match(css, /\.bulk-chest-reward/);
assert.ok(app.includes("function createModuleEffectList"));
assert.ok(app.includes("createModuleEffectList(item.effect_lines)"));
assert.match(css, /\.module-effect-panel/);
assert.ok(html.includes('id="team-onboarding"'));
assert.ok(html.includes('data-team-tab="overview"'));
assert.ok(html.includes('data-team-tab="members"'));
assert.ok(html.includes('data-team-tab="requests"'));
assert.ok(html.includes('data-team-tab="chat"'));
assert.ok(html.includes('data-team-tab="battle"'));
assert.ok(app.includes("function loadTeamView"));
assert.ok(app.includes("function renderTeamHub"));
assert.ok(app.includes("/module-requests"));
assert.ok(app.includes("/training-challenges"));
assert.ok(html.includes("Antrenman protokolü derecesizdir"));
assert.match(css, /\.team-member-row/);
assert.match(css, /\.team-message-list/);

console.log("checkpoint UI pass contract passed");
