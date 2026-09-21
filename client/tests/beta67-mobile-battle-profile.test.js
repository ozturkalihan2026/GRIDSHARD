"use strict";

const assert = require("assert");
const fs = require("fs");
const {
  RelayBattleClient,
  MODULE_STATUS,
} = require("../src/relay-client.js");

const html = fs.readFileSync("./index.html", "utf8");
const app = fs.readFileSync("./src/app.js", "utf8");
const css = fs.readFileSync("./src/canon.css", "utf8");

assert.ok(!html.includes('id="mobile-battle-tabs"'));
assert.ok(!html.includes('id="mobile-placement-controls"'));
assert.ok(!html.includes('data-mobile-battle-panel="player"'));
assert.ok(!html.includes('id="mobile-return-module"'));
assert.ok(!html.includes('id="mobile-cancel-placement"'));
assert.ok(html.includes('class="duel-side duel-enemy-side"'));
assert.ok(html.includes('class="duel-side duel-player-side"'));
assert.ok(app.includes('target: "#module-shelf"'));
assert.ok(app.includes('card.addEventListener("click", () => deployDeckModule(module))'));
assert.ok(!app.includes("placeTapSelectionOnCell"));
assert.ok(!app.includes("tapSelectedModuleId"));
assert.ok(!app.includes("mobileBattleController"));

assert.ok(css.includes("Beta.67 — one portrait battle surface"));
assert.ok(!css.includes("data-mobile-battle-panel"));
assert.ok(css.includes("padding-bottom:calc(76px + env(safe-area-inset-bottom))"));
assert.ok(css.includes("bottom:calc(67px + max(5px,env(safe-area-inset-bottom)))"));

for (const navigation of html.matchAll(/<nav class="profile-terminal-tabs"[^>]*>([\s\S]*?)<\/nav>/gu)) {
  assert.strictEqual((navigation[1].match(/<button\b/gu) || []).length, 5);
}

const commands = [];
const client = new RelayBattleClient({
  unlockAtMs:0,
  circuitCredits:200,
  emitCommand:(command) => commands.push(command),
  modules:[
    {
      instanceId:"active-1",
      nameTr:"Lazer",
      hp:100,
      maxHp:100,
      status:MODULE_STATUS.ACTIVE,
      position:{x:1,y:1},
    },
    {
      instanceId:"reserve-1",
      nameTr:"Kalkan",
      hp:100,
      maxHp:100,
      status:MODULE_STATUS.RESERVE,
      position:null,
    },
  ],
});

assert.strictEqual(client.beginDrag("active-1").ok, false);
assert.strictEqual(commands.length, 0);
assert.strictEqual(client.beginDrag("reserve-1").ok, false);
assert.strictEqual(client.dropOnCell(1, 1, "active-1").ok, false);
assert.strictEqual(commands.length, 0);
assert.strictEqual(client.deployDefinition("shield", 2).ok, true);
assert.deepStrictEqual(commands[0], {
  kind:"deploy_module",
  payload:{definition_id:"shield"},
});

console.log("beta67 mobile battle and profile terminal contract passed");
