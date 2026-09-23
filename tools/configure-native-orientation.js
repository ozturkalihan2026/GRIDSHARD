"use strict";

const fs = require("node:fs");
const path = require("node:path");

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
  const targets = {
    android: ["android/app/src/main/AndroidManifest.xml", androidPortrait],
    ios: ["ios/App/App/Info.plist", iosPortrait],
  };
  if (platform === "web") return;
  if (!targets[platform]) throw new Error("Platform android veya ios olmalı.");
  const [relative, transform] = targets[platform];
  const filename = path.join(root, relative);
  if (!fs.existsSync(filename)) throw new Error(`Önce yerel mobil projeyi oluşturun: ${relative}`);
  const before = fs.readFileSync(filename, "utf8");
  const after = transform(before);
  if (before !== after) fs.writeFileSync(filename, after, "utf8");
  console.log(`${platform}: yerel portre yönü yapılandırıldı.`);
}

if (require.main === module) {
  configure(process.argv[2] || process.env.CAPACITOR_PLATFORM_NAME);
}
module.exports = {androidPortrait, iosPortrait};
