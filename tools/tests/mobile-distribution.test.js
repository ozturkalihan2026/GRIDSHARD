"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const {policy, withoutMonetization, packagedScripts} = require("../mobile-distribution-policy.js");
const {withoutMonetizationManifest, withoutMonetizationGradle, configureNativeWithoutMonetization} = require("../configure-native-without-monetization.js");
const {configureNativeDisplay} = require("../configure-native-display.js");
const {getPlugins} = require("@capacitor/cli/dist/plugin.js");
const root = path.resolve(__dirname, "../..");

test("release boundary preserves 2.4 and excludes monetization in 2.5 and later", () => {
  for (const version of ["2.3.0", "2.4.0", "2.4.10"]) assert.equal(withoutMonetization(version), false);
  for (const version of ["2.5.0", "2.5.1", "2.10.0", "3.0.0"]) assert.equal(withoutMonetization(version), true);
  assert.throws(() => withoutMonetization("2.5"));
  const inputs = ["./src/first.js", "./src/native-store.js", "./src/app.js"];
  assert.deepEqual(packagedScripts(inputs, "2.4.0"), inputs);
  assert.deepEqual(packagedScripts(inputs, "2.5.0"), [inputs[0], inputs[2]]);
  assert.ok(fs.existsSync(path.join(root, "client/src/native-store.js")));
});

test("real Capacitor resolver excludes both SDKs and retains auth, storage and push", async () => {
  const plugins = await getPlugins({app:{rootDir:root, extConfig:{includePlugins:policy.included_plugins}}}, "android");
  assert.deepEqual(plugins.map(p => p.id).sort(), [...policy.included_plugins].sort());
  assert.ok(policy.excluded_plugins.every(id => !plugins.some(p => p.id === id)));
});

test("Capacitor config wires the version policy without changing release 2.4", () => {
  const source = fs.readFileSync(path.join(root, "capacitor.config.js"), "utf8");
  for (const version of ["2.4.0", "2.5.0"]) {
    const context = vm.createContext({module:{exports:{}}, process:{env:{}}, require(name) {
      if (name === "./package.json") return {version};
      return require(path.join(root, name));
    }});
    vm.runInContext(source, context);
    const config = context.module.exports;
    assert.equal(config.appId, "com.gridshardgame.app");
    assert.equal(config.plugins.PushNotifications.presentationOptions[0], "sound");
    assert.deepEqual(config.includePlugins, version === "2.5.0" ? policy.included_plugins : undefined);
  }
});

test("reused Android project sheds generated SDK sources and registration; source templates survive", t => {
  const native = fs.mkdtempSync(path.join(os.tmpdir(), "gridshard-free-android-"));
  t.after(() => fs.rmSync(native, {recursive:true, force:true}));
  const write = (relative, text) => {
    const target = path.join(native, relative);
    fs.mkdirSync(path.dirname(target), {recursive:true}); fs.writeFileSync(target, text);
  };
  write("app/src/main/AndroidManifest.xml", '<manifest xmlns:android="http://schemas.android.com/apk/res/android"><uses-permission android:name="com.android.vending.BILLING"/><application><meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="old" /></application></manifest>');
  write("app/build.gradle", "// keep other dependencies\n// GRIDSHARD Ad Safety SDK (managed)\ndependencies { implementation 'com.google.android.gms:play-services-ads:25.4.0' }\n");
  write("app/src/main/java/com/example/MainActivity.java", "import com.getcapacitor.BridgeActivity;\npublic class MainActivity extends BridgeActivity {}\n");
  write("app/src/main/java/com/gridshard/nativeui/GridshardAdSafety.java", "old generated copy");
  write("app/src/main/res/values/gridshard_ad_safety.xml", "old ad identifiers");
  const templates = ["GridshardActivity.java", "GridshardAdSafety.java", "GridshardBillingDiagnostics.java"];
  const before = templates.map(name => fs.readFileSync(path.join(root, "tools/native-templates", name), "utf8"));
  configureNativeDisplay(native, root, {excludeMonetization:true});
  configureNativeWithoutMonetization(native);
  const activity = fs.readFileSync(path.join(native, "app/src/main/java/com/gridshard/nativeui/GridshardActivity.java"), "utf8");
  assert.doesNotMatch(activity, /GridshardAdSafety/);
  assert.match(activity, /registerPlugin\(GridshardPlayGames.class\)/);
  const manifest = fs.readFileSync(path.join(native, "app/src/main/AndroidManifest.xml"), "utf8");
  assert.doesNotMatch(manifest, /com\.google\.android\.gms\.ads\./);
  assert.match(manifest, /com.android.vending.BILLING" tools:node="remove"/);
  assert.match(manifest, /firebase_messaging_auto_init_enabled" android:value="false"/);
  assert.equal(withoutMonetizationManifest(manifest), manifest);
  const gradle = fs.readFileSync(path.join(native, "app/build.gradle"), "utf8");
  assert.doesNotMatch(gradle, /play-services-ads/);
  assert.equal(withoutMonetizationGradle(gradle), gradle);
  assert.ok(!fs.existsSync(path.join(native, "app/src/main/res/values/gridshard_ad_safety.xml")));
  assert.deepEqual(templates.map(name => fs.readFileSync(path.join(root, "tools/native-templates", name), "utf8")), before);
});
