const {test} = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {NativeStoreBridge} = require("../src/native-store.js");

const state = {providers:{ad_platforms:{admob:true}, ad_units:{android:"fixture-rewarded"}, ad_policy:{protocol:"child-safe-v1",mode:"live"}}};
const options = {storeState:state, userId:"fixture-player", battleId:"fixture-battle"};
const ready = {status:"NOT_REQUIRED", canRequestAds:true, privacyOptionsRequirementStatus:"NOT_REQUIRED"};
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture() {
  const calls = [], listeners = new Map();
  const consentOptions = [], initializeOptions = [];
  let showResolve, showReject;
  const plugin = {
    async requestConsentInfo(o) { consentOptions.push(o); calls.push("consent"); return {...ready}; },
    async showConsentForm() { calls.push("form"); return {...ready, status:"OBTAINED"}; },
    async showPrivacyOptionsForm() { calls.push("privacy"); },
    async initialize(o) { initializeOptions.push(o); calls.push("initialize"); },
    async prepareRewardVideoAd(o) { calls.push(["prepare",o]); return {adUnitId:o.adId}; },
    async addListener(event, callback) {
      listeners.set(event, callback);
      return {async remove() { listeners.delete(event); }};
    },
    showRewardVideoAd(o) {
      calls.push(["show",o]);
      return new Promise((resolve,reject) => { showResolve=resolve; showReject=reject; });
    },
  };
  const bridge = new NativeStoreBridge({capacitor:{getPlatform:() => "android", Plugins:{AdMob:plugin,
    GridshardAdSafety:{verifyLiveBuild:async()=>({verified:true,mode:"live"})}}}, storage:null});
  return {bridge, plugin, calls, listeners, consentOptions, initializeOptions,
    emit:(event,value) => listeners.get(event)?.(value),
    reward:reward => showResolve(reward), fail:error => showReject(error)};
}

test("disabled server/web never initializes UMP or ads", async () => {
  const f=fixture();
  assert.equal(await f.bridge.refreshAdsConsent({storeState:{providers:{}}}), null);
  await assert.rejects(f.bridge.showRewardedAd({...options,storeState:{providers:{}}}), /henüz etkin değil/);
  f.bridge.native=false;
  assert.equal(await f.bridge.refreshAdsConsent({storeState:state}), null);
  assert.deepEqual(f.calls, []);
});

test("startup UMP info is coalesced in RAM, never initializes advertising SDK", async () => {
  const f=fixture();
  await Promise.all([f.bridge.refreshAdsConsent(options),f.bridge.refreshAdsConsent(options)]);
  await f.bridge.refreshAdsConsent(options);
  assert.deepEqual(f.calls,["consent"]);
  const fresh=fixture();
  await fresh.bridge.refreshAdsConsent(options);
  assert.deepEqual(fresh.calls,["consent"]); // New launch checks the SDK again.
});

test("UMP eligibility precedes SDK/load; reward waits for dismissal", async () => {
  const f=fixture();
  let settled=false;
  const pending=f.bridge.showRewardedAd(options).then(value => { settled=true; return value; });
  await tick();
  assert.deepEqual(f.calls.slice(0,2),["consent","initialize"]);
  assert.deepEqual(f.calls[2][1],{adId:"fixture-rewarded",immersiveMode:true,npa:true,ssv:{userId:"fixture-player",customData:"fixture-battle"}});
  assert.deepEqual(f.calls[3], ["show",{adId:"fixture-rewarded"}]);
  const reward={type:"fixture",amount:1};
  f.emit("onRewardedVideoAdReward",reward); f.reward(reward);
  await tick();
  assert.equal(settled,false);
  f.emit("onRewardedVideoAdDismissed");
  assert.deepEqual(await pending,reward);
  assert.equal(f.bridge.adsBusy,false);
  assert.equal(f.listeners.size,0);
});

test("denied/unknown/missing canRequestAds fail closed without initialize/load", async () => {
  for (const info of [{status:"OBTAINED",canRequestAds:false},{status:"UNKNOWN"},{canRequestAds:"true"}]) {
    const f=fixture(); f.plugin.requestConsentInfo=async () => info;
    await assert.rejects(f.bridge.showRewardedAd(options), /gizlilik onayı/);
    assert.deepEqual(f.calls,[]);
    assert.equal(f.bridge.adsBusy,false);
  }
});

test("consent/network failure does not authorize advertising and can retry", async () => {
  const f=fixture();
  f.plugin.requestConsentInfo=async () => { throw new Error("fixture offline"); };
  await assert.rejects(f.bridge.showRewardedAd(options), /offline/);
  assert.equal(f.bridge.adsConsent,null); assert.equal(f.bridge.adsBusy,false);
  f.plugin.requestConsentInfo=async () => ({...ready,status:"REQUIRED",canRequestAds:false});
  await assert.rejects(f.bridge.showRewardedAd(options), /gizlilik onayı/);
  assert.deepEqual(f.calls,[]);
});

test("unknown-age users receive independent UMP and child-directed G-rated nonpersonal ad flags", async () => {
  for (const platform of ["android", "ios"]) {
    const f=fixture(); f.bridge.platform=platform;
    const storeState={providers:{...state.providers,ad_units:{[platform]:"fixture-rewarded"}}};
    const pending=assert.rejects(f.bridge.showRewardedAd({...options,storeState}), /tamamlanmadan kapatıldı/);
    await tick();
    assert.deepEqual(f.consentOptions,[{tagForUnderAgeOfConsent:true}]);
    assert.deepEqual(f.initializeOptions,[{tagForChildDirectedTreatment:true,maxAdContentRating:"General"}]);
    assert.equal(f.calls.find(call => Array.isArray(call) && call[0] === "prepare")[1].npa,true);
    assert.equal(f.calls.includes("form"),false);
    f.emit("onRewardedVideoAdDismissed"); await pending;
  }
});

test("unexpected REQUIRED UMP result never solicits consent from child/unknown users", async () => {
  for (const canRequestAds of [true,false]) {
    const f=fixture();
    f.plugin.requestConsentInfo=async () => ({...ready,status:"REQUIRED",canRequestAds});
    await assert.rejects(f.bridge.showRewardedAd(options), /gizlilik onayı/);
    assert.deepEqual(f.calls,[]);
    assert.equal(f.bridge.adsBusy,false);
  }
});

test("refresh and retry keep child safeguards; server preferences cannot relax them", async () => {
  const f=fixture();
  const storeState={...state,age:"adult",adPolicy:{npa:false,tagForChildDirectedTreatment:false}};
  await f.bridge.refreshAdsConsent({storeState});
  await f.bridge.refreshAdsConsent({storeState,force:true});
  assert.deepEqual(f.consentOptions,[{tagForUnderAgeOfConsent:true},{tagForUnderAgeOfConsent:true}]);
  const initialize=f.plugin.initialize;
  f.plugin.initialize=async o => { o.tagForChildDirectedTreatment=false; throw new Error("fixture retry"); };
  await assert.rejects(f.bridge.showRewardedAd({...options,storeState}), /retry/);
  f.plugin.initialize=initialize;
  const pending=assert.rejects(f.bridge.showRewardedAd({...options,storeState}));
  await tick();
  assert.deepEqual(f.initializeOptions,[{tagForChildDirectedTreatment:true,maxAdContentRating:"General"}]);
  f.emit("onRewardedVideoAdDismissed"); await pending;
});

test("early dismissal releases pending action/listeners without reward; retry works", async () => {
  const f=fixture();
  const first=assert.rejects(f.bridge.showRewardedAd(options), /tamamlanmadan kapatıldı/);
  await tick(); f.emit("onRewardedVideoAdDismissed"); await first;
  assert.equal(f.bridge.adsBusy,false); assert.equal(f.listeners.size,0);
  const second=f.bridge.showRewardedAd(options);
  await tick();
  const reward={amount:1}; f.reward(reward); await tick(); f.emit("onRewardedVideoAdDismissed");
  assert.deepEqual(await second,reward);
  assert.equal(f.calls.filter(x => x==="initialize").length,1);
});

test("show event failure and rejected native show each clean up busy/listeners", async () => {
  for (const rejectPromise of [false,true]) {
    const f=fixture(); const pending=assert.rejects(f.bridge.showRewardedAd(options));
    await tick();
    if (rejectPromise) f.fail(new Error("fixture show error"));
    else f.emit("onRewardedVideoAdFailedToShow");
    await pending;
    assert.equal(f.bridge.adsBusy,false); assert.equal(f.listeners.size,0);
  }
});

test("duplicate show/privacy cannot overlap a reward operation", async () => {
  const f=fixture(); const pending=assert.rejects(f.bridge.showRewardedAd(options));
  await tick();
  await assert.rejects(f.bridge.showRewardedAd(options), /zaten devam/);
  await assert.rejects(f.bridge.showAdsPrivacyOptions(options), /zaten devam/);
  f.emit("onRewardedVideoAdDismissed"); await pending;
});

test("initialize/load failures release the action; initialize failure can retry", async () => {
  for (const stage of ["initialize", "prepareRewardVideoAd"]) {
    const f=fixture(); const original=f.plugin[stage];
    f.plugin[stage]=async () => { throw new Error(`fixture ${stage} failure`); };
    await assert.rejects(f.bridge.showRewardedAd(options), /failure/);
    assert.equal(f.bridge.adsBusy,false); assert.equal(f.listeners.size,0);
    if (stage === "initialize") assert.equal(f.bridge.adsInitialized,null);
    assert.equal(f.calls.some(call => Array.isArray(call) && call[0] === "show"),false);
    f.plugin[stage]=original;
    const pending=assert.rejects(f.bridge.showRewardedAd(options), /tamamlanmadan kapatıldı/);
    await tick(); f.emit("onRewardedVideoAdDismissed"); await pending;
    assert.equal(f.bridge.adsBusy,false);
  }
});

test("partial listener registration failure removes earlier handles without showing an ad", async () => {
  const f=fixture(); const original=f.plugin.addListener;
  f.plugin.addListener=async (event, callback) => {
    if (event === "onRewardedVideoAdDismissed") throw new Error("fixture listener failure");
    return original(event,callback);
  };
  await assert.rejects(f.bridge.showRewardedAd(options), /listener failure/);
  assert.equal(f.bridge.adsBusy,false); assert.equal(f.listeners.size,0);
  assert.equal(f.calls.some(call => Array.isArray(call) && call[0] === "show"),false);
});

test("privacy choices refresh UMP and revocation blocks subsequent ads", async () => {
  const f=fixture();
  f.plugin.requestConsentInfo=async () => ({...ready,privacyOptionsRequirementStatus:"REQUIRED"});
  await f.bridge.refreshAdsConsent(options);
  f.plugin.requestConsentInfo=async () => ({...ready,status:"OBTAINED",canRequestAds:false,privacyOptionsRequirementStatus:"REQUIRED"});
  assert.equal(await f.bridge.showAdsPrivacyOptions(options),true);
  assert.equal(f.bridge.adsConsent.canRequestAds,false);
  assert.equal(f.bridge.adsPrivacyOptionsRequired,true);
  await assert.rejects(f.bridge.showRewardedAd(options), /gizlilik onayı/);
  assert.deepEqual(f.calls,["privacy"]);
});

test("refresh failure blocks ads but keeps the required privacy entry accessible", async () => {
  const f=fixture();
  f.plugin.requestConsentInfo=async () => ({...ready,privacyOptionsRequirementStatus:"REQUIRED"});
  await f.bridge.refreshAdsConsent(options);
  f.plugin.requestConsentInfo=async () => { throw new Error("fixture offline"); };
  await assert.rejects(f.bridge.refreshAdsConsent({...options,force:true}));
  assert.equal(f.bridge.adsConsent,null); assert.equal(f.bridge.adsPrivacyOptionsRequired,true);
  await assert.rejects(f.bridge.showAdsPrivacyOptions(options));
  assert.deepEqual(f.calls,["privacy"]); assert.equal(f.bridge.adsBusy,false);
});

test("privacy UI is in account category and startup refresh is nonblocking", () => {
  const root=path.resolve(__dirname,"../..");
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
  const app=fs.readFileSync(path.join(root,"client/src/app.js"),"utf8");
  assert.ok(html.indexOf('id="ad-privacy-panel"') > html.indexOf('id="settings-panel-account"'));
  assert.match(html, /id="ad-privacy-panel" hidden/);
  assert.match(app, /await startupLoading\?\.finish\(\);\s+void loadStoreState\(\)/);
  assert.match(app, /void refreshNativeAdConsent\(\)/);
  assert.match(app, /if \(nativeStore\?\.adsBusy\) \{ renderAdsPrivacyOptions\(\); return; \}/);
  assert.match(app, /nativeStore\?\.adsPrivacyOptionsRequired === true/);
});
