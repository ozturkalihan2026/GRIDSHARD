"use strict";
// Source-only loopback E2E. Temporary fixture credentials, NO build/deployment.
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const net = require("node:net");
const {spawn} = require("node:child_process");
const assert = require("node:assert/strict");
const {chromium} = require("@playwright/test");

async function step(label, action) {
  let timer;
  try {
    console.log(label);
    return await Promise.race([action(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), 30000);
    })]);
  } finally { clearTimeout(timer); }
}

async function check() {
  const root = path.resolve(__dirname, "..");
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "gridshard-review-e2e-"));
  const password = crypto.randomBytes(32).toString("base64url");
  const salt = crypto.randomBytes(32).toString("hex");
  const config = {schema_version:1, username:`PlayReview-${crypto.randomBytes(6).toString("hex")}`,
    player_id:`review-${crypto.randomBytes(16).toString("hex")}`, owner_id:crypto.randomBytes(32).toString("hex"), salt,
    verifier:crypto.pbkdf2Sync(password, Buffer.from(salt,"hex"),600000,32,"sha256").toString("hex")};
  const configPath = path.join(temporary,"review-config.json");
  fs.writeFileSync(configPath, JSON.stringify(config), {mode:0o600, flag:"wx"});
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0,"127.0.0.1",resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const origin = `http://127.0.0.1:${port}`;
  const env = {...process.env, GRIDSHARD_RUNTIME_MODE:"development", GRIDSHARD_AUTH_REQUIRED:"1",
    GRIDSHARD_RATE_LIMIT_REQUIRED:"0", GRIDSHARD_RUNTIME_DATA_DIR:temporary,
    GRIDSHARD_PLAY_REVIEW_CONFIG_FILE:configPath, DATABASE_URL:"", REDIS_URL:"",
    GRIDSHARD_PUSH_ENABLED:"0", GRIDSHARD_STORE_RECONCILE_INTERVAL_SECONDS:"0"};
  for (const name of ["DATABASE_URL_FILE", "REDIS_URL_FILE", "GRIDSHARD_AUTH_SIGNING_KEY", "GRIDSHARD_AUTH_SIGNING_KEY_FILE",
    "RELAY_PLAYER_DATA_PATH", "RELAY_TELEMETRY_PATH", "RELAY_BATTLE_POOL_PRESET_PATH", "GRIDSHARD_AUTH_IDENTITY_PATH",
    "GRIDSHARD_AUTH_KEY_PATH", "GRIDSHARD_PLATFORM_STATE_PATH", "GRIDSHARD_PRODUCT_ANALYTICS_PATH", "GRIDSHARD_TEAM_DATA_PATH",
    "GRIDSHARD_CLIENT_DIR", "GRIDSHARD_DIST_DIR"]) delete env[name];
  const child = spawn(process.env.GRIDSHARD_TEST_PYTHON || "python", ["-m","uvicorn","app.main:app","--host","127.0.0.1","--port",String(port),"--log-level","warning"],
    {cwd:path.join(root,"server"), env, windowsHide:true, stdio:["ignore","pipe","pipe"]});
  let output = "";
  child.stdout.on("data", chunk => {output += chunk;}); child.stderr.on("data",chunk => {output += chunk;});
  let browser;
  try {
    for (let i = 0; i < 100; i++) {
      try { if ((await fetch(`${origin}/health`, {signal:AbortSignal.timeout(2000)})).ok) break; } catch (_) {}
      if (child.exitCode !== null) throw new Error(`Fixture server exited: ${output}`);
      if (i === 99) throw new Error(`Fixture server not ready: ${output}`);
      await new Promise(resolve => setTimeout(resolve,100));
    }
    browser = await chromium.launch(process.env.GRIDSHARD_TEST_BROWSER_CHANNEL ? {channel:process.env.GRIDSHARD_TEST_BROWSER_CHANNEL} : {});
    const screenshots = path.join(root,"artifacts","play-review-access","layout");
    fs.mkdirSync(screenshots,{recursive:true});
    let checked = 0;
    for (const viewport of [{width:1280,height:900},{width:393,height:852},{width:320,height:740},{width:740,height:320}]) {
      const page = await browser.newPage({viewport});
      page.setDefaultTimeout(15000);
      page.setDefaultNavigationTimeout(15000);
      const pageErrors = [];
      page.on("pageerror",error => pageErrors.push(error.message));
      await page.route("**/*", route => route.request().url().startsWith(origin) ? route.continue() : route.abort());
      await step(`Open source app at ${viewport.width}x${viewport.height}`, () => page.goto(origin));
      // The actual source app boots an ordinary isolated guest, no native PGS.
      await page.waitForFunction(() => !!localStorage.getItem("project-relay.web-test.participant-id"));
      const original = await page.evaluate(() => localStorage.getItem("project-relay.web-test.participant-id"));
      // All four actual entry points use the same dialog; boot can finish fast.
      await page.locator("[data-review-access-open]:visible").first().click();
      const panel = page.locator("#review-access-dialog");
      await panel.waitFor({state:"visible"});
      const bounds = await panel.boundingBox();
      assert.ok(bounds.x >= -1 && bounds.y >= -1 && bounds.x + bounds.width <= viewport.width + 1 && bounds.y + bounds.height <= viewport.height + 1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "Review dialog must not cause horizontal overflow");
      await page.locator("#review-access-username").fill(config.username);
      await page.locator("#review-access-password").fill(password);
      await page.screenshot({path:path.join(screenshots,`dialog-${viewport.width}x${viewport.height}.png`)});
      const signedIn = page.waitForResponse(response => response.url() === `${origin}/auth/review-session`, {timeout:15000}).catch(() => null);
      await page.locator("#review-access-submit").click();
      const signedResponse = await signedIn;
      if (!signedResponse || signedResponse.status() !== 200) throw new Error(`Review UI did not sign in: HTTP ${signedResponse?.status() || "no request"}; ${await page.locator("#review-access-status").textContent()}; browser errors: ${pageErrors.join(" | ")}`);
      await page.waitForFunction(id => localStorage.getItem("project-relay.web-test.participant-id") === id, config.player_id);
      await step("Wait for authenticated source-app reload", () => page.waitForFunction(() => GridshardAuth.session.playerId === localStorage.getItem("project-relay.web-test.participant-id") && !!GridshardAuth.session.accessToken));
      const state = await step("Inspect authenticated premium state", () => page.evaluate(async() => {
        const id = localStorage.getItem("project-relay.web-test.participant-id");
        const [profile,store] = await Promise.all([fetch(`/profile/${id}`).then(r => r.json()),fetch(`/store/${id}`).then(r => r.json())]);
        return {profile,store, backup:await GridshardAuth.session.secretStore.read("gridshard.auth.review-origin")};
      }));
      assert.equal(state.profile.engagement.premium_pass.active,true, "Season premium must remain active after app reload");
      assert.equal(state.store.battle_premium.active,true, "Battle premium must remain active after app reload");
      assert.ok(state.profile.engagement.premium_reward_track.every(item => item.unlocked));
      assert.equal(JSON.parse(state.backup).playerId,original);
      assert.equal(state.backup.includes(password),false);
      await step("Wait for the startup overlay to finish", () => page.waitForFunction(() => document.getElementById("startup-loading").hidden));
      await step("Wait for the deferred daily-meta prompt or saved selection", () => page.waitForFunction(() =>
        document.getElementById("daily-meta-dialog").open || document.getElementById("daily-meta-card")?.dataset.selected === "true"));
      // The normal daily-meta choice is not a paid/login gate. Complete it as
      // a real reviewer would, without synthetic DOM clicks or forced dismissal.
      if (await page.evaluate(() => document.getElementById("daily-meta-dialog").open)) {
        await step("Complete normal daily-meta selection", async() => {
          await page.locator("#daily-meta-roll").click();
          await page.waitForFunction(() => !document.getElementById("daily-meta-roll").disabled && !document.getElementById("daily-meta-result").hidden);
          await page.locator("#daily-meta-roll").click();
          await page.locator("#daily-meta-dialog").waitFor({state:"hidden"});
        });
      }
      // Exercise the real Settings entry point after the reload.
      await step("Open the profile terminal", () => page.locator("#lobby-profile-button").click());
      await step("Open Settings in source app", () => page.locator('[data-open-screen="settings"]:visible').first().click());
      await page.locator('#settings-tab-account').click();
      await page.locator('#settings-panel-account [data-review-access-open]').click();
      const dialogState = await page.evaluate(() => ({open:document.getElementById("review-access-dialog").open,
        modals:[...document.querySelectorAll("dialog[open]")].map(node => node.id), boot:document.body.dataset.boot}));
      assert.equal(dialogState.open,true, `Settings must open the modal review dialog: ${JSON.stringify(dialogState)}`);
      await page.locator("#review-access-restore").click();
      await step("Verify return to unchanged original profile", () => page.waitForFunction(id => localStorage.getItem("project-relay.web-test.participant-id") === id, original));
      assert.deepEqual(pageErrors,[]);
      await page.close(); checked++;
    }
    console.log(`Review sign-in, all premium tiers, battle premium and original-profile return verified at ${checked} viewport sizes. Source only; no APK/AAB or deployment.`);
    console.log(`Screenshots (password fields masked): ${screenshots}`);
  } finally {
    child.kill();
    if (browser) await step("Close disposable source-test browser", () => browser.close());
    // Temporary fixture data is left for diagnosis; never delete broad/computed trees.
  }
}
check().catch(error => {console.error(error.message);process.exitCode=1;});
