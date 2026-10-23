"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { RelayProfileClientState, RelaySettingsClientState } = require("../src/relay-client.js");

test("primitive state reads track replacements without copying profile collections", () => {
  const profile = new RelayProfileClientState();
  const settings = new RelaySettingsClientState();
  assert.equal(profile.displayName, undefined);
  assert.equal(settings.analyticsConsent, false);
  profile.applyProfile({ player_id:"p1", display_name:"İlk" });
  Object.defineProperty(profile.profile, "cosmetics", { get() { throw new Error("unnecessary clone"); } });
  assert.equal(profile.displayName, "İlk");
  settings.applySettings({ player_id:"p1", analytics_consent:true });
  assert.equal(settings.analyticsConsent, true);
  settings.patch({ analytics_consent:false });
  assert.equal(settings.analyticsConsent, false);
  settings.patch({ analytics_consent:"true" });
  assert.equal(settings.analyticsConsent, false, "do not broaden consent truthiness");
  profile.applyProfile({ player_id:"p1", display_name:"Yeni" });
  assert.equal(profile.displayName, profile.viewModel().displayName);
});

test("repeated battle identity renders never construct a profile view model", () => {
  const source = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");
  const start = source.indexOf("  let renderedBattleIdentitySignature = null;");
  const end = source.indexOf("  function renderRemoteDataStatus", start);
  assert.ok(start >= 0 && end > start);
  const profile = new RelayProfileClientState();
  profile.viewModel = () => { throw new Error("HUD copied profile"); };
  let writes = 0, displayed;
  const name = { set textContent(value) { writes++; displayed = value; } };
  const context = vm.createContext({
    profileState:profile, playerBattleNameEl:name, enemyBattleNameEl:null, enemyDeckPreviewEl:null,
    opponentBattleDisplayName:() => "Rakip", isPublicProfileTarget:() => false,
    enemyBattlePlayerId:"enemy", matchmakingState:{ opponentType:"ai" },
    enemyBattlePoolDefinitionIds:[], STARTER_BATTLE_POOL_PRESET:{module_definition_ids:[]},
    moduleDefinitions:[], document:{documentElement:{lang:"tr"}},
  });
  vm.runInContext(source.slice(start, end), context);
  context.renderBattleIdentityPanels();
  assert.equal(displayed, "Oyuncu");
  profile.applyProfile({player_id:"p1", display_name:"Oyuncu Adı"});
  for (let tick = 0; tick < 10_000; tick++) context.renderBattleIdentityPanels();
  assert.equal(displayed, "Oyuncu Adı");
  assert.equal(writes, 2, "cached identity should touch DOM only when changed");
  profile.applyProfile({player_id:"p1", display_name:"Yeni Ad"});
  context.renderBattleIdentityPanels();
  assert.equal(displayed, "Yeni Ad");
  assert.equal(writes, 3);
});
