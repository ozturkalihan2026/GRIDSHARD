"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { NativePushController } = require("../src/native-push.js");

function fixture({ enabled = false, granted = true } = {}) {
  const listeners = {};
  const calls = [];
  const opened = [];
  const preferences = new Map([["gridshard.push.enabled", String(enabled)]]);
  const plugin = {
    addListener: async (name, callback) => {
      assert.equal(listeners[name], undefined, "listeners must not accumulate");
      listeners[name] = callback;
      return { remove() { delete listeners[name]; } };
    },
    requestPermissions: async () => ({ receive: granted ? "granted" : "denied" }),
    checkPermissions: async () => ({ receive: granted ? "granted" : "denied" }),
    createChannel: async () => {},
    register: async () => { listeners.registration({ value: "fixture-native-token" }); },
    unregister: async () => {},
  };
  const controller = new NativePushController({
    capacitor: { getPlatform: () => "android", Plugins: { PushNotifications: plugin } },
    storage: { getItem: (key) => preferences.get(key), setItem: (key, value) => preferences.set(key, value) },
    identity: () => ({ playerId: "alice", deviceId: "phone" }),
    request: async (path, options) => { calls.push({ path, ...options }); return {}; },
    onOpen: (url) => opened.push(url),
  });
  return { controller, calls, listeners, opened, preferences, plugin };
}

test("opt-in installs listeners once and serializes token refresh / opt-out", async () => {
  const { controller, calls, listeners, preferences } = fixture();
  await controller.start();
  assert.ok(calls.every((call) => call.method === "DELETE"));
  await controller.enable();
  await controller.mutations;
  await controller.enable();
  await controller.mutations;
  assert.equal(Object.keys(listeners).length, 3);
  assert.equal(calls.filter((call) => call.method === "POST").length, 2);
  assert.equal(JSON.parse(calls.find((call) => call.method === "POST").body).device_id, "phone");
  await controller.disable();
  listeners.registration({ value: "late-native-token" });
  await controller.mutations;
  assert.equal(calls.at(-1).method, "DELETE");
  assert.equal(preferences.get("gridshard.push.enabled"), "false");
  assert.ok(!JSON.stringify([...preferences]).includes("token"));
});

test("denied permission cancels stale server subscription without registration", async () => {
  const { controller, calls } = fixture({ enabled: true, granted: false });
  await controller.start();
  assert.equal(controller.wanted, false);
  assert.ok(calls.every((call) => call.method === "DELETE"));
});

test("cold-start taps wait for identity, only open safe recipient-scoped links, and deduplicate", async () => {
  const { controller, listeners, opened } = fixture();
  await controller.listen();
  const tap = (data) => listeners.pushNotificationActionPerformed({ notification: { data } });
  const valid = { notification_id: "n1", recipient_id: "alice", deep_link: "gridshard://friends/messages/bob" };
  tap(valid);
  assert.deepEqual(opened, []);
  await controller.start();
  tap(valid);
  tap({ ...valid, notification_id: "n2", recipient_id: "other-account" });
  tap({ ...valid, notification_id: "n3", deep_link: "https://evil.example/profile/bob" });
  tap({ ...valid, notification_id: "n4", deep_link: "gridshard://invite/CODE" });
  assert.deepEqual(opened, [valid.deep_link]);
});

test("an offline disable is retried after restart", async () => {
  const { controller, calls } = fixture({ enabled: true });
  await controller.start();
  await controller.mutations;
  const request = controller.request;
  controller.request = async () => { throw new Error("offline"); };
  await assert.rejects(controller.disable());
  controller.request = request;
  await controller.start();
  assert.equal(calls.at(-1).method, "DELETE");
});

test("web never requests native permissions or writes push subscriptions", async () => {
  const controller = new NativePushController({
    capacitor: { getPlatform: () => "web" }, storage: null,
    request: () => assert.fail("web must not call notification endpoints"), identity: () => ({}),
  });
  await controller.start();
  await controller.enable();
  assert.equal(controller.plugin, null);
});

test("late permission grant cannot undo a newer disable action", async () => {
  const { controller, plugin, calls } = fixture();
  await controller.start();
  let grant;
  let requested;
  const permissionRequested = new Promise((resolve) => { requested = resolve; });
  plugin.requestPermissions = () => new Promise((resolve) => { grant = resolve; requested(); });
  const enabling = controller.enable();
  await permissionRequested;
  await controller.disable();
  grant({ receive: "granted" });
  await enabling;
  assert.equal(controller.wanted, false);
  assert.ok(calls.every((call) => call.method === "DELETE"));
});
