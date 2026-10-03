"use strict";
const fs = require("node:fs");
const path = require("node:path");

function androidOAuthLinks(source, apiBaseUrl, target) {
  const markers = /\s*<!-- GRIDSHARD_NATIVE_OAUTH_START -->[\s\S]*?<!-- GRIDSHARD_NATIVE_OAUTH_END -->/g;
  const clean = source.replace(markers, "");
  if (!target) return clean;
  const url = new URL(apiBaseUrl);
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash
    || url.port || !["", "/"].includes(url.pathname) || !/^[a-zA-Z0-9.-]+$/.test(url.hostname)) {
    throw new Error("Native OAuth App Link için standart HTTPS oyun kökeni gerekli.");
  }
  if (!["android", "android-test"].includes(target)) throw new Error("Geçersiz native OAuth hedefi.");
  let matches = 0;
  const result = clean.replace(/(<activity\b[^>]*>)([\s\S]*?)(<\/activity>)/g, (all, open, body, close) => {
    if (!/android:name\s*=\s*["'](?:[\w.]*\.)?MainActivity["']/.test(open)) return all;
    matches++;
    return `${open}${body.trimEnd()}\n            <!-- GRIDSHARD_NATIVE_OAUTH_START -->\n            <intent-filter android:autoVerify="true">\n                <action android:name="android.intent.action.VIEW" />\n                <category android:name="android.intent.category.DEFAULT" />\n                <category android:name="android.intent.category.BROWSABLE" />\n                <data android:scheme="https" android:host="${url.hostname}" android:path="/native-auth/${target}" />\n            </intent-filter>\n            <!-- GRIDSHARD_NATIVE_OAUTH_END -->\n        ${close}`;
  });
  if (matches !== 1) throw new Error("Native OAuth için tek MainActivity gerekli.");
  return result;
}

function configureNativeOAuth(nativeRoot, debugTarget = false, apiBaseUrl = process.env.GRIDSHARD_API_BASE_URL) {
  const filename = path.join(nativeRoot, "app/src/main/AndroidManifest.xml");
  const before = fs.readFileSync(filename, "utf8");
  const target = debugTarget === true ? null : debugTarget === "remote" ? "android-test" : "android";
  const after = androidOAuthLinks(before, apiBaseUrl, target);
  if (after !== before) fs.writeFileSync(filename, after, "utf8");
}
module.exports = {androidOAuthLinks, configureNativeOAuth};
