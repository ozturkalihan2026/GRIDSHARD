const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {androidDisplayActivity} = require("../../tools/configure-native-display.js");
const root = path.resolve(__dirname, "../..");

test("native display hook is idempotent and preserves activity code/identity", () => {
  const source = "package com.gridshard.remotedebug;\nimport com.getcapacitor.BridgeActivity;\npublic class MainActivity extends BridgeActivity { /* existing code */ }\n";
  const after = androidDisplayActivity(source);
  assert.match(after, /package com.gridshard.remotedebug;/);
  assert.match(after, /extends GridshardActivity/);
  assert.match(after, /existing code/);
  assert.equal(androidDisplayActivity(after), after);
  assert.throws(() => androidDisplayActivity("class MainActivity {}"), /tek Capacitor/);
  assert.throws(() => androidDisplayActivity(source + source), /tek Capacitor/);
});

test("camera reservation stays stable; bottom is edge-to-edge except for the keyboard", () => {
  const source = fs.readFileSync(path.join(root, "tools/native-templates/GridshardActivity.java"), "utf8");
  const config = require(path.join(root, "capacitor.config.js"));
  assert.equal(config.plugins.SystemBars.insetsHandling, "disable");
  assert.equal(config.plugins.SystemBars.style, "DARK");
  assert.match(source, /getInsetsIgnoringVisibility\(safeTypes\)/);
  const safeTypes = source.match(/int safeTypes = ([\s\S]*?);/)[1];
  assert.match(safeTypes, /Type\.statusBars\(\)/);
  assert.match(safeTypes, /Type\.displayCutout\(\)/);
  assert.doesNotMatch(safeTypes, /Type\.(?:systemBars|navigationBars)\(\)/);
  assert.match(source, /view\.setPadding\(safe\.left, safe\.top, safe\.right,\s*keyboardVisible \? keyboard\.bottom : 0\)/);
  assert.doesNotMatch(source, /safe\.bottom/);
  // No downstream parent padding or CSS env() may add navigation space back.
  assert.match(source, /int consumedTypes = WindowInsetsCompat\.Type\.systemBars\(\) \| WindowInsetsCompat\.Type\.displayCutout\(\)/);
  assert.match(source, /setInsets\(consumedTypes \| WindowInsetsCompat\.Type\.ime\(\), Insets\.NONE\)/);
  assert.match(source, /setInsetsIgnoringVisibility\(consumedTypes, Insets\.NONE\)/);
  assert.match(source, /if \(keyboardVisible \|\| getBridge\(\) == null\) return/);
  assert.match(source, /BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE/);
  assert.match(source, /setNavigationBarContrastEnforced\(false\)/);
  assert.match(source, /setNavigationBarColor\(Color\.TRANSPARENT\)/);
  assert.match(source, /MotionEvent\.ACTION_UP\) restoreGameFullscreen\(\)/);
  assert.match(source, /boolean handled = super\.dispatchTouchEvent\(event\)/);
  assert.match(source, /return handled/);
  assert.match(source, /setDisplayCutout\(null\)/);
  // Sistem yazı boyutu sabit ölçülü oyun arayüzünü taşırmamalı.
  assert.match(source, /getWebView\(\)\.getSettings\(\)\.setTextZoom\(100\)/);
  const android = path.join(root, "android/app/src/main/java/com/gridshard/nativeui/GridshardActivity.java");
  if (fs.existsSync(android)) assert.equal(fs.readFileSync(android, "utf8"), source);
});

test("all settings checkboxes use the same horizontal toggle layout", () => {
  const html = fs.readFileSync(path.join(root, "client/index.html"), "utf8");
  for (const id of ["settings-vibration", "settings-sound-muted", "settings-music-muted", "settings-battle-perspective"]) {
    assert.ok(new RegExp(`<label class="settings-toggle"><input id="${id}"`).test(html), id);
  }
});

test("unconfigured ads explain availability without starting a fake reward", () => {
  const source = fs.readFileSync(path.join(root, "client/src/app.js"), "utf8");
  const render = source.slice(source.indexOf("  function renderPostMatchAdReward()"), source.indexOf("  function playTestRewardAd("));
  const nodes = Object.fromEntries(["post-match-ad-reward", "post-match-ad-button", "post-match-ad-copy"].map(id => [id, {dataset:{}}]));
  let provider = null;
  const context = {document:{getElementById:id => nodes[id]},
    progressionState:{viewModel:() => ({profileProgressionApplied:true, circuitCreditsAwarded:35})},
    postMatchSync:{lastBattleId:"own-finished-battle"}, currentAdProvider:() => provider,
    storeState:{providers:{ad_policy:{mode:"live"}}},
    adRewardReceipts:new Map(), adRewardPending:false};
  vm.runInNewContext(render + "renderPostMatchAdReward();", context);
  assert.equal(nodes["post-match-ad-reward"].hidden, false);
  assert.equal(nodes["post-match-ad-button"].disabled, true);
  assert.match(nodes["post-match-ad-copy"].textContent, /henüz etkin değil/);
  provider = "admob";
  vm.runInNewContext("renderPostMatchAdReward();", context);
  assert.equal(nodes["post-match-ad-button"].disabled, false);
  assert.match(nodes["post-match-ad-button"].textContent, /REKLAM İZLE/);
  context.postMatchSync.lastBattleId = null;
  vm.runInNewContext("renderPostMatchAdReward();", context);
  assert.equal(nodes["post-match-ad-reward"].hidden, true);
});
