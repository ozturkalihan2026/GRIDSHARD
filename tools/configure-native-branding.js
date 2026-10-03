"use strict";

// Apply the original GRIDSHARD2.1 artwork only. Orientation, backup exclusions,
// network policy, activity lifecycle and server configuration are left alone.
const fs = require("node:fs");
const path = require("node:path");

const DENSITIES = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"];
const ICONS = ["ic_launcher", "ic_launcher_round", "ic_launcher_foreground", "ic_launcher_background", "ic_launcher_monochrome"];

function nativeAssetPlan(platform, root, localDebug = false) {
  const source = path.join(root, "native-assets", platform);
  if (platform === "android") {
    const res = path.join(source, "res");
    const target = path.join(root, ...(localDebug ? [".mobile-debug"] : []), localDebug === "remote" ? "remote-android" : "android", "app", "src", "main", "res");
    const names = [
      ...DENSITIES.flatMap(density => [
        ...ICONS.map(icon => `mipmap-${density}/${icon}.png`),
        `drawable-${density}/gridshard_splash_icon.png`,
      ]),
      "drawable/gridshard_splash.xml",
      "mipmap-anydpi-v26/ic_launcher.xml",
      "mipmap-anydpi-v26/ic_launcher_round.xml",
    ];
    return names.map(name => [path.join(res, name), path.join(target, name)]);
  }
  if (platform === "ios") {
    const target = path.join(root, "ios", "App", "App", "Assets.xcassets");
    return [
      [path.join(source, "AppIcon-512@2x.png"), path.join(target, "AppIcon.appiconset", "AppIcon-512@2x.png")],
      ...["splash-2732x2732.png", "splash-2732x2732-1.png", "splash-2732x2732-2.png"].map(name =>
        [path.join(source, "splash-2732x2732.png"), path.join(target, "Splash.imageset", name)]),
    ];
  }
  throw new Error("Platform android veya ios olmalı.");
}

function styleItem(text, styleName, itemName, value) {
  const escaped = styleName.replace(/\./g, "\\.");
  const pattern = new RegExp(`(<style\\s+name="${escaped}"[^>]*>)([\\s\\S]*?)(\\n?[ \\t]*</style>)`, "g");
  if ((text.match(pattern) || []).length !== 1) throw new Error(`styles.xml içinde tek ${styleName} teması bulunmalı.`);
  return text.replace(pattern, (_all, open, body, close) => {
    const item = `<item name="${itemName}">${value}</item>`;
    const existing = new RegExp(`<item\\s+name="${itemName.replace(/[:.]/g, "\\$&")}"\\s*>[^<]*</item>`);
    if (existing.test(body)) return `${open}${body.replace(existing, item)}${close}`;
    return `${open}${body.replace(/\s*$/, "")}\n        ${item}${close}`;
  });
}

function androidSplashStyles(source) {
  let output = source.replace(/\r\n/g, "\n");
  output = styleItem(output, "AppTheme.NoActionBar", "android:windowBackground", "@color/gridshard_window_background");
  output = styleItem(output, "AppTheme.NoActionBarLaunch", "android:background", "@drawable/gridshard_splash");
  output = styleItem(output, "AppTheme.NoActionBarLaunch", "windowSplashScreenBackground", "@color/gridshard_window_background");
  output = styleItem(output, "AppTheme.NoActionBarLaunch", "windowSplashScreenAnimatedIcon", "@drawable/gridshard_splash_icon");
  return source.includes("\r\n") ? output.replace(/\n/g, "\r\n") : output;
}

function configureNativeBranding(platform, root, localDebug = false) {
  const plan = nativeAssetPlan(platform, root, localDebug);
  for (const [source] of plan) {
    if (!fs.existsSync(source) || !fs.lstatSync(source).isFile()) {
      throw new Error(`Marka görseli eksik: ${path.relative(root, source)}`);
    }
  }
  let stylesPath;
  let stylesBefore;
  let stylesAfter;
  if (platform === "android") {
    const res = path.dirname(path.dirname(plan[0][1]));
    stylesPath = path.join(res, "values", "styles.xml");
    stylesBefore = fs.readFileSync(stylesPath, "utf8");
    stylesAfter = androidSplashStyles(stylesBefore);
  } else if (plan.some(([, target]) => !fs.existsSync(path.dirname(target)))) {
    throw new Error("iOS AppIcon/Splash görsel katalogları bulunamadı; beklenmeyen şablonda devam edilmez.");
  }
  for (const [source, target] of plan) {
    const bytes = fs.readFileSync(source);
    if (fs.existsSync(target) && fs.readFileSync(target).equals(bytes)) continue;
    fs.mkdirSync(path.dirname(target), { recursive:true });
    fs.writeFileSync(target, bytes);
  }
  if (stylesPath) {
    if (stylesAfter !== stylesBefore) fs.writeFileSync(stylesPath, stylesAfter, "utf8");
    const colors = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="gridshard_window_background">#07142B</color>\n</resources>\n';
    const colorsPath = path.join(path.dirname(stylesPath), "gridshard_colors.xml");
    if (!fs.existsSync(colorsPath) || fs.readFileSync(colorsPath, "utf8") !== colors) {
      fs.writeFileSync(colorsPath, colors, "utf8");
    }
  }
}

module.exports = {nativeAssetPlan, androidSplashStyles, configureNativeBranding};
