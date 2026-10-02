"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { outputPlan, renderPage, pagePath, adsText, ASSETS, PAGES } = require("../build-public-site.js");
const { content } = require("../../public-site/content.js");
const root = path.resolve(__dirname, "../..");
const hash = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

test("both languages have every public route and a matching language switch", () => {
  for (const language of ["tr", "en"]) {
    for (const page of PAGES) {
      const html = renderPage(language, page);
      assert.match(html, new RegExp(`<html lang="${language}">`));
      assert.ok(html.includes(content[language][page].title));
      assert.ok(html.includes(`href="${pagePath(language === "tr" ? "en" : "tr", page)}" lang=`));
      assert.match(html, /<h1>/);
      assert.match(html, /gridshardgame@gmail\.com/);
    }
  }
});

test("the static site has no game code, credentials, login form or tracking script", () => {
  const files = outputPlan(root, "pub-4974825529326987");
  assert.equal(files.size, 19);
  for (const [file, bytes] of files) {
    assert.doesNotMatch(file, /(?:^|\/)(?:\.env|server|src|node_modules|data|README|content\.js)(?:\/|$)/);
    if (file.endsWith(".html")) {
      assert.doesNotMatch(bytes.toString(), /<script\b|<form\b|localStorage|sessionStorage|Bearer\s|G-[A-Z0-9]+|ca-app-pub-/);
    }
  }
  assert.match(files.get("_headers").toString(), /default-src 'none'/);
  assert.match(files.get("_headers").toString(), /frame-ancestors 'none'/);
  assert.ok(files.has("404.html"), "No implicit single-page app fallback for missing files.");
});

test("only a real correctly shaped public publisher ID generates app-ads.txt", () => {
  assert.equal(adsText("pub-4974825529326987"), "google.com, pub-4974825529326987, DIRECT, f08c47fec0942fa0\n");
  for (const invalid of ["pub-0000000000000000", "pub-example", "ca-app-pub-4974825529326987~1", "4974825529326987", "pub-4974825529326987\nmalicious"]) {
    assert.throws(() => adsText(invalid));
  }
  assert.equal(outputPlan(root, "").has("app-ads.txt"), false);
  assert.equal(fs.readFileSync(path.join(root, "public-site/app-ads.txt"), "utf8").trim(), adsText("pub-4974825529326987").trim());
});

test("deletion instructions work without login or app reinstall and do not request secrets", () => {
  for (const language of ["tr", "en"]) {
    const html = renderPage(language, "delete-account");
    assert.match(html, /mailto:gridshardgame@gmail\.com\?subject=/);
    assert.match(html, /&amp;body=/);
    const subject = decodeURIComponent(html.match(/\?subject=([^&]+)/)[1]);
    assert.equal(subject, content[language].deletionSubject);
    assert.ok(html.includes(content[language]["delete-account"].intro));
    assert.doesNotMatch(html, /<input|<form|fetch\(/);
  }
  assert.match(renderPage("tr", "delete-account"), /Şifre, oturum belirteci/);
  assert.match(renderPage("en", "delete-account"), /Do not send passwords/);
});

test("original branding assets are copied without alteration", () => {
  const files = outputPlan(root, "");
  for (const [source, target] of ASSETS) {
    assert.equal(hash(files.get(target)), hash(fs.readFileSync(path.join(root, source))));
  }
  assert.match(files.get("site.css").toString(), /prefers-reduced-motion/);
});

test("pre-release state and unfinished production policy are disclosed", () => {
  assert.match(renderPage("tr", "home"), /Google Play yayını hazırlanıyor/);
  assert.match(renderPage("en", "home"), /Preparing for Google Play/);
  assert.match(renderPage("tr", "privacy"), /en fazla 30 gün/);
  assert.match(renderPage("tr", "privacy"), /varsayılan olarak kapalıdır/);
  assert.match(renderPage("tr", "privacy"), /kesin saklama takvimi/);
  assert.match(renderPage("en", "privacy"), /precise retention schedule/);
});
