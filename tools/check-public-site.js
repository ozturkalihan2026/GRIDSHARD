"use strict";

// Local-only visual/layout check. Does not connect to Cloudflare or the game API.
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const assert = require("node:assert/strict");
const { chromium } = require("@playwright/test");
const { buildPublicSite, pagePath, PAGES } = require("./build-public-site.js");

async function startPreviewServer() {
  const { output, manifest } = buildPublicSite();
  const allowed = new Set(manifest.files.map((item) => item.file));
  const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".webp": "image/webp", ".png": "image/png", ".ico": "image/x-icon" };
  const server = http.createServer((request, response) => {
    const requested = new URL(request.url, "http://localhost").pathname.slice(1);
    const file = requested.endsWith("/") || !requested ? `${requested}index.html` : requested;
    const found = allowed.has(file);
    const selected = found ? file : "404.html";
    response.writeHead(found ? 200 : 404, {
      "Content-Type": types[path.extname(selected)] || "text/plain",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'",
    });
    response.end(fs.readFileSync(path.join(output, selected)));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, origin: `http://127.0.0.1:${server.address().port}` };
}

async function check() {
  const { server, origin } = await startPreviewServer();
  let browser;
  try {
    browser = await chromium.launch();
    const screenshots = path.resolve(__dirname, "../test-results/public-site");
    fs.mkdirSync(screenshots, { recursive: true });
    let checks = 0;
    for (const viewport of [{ width: 1280, height: 900 }, { width: 393, height: 852 }, { width: 320, height: 740 }]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      const failures = [];
      page.on("pageerror", (error) => failures.push(error.message));
      page.on("requestfailed", (request) => failures.push(request.url()));
      page.on("request", (request) => assert.ok(request.url().startsWith(origin), "No external network requests."));
      for (const language of ["tr", "en"]) {
        for (const route of PAGES) {
          const response = await page.goto(`${origin}${pagePath(language, route)}`);
          assert.equal(response.status(), 200);
          await page.locator("h1").waitFor();
          assert.equal(await page.locator("html").getAttribute("lang"), language);
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${language}/${route}: no horizontal overflow at ${viewport.width}px`);
          assert.equal(await page.locator("script, form").count(), 0);
          if (route === "home") {
            assert.equal(await page.locator(".hero-art img").evaluate((element) => element.complete && element.naturalWidth > 0), true);
            await page.screenshot({ path: path.join(screenshots, `home-${language}-${viewport.width}.png`), fullPage: true, animations: "disabled" });
          }
          if (route === "delete-account" && viewport.width === 393) await page.screenshot({ path: path.join(screenshots, `delete-account-${language}-393.png`), fullPage: true });
          if (route === "terms") await page.screenshot({ path: path.join(screenshots, `terms-${language}-${viewport.width}.png`), fullPage: true });
          checks += 1;
        }
      }
      assert.deepEqual(failures, []);
      const ads = await context.request.get(`${origin}/app-ads.txt`);
      assert.equal(await ads.text(), "google.com, pub-4974825529326987, DIRECT, f08c47fec0942fa0\n");
      assert.match(ads.headers()["content-type"], /text\/plain/);
      assert.equal((await context.request.get(`${origin}/.env`)).status(), 404);
      await context.close();
    }
    console.log(`${checks} local browser page/layout checks passed; desktop + 393px + 320px, TR/EN. No remote deployment.`);
    console.log(screenshots);
  } finally {
    await browser?.close();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

if (require.main === module) {
  const run = process.argv.includes("--serve")
    ? () => startPreviewServer().then(({ origin }) => console.log(`Local-only preview: ${origin}`))
    : check;
  run().catch((error) => { console.error(error); process.exitCode = 1; });
}
module.exports = { check, startPreviewServer };
