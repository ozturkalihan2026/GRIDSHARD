const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const {webcrypto} = require("node:crypto");

function harness(native, failWrite = false, {platform = native ? "android" : "web", userAgent = ""} = {}) {
  const key = "gridshard.auth.device-secret", value = "a".repeat(64);
  const plain = new Map([[key, value]]), secure = new Map();
  const storage = {getItem:k=>plain.get(k) || null, setItem:(k,v)=>plain.set(k,v), removeItem:k=>plain.delete(k)};
  const calls = [];
  const plugin = {
    internalRemoveItem:async({prefixedKey})=>secure.delete(prefixedKey),
    internalGetItem:async({prefixedKey, sync})=>{assert.equal(sync,false); return {data:secure.get(prefixedKey) || null};},
    internalSetItem:async({prefixedKey,data,sync,access})=>{
      assert.equal(sync,false); assert.equal(access,1);
      if (failWrite) throw new Error("secure unavailable");
      secure.set(prefixedKey,data);
    }
  };
  const context = {localStorage:storage, crypto:webcrypto, URL, Headers, location:{href:"https://game.test", origin:"https://game.test"},
    fetch:async(input, init)=>{calls.push({input,init}); return {ok:true,json:async()=>({player_id:"a", access_token:"memory-token", expires_at:9999999999})};},
    navigator:{userAgent},
    Capacitor:{getPlatform:()=>platform, Plugins:{SecureStorage:plugin}}};
  vm.createContext(context);
  for (const file of ["native-secure-storage.js","auth-session.js"]) vm.runInContext(fs.readFileSync(`src/${file}`,"utf8"),context);
  return {context, plain, secure, calls, key, value};
}
test("native secret is migrated only after verified secure write; tokens stay in RAM", async()=>{
  const h = harness(true);
  await h.context.GridshardAuth.session.ensureAuthenticated("a");
  assert.equal(JSON.parse(h.secure.get(h.key)),h.value);
  assert.equal(h.plain.has(h.key),false);
  assert.equal(JSON.parse(h.calls[0].init.body).device_secret,h.value);
  assert.equal([...h.plain.values()].includes("memory-token"),false);
  await h.context.GridshardAuth.session.replaceDeviceSecret("b".repeat(64));
  assert.equal(JSON.parse(h.secure.get(h.key)),"b".repeat(64));
  assert.equal(h.context.GridshardAuth.session.accessToken,null);
});
test("native secure failure blocks login and preserves the old copy", async()=>{
  const h = harness(true,true);
  await assert.rejects(h.context.GridshardAuth.session.ensureAuthenticated("a"), /secure unavailable/);
  assert.equal(h.plain.get(h.key),h.value);
  assert.equal(h.calls.length,0);
});
test("web never loads native storage; concurrent requests share one random secret", async()=>{
  const h = harness(false);
  h.plain.delete(h.key);
  const [first, second] = await Promise.all([h.context.GridshardAuth.session._deviceSecret(), h.context.GridshardAuth.session._deviceSecret()]);
  assert.equal(first,second);
  assert.match(first,/^[a-f0-9]{64}$/);
  assert.equal(h.plain.get(h.key),first);
  assert.equal(h.secure.size,0);
});

test("recovery candidate survives server commit plus app restart before primary write", async()=>{
  const h = harness(true);
  const candidate = "b".repeat(64);
  await h.context.GridshardAuth.session.stageRecoverySecret("a", candidate);
  // Simulate code consumed/server verifier rotated, but app killed before commit.
  vm.runInContext(fs.readFileSync("src/auth-session.js","utf8"), h.context);
  h.context.GridshardAuth.session.fetchImpl = async(_input, init)=>{
    const body = JSON.parse(init.body);
    if (body.device_secret !== candidate) return {ok:false, status:401};
    return {ok:true, status:200, json:async()=>({player_id:"a", access_token:"recovered", expires_at:9999999999})};
  };
  assert.equal(await h.context.GridshardAuth.session.ensureAuthenticated("a"), "recovered");
  assert.equal(JSON.parse(h.secure.get(h.key)), candidate);
  assert.equal(h.secure.has("gridshard.auth.recovery-candidate"), false);
});

test("secure recovery staging fails before any network mutation", async()=>{
  const h = harness(true,true);
  await assert.rejects(h.context.GridshardAuth.session.stageRecoverySecret("a", "b".repeat(64)), /secure unavailable/);
  assert.equal(h.calls.length,0);
});

for (const [platform, userAgent, expected] of [
  ["android", "Mozilla/5.0 (Linux; Android 15; wv) Chrome/140.0.0.0 Mobile Safari/537.36", "ANDROID · GRIDSHARD"],
  ["ios", "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1", "IOS · GRIDSHARD"],
]) {
  test(`${platform} authentication identifies the app, not its WebView engine; device identity survives`, async()=>{
    const h = harness(true, false, {platform, userAgent});
    const deviceId = "existing-native-device";
    h.plain.set("gridshard.auth.device-id", deviceId);
    await h.context.GridshardAuth.session.ensureAuthenticated("a");
    await h.context.GridshardAuth.session.completeProviderLogin("fixture-exchange", {codeVerifier:"p".repeat(64)});
    assert.equal(h.calls.length, 2);
    for (const {init} of h.calls) {
      const body = JSON.parse(init.body);
      assert.equal(body.device_name, expected);
      assert.equal(body.platform, platform);
      assert.equal(body.device_id, deviceId);
      assert.equal(body.device_secret, h.value);
    }
    assert.equal(h.plain.get("gridshard.auth.device-id"), deviceId);
    assert.equal(JSON.parse(h.calls[1].init.body).code_verifier,"p".repeat(64));
  });
}

for (const [userAgent, browser] of [
  ["Mozilla/5.0 (Linux; Android 15) Chrome/140.0.0.0 Mobile Safari/537.36", "Chrome"],
  ["Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0", "Edge"],
  ["Mozilla/5.0 (iPhone) Version/18.0 Mobile/15E148 Safari/604.1", "Safari"],
]) {
  test(`actual web ${browser} session retains its browser label`, async()=>{
    const h = harness(false, false, {userAgent});
    await h.context.GridshardAuth.session.ensureAuthenticated("a");
    const body = JSON.parse(h.calls[0].init.body);
    assert.equal(body.device_name, `WEB · ${browser}`);
    assert.equal(body.platform, "web");
    assert.equal(h.secure.size, 0);
  });
}
