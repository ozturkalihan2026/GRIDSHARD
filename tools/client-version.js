"use strict";

const fs = require("node:fs");
const path = require("node:path");

// The working client's release is independent of the last deployed server and
// production signing configuration. Never infer a client version from /health.
function clientVersion(root) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const release = { versionName: pkg.version, versionCode: pkg.gridshard?.androidVersionCode };
  if (typeof release.versionName !== "string" || !/^\d+\.\d+\.\d+$/.test(release.versionName)
      || !Number.isSafeInteger(release.versionCode) || release.versionCode < 1 || release.versionCode > 2100000000) {
    throw new Error("package.json istemci sürümü ve gridshard.androidVersionCode geçerli olmalı.");
  }
  return release;
}

function assertClientVersion(html, release) {
  const boot = [...html.matchAll(/<span\b[^>]*\bid="boot-version"[^>]*\bdata-version="([^"]+)"[^>]*>([^<]*)<\/span>/g)];
  const settings = [...html.matchAll(/<dd\b[^>]*\bid="ui-build-version"[^>]*>([^<]*)<\/dd>/g)];
  if (boot.length !== 1 || settings.length !== 1
      || boot[0][1] !== release.versionName || boot[0][2].trim() !== `Sürüm: ${release.versionName}`
      || settings[0][1].trim() !== release.versionName) {
    throw new Error(`İstemci sürüm uyuşmazlığı: açılış ve ayarlar ${release.versionName} olmalı.`);
  }
}

function androidVersion(source, release) {
  if ([...source.matchAll(/\bversionCode\s+\d+/g)].length !== 1
      || [...source.matchAll(/\bversionName\s+"[^"]+"/g)].length !== 1) {
    throw new Error("Android şablonunda tek versionCode ve versionName bulunmalı.");
  }
  return source.replace(/\bversionCode\s+\d+/, `versionCode ${release.versionCode}`)
    .replace(/\bversionName\s+"[^"]+"/, `versionName "${release.versionName}"`);
}

module.exports = { clientVersion, assertClientVersion, androidVersion };
