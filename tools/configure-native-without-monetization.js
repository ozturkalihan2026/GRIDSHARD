"use strict";

const fs = require("node:fs");
const path = require("node:path");
const {adSafetyManifest} = require("./configure-native-ad-safety.js");

function withoutMonetizationManifest(source) {
  // Preserve Firebase opt-in and remove advertising/billing permissions even
  // if a future transitive dependency tries to merge them back into the app.
  source = adSafetyManifest(source);
  source = source.replace(/\s*<meta-data\b[^>]*android:name=["']com\.google\.android\.gms\.ads\.[^"']+["'][^>]*\/>/g, "");
  source = source.replace(/\s*<uses-permission\b[^>]*android:name=["']com\.android\.vending\.BILLING["'][^>]*(?:\/>|>[\s\S]*?<\/uses-permission>)/g, "");
  return source.replace(/\s*(<application\b)/,
    '\n    <uses-permission android:name="com.android.vending.BILLING" tools:node="remove" />\n    $1')
    .replace(/\s*<\/application>/g, '\n    </application>');
}

function withoutMonetizationGradle(source) {
  return source.replace(/\r?\n\/\/ GRIDSHARD Ad Safety SDK \(managed\)\r?\ndependencies \{ implementation 'com\.google\.android\.gms:play-services-ads:[^']+' \}\r?\n?/, "\n");
}

function configureNativeWithoutMonetization(nativeRoot) {
  const manifest = path.join(nativeRoot, "app/src/main/AndroidManifest.xml");
  const gradle = path.join(nativeRoot, "app/build.gradle");
  fs.writeFileSync(manifest, withoutMonetizationManifest(fs.readFileSync(manifest, "utf8")));
  fs.writeFileSync(gradle, withoutMonetizationGradle(fs.readFileSync(gradle, "utf8")));
  // Only generated copies are removed. The canonical Java templates and the
  // npm dependencies remain in the repository/dependency lockfile.
  for (const relative of ["app/src/main/java/com/gridshard/nativeui/GridshardAdSafety.java",
    "app/src/main/res/values/gridshard_ad_safety.xml"]) {
    const target = path.join(nativeRoot, relative);
    if (fs.existsSync(target)) fs.unlinkSync(target);
  }
}

module.exports = {withoutMonetizationManifest, withoutMonetizationGradle, configureNativeWithoutMonetization};
