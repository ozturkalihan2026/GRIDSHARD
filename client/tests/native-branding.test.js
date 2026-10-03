"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {nativeAssetPlan, androidSplashStyles} = require("../../tools/configure-native-branding.js");
const root = path.resolve(__dirname,"../..");

test("native artwork is complete and debug/production targets stay separate", () => {
  for (const platform of ["android","ios"]) {
    const plan = nativeAssetPlan(platform,root);
    assert.equal(plan.length,platform === "android" ? 33 : 4);
    for (const [source,target] of plan) {
      assert.ok(fs.statSync(source).isFile(),source);
      assert.ok(source.startsWith(path.join(root,"native-assets")));
      assert.ok(target.startsWith(path.join(root,platform)));
    }
  }
  const debug = nativeAssetPlan("android",root,true);
  assert.ok(debug.every(([,target]) => target.startsWith(path.join(root,".mobile-debug","android"))));
  const remoteDebug = nativeAssetPlan("android",root,"remote");
  assert.ok(remoteDebug.every(([,target]) => target.startsWith(path.join(root,".mobile-debug","remote-android"))));
  assert.deepEqual(remoteDebug.map(([source]) => source), debug.map(([source]) => source));
  assert.throws(() => nativeAssetPlan("web",root),/Platform/);
});

test("Android splash themes are idempotent and unrelated styles stay unchanged", () => {
  const before = '<resources>\n<style name="AppTheme" parent="Theme.AppCompat">\n<item name="android:textColor">#FFFFFF</item>\n</style>\n<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.NoActionBar"></style>\n<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">\n<item name="android:background">@drawable/splash</item>\n</style>\n</resources>\n';
  const after = androidSplashStyles(before);
  assert.equal(androidSplashStyles(after),after);
  assert.match(after,/windowSplashScreenAnimatedIcon">@drawable\/gridshard_splash_icon/);
  assert.match(after,/android:background">@drawable\/gridshard_splash/);
  assert.ok(after.includes('<item name="android:textColor">#FFFFFF</item>'));
  const crlf = before.replace(/\n/g,"\r\n");
  assert.equal(androidSplashStyles(crlf),after.replace(/\n/g,"\r\n"));
  assert.throws(() => androidSplashStyles("<resources/>"),/tek/);
});

test("native application icon remains exactly the same as the store artwork", () => {
  assert.deepEqual(fs.readFileSync(path.join(root,"native-assets/ios/AppIcon-512@2x.png")),fs.readFileSync(path.join(root,"client/assets/branding/gridshard-store-icon-1024.png")));
  const script = fs.readFileSync(path.join(root,"tools/configure-native-orientation.js"),"utf8");
  assert.ok(script.includes('configureNativeBranding(platform, root, nativeDebugTarget)'));
  assert.ok(script.includes("androidNoBackup(transform(before))"));
});
