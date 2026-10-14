"use strict";
// Owned, blank headless browser fixture. Counts actual observer/translation work,
// not full-game FPS. Instrumentation never enters the production bundle.
const fs = require("node:fs");
const path = require("node:path");
const {execFileSync} = require("node:child_process");
const assert = require("node:assert/strict");
const {chromium} = require("@playwright/test");
const ROOT = path.resolve(__dirname, "..");
const BASE = "7f82db77fcc7a974ba60508d7a3c9536335f95f1";
const assertOnly = process.argv.includes("--assert-only");

async function inspect(browser, mode) {
  const page = await browser.newPage();
  try {
    await page.setContent('<title>GRIDSHARD</title><main><button id="settings" title="Savaş">Ayarlar</button></main><div id="battle-effect-layer"></div>');
    await page.evaluate(() => {
      window.auditCounts = {turkish:0, callbacks:0, records:0, fxWalks:0};
      const Observer = window.MutationObserver;
      window.MutationObserver = class extends Observer {
        constructor(callback) {
          super((records, observer) => {
            auditCounts.callbacks++;
            auditCounts.records += records.length;
            callback(records, observer);
          });
        }
      };
      const walk = document.createTreeWalker.bind(document);
      document.createTreeWalker = (root, ...args) => {
        if (root.closest?.("#battle-effect-layer")) auditCounts.fxWalks++;
        return walk(root, ...args);
      };
    });
    const source = mode === "baseline"
      ? execFileSync("git", ["show", BASE + ":client/src/i18n.js"], {cwd:ROOT, encoding:"utf8"})
      : fs.readFileSync(path.join(ROOT, "client/src/i18n.js"), "utf8");
    const marker = "function toTurkish(value) {";
    assert.equal(source.split(marker).length, 2, "translation instrumentation must match exactly once");
    await page.addScriptTag({content:source.replace(marker, marker + " globalThis.auditCounts.turkish++;")});
    await page.evaluate(() => GridshardI18n.apply("tr"));
    // A task boundary drains the real MutationObserver; no guessed sleep time.
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
    await page.evaluate(() => {
      for (const key of Object.keys(auditCounts)) auditCounts[key] = 0;
      const ui = document.querySelector("main");
      const effects = document.querySelector("#battle-effect-layer");
      for (let i=0; i<100; i++) {
        const text = document.createElement("span");
        text.textContent = "Seviye " + i;
        text.title = "Can " + i;
        ui.appendChild(text);
      }
      for (let i=0; i<300; i++) {
        const particle = document.createElement("span");
        particle.textContent = String(i);
        effects.appendChild(particle);
      }
    });
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 0)));
    const work = await page.evaluate(() => ({...auditCounts}));
    const correctness = await page.evaluate(async () => {
      const settings = document.querySelector("#settings");
      GridshardI18n.apply("en");
      await new Promise(resolve => setTimeout(resolve, 0));
      const english = settings.textContent;
      const englishTitle = settings.title;
      const effect = document.createElement("span");
      effect.dataset.i18nSource = "Çekirdek";
      effect.textContent = GridshardI18n.translateText("Çekirdek", "en");
      document.querySelector("#battle-effect-layer").appendChild(effect);
      await new Promise(resolve => setTimeout(resolve, 0));
      GridshardI18n.apply("tr");
      await new Promise(resolve => setTimeout(resolve, 0));
      const restored = settings.textContent;
      const restoredTitle = settings.title;
      const restoredEffect = effect.textContent;
      GridshardI18n.apply("en");
      await new Promise(resolve => setTimeout(resolve, 0));
      settings.textContent = "Mağaza";
      settings.title = "Ayarlar";
      await new Promise(resolve => setTimeout(resolve, 0));
      GridshardI18n.apply("tr");
      await new Promise(resolve => setTimeout(resolve, 0));
      return {english, englishTitle, restored, restoredTitle, restoredEffect,
        changedSource:settings.textContent, changedTitle:settings.title,
        explicitExternalTranslation:GridshardI18n.translateText("Settings", "tr")};
    });
    assert.equal(correctness.english, "Settings");
    assert.equal(correctness.englishTitle, "Battle");
    assert.equal(correctness.restored, "Ayarlar");
    assert.equal(correctness.restoredTitle, "Savaş");
    assert.equal(correctness.changedSource, "Mağaza");
    assert.equal(correctness.changedTitle, "Ayarlar");
    assert.equal(correctness.explicitExternalTranslation, "Ayarlar");
    if (mode === "current") {
      assert.equal(work.turkish, 0, "new Turkish DOM must not reverse-translate");
      assert.equal(work.fxWalks, 0, "new particles must not walk the FX subtree");
      assert.equal(correctness.restoredEffect, "Çekirdek", "an already visible effect follows language changes");
    } else {
      assert.ok(work.turkish > 0);
      assert.equal(work.fxWalks, 300);
    }
    return {mode, uiNodes:100, particles:300, ...work, correctness};
  } finally {await page.close();}
}

async function main() {
  const browser = await chromium.launch(process.env.CI ? {} : {channel:"chrome", headless:true});
  try {
    const results = [];
    for (const mode of assertOnly ? ["current"] : ["baseline", "current"]) results.push(await inspect(browser, mode));
    console.log(JSON.stringify({baseline:BASE, measuredAt:new Date().toISOString(), node:process.version, browser:browser.version(),
      platform:process.platform, kind:"real-DOM observer work; not FPS", results}, null, 2));
  } finally {await browser.close();}
}
main().catch(error => {console.error(error); process.exitCode = 1;});
