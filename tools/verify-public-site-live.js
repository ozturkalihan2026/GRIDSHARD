"use strict";

// Read-only anonymous HTTPS verification of the informational custom domain.
// No credentials, uploads, game API calls, or Cloudflare settings changes.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

async function verifyPublicSiteLive() {
  const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../build/public-site-manifest.json"), "utf8"));
  if (manifest.site !== "https://gridshardgame.com") throw new Error("Unexpected public-site origin.");
  const expected = manifest.files.filter((entry) => entry.file.endsWith("index.html") || entry.file === "app-ads.txt");
  if (expected.length !== 11) throw new Error("Expected ten TR/EN pages and app-ads.txt.");
  const checks = await Promise.all(expected.map(async (entry) => {
    const route = entry.file === "app-ads.txt" ? "/app-ads.txt" : `/${entry.file.slice(0, -"index.html".length)}`;
    const response = await fetch(`${manifest.site}${route}`, { redirect: "manual", signal: AbortSignal.timeout(20000) });
    const bytes = Buffer.from(await response.arrayBuffer());
    const sha256 = crypto.createHash("sha256").update(bytes).digest("hex");
    const text = bytes.toString("utf8");
    const problems = [];
    if (response.status !== 200) problems.push(`HTTP ${response.status}`);
    if (bytes.length !== entry.size || sha256 !== entry.sha256) problems.push("build manifest mismatch");
    const cache = response.headers.get("cache-control") || "";
    if (!cache.includes("no-transform")) problems.push("missing no-transform");
    const csp = response.headers.get("content-security-policy") || "";
    if (!csp.includes("default-src 'none'") || /unsafe-inline|unsafe-eval|script-src/.test(csp)) problems.push("unexpected CSP");
    if (entry.file.endsWith(".html")) {
      if (/<script\b|__cf_email__|data-cfemail|email-protection/.test(text)) problems.push("edge-injected scripts or email obfuscation");
      if (!text.includes('href="mailto:gridshardgame@gmail.com')) problems.push("missing plain mailto");
    } else if (!/text\/plain/.test(response.headers.get("content-type") || "")) problems.push("app-ads.txt is not plain text");
    return { route, status: response.status, size: bytes.length, sha256, cacheControl: cache, problems };
  }));
  return { checkedAt: new Date().toISOString(), origin: manifest.site, passed: checks.every((entry) => entry.problems.length === 0), checks };
}

if (require.main === module) verifyPublicSiteLive().then((result) => {
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
}).catch((error) => { console.error(error.message); process.exitCode = 1; });

module.exports = { verifyPublicSiteLive };
