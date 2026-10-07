const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const {NativeStoreBridge} = require("../src/native-store.js");
const native = plugin => ({getPlatform:()=>"android",Plugins:{AdMob:plugin}});
const providers = {ad_platforms:{admob:true},ad_units:{android:"fixture-unit"},ad_policy:{protocol:"child-safe-v1",mode:"live"}};

test("native rollout declaration is absent on web/missing plugin; policy is strict", async () => {
  const b=new NativeStoreBridge({capacitor:native({}),storage:null});
  assert.equal(b.adQuery(),"?ad_protocol=child-safe-v1&ad_platform=android");
  for (const ad_policy of [null,{protocol:"child-safe-v0",mode:"live"},{protocol:"child-safe-v1",mode:"unknown"}]) {
    assert.equal(b.adProvider({providers:{...providers,ad_policy}}),null);
    await assert.rejects(b.showRewardedAd({storeState:{providers:{...providers,ad_policy}}}),/henüz etkin/);
  }
  b.native=false; assert.equal(b.adQuery(),""); assert.deepEqual(b.adCapability(),{});
});

function fixture({settings,verified}={}) {
  const calls=[], listeners=new Map();
  const plugin={
    async requestConsentInfo() { calls.push("consent");return {status:"NOT_REQUIRED",canRequestAds:true}; },
    async initialize(o) { calls.push(["init",o]); },
    async prepareRewardVideoAd(o) { calls.push(["load",o]);return {adUnitId:o.adId}; },
    async addListener(e,fn) { listeners.set(e,fn);return {remove:async()=>listeners.delete(e)}; },
    async showRewardVideoAd() { calls.push("show");listeners.get("onRewardedVideoAdReward")({amount:1});listeners.get("onRewardedVideoAdDismissed")(); return {amount:1}; },
  };
  const safety={
    async getTestSettings() {calls.push("settings");return settings ?? {mode:"test",adUnitId:"fixture-unit",testingDevices:["A".repeat(32)]};},
    async verifyTestDevice(o) {calls.push(["verify",o]);return verified ?? {verified:true,mode:"test"};},
  };
  const capacitor=native(plugin);capacitor.Plugins.GridshardAdSafety=safety;
  const bridge=new NativeStoreBridge({capacitor,storage:null});
  return {bridge,plugin,safety,calls,options:{storeState:{providers:{...providers,ad_policy:{...providers.ad_policy,mode:"test"}}},userId:"fixture-user",battleId:"fixture-battle"}};
}

test("publisher test mode requires native test configuration and SDK verification before load", async () => {
  const f=fixture();await f.bridge.showRewardedAd(f.options);
  assert.deepEqual(f.calls.slice(0,2),["consent","settings"]);
  assert.deepEqual(f.calls[2],["init",{tagForChildDirectedTreatment:true,maxAdContentRating:"General",initializeForTesting:true,testingDevices:["A".repeat(32)]}]);
  assert.deepEqual(f.calls[3],["verify",{adId:"fixture-unit"}]);
  assert.equal(f.calls[4][1].isTesting,true);assert.equal(f.calls[4][1].npa,true);
  assert.equal(f.bridge.adsBusy,false);
});

test("unverified device cannot load; missing plugin/wrong native config cannot initialize", async () => {
  for (const options of [{verified:{verified:false,mode:"test"}},{settings:{mode:"ump-only",adUnitId:"fixture-unit",testingDevices:[]}},{settings:{mode:"test",adUnitId:"other",testingDevices:["A".repeat(32)]}}]) {
    const f=fixture(options);await assert.rejects(f.bridge.showRewardedAd(f.options));
    assert.equal(f.calls.some(c=>c[0]==="load"),false);assert.equal(f.bridge.adsBusy,false);
  }
  const f=fixture();delete f.bridge.capacitor.Plugins.GridshardAdSafety;
  await assert.rejects(f.bridge.showRewardedAd(f.options),/test paketi/);
  assert.deepEqual(f.calls,["consent"]);
});

test("server live policy cannot authorize a publisher unit on a debug or UMP-only build", async () => {
  for (const verifyLiveBuild of [null,async()=>({verified:false,mode:"ump-only"}),async()=>{throw new Error("debug denied");}]) {
    const f=fixture();f.options.storeState.providers.ad_policy.mode="live";
    f.safety.verifyLiveBuild=verifyLiveBuild;
    await assert.rejects(f.bridge.showRewardedAd(f.options));
    assert.deepEqual(f.calls,["consent"]);
    assert.equal(f.bridge.adsBusy,false);
  }
});

test("wrong loaded unit cannot be shown and test mode never requests a real bonus", async () => {
  const f=fixture();f.plugin.prepareRewardVideoAd=async()=>({adUnitId:"other"});
  await assert.rejects(f.bridge.showRewardedAd(f.options),/beklenen birim/);
  assert.equal(f.calls.includes("show"),false);
  const app=fs.readFileSync("src/app.js","utf8");
  assert.match(app,/if \(isPublisherTest\)[\s\S]*?return; \/\/ Test ads are not proof/);
  assert.ok(app.indexOf("// Test ads are not proof") < app.indexOf("const payload = await claimAdReward(battleId, provider)"));
});

test("post-match publisher test UI does not promise a real x2 reward", () => {
  const app=fs.readFileSync("src/app.js","utf8");
  const render=app.slice(app.indexOf("  function renderPostMatchAdReward()"),app.indexOf("  function playTestRewardAd("));
  for (const mode of ["test","live"]) {
    const elements=Object.fromEntries(["post-match-ad-reward","post-match-ad-button","post-match-ad-copy","post-match-ad-heading"].map(id=>[id,{dataset:{}}]));
    vm.runInNewContext(`${render}\nrenderPostMatchAdReward();`,{
      document:{getElementById:id=>elements[id]},
      progressionState:{viewModel:()=>({profileProgressionApplied:true,circuitCreditsAwarded:10})},
      postMatchSync:{lastBattleId:"fixture-battle"},adRewardReceipts:new Map(),adRewardPending:false,
      pendingAdRewardClaims:new Set(),adRewardClaimPending:false,
      storeState:{providers:{ad_policy:{mode}}},currentAdProvider:()=>"admob",localizedUiText:t=>t,
    });
    assert.equal(elements["post-match-ad-button"].disabled,false);
    if (mode === "test") {
      assert.match(elements["post-match-ad-heading"].textContent,/TESTİ/);
      assert.match(elements["post-match-ad-button"].textContent,/TEST REKLAMINI/);
      assert.match(elements["post-match-ad-copy"].textContent,/gerçek ek ödül verilmez/);
      assert.equal(Object.values(elements).some(e=>String(e.textContent).includes("x2")),false);
    } else assert.match(elements["post-match-ad-button"].textContent,/x2/);
  }
});
