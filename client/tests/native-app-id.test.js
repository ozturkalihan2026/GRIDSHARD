"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "../..");
const source = fs.readFileSync(path.join(root, "capacitor.config.js"), "utf8");

function configuration(env = {}) {
  const context = { module: { exports: {} }, process: { env } };
  vm.runInNewContext(source, context, { filename: "capacitor.config.js" });
  return context.module.exports;
}

test("native default matches the registered Play Console package", () => {
  const config = configuration();
  assert.equal(config.appId, "com.gridshardgame.app");
  assert.equal(config.appName, "GRIDSHARD");
  assert.equal(config.server.androidScheme, "https");
  assert.equal(config.server.cleartext, undefined);
  assert.equal(config.android.allowMixedContent, false);
});

test("local debug keeps its separate identity, path and network settings", () => {
  const config = configuration({
    GRIDSHARD_LOCAL_DEBUG: "1",
    GRIDSHARD_APP_ID: "com.gridshardgame.app",
  });
  assert.equal(config.appId, "com.gridshard.localdebug");
  assert.equal(config.android.path, ".mobile-debug/android");
  assert.equal(config.server.cleartext, true);
  assert.equal(config.android.allowMixedContent, true);
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
