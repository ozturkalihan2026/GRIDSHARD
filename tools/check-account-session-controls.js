"use strict";

// A source-only, loopback UI check. No app build, live API, native sign-in or deployment.
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const {chromium} = require("@playwright/test");

async function check() {
  const client = path.resolve(__dirname, "../client");
  const source = fs.readFileSync(path.join(client, "index.html"), "utf8");
  const dialog = source.match(/<dialog id="account-session-recovery"[\s\S]*?<\/dialog>/)?.[0];
  assert.ok(dialog);
  const styles = ["styles.css", "canon.css", "account-session-controls.css"];
  const scripts = ["i18n-catalog.js", "i18n.js", "account-session-controls.js"];
  const allowed = new Set([...styles, ...scripts].map(file => `/src/${file}`));
  const server = http.createServer((request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/") {
      response.setHeader("Content-Type", "text/html; charset=utf-8");
      response.end(`<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${styles.map(file => `<link rel="stylesheet" href="/src/${file}">`).join("")}</head><body data-boot="loading"><section class="boot-screen">Profil geri getiriliyor…</section>${dialog}${scripts.map(file => `<script src="/src/${file}"></script>`).join("")}</body></html>`);
    } else if (allowed.has(url.pathname)) {
      response.setHeader("Content-Type", url.pathname.endsWith(".css") ? "text/css; charset=utf-8" : "application/javascript; charset=utf-8");
      response.end(fs.readFileSync(path.join(client, url.pathname.slice(1))));
    } else { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch();
    const origin = `http://127.0.0.1:${server.address().port}`;
    const screenshots = path.resolve(__dirname, "../artifacts/account-revocation-20261005/layout");
    fs.mkdirSync(screenshots, {recursive:true});
    let checks = 0;
    for (const viewport of [{width:1280, height:900}, {width:393, height:852}, {width:320, height:740}, {width:740, height:320}]) {
      for (const language of ["tr", "en"]) {
        const page = await browser.newPage({viewport});
        const failures = [];
        page.on("pageerror", error => failures.push(error.message));
        page.on("request", request => assert.ok(request.url().startsWith(origin), "No external requests"));
        await page.goto(origin);
        await page.evaluate(async language => {
          GridshardI18n.apply(language);
          window.controls = new GridshardAccountSessionControls({document,
            auth:{deviceId:() => "fixture"}, playGames:{configured:true, begin:async() => { throw new Error("fixture rejection"); }},
            ready:Promise.resolve(), playerId:"remembered-fixture", reload:() => { throw new Error("Unexpected reload"); }});
          await controls.openRecovery();
        }, language);
        const panel = page.locator("#account-session-recovery");
        await assertPanel(page, panel, viewport);
        assert.equal(await panel.locator("h2").textContent(), language === "tr" ? "Hesabına yeniden giriş yap" : "Sign in to your account again");
        await page.locator("#account-session-recovery-login").click();
        await page.waitForFunction(() => !controls.busy);
        await assertPanel(page, panel, viewport);
        assert.match(await page.locator("#account-session-recovery-status").textContent(), language === "tr" ? /Profilin değiştirilmedi/ : /profile has not been changed/);
        await page.keyboard.press("Escape");
        assert.equal(await panel.evaluate(element => element.open), true);
        assert.equal(await page.evaluate(() => !!document.activeElement.closest("#account-session-recovery")), true);
        await page.screenshot({path:path.join(screenshots, `recovery-${language}-${viewport.width}x${viewport.height}.png`)});
        assert.deepEqual(failures, []);
        checks += 1;
        await page.close();
      }
    }
    console.log(`${checks} local recovery-dialog checks passed: desktop, mobile and landscape, TR/EN. No game build or deployment.`);
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}

async function assertPanel(page, panel, viewport) {
  const bounds = await panel.boundingBox();
  assert.ok(bounds && bounds.x >= 0 && bounds.y >= 0);
  assert.ok(bounds.x + bounds.width <= viewport.width + 1 && bounds.y + bounds.height <= viewport.height + 1);
  assert.equal(await panel.evaluate(element => element.scrollWidth > element.clientWidth), false);
  assert.equal(await page.locator("#account-session-recovery-login").isEnabled(), true);
  assert.equal(await page.evaluate(() => document.elementFromPoint(innerWidth / 2, innerHeight / 2).closest("#account-session-recovery") !== null), true);
}

if (require.main === module) check().catch(error => { console.error(error); process.exitCode = 1; });
module.exports = {check};
