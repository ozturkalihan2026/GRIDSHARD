"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const {webcrypto} = require("node:crypto");
const PLAYER = "project-relay.web-test.participant-id";
const SECRET = "gridshard.auth.device-secret";
const ORIGIN = "gridshard.auth.review-origin";
const DEMO = "review-" + "a".repeat(32);
const PASSWORD = "fixture-password-not-a-shipped-credential";

function setup({native = false, origin = "https://game.test", api = ""} = {}) {
  const values = new Map([[PLAYER, "original-owner"], ["gridshard.auth.device-id", "original-device"]]);
  const secure = new Map();
  if (native) secure.set(SECRET, JSON.stringify("s".repeat(64)));
  else values.set(SECRET, "s".repeat(64));
  const storage = {getItem:key => values.get(key) || null,
    setItem:(key,value) => values.set(key,value), removeItem:key => values.delete(key)};
  const calls = [];
  const context = {localStorage:storage, crypto:webcrypto, URL, Headers,
    GRIDSHARD_API_BASE_URL:api, location:{href:origin, origin},
    fetch:async(url, init) => {
      calls.push({url, body:JSON.parse(init.body)});
      return {ok:true, json:async() => ({player_id:DEMO, review_access:true, access_token:"review-token", expires_at:9999999999})};
    }};
  if (native) context.Capacitor = {getPlatform:() => "android", Plugins:{SecureStorage:{
    internalGetItem:async({prefixedKey}) => ({data:secure.get(prefixedKey) ?? null}),
    internalSetItem:async({prefixedKey,data}) => secure.set(prefixedKey,data),
    internalRemoveItem:async({prefixedKey}) => secure.delete(prefixedKey),
  }}};
  vm.createContext(context);
  for (const file of ["native-secure-storage.js", "auth-session.js"]) vm.runInContext(fs.readFileSync(`src/${file}`, "utf8"), context);
  return {session:context.GridshardAuth.session, context, values, secure, storage, calls};
}

test("review sign-in has no client credential/entitlement, preserves original native proof, and uses normal auth", async() => {
  const {session, values, secure, calls} = setup({native:true, api:"https://api.test"});
  await session.completeReviewLogin("fixture-reviewer", PASSWORD);
  assert.equal(values.get(PLAYER), DEMO);
  assert.equal(session.accessTokenFor(DEMO), "review-token");
  assert.equal(session.isReviewProfile(), true);
  assert.equal(secure.get(SECRET), JSON.stringify("s".repeat(64)));
  assert.deepEqual(JSON.parse(JSON.parse(secure.get(ORIGIN))), {
    playerId:"original-owner", secret:"s".repeat(64), deviceId:"original-device",
  });
  assert.equal(values.has(ORIGIN), false);
  assert.equal(JSON.stringify([...secure, ...values]).includes(PASSWORD), false);
  assert.equal(calls[0].url, "https://api.test/auth/review-session");
  assert.equal(calls[0].body.player_id, undefined);
  assert.equal(calls[0].body.premium, undefined);
  assert.equal(calls[0].body.password, PASSWORD);
});

test("wrong credentials, disabled service and network errors never replace the remembered player", async() => {
  for (const status of [401, 404, 429, 503]) {
    const {session, values} = setup();
    session.fetchImpl = async() => ({ok:false,status});
    await assert.rejects(session.completeReviewLogin("fixture", PASSWORD));
    assert.equal(values.get(PLAYER), "original-owner");
    assert.equal(values.get(SECRET), "s".repeat(64));
    assert.equal(session.reviewSwitchPending, false);
  }
  const {session, values} = setup();
  session.fetchImpl = async() => { throw new Error("offline"); };
  await assert.rejects(session.completeReviewLogin("fixture", PASSWORD), /offline/);
  assert.equal(values.get(PLAYER), "original-owner");
});

test("credential POST rejects remote HTTP before saving or sending anything; loopback works", async() => {
  for (const options of [{origin:"http://remote.test"}, {api:"http://api.test"}]) {
    const {session, calls, values} = setup(options);
    await assert.rejects(session.completeReviewLogin("fixture", PASSWORD), /HTTPS/);
    assert.equal(calls.length, 0);
    assert.equal(values.has(ORIGIN), false);
  }
  const {session} = setup({origin:"http://127.0.0.1:8000"});
  await session.completeReviewLogin("fixture", PASSWORD);
});

test("secure-backup failure blocks sign-in; ID write failure keeps original proof recoverable", async() => {
  const blocked = setup({native:true});
  blocked.session.secretStore.write = async() => { throw new Error("locked keystore"); };
  await assert.rejects(blocked.session.completeReviewLogin("fixture", PASSWORD), /locked keystore/);
  assert.equal(blocked.calls.length, 0);
  assert.equal(blocked.values.get(PLAYER), "original-owner");
  const partial = setup();
  const setItem = partial.storage.setItem;
  partial.storage.setItem = (key,value) => { if (key === PLAYER) throw new Error("quota"); setItem(key,value); };
  await assert.rejects(partial.session.completeReviewLogin("fixture", PASSWORD), /quota/);
  assert.equal(partial.values.get(PLAYER), "original-owner");
  assert.equal(JSON.parse(partial.values.get(ORIGIN)).playerId, "original-owner");
});

test("unverified or non-demo response cannot change the local profile", async() => {
  for (const payload of [{player_id:"original-owner",access_token:"token",review_access:true},
    {player_id:DEMO,access_token:"token"}, {player_id:DEMO,review_access:true}]) {
    const {session, values} = setup();
    session.fetchImpl = async() => ({ok:true,json:async() => payload});
    await assert.rejects(session.completeReviewLogin("fixture", PASSWORD), /Invalid review/);
    assert.equal(values.get(PLAYER), "original-owner");
  }
});

test("repeat demo sign-in does not replace the saved original; return verifies its old device", async() => {
  const {session, values} = setup();
  await session.completeReviewLogin("fixture", PASSWORD);
  const backup = values.get(ORIGIN);
  await session.completeReviewLogin("fixture", PASSWORD);
  assert.equal(values.get(ORIGIN), backup);
  const requests = [];
  session.fetchImpl = async(url, init) => {
    const body = JSON.parse(init.body); requests.push({url,body});
    return {ok:true,json:async() => ({player_id:"original-owner",access_token:"normal-token",expires_at:9999999999})};
  };
  await session.returnFromReview();
  assert.equal(values.get(PLAYER), "original-owner");
  assert.equal(values.get(SECRET), "s".repeat(64));
  assert.equal(session.isReviewProfile(), false);
  assert.equal(session.accessTokenFor("original-owner"), "normal-token");
  assert.deepEqual(requests[0].body, {player_id:"original-owner",device_secret:"s".repeat(64),
    device_id:"original-device",device_name:"WEB · Tarayıcı",platform:"web",existing_only:true});
});

test("revoked or unavailable original device remains in demo, never silently authorizes the original", async() => {
  const {session, values} = setup();
  await session.completeReviewLogin("fixture", PASSWORD);
  for (const status of [401, 503]) {
    session.fetchImpl = async() => ({ok:false,status});
    await assert.rejects(session.returnFromReview(), /normal account recovery/);
    assert.equal(values.get(PLAYER), DEMO);
    assert.equal(session.accessToken, "review-token");
    assert.equal(JSON.parse(values.get(ORIGIN)).playerId, "original-owner");
  }
});

test("switches are serialized, and UI clears password on rejection, success and close", async() => {
  const {session, context} = setup();
  session.reviewSwitchPending = true;
  await assert.rejects(session.completeReviewLogin("fixture", PASSWORD), /already in progress/);
  await assert.rejects(session.returnFromReview(), /already in progress/);
  session.reviewSwitchPending = false;
  const nodes = new Map();
  for (const id of ["dialog","status","password","submit","restore","close","form","username"]) {
    nodes.set(`review-access-${id}`, {value:"fixture", textContent:"", open:false, hidden:false, listeners:{},
      addEventListener(event, callback) {this.listeners[event] = callback;}, showModal() {this.open=true;}, close() {this.open=false;this.listeners.close?.();}});
  }
  let click;
  context.document = {getElementById:id => nodes.get(id), querySelectorAll:() => [{addEventListener:(event,callback) => {click=callback;}}]};
  let reloads = 0;
  context.location.reload = () => reloads++;
  vm.runInContext(fs.readFileSync("src/review-access.js", "utf8"), context);
  click();
  assert.equal(nodes.get("review-access-dialog").open, true);
  const field = nodes.get("review-access-password");
  const submit = nodes.get("review-access-form").listeners.submit;
  session.fetchImpl = async() => ({ok:false,status:401});
  field.value = PASSWORD;
  await submit({preventDefault(){}});
  assert.equal(field.value, ""); assert.equal(reloads, 0);
  session.fetchImpl = async() => ({ok:true,json:async() => ({player_id:DEMO,access_token:"demo",review_access:true})});
  field.value = PASSWORD;
  await submit({preventDefault(){}});
  assert.equal(field.value, ""); assert.equal(reloads, 1);
  field.value = PASSWORD; nodes.get("review-access-close").listeners.click();
  assert.equal(field.value, "");
});

test("real source has review entry before boot, onboarding, recovery and settings, with English labels", () => {
  const html = fs.readFileSync("index.html", "utf8");
  assert.equal((html.match(/data-review-access-open/g) || []).length, 4);
  assert.ok(html.indexOf("review-access.js") < html.indexOf('src/app.js'));
  assert.ok(html.includes('id="review-access-dialog" class="review-access-dialog" lang="en"'));
  assert.ok(html.includes('type="password" required maxlength="100" autocomplete="off"'));
  assert.ok(html.includes("RETURN TO PREVIOUS PROFILE"));
  assert.ok(fs.readFileSync("src/app.js", "utf8").includes("isReviewProfile?.()"));
});

test("app startup preserves the server-selected review identity rather than making another guest", () => {
  const {RelayTestParticipantIdentity} = require("../src/relay-client.js");
  for (const remembered of [DEMO, "wt-original-owner"]) {
    const values = new Map([[PLAYER,remembered]]);
    const storage = {getItem:key => values.get(key), setItem:(key,value) => values.set(key,value)};
    const identity = new RelayTestParticipantIdentity({storage, idFactory:() => {throw new Error("Must not replace remembered identity");}});
    assert.equal(identity.getOrCreate(),remembered);
    assert.equal(values.get(PLAYER),remembered);
  }
});

test("only private demo skips automatic guide; manual tutorial and ordinary player guide remain available", () => {
  const app = fs.readFileSync("src/app.js", "utf8");
  const start = app.indexOf("  function syncFirstMatchTutorial(");
  const end = app.indexOf("  // Hedefe dokunuş", start);
  assert.ok(start > 0 && end > start);
  function run({review, requested=false, dialog=false}) {
    let hidden=0, started=0;
    const context = {lastTutorialSyncAt:-Infinity,reviewTutorialRequested:requested,
      document:{getElementById:() => ({open:dialog})}, GridshardAuth:{session:{isReviewProfile:() => review}},
      onboardingOverlay:{hide:() => hidden++}, ONBOARDING_AUTOMATION_OPT_OUT:false,
      onboardingContext:() => ({hub:true,inMatchFlow:false}), startupLoading:null,
      onboardingFlow:{active:false,isCompleted:() => false,start:() => started++,update(){},read:() => false},
      statisticsState:{viewModel:() => ({totalMatches:0})}, syncBattleHints(){}};
    vm.runInNewContext(`${app.slice(start,end)}; syncFirstMatchTutorial(1000);`,context);
    return {hidden,started};
  }
  assert.deepEqual(run({review:true}), {hidden:1,started:0});
  assert.deepEqual(run({review:false}), {hidden:0,started:1});
  assert.deepEqual(run({review:true,requested:true}), {hidden:0,started:1});
  assert.deepEqual(run({review:false,dialog:true}), {hidden:1,started:0});
  assert.match(app,/settings-tutorial-replay[\s\S]{0,180}reviewTutorialRequested = true;/);
});
