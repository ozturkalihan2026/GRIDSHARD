"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const { createRequire } = require("node:module");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "capacitor.config.js"), "utf8");

function configuration(env = {}) {
  const context = { module: { exports: {} }, process: { env }, require: createRequire(path.join(root, "capacitor.config.js")) };
  vm.runInNewContext(source, context, { filename: "capacitor.config.js" });
  return context.module.exports;
}

test("native default matches the registered Play Console package", () => {
  const config = configuration();
  assert.equal(config.appId, "com.gridshardgame.app");
  assert.equal(config.appName, "GRIDSHARD");
  assert.equal(config.server.androidScheme, "https");
  assert.equal(config.server.cleartext, false);
  assert.equal(config.android.allowMixedContent, false);
});

test("HTTPS debug keeps its separate identity without opening plaintext or mixed content", () => {
  const config = configuration({
    GRIDSHARD_LOCAL_DEBUG: "1",
    GRIDSHARD_APP_ID: "com.gridshardgame.app",
    GRIDSHARD_API_BASE_URL: "https://play.gridshardgame.com",
  });
  assert.equal(config.appId, "com.gridshard.localdebug");
  assert.equal(config.android.path, ".mobile-debug/android");
  assert.equal(config.server.cleartext, false);
  assert.equal(config.android.allowMixedContent, false);
});

test("only an explicitly selected private LAN debug API opens plaintext", () => {
  const env = { GRIDSHARD_LOCAL_DEBUG: "1", GRIDSHARD_ALLOW_INSECURE_MOBILE_API: "1",
    GRIDSHARD_API_BASE_URL: "http://192.168.1.105:8879" };
  assert.equal(configuration(env).server.cleartext, true);
  assert.equal(configuration(env).android.allowMixedContent, true);
  assert.throws(() => configuration({ ...env, GRIDSHARD_LOCAL_DEBUG: "0" }), /HTTPS/);
  assert.throws(() => configuration({ ...env, GRIDSHARD_ALLOW_INSECURE_MOBILE_API: "0" }), /HTTPS/);
  assert.throws(() => configuration({ ...env, GRIDSHARD_API_BASE_URL: "http://play.gridshardgame.com" }), /HTTPS/);
  const https = configuration({ ...env, GRIDSHARD_API_BASE_URL: "https://play.gridshardgame.com" });
  assert.equal(https.server.cleartext, false);
  assert.equal(https.android.allowMixedContent, false);
});

test("remote debug is separate from LAN debug and the permanent store identity", () => {
  const env = { GRIDSHARD_LOCAL_DEBUG: "1", GRIDSHARD_REMOTE_DEBUG: "1",
    GRIDSHARD_API_BASE_URL: "https://play.gridshardgame.com" };
  const config = configuration(env);
  assert.equal(config.appId, "com.gridshard.remotedebug");
  assert.equal(config.appName, "GRIDSHARD TEST");
  assert.equal(config.android.path, ".mobile-debug/remote-android");
  assert.equal(config.server.cleartext, false);
  assert.equal(config.android.allowMixedContent, false);
  assert.throws(() => configuration({ ...env, GRIDSHARD_LOCAL_DEBUG: "0" }), /LOCAL_DEBUG/);
  assert.throws(() => configuration({ ...env, GRIDSHARD_API_BASE_URL: "" }), /zorunludur/);
  assert.throws(() => configuration({ ...env, GRIDSHARD_API_BASE_URL: "http://192.168.1.2", GRIDSHARD_ALLOW_INSECURE_MOBILE_API: "1" }), /HTTPS/);
});

test("explicit native application ID configuration still works", () => {
  assert.equal(configuration({ GRIDSHARD_APP_ID: "com.gridshard.fixture" }).appId,
    "com.gridshard.fixture");
  assert.equal(configuration({ GRIDSHARD_LOCAL_DEBUG: "0" }).appId,
    "com.gridshardgame.app");
});

test("mobile release and server receipt example settings share the same package", () => {
  const example = fs.readFileSync(path.join(root, ".env.example"), "utf8");
  for (const key of ["GRIDSHARD_APP_ID", "GRIDSHARD_GOOGLE_PLAY_PACKAGE_NAME"]) {
    const matches = [...example.matchAll(new RegExp(`^${key}=(.*)$`, "gm"))];
    assert.equal(matches.length, 1, key);
    assert.equal(matches[0][1].trim(), configuration().appId, key);
  }
});

test("new rewarded unit replaces the retired account without enabling live AdMob or iOS", () => {
  const example = fs.readFileSync(path.join(root, ".env.example"), "utf8");
  const value = (key) => {
    const matches = [...example.matchAll(new RegExp(`^${key}=(.*)$`, "gm"))];
    assert.equal(matches.length, 1, key);
    return matches[0][1].trim();
  };
  const androidUnit = value("GRIDSHARD_ADMOB_REWARDED_AD_UNIT_ANDROID");
  assert.equal(androidUnit, "ca-app-pub-4974825529326987/6776291719");
  assert.match(androidUnit, /^ca-app-pub-\d{16}\/\d{10}$/);
  assert.equal(value("GRIDSHARD_ADMOB_SSV_ENABLED"), "0");
  assert.equal(value("GRIDSHARD_ADMOB_REWARDED_AD_UNIT_IOS"), "");
  const purchases = fs.readFileSync(path.join(root, "docs/STORE_PURCHASES.md"), "utf8");
  assert.ok(!example.includes("9009542461979439"));
  assert.ok(!purchases.includes("9009542461979439"));
  assert.ok(purchases.includes("pub-4974825529326987"));
  assert.ok(purchases.includes(androidUnit));
  assert.ok(purchases.includes('android:value="ca-app-pub-4974825529326987~9642213924"'));
});
