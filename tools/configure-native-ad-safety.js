"use strict";
const fs = require("node:fs");
const path = require("node:path");
const {apiBaseForBuild} = require("./mobile-network-policy.js");
const DEMO_APP_ID = "ca-app-pub-3940256099942544~3347511713";

function adTestConfig(environment, root = path.resolve(__dirname, "..")) {
  const filename = environment.GRIDSHARD_ADMOB_TEST_CONFIG;
  if (!filename) return {mode:"disabled", appId:DEMO_APP_ID, adUnitId:"", testingDevices:[]};
  if (environment.GRIDSHARD_LOCAL_DEBUG !== "1" || environment.GRIDSHARD_REMOTE_DEBUG !== "1"
      || !apiBaseForBuild(environment, true).startsWith("https://")) {
    throw new Error("Publisher ad test configuration requires explicit remote HTTPS debug mode.");
  }
  const target = fs.realpathSync(path.resolve(root, filename));
  const artifacts = fs.realpathSync(path.join(root, "artifacts"));
  const relative = path.relative(artifacts, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Ad test configuration must be inside ignored artifacts.");
  }
  const input = JSON.parse(fs.readFileSync(target, "utf8"));
  if (Object.keys(input).sort().join(",") !== "adUnitId,appId,testingDevices"
      || !/^ca-app-pub-\d{16}~\d{10}$/.test(input.appId)
      || !/^ca-app-pub-\d{16}\/\d{10}$/.test(input.adUnitId)
      || input.appId.split("~")[0] !== input.adUnitId.split("/")[0]
      || input.appId === DEMO_APP_ID
      || !Array.isArray(input.testingDevices) || input.testingDevices.length > 8
      || input.testingDevices.some(id => typeof id !== "string" || !/^[A-F0-9]{32}$/.test(id))) {
    throw new Error("Invalid publisher test configuration; no identifiers are logged.");
  }
  // An app-ID/UMP-only package is useful before a programmatic SDK test ID
  // is available. Native authorization refuses its own ad unit entirely.
  return {mode:input.testingDevices.length ? "test" : "ump-only", appId:input.appId, adUnitId:input.adUnitId, testingDevices:[...new Set(input.testingDevices)]};
}

function adBuildConfig(environment, root = path.resolve(__dirname, "..")) {
  if (environment.GRIDSHARD_ANDROID_PRODUCTION !== "1") return adTestConfig(environment, root);
  const input = JSON.parse(fs.readFileSync(path.join(root,"config/android-production.json"),"utf8"));
  if (environment.GRIDSHARD_LOCAL_DEBUG === "1" || environment.GRIDSHARD_REMOTE_DEBUG === "1"
      || environment.GRIDSHARD_ADMOB_TEST_CONFIG || environment.GRIDSHARD_ALLOW_INSECURE_MOBILE_API === "1"
      || environment.GRIDSHARD_APP_ID !== "com.gridshardgame.app" || input.appId !== environment.GRIDSHARD_APP_ID
      || apiBaseForBuild(environment,true) !== input.apiBaseUrl
      || input.apiBaseUrl !== "https://play.gridshardgame.com"
      || !/^ca-app-pub-\d{16}~\d{10}$/.test(input.admobAppId)
      || !/^ca-app-pub-\d{16}\/\d{10}$/.test(input.admobRewardedUnitId)
      || input.admobAppId.split("~")[0] !== input.admobRewardedUnitId.split("/")[0]
      || input.admobAppId === DEMO_APP_ID) {
    throw new Error("Production ads require canonical release identity, HTTPS and no debug/test configuration.");
  }
  return {mode:"live",appId:input.admobAppId,adUnitId:input.admobRewardedUnitId,testingDevices:[]};
}

function adSafetyManifest(source) {
  if (!source.includes('xmlns:tools=')) source = source.replace(/<manifest\b/, '<manifest xmlns:tools="http://schemas.android.com/tools"');
  const permissions = ["com.google.android.gms.permission.AD_ID", "android.permission.ACCESS_ADSERVICES_AD_ID",
    "android.permission.ACCESS_ADSERVICES_ATTRIBUTION", "android.permission.ACCESS_ADSERVICES_TOPICS"];
  for (const permission of permissions) {
    const escaped = permission.replace(/\./g,"\\.");
    source = source.replace(new RegExp(`\\s*<uses-permission\\b[^>]*android:name=["']${escaped}["'][^>]*(?:\\/>|>[\\s\\S]*?<\\/uses-permission>)\\s*`,"g"),"");
  }
  source = source.replace(/\s*<meta-data\b[^>]*android:name=["']com\.google\.android\.gms\.ads\.DELAY_APP_MEASUREMENT_INIT["'][^>]*\/>\s*/g, "");
  source = source.replace(/(<application\b[^>]*>)\s*/, '$1\n        <meta-data android:name="com.google.android.gms.ads.DELAY_APP_MEASUREMENT_INIT" android:value="true" />\n        ');
  source = source.replace(/\s*(<application\b)/, "\n    " + permissions.map(p => `<uses-permission android:name="${p}" tools:node="remove" />`).join("\n    ") + "\n    $1");
  return source.replace(/\n[ \t]*\n+/g,"\n");
}

function adSafetyGradle(source) {
  const marker = "// GRIDSHARD Ad Safety SDK (managed)";
  const managed = `${marker}\ndependencies { implementation 'com.google.android.gms:play-services-ads:25.4.0' }\n`;
  if (source.includes(marker)) return source.replace(/\/\/ GRIDSHARD Ad Safety SDK \(managed\)\r?\n[^\r\n]+\r?\n/, managed);
  return source.trimEnd() + "\n\n" + managed;
}

function configureNativeAdSafety(nativeRoot, repositoryRoot, config) {
  const java = path.join(nativeRoot, "app/src/main/java/com/gridshard/nativeui");
  fs.mkdirSync(java, {recursive:true});
  fs.copyFileSync(path.join(repositoryRoot,"tools/native-templates/GridshardAdSafety.java"), path.join(java,"GridshardAdSafety.java"));
  const fields = {mode:config.mode,app_id:config.appId,ad_unit_id:config.adUnitId,test_devices:config.testingDevices.join(",")};
  const values = Object.entries(fields).map(([name,value]) => `<string name="gridshard_ad_${name}" translatable="false">${value}</string>`).join("\n");
  fs.writeFileSync(path.join(nativeRoot,"app/src/main/res/values/gridshard_ad_safety.xml"), `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${values}\n</resources>\n`);
  const gradle = path.join(nativeRoot,"app/build.gradle");
  fs.writeFileSync(gradle, adSafetyGradle(fs.readFileSync(gradle,"utf8")));
  const manifest = path.join(nativeRoot,"app/src/main/AndroidManifest.xml");
  fs.writeFileSync(manifest, adSafetyManifest(fs.readFileSync(manifest,"utf8")));
}
module.exports = {DEMO_APP_ID, adTestConfig, adBuildConfig, adSafetyManifest, adSafetyGradle, configureNativeAdSafety};
