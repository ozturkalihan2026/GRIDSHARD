const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const app = fs.readFileSync("src/app.js", "utf8");
const render = app.slice(app.indexOf("  function renderPostMatchAdReward()"), app.indexOf("  function playTestRewardAd("));
const claimAndWatch = app.slice(app.indexOf("  async function claimAdReward("), app.indexOf("  async function openGiftChest("));
const receipt = {circuit_credits:10, xp:20};
const failure = (status = 422) => Object.assign(new Error("fixture verification pending"), {status});

function fixture(mode = "live") {
  const elements = Object.fromEntries([
    "post-match-ad-reward", "post-match-ad-button", "post-match-ad-copy",
    "post-match-ad-heading", "post-match-store-status",
  ].map(id => [id, {dataset:{}}]));
  const calls = {ads:[], requests:[], profiles:[], waits:[]};
  const context = vm.createContext({
    Error, Map, Set, Promise,
    document:{getElementById:id => elements[id]},
    progressionState:{viewModel:() => ({profileProgressionApplied:true, circuitCreditsAwarded:10})},
    postMatchSync:{lastBattleId:"battle-one"},
    participantPlayerId:"fixture-player",
    adRewardReceipts:new Map(), pendingAdRewardClaims:new Set(),
    adRewardPending:false, adRewardClaimPending:false,
    storeState:{providers:{ad_policy:{mode}}},
    currentAdProvider:() => "admob", localizedUiText:text => text,
    nativeStore:{
      async showRewardedAd(options) {calls.ads.push(options);},
      adCapability:() => ({ad_protocol:"child-safe-v1", ad_platform:"android"}),
    },
    async requestJsonWithDeadline(path, options) {
      calls.requests.push({path, body:JSON.parse(options.body)});
      return {receipt, profile:{player_id:"fixture-player"}};
    },
    operationRequestId:() => `fixture-${calls.requests.length}`,
    window:{setTimeout(resolve, delay) {calls.waits.push(delay); resolve();}},
    profileState:{applyProfile:profile => calls.profiles.push(profile)},
    renderProfileSummary() {}, renderPostMatchRewards() {}, renderAdsPrivacyOptions() {},
    playTestRewardAd:async () => {},
  });
  vm.runInContext(`${render}\n${claimAndWatch}`, context);
  return {context, calls, elements};
}

test("delayed SSV keeps a claim-only retry; success clears it without another ad", async () => {
  const {context:c, calls, elements} = fixture();
  const acceptedRequest = c.requestJsonWithDeadline;
  c.requestJsonWithDeadline = async (path, options) => {
    calls.requests.push({path, body:JSON.parse(options.body)});
    throw failure();
  };
  await c.watchRewardAd();
  assert.equal(calls.ads.length, 1);
  assert.equal(calls.requests.length, 6);
  assert.equal(new Set(calls.requests.map(r => r.body.request_id)).size, 1);
  assert.equal(calls.waits.length, 5);
  assert.equal(c.pendingAdRewardClaims.has("battle-one"), true);
  assert.equal(c.adRewardReceipts.size, 0);
  assert.equal(calls.profiles.length, 0);
  assert.equal(elements["post-match-ad-button"].textContent, "ÖDÜLÜ KONTROL ET");
  assert.equal(elements["post-match-ad-button"].disabled, false);
  assert.match(elements["post-match-ad-copy"].textContent, /yeniden reklam izlemeden/);

  c.requestJsonWithDeadline = acceptedRequest;
  await c.watchRewardAd();
  assert.equal(calls.ads.length, 1);
  assert.equal(calls.requests.length, 7);
  assert.equal(c.pendingAdRewardClaims.size, 0);
  assert.equal(c.adRewardReceipts.get("battle-one"), receipt);
  assert.equal(calls.profiles.length, 1);
  assert.equal(elements["post-match-ad-button"].textContent, "x2 ÖDÜL ALINDI");
  await c.watchRewardAd();
  assert.equal(calls.requests.length, 7); // Already claimed, no new request or ad.
});

test("lost reward response is retried without replaying the native advertisement", async () => {
  const {context:c, calls} = fixture();
  const acceptedRequest = c.requestJsonWithDeadline;
  c.requestJsonWithDeadline = async () => {throw failure(0);};
  await c.watchRewardAd();
  assert.equal(c.pendingAdRewardClaims.has("battle-one"), true);
  c.requestJsonWithDeadline = acceptedRequest;
  await c.watchRewardAd();
  assert.equal(calls.ads.length, 1);
  assert.equal(c.adRewardReceipts.get("battle-one"), receipt);
});

test("native failure or early dismissal never creates a claim marker", async () => {
  const {context:c, calls, elements} = fixture();
  c.nativeStore.showRewardedAd = async () => {throw new Error("fixture closed before reward");};
  await c.watchRewardAd();
  assert.equal(c.pendingAdRewardClaims.size, 0);
  assert.equal(calls.requests.length, 0);
  assert.equal(c.adRewardPending, false);
  assert.equal(c.adRewardClaimPending, false);
  assert.match(elements["post-match-ad-button"].textContent, /REKLAM İZLE/);
});

test("publisher test completion cannot become a real claim if rollout changes while open", async () => {
  const {context:c, calls} = fixture("test");
  c.nativeStore.showRewardedAd = async () => {c.storeState = {providers:{ad_policy:{mode:"live"}}};};
  await c.watchRewardAd();
  assert.equal(c.pendingAdRewardClaims.size, 0);
  assert.equal(calls.requests.length, 0);
  assert.equal(c.adRewardReceipts.size, 0);
});

test("a claim marker for one battle never skips the ad for a different battle", async () => {
  const {context:c, calls} = fixture();
  c.pendingAdRewardClaims.add("battle-one");
  c.postMatchSync.lastBattleId = "battle-two";
  await c.watchRewardAd();
  assert.equal(calls.ads.length, 1);
  assert.equal(calls.ads[0].battleId, "battle-two");
  assert.equal(calls.ads[0].userId, "fixture-player");
  assert.equal(calls.requests[0].path, "/profile/fixture-player/battles/battle-two/ad-reward");
  assert.equal(c.pendingAdRewardClaims.has("battle-one"), true);
  assert.equal(c.pendingAdRewardClaims.has("battle-two"), false);
});

test("claim-in-flight has its own label and double tapping never starts a second operation", async () => {
  const {context:c, calls, elements} = fixture();
  let complete;
  let started;
  const requestStarted = new Promise(resolve => {started = resolve;});
  c.requestJsonWithDeadline = () => new Promise(resolve => {complete = resolve; started();});
  const watching = c.watchRewardAd();
  await requestStarted;
  assert.equal(c.adRewardClaimPending, true);
  assert.equal(elements["post-match-ad-button"].textContent, "ÖDÜL DOĞRULANIYOR…");
  assert.equal(elements["post-match-ad-button"].disabled, true);
  await c.watchRewardAd();
  assert.equal(calls.ads.length, 1);
  complete({receipt});
  await watching;
  assert.equal(c.adRewardClaimPending, false);
});

test("reopened publisher test UI does not promote an old live marker to a reward", async () => {
  const {context:c, calls, elements} = fixture("test");
  c.pendingAdRewardClaims.add("battle-one");
  c.renderPostMatchAdReward();
  assert.match(elements["post-match-ad-button"].textContent, /TEST REKLAMINI/);
  await c.watchRewardAd();
  assert.equal(calls.ads.length, 1);
  assert.equal(calls.requests.length, 0);
  assert.equal(c.adRewardReceipts.size, 0);
});
