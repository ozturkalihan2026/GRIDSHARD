"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "src/app.js"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "src/canon.css"), "utf8");
const context = {};
vm.runInNewContext(`${app.slice(app.indexOf("function shopChestAction"), app.indexOf("function renderShop"))}; this.decide = shopChestAction;`, context);
const state = { circuit_credits:99999, flux_shards:99999 };
const item = { currency:"flux_shards", cost:500, daily_limit:2, remaining_today:2 };
const decide = (overrides = {}) => context.decide({ gift:null, ownedCount:0, openableCount:0, item, state, ...overrides });

test("one chest button prioritizes gift, inventory count, then price", () => {
  let action = decide({ gift:{ claim_available:true, claim_remaining_seconds:0 }, ownedCount:3, openableCount:3 });
  assert.equal(action.kind, "gift");
  assert.equal(action.label, "HEDİYE SANDIK AÇ");
  action = decide({ gift:{ claim_available:false, claim_remaining_seconds:120 }, ownedCount:3, openableCount:3 });
  assert.equal(action.kind, "open-all");
  assert.equal(action.label, "SANDIK AÇ (3)");
  action = decide({ gift:{ claim_available:false, claim_remaining_seconds:120 } });
  assert.equal(action.kind, "buy");
  assert.equal(action.label, "500 Akı");
  assert.equal(decide({ item:{ currency:"circuit_credits", cost:1000 } }).label, "1000 DK");
  const render = app.slice(app.indexOf("function renderShop"), app.indexOf("function giftChestActionLabel"));
  assert.equal((render.match(/document.createElement\("button"\)/g) || []).length, 1);
  assert.equal((render.match(/actions.appendChild\(/g) || []).length, 1);
  assert.ok(!render.includes('odds.className = "chest-store-odds"'));
  assert.ok(render.includes("oddsTab.onclick = openChestOdds"));
  assert.match(css, /\.chest-store-card \{[^}]*grid-template-rows:auto 2\.4em minmax\(2\.7em,auto\) auto;/);
});

test("purchase limits and low balance never disable a ready gift or stock", () => {
  const exhausted = { ...item, remaining_today:0 };
  const empty = { ...state, flux_shards:0 };
  assert.equal(decide({ item:exhausted, state:empty }).disabled, true);
  assert.equal(decide({ item:exhausted }).label, "SINIR DOLDU");
  assert.equal(decide({ state:empty }).disabled, true);
  assert.equal(decide({ item:exhausted, state:empty, ownedCount:2, openableCount:2 }).disabled, false);
  assert.equal(decide({ item:exhausted, state:empty, gift:{ claim_available:true } }).disabled, false);
  assert.equal(decide({ ownedCount:2, openableCount:0 }).disabled, true);
  assert.equal(decide({ state:{ ...state, unavailable:true }, gift:{ claim_available:true } }).disabled, true);
});

test("mailbox has four tabs, system owns notifications and collected chests disappear", () => {
  const dialog = html.slice(html.indexOf('<dialog id="reward-inbox-dialog"'), html.indexOf('</dialog>', html.indexOf('<dialog id="reward-inbox-dialog"')));
  for (const tab of ["battle", "purchase", "reward", "system"]) {
    assert.ok(dialog.includes(`data-inbox-tab="${tab}"`));
    assert.ok(dialog.includes(`aria-controls="inbox-panel-${tab}"`));
    assert.ok(dialog.includes(`id="inbox-panel-${tab}" role="tabpanel"`));
  }
  assert.ok(dialog.indexOf('id="reward-inbox-notices"') > dialog.indexOf('id="inbox-panel-reward"'));
  assert.ok(app.includes('claim.textContent = message.status === "claimed" ? "ALINDI" : "TOPLA"'));
  assert.ok(app.includes('request_id:`inbox:${message.message_id}`'));
  assert.ok(app.includes('filter((item) => item.status === "unclaimed")'));
  assert.ok(app.includes('activeInboxTab === "purchase" ? rewardInboxState?.purchases || [] : []'));
});

test("repair has one current physical painting, no gameplay balance change and a short title", () => {
  const icons = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, "src/module-device-art.js"), "utf8"), icons);
  vm.runInNewContext(fs.readFileSync(path.join(root, "src/battle/module-card-view.js"), "utf8"), icons);
  const card = icons.GridshardModuleCardView;
  for (const module of [{ nameTr:"Onarım" }, { nameTr:"Onarım Modülü" }, { definition_id:"repair" }, { definitionId:"repair" }]) {
    assert.match(card.emblemFor(module),/modules-physical-v1\/repair.webp/);
  }
  assert.notEqual(card.emblemFor({ nameTr:"Güçlendirici" }),card.emblemFor({ nameTr:"Onarım" }));
  assert.equal(card.shortNameFor({ nameTr:"Onarım" }), "Onarım");
  const canon = fs.readFileSync(path.join(root, "src/canon-data.js"), "utf8");
  assert.match(canon, /"id": "repair",\s*"name_tr": "Onarım"/);
  assert.ok(!app.includes("GridshardModuleCardView.iconFor"));
});

test("season stock protocol is explicit and confirmed tier rewards get a reveal", () => {
  const source = fs.readFileSync(path.join(root, "src/relay-client.js"), "utf8");
  assert.ok(source.includes('["tiers", "premium-tiers"].includes(kind) ? "?chest_delivery=stock-v1" : ""'));
  const start = app.indexOf("async function claimEngagementReward");
  assert.ok(start > 0);
  const handler = app.slice(start, app.indexOf("\n  function ", start));
  assert.ok(handler.includes("if (isSeasonTrack) showChestOpening("));
  assert.ok(handler.includes('item?.delivery === "inventory"'));
});

test("new labels translate in both directions", () => {
  require("../src/i18n-catalog.js");
  const i18n = require("../src/i18n.js");
  for (const [turkish, english] of [["TOPLA", "COLLECT"], ["SANDIK AÇ (7)", "OPEN CHEST (7)"], ["Satın Alım", "Purchases"], ["Onarım", "Repair"]]) {
    assert.equal(i18n.translateText(turkish, "en"), english);
    assert.equal(i18n.translateText(english, "tr"), turkish);
  }
});
