const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const {webcrypto, createHash} = require("node:crypto");
const {androidOAuthLinks} = require("../../tools/configure-native-oauth.js");

function harness({platform = "android", configured = true, failWrite = false, authHost = "accounts.google.com"} = {}) {
  const secure = new Map(), plain = new Map(), tab = new Map(), opened = [], requests = [], sessions = [];
  const handoff = "h".repeat(32);
  const context = {URL, URLSearchParams, Uint8Array, TextEncoder, crypto:webcrypto,
    btoa:value => Buffer.from(value, "binary").toString("base64"),
    localStorage:{getItem:key=>plain.get(key)||null, setItem:(key,value)=>plain.set(key,value), removeItem:key=>plain.delete(key)},
    sessionStorage:{getItem:key=>tab.get(key)||null, setItem:(key,value)=>{if(failWrite)throw Error("tab unavailable");tab.set(key,value);},removeItem:key=>tab.delete(key)},
    location:{origin:"https://play.gridshard.test",assign:url=>opened.push({url})}};
  context.Capacitor = {getPlatform:()=>platform, Plugins:{
    App:{getInfo:async()=>({id:"com.gridshard.remotedebug"})},
    Browser:{open:async options=>{
      assert.ok(secure.has("gridshard.auth.native-oauth"), "secure write before external browser");
      opened.push(options);
    }, close:async()=>{}},
    SecureStorage:{internalGetItem:async({prefixedKey})=>({data:secure.get(prefixedKey)??null}),
      internalSetItem:async({prefixedKey,data})=>{if(failWrite)throw Error("secure unavailable");secure.set(prefixedKey,data);},
      internalRemoveItem:async({prefixedKey})=>secure.delete(prefixedKey)},
  }};
  vm.createContext(context);
  for (const file of ["native-secure-storage.js", "native-oauth.js"]) vm.runInContext(fs.readFileSync(`src/${file}`,"utf8"),context);
  const options = {capacitor:context.Capacitor, storage:context.localStorage,
    apiBaseUrl:"https://play.gridshard.test", now:()=>1000,
    request:async(path,init)=>{requests.push({path,init});return {configured,
      authorization_url:configured?`https://${authHost}/o/oauth2/v2/auth?state=fixture-state`:null, handoff};},
    auth:{completeProviderLogin:async(...args)=>sessions.push(args)}};
  const create = () => new context.GridshardNativeOAuth(options);
  const callback = (updates = {}) => {
    const url = new URL(platform === "web" ? "https://play.gridshard.test/" : "https://play.gridshard.test/native-auth/android-test");
    url.search = new URLSearchParams({oauth_provider:"google", oauth_status:"linked",
      oauth_handoff:handoff, oauth_exchange:"e".repeat(43), ...updates}).toString();
    return url.href;
  };
  return {controller:create(), create, options, context, secure, plain, tab, opened, requests, sessions, callback};
}

test("web OAuth is tab-bound across reload and never persists the proof in localStorage", async()=>{
  const h = harness({platform:"web"});
  await h.controller.begin("guest","google","login");
  assert.equal(h.opened.length,1);
  assert.equal(h.secure.size,0);
  assert.equal(h.plain.size,0);
  const proof = JSON.parse(h.tab.get("gridshard.auth.native-oauth")).verifier;
  const params = new URL(h.requests[0].path,"https://fixture.test").searchParams;
  assert.equal(params.has("native_target"),false);
  assert.equal(params.get("code_challenge"),createHash("sha256").update(proof).digest("base64url"));
  await h.create().consume(h.callback());
  assert.equal(h.sessions[0][1].codeVerifier,proof);
  assert.equal(h.tab.size,0);
});

test("web callbacks need the initiating tab and cancellation clears only a matched attempt", async()=>{
  const h = harness({platform:"web"});
  await assert.rejects(h.controller.consume(h.callback()));
  await h.controller.begin("guest","google");
  await assert.rejects(h.controller.consume(h.callback({oauth_handoff:"x".repeat(32)})));
  assert.equal(h.tab.size,1);
  const result = await h.controller.consume(h.callback({oauth_status:"cancelled",oauth_exchange:""}));
  assert.equal(result.status,"cancelled");
  assert.equal(h.tab.size,0);
  assert.equal(h.sessions.length,0);
});

test("blocked web storage does not break construction but cannot launch an unbound login", async()=>{
  const h = harness({platform:"web",failWrite:true});
  await assert.rejects(h.controller.begin("guest","google"));
  assert.equal(h.opened.length,0);
  Object.defineProperty(h.context,"sessionStorage",{get(){throw Error("privacy mode");}});
  const controller = h.create();
  await assert.rejects(controller.begin("guest","google"),/güvenli kaydedilemedi/);
});

test("native sign-in opens an official external browser only after verified secure persistence", async()=>{
  const h = harness();
  await h.controller.begin("guest", "google", "login");
  const pending = JSON.parse(JSON.parse(h.secure.get("gridshard.auth.native-oauth")));
  const params = new URL(h.requests[0].path,"https://fixture.test").searchParams;
  assert.equal(params.get("native_target"), "android-test");
  assert.equal(params.get("mode"), "login");
  assert.equal(params.get("code_challenge"), createHash("sha256").update(pending.verifier).digest("base64url"));
  assert.equal(h.requests[0].init.cache, "no-store");
  assert.equal(h.opened.length,1);
  assert.equal(h.plain.size,0);
  assert.ok(!h.opened[0].url.includes(pending.verifier));
  await h.create().consume(h.callback()); // cold launch, no controller memory
  assert.equal(h.sessions.length,1);
  assert.equal(h.sessions[0][1].codeVerifier,pending.verifier);
  assert.equal(h.secure.has("gridshard.auth.native-oauth"),false);
});

test("concurrent warm/cold return events redeem one exchange and duplicate completion is harmless", async()=>{
  const h = harness();
  await h.controller.begin("guest", "google");
  const results = await Promise.all([h.controller.consume(h.callback()),h.controller.consume(h.callback())]);
  assert.equal(h.sessions.length,1);
  assert.equal(results[1].duplicate,true);
  assert.equal((await h.controller.consume(h.callback())).duplicate,true);
});

for (const [name, change] of [
  ["foreign host", url=>url.replace("play.gridshard.test", "evil.test")],
  ["plaintext", url=>url.replace("https:", "http:")],
  ["wrong target", url=>url.replace("/android-test", "/android")],
  ["wrong provider", url=>url.replace("oauth_provider=google", "oauth_provider=apple")],
  ["wrong handoff", url=>url.replace("oauth_handoff=" + "h".repeat(32), "oauth_handoff=" + "x".repeat(32))],
  ["duplicate parameter", url=>url + "&oauth_provider=google"],
  ["fragment", url=>url + "#forged"],
  ["missing exchange", url=>url.replace("oauth_exchange=" + "e".repeat(43), "oauth_exchange=")],
]) {
  test(`reject ${name} without authenticating or deleting the real pending attempt`, async()=>{
    const h = harness();
    await h.controller.begin("guest","google");
    await assert.rejects(h.controller.consume(change(h.callback())));
    assert.equal(h.sessions.length,0);
    assert.equal(h.secure.has("gridshard.auth.native-oauth"),true);
  });
}

test("unsolicited/expired returns cannot authorize a device; cancellation never authenticates", async()=>{
  const h = harness();
  await assert.rejects(h.controller.consume(h.callback()));
  await h.controller.begin("guest", "google");
  const expired = h.create(); expired.now = ()=>9999999;
  await assert.rejects(expired.consume(h.callback()), /süresi doldu/);
  const cancelled = await h.controller.consume(h.callback({oauth_status:"cancelled"}));
  assert.equal(cancelled.status,"cancelled");
  assert.equal(h.sessions.length,0);
  assert.equal(h.secure.size,0);
});

test("unconfigured provider, secure failure, foreign authorize URL and unavailable iOS never open a browser", async()=>{
  const disabled = harness({configured:false});
  assert.equal((await disabled.controller.begin("guest","google")).configured,false);
  assert.equal(disabled.opened.length,0);
  assert.equal(disabled.secure.size,0);
  for (const options of [{failWrite:true}, {authHost:"evil.test"}, {platform:"ios"}]) {
    const h = harness(options);
    await assert.rejects(h.controller.begin("guest","google"));
    assert.equal(h.opened.length,0);
  }
});

test("failed exchange keeps its proof for a network retry and never starts a second attempt mid-redemption", async()=>{
  const h = harness();
  await h.controller.begin("guest","google");
  let release;
  h.options.auth.completeProviderLogin = () => new Promise((_,reject)=>{release=()=>reject(Error("offline"));});
  const consuming = h.controller.consume(h.callback());
  await assert.rejects(h.controller.begin("guest","google"), /zaten başlatılıyor/);
  // Advance pending secure-store reads to the exchange call.
  await new Promise(resolve=>setImmediate(resolve));
  release();
  await assert.rejects(consuming, /offline/);
  assert.equal(h.secure.has("gridshard.auth.native-oauth"),true);
});

test("Android OAuth filter is exact HTTPS, idempotent, and preserves launcher/provider/other activities", ()=>{
  const source = '<manifest><application><activity android:name=".MainActivity"><intent-filter><action android:name="android.intent.action.MAIN" /></intent-filter></activity><activity android:name=".Other" /><provider android:name="FileProvider"><meta-data android:name="paths" /></provider></application></manifest>';
  const result = androidOAuthLinks(source,"https://play.gridshard.test","android-test");
  assert.equal(androidOAuthLinks(result,"https://play.gridshard.test","android-test"),result);
  assert.match(result,/android:autoVerify="true"/);
  assert.match(result,/android:scheme="https" android:host="play.gridshard.test" android:path="\/native-auth\/android-test"/);
  assert.match(result,/android.intent.action.MAIN/);
  assert.match(result,/FileProvider/);
  assert.match(result,/\.Other/);
  assert.doesNotMatch(androidOAuthLinks(result,"http://192.168.1.2",null),/GRIDSHARD_NATIVE_OAUTH_START/);
  assert.throws(()=>androidOAuthLinks(source,"http://play.gridshard.test","android-test"));
  assert.throws(()=>androidOAuthLinks(source,"https://user:secret@play.gridshard.test","android-test"));
});
