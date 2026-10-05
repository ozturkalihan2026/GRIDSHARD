const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const {webcrypto} = require("node:crypto");

function controls({confirmed = true, recoverable = true, configured = true, ready = Promise.resolve()} = {}) {
  const calls = [], nodes = new Map();
  for (const suffix of ["", "-status", "-login", "-retry"]) {
    nodes.set(`account-session-recovery${suffix}`, {
      open:false, disabled:false, textContent:"", listeners:{},
      addEventListener(event, callback) { this.listeners[event] = callback; },
      showModal() { this.open = true; },
    });
  }
  const document = {documentElement:{lang:"tr"}, getElementById:id => nodes.get(id)};
  const context = {GridshardI18n:{t:(key, params) => key + (params.device ? `:${params.device}` : "")}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("src/account-session-controls.js", "utf8"), context);
  const auth = {deviceId:() => "own-phone", markSignedOut:() => calls.push(["signed-out"])};
  const playGames = {configured, begin:async(playerId, mode) => calls.push(["proof", playerId, mode])};
  const instance = new context.GridshardAccountSessionControls({document, auth, playGames, ready,
    playerId:"remembered-owner", request:async(path, init) => { calls.push(["request", path, init]); return {devices:[]}; },
    confirm:async(message) => { calls.push(["confirm", message]); return confirmed; },
    canRecoverCurrent:() => recoverable, reload:() => calls.push(["reload"]),
    onRevoked:state => calls.push(["view", state]),
  });
  return {instance, calls, nodes, playGames};
}
const own = {device_id:"own-phone", name:"ANDROID · GRIDSHARD"};
const other = {device_id:"other-phone", name:"ANDROID · GRIDSHARD"};

test("current device is distinguished even when native display names match", () => {
  const {instance} = controls();
  assert.match(instance.deviceLabel(own), /account.session.this_device/);
  assert.equal(instance.deviceLabel(other), "ANDROID · GRIDSHARD");
});

test("cancel and unlinked current device perform no sign-out or server writes", async() => {
  const cancelled = controls({confirmed:false});
  assert.equal((await cancelled.instance.revokeDevice(own)).cancelled, true);
  assert.deepEqual(cancelled.calls.map(call => call[0]), ["confirm"]);
  const unsafe = controls({recoverable:false});
  assert.equal((await unsafe.instance.revokeDevice(own)).blocked, true);
  assert.deepEqual(unsafe.calls, []);
});

test("confirmed current sign-out clears cached session only after success and opens recovery", async() => {
  const {instance, calls, nodes} = controls();
  const result = await instance.revokeDevice(own);
  assert.equal(result.current, true);
  assert.deepEqual(calls.map(call => call[0]), ["confirm", "request", "signed-out", "view"]);
  assert.match(calls[0][1], /account.session.confirm_current/);
  assert.equal(calls[1][1], "/accounts/remembered-owner/devices/own-phone");
  assert.equal(calls[1][2].method, "DELETE");
  assert.deepEqual(JSON.parse(calls[1][2].body), {player_id:"remembered-owner"});
  assert.equal(nodes.get("account-session-recovery").open, true);
  assert.equal(nodes.get("account-session-recovery-login").disabled, false);
});

test("other device sign-out does not clear this session or show a recovery dialog", async() => {
  const {instance, calls, nodes} = controls({recoverable:false});
  assert.equal((await instance.revokeDevice(other)).current, false);
  assert.deepEqual(calls.map(call => call[0]), ["confirm", "request", "view"]);
  assert.match(calls[0][1], /account.session.confirm_other/);
  assert.equal(nodes.get("account-session-recovery").open, false);
});

test("failed revoke leaves current session unchanged", async() => {
  const {instance, calls, nodes} = controls();
  instance.request = async() => { throw new Error("offline"); };
  await assert.rejects(instance.revokeDevice(own), /offline/);
  assert.deepEqual(calls.map(call => call[0]), ["confirm"]);
  assert.equal(nodes.get("account-session-recovery").open, false);
});

test("recovery dialog works before startup completes; missing provider stays disabled", async() => {
  for (const options of [{configured:false}, {ready:Promise.reject(new Error("unavailable"))}]) {
    const {instance, nodes} = controls(options);
    await instance.openRecovery();
    assert.equal(nodes.get("account-session-recovery").open, true);
    assert.equal(nodes.get("account-session-recovery-login").disabled, true);
    assert.equal(nodes.get("account-session-recovery-status").textContent, "account.session.provider_unavailable");
  }
  const html = fs.readFileSync("index.html", "utf8"), app = fs.readFileSync("src/app.js", "utf8");
  assert.ok(html.indexOf('id="account-session-recovery"') < html.indexOf('<main class="battle-shell"'));
  assert.match(html, /account-session-controls\.js[\s\S]*src="\.\/src\/app\.js"/);
  assert.match(app, /requiresReauthentication\)\s*\{\s*void accountSessionControls\?\.openRecovery\(\)/);
});

test("successful explicit recovery proves same remembered profile before reloading", async() => {
  const {instance, calls} = controls();
  await instance.recover();
  assert.deepEqual(calls, [["proof", "remembered-owner", "recover"], ["reload"]]);
});

test("duplicate recovery clicks and network retries cannot run parallel proof requests", async() => {
  const {instance, calls, playGames, nodes} = controls();
  let finish;
  playGames.begin = async() => { calls.push(["proof"]); await new Promise(resolve => { finish = resolve; }); };
  const first = instance.recover();
  await instance.recover();
  nodes.get("account-session-recovery-retry").listeners.click();
  assert.deepEqual(calls, [["proof"]]);
  finish(); await first;
  assert.deepEqual(calls, [["proof"], ["reload"]]);
  assert.equal(instance.busy, false);
});

test("cancelled or rejected provider proof preserves remembered profile with a retry", async() => {
  const {instance, calls, playGames, nodes} = controls();
  playGames.begin = async() => { throw new Error("wrong Google account; must not expose upstream credentials"); };
  await instance.openRecovery(); await instance.recover();
  assert.deepEqual(calls, []);
  assert.equal(instance.playerId, "remembered-owner");
  assert.equal(nodes.get("account-session-recovery").open, true);
  assert.equal(nodes.get("account-session-recovery-status").textContent, "account.session.recovery_failed");
  assert.equal(nodes.get("account-session-recovery-login").disabled, false);
  let prevented = false;
  nodes.get("account-session-recovery").listeners.cancel({preventDefault:() => { prevented = true; }});
  assert.equal(prevented, true);
});

function authSession() {
  const values = new Map([["project-relay.web-test.participant-id", "remembered-owner"],
    ["gridshard.auth.device-secret", "s".repeat(64)]]);
  const storage = {getItem:key => values.get(key) || null, setItem:(key, value) => values.set(key, value), removeItem:key => values.delete(key)};
  const context = {localStorage:storage, crypto:webcrypto, URL, Headers, fetch:async() => ({ok:false, status:401}),
    location:{href:"https://game.test", origin:"https://game.test"}};
  vm.createContext(context);
  for (const file of ["native-secure-storage.js", "auth-session.js"]) {
    vm.runInContext(fs.readFileSync(`src/${file}`, "utf8"), context);
  }
  return {session:context.GridshardAuth.session, values};
}

test("revoked device clears only in-memory token and preserves owner and device secret", async() => {
  const {session, values} = authSession();
  session.accessToken = "old-token"; session.expiresAt = 9999999999;
  await assert.rejects(session.ensureAuthenticated("remembered-owner", {force:true}), error => error.status === 401);
  assert.equal(session.requiresReauthentication, true);
  assert.equal(session.accessToken, null); assert.equal(session.expiresAt, 0);
  assert.equal(values.get("project-relay.web-test.participant-id"), "remembered-owner");
  assert.equal(values.get("gridshard.auth.device-secret"), "s".repeat(64));
  session.fetchImpl = async() => ({ok:true, json:async() => ({player_id:"remembered-owner", access_token:"verified", expires_at:9999999999})});
  await session.completeProviderLogin("one-use-proof", {codeVerifier:"a".repeat(64)});
  assert.equal(session.requiresReauthentication, false);
  assert.equal(session.accessToken, "verified");
});

test("network/server failure alone is not treated as a revoked identity", async() => {
  const {session} = authSession();
  for (const fetch of [async() => ({ok:false, status:503}), async() => { throw new Error("offline"); }]) {
    session.fetchImpl = fetch;
    await assert.rejects(session.ensureAuthenticated("remembered-owner", {force:true}));
    assert.equal(session.requiresReauthentication, false);
  }
});
