"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {configureNativeBranding} = require("./configure-native-branding.js");
const {insecureLocalDebugForBuild} = require("./mobile-network-policy.js");
const {configureNativeDisplay} = require("./configure-native-display.js");
const {configureNativeOAuth} = require("./configure-native-oauth.js");
const {configureNativePlayGames} = require("./configure-native-play-games.js");
const {configureNativeBilling} = require("./configure-native-billing.js");
const {DEMO_APP_ID, adBuildConfig, configureNativeAdSafety} = require("./configure-native-ad-safety.js");

function androidPortrait(source) {
  // Only the Capacitor main activity is changed; OAuth/system activities
  // retain their own policies. Fail on unexpected templates, never guess.
  let matches = 0;
  const output = source.replace(/<activity\b[^>]*>/g, (tag) => {
    if (!/\bandroid:name\s*=\s*["'](?:[\w.]*\.)?MainActivity["']/.test(tag)) return tag;
    matches += 1;
    const orientation = /\s+android:screenOrientation\s*=\s*["'][^"']*["']/g;
    return tag.replace(orientation, "").replace(/\s*(\/?)>$/, ' android:screenOrientation="portrait"$1>');
  });
  if (matches !== 1) throw new Error("AndroidManifest.xml içinde tek MainActivity bulunmalı.");
  return output;
}

function androidLocalDebugNetwork(source, allowCleartext = true) {
  let matches = 0;
  const output = source.replace(/<application\b[^>]*>/g, (tag) => {
    matches += 1;
    return tag.replace(/\s+android:(?:usesCleartextTraffic|allowBackup)\s*=\s*["'][^"']*["']/g, "")
      .replace(/\s*(\/?)>$/, ` android:usesCleartextTraffic="${allowCleartext}" android:allowBackup="false"$1>`);
  });
  if (matches !== 1) throw new Error("AndroidManifest.xml içinde tek application bulunmalı.");
  return output;
}

function androidNoBackup(source) {
  let matches = 0;
  const output = source.replace(/<application\b[^>]*>/g, (tag) => {
    matches += 1;
    return tag.replace(/\s+android:allowBackup\s*=\s*["'][^"']*["']/g, "")
      .replace(/\s*(\/?)>$/, ' android:allowBackup="false"$1>');
  });
  if (matches !== 1) throw new Error("AndroidManifest.xml içinde tek application bulunmalı.");
  return output;
}

function androidDebugAdMob(source, appId = DEMO_APP_ID) {
  // The SDK's startup provider needs an app ID even when server-side ads are
  // disabled. Default is Google's demo; publisher tests require a separately
  // validated remote-debug config and a native test-device gate.
  if (!/^ca-app-pub-\d{16}~\d{10}$/.test(appId)) throw new Error("Invalid AdMob application ID.");
  const declaration = `<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${appId}" />`;
  let applications = 0;
  const output = source.replace(/(<application\b[^>]*>)([\s\S]*?)(<\/application>)/g, (_all, open, body, close) => {
    applications += 1;
    let declarations = 0;
    const nextBody = body.replace(/<meta-data\b[^>]*?\/>|<meta-data\b[^>]*>[\s\S]*?<\/meta-data>/g, (tag) => {
      if (!/android:name\s*=\s*["']com\.google\.android\.gms\.ads\.APPLICATION_ID["']/.test(tag)) return tag;
      declarations += 1;
      return declaration;
    });
    if (declarations > 1) throw new Error("Android debug AdMob uygulama kimliği yinelenmiş.");
    return `${open}${declarations ? nextBody : "\n        " + declaration + body}${close}`;
  });
  if (applications !== 1) throw new Error("AndroidManifest.xml içinde tek application bulunmalı.");
  return output;
}

function plistValue(source, key, value, existingType) {
  const keyXml = `<key>${key}</key>`;
  const count = source.split(keyXml).length - 1;
  if (count > 1) throw new Error(`Info.plist yinelenen alan: ${key}`);
  if (count === 1) {
    const pattern = new RegExp(`${keyXml}\\s*${existingType}`);
    if (!pattern.test(source)) throw new Error(`Info.plist beklenmeyen alan biçimi: ${key}`);
    return source.replace(pattern, `${keyXml}\n\t${value}`);
  }
  if (!/<\/dict>\s*<\/plist>\s*$/.test(source)) throw new Error("Info.plist XML sözlüğü bekleniyor.");
  return source.replace(/<\/dict>\s*<\/plist>\s*$/, `\t${keyXml}\n\t${value}\n</dict>\n</plist>\n`);
}

function iosPortrait(source) {
  const portrait = "<array><string>UIInterfaceOrientationPortrait</string></array>";
  let output = plistValue(source, "UISupportedInterfaceOrientations", portrait, "<array>[\\s\\S]*?</array>");
  output = plistValue(output, "UISupportedInterfaceOrientations~ipad", portrait, "<array>[\\s\\S]*?</array>");
  // Older iPad versions require full screen for restricted orientations.
  // Modern windowed modes may override orientation: keep responsive CSS.
  return plistValue(output, "UIRequiresFullScreen", "<true/>", "<(?:true|false)\\s*/>");
}

function configure(platform) {
  const root = path.resolve(__dirname, "..");
  const adConfig = adBuildConfig(process.env, root);
  const targets = {
    android: ["android/app/src/main/AndroidManifest.xml", androidPortrait],
    ios: ["ios/App/App/Info.plist", iosPortrait],
  };
  if (platform === "web") return;
  if (!targets[platform]) throw new Error("Platform android veya ios olmalı.");
  const [defaultRelative, transform] = targets[platform];
  const nativeDebugTarget = process.env.GRIDSHARD_LOCAL_DEBUG === "1"
    ? (process.env.GRIDSHARD_REMOTE_DEBUG === "1" ? "remote" : true) : false;
  const relative = platform === "android" && process.env.GRIDSHARD_LOCAL_DEBUG === "1"
    ? (nativeDebugTarget === "remote" ? ".mobile-debug/remote-android/app/src/main/AndroidManifest.xml" : `.mobile-debug/${defaultRelative}`)
    : defaultRelative;
  const filename = path.join(root, relative);
  if (!fs.existsSync(filename)) throw new Error(`Önce yerel mobil projeyi oluşturun: ${relative}`);
  const before = fs.readFileSync(filename, "utf8");
  const oriented = platform === "android" ? androidNoBackup(transform(before)) : transform(before);
  const networked = platform === "android"
    ? androidLocalDebugNetwork(oriented, insecureLocalDebugForBuild(process.env)) : oriented;
  const after = platform === "android"
    ? androidDebugAdMob(networked, adConfig.appId) : networked;
  if (before !== after) fs.writeFileSync(filename, after, "utf8");
  configureNativeBranding(platform, root, nativeDebugTarget);
  if (platform === "android") {
    configureNativeBilling(root);
    const nativeRoot = path.resolve(filename, "../../../..");
    configureNativeDisplay(nativeRoot, root);
    configureNativeOAuth(nativeRoot, nativeDebugTarget);
    configureNativePlayGames(nativeRoot, root);
    configureNativeAdSafety(nativeRoot, root, adConfig);
    if (!nativeDebugTarget) {
      const gradle = path.join(nativeRoot,"app/build.gradle");
      const beforeGradle = fs.readFileSync(gradle,"utf8");
      const managed = "apply from: rootProject.file('../tools/native-templates/android-release-signing.gradle')";
      if (!beforeGradle.includes(managed)) fs.writeFileSync(gradle,beforeGradle.trimEnd()+"\n\n"+managed+"\n");
    }
  }
  console.log(`${platform}: yerel portre yönü ve kaynak marka görselleri yapılandırıldı.`);
}

if (require.main === module) {
  configure(process.argv[2] || process.env.CAPACITOR_PLATFORM_NAME);
}
module.exports = {androidPortrait, androidLocalDebugNetwork, androidNoBackup, androidDebugAdMob, iosPortrait};
