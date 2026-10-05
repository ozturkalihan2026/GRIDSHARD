const {test, expect} = require("@playwright/test");

test("failed server startup stays covered and retry restores the authenticated home", async ({page}) => {
  let offline = true;
  await page.route("**/health", async route => {
    if (offline) return route.fulfill({status:503, contentType:"application/json", body:'{"status":"degraded"}'});
    return route.continue();
  });
  await page.goto("/?e2e=1", {waitUntil:"domcontentloaded"});
  const overlay = page.locator("#startup-loading");
  await expect(overlay).toBeVisible();
  await expect(page.locator("#boot-retry")).toBeVisible();
  await expect(page.locator("#account-player-id")).toBeHidden();
  await expect(page.locator("#boot-bar")).toHaveAttribute("aria-valuenow", "0");
  const bounds = await overlay.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds.x).toBe(0);
  expect(bounds.y).toBe(0);
  expect(Math.round(bounds.width)).toBe(viewport.width);
  expect(Math.round(bounds.height)).toBe(viewport.height);
  await page.screenshot({path:`qa_reports/startup-${test.info().project.name}.png`});
  offline = false;
  await page.locator("#boot-retry").click();
  await expect(overlay).toBeHidden();
  await expect(page.locator("#boot-bar")).toHaveAttribute("aria-valuenow", "100");
  expect(await page.evaluate(() => Boolean(GridshardAuth.session.accessToken))).toBe(true);
  await expect(page.locator('body[data-app-screen="menu"]')).toBeVisible();
});

test("a failed profile request does not advance past server readiness", async ({page}) => {
  let failProfile = true;
  await page.route("**/participants/*/bootstrap", async route => {
    if (failProfile) return route.fulfill({status:503, contentType:"application/json", body:'{"detail":"fixture profile failure"}'});
    return route.continue();
  });
  await page.goto("/?e2e=1", {waitUntil:"domcontentloaded"});
  await expect(page.locator("#boot-retry")).toBeVisible();
  await expect(page.locator("#boot-bar")).toHaveAttribute("aria-valuenow", "25");
  await expect(page.locator("#account-player-id")).toBeHidden();
  await expect(page.locator("#startup-loading")).toBeVisible();
  failProfile = false;
  await page.locator("#boot-retry").click();
  await expect(page.locator("#startup-loading")).toBeHidden();
  await expect(page.locator("#boot-bar")).toHaveAttribute("aria-valuenow", "100");
});

test("original emblem and animations cover the game until account loading finishes", async ({page}) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route("**/accounts/*", async route => { await gate; await route.continue(); });
  await page.addInitScript(() => localStorage.setItem("gridshard.tutorial.v1", "complete"));
  await page.goto("/?e2e=1", {waitUntil:"domcontentloaded"});
  await expect(page.locator("#boot-bar")).toHaveAttribute("aria-valuenow","75");
  // Kimlik sunucu doğrulayınca yayımlanır; açılış ekranında değil, Ayarlar →
  // Genel'de ad formunun altında ve kısaltılmadan gösterilir.
  await expect(page.locator("#account-player-id")).not.toHaveAttribute("hidden", "");
  await expect(page.locator("#account-player-id-label")).toHaveText("Kimliğin:");
  await expect(page.locator("#account-player-id")).toHaveAttribute("title", /Play Games kimliğinden farklıdır/);
  const confirmedIds = await page.evaluate(() => ({
    account: GridshardAuth.session.playerId,
    stored: localStorage.getItem("project-relay.web-test.participant-id"),
    shown: document.getElementById("account-player-id-value").textContent,
    splash: document.getElementById("startup-loading").textContent,
  }));
  expect(confirmedIds.account).toBe(confirmedIds.stored);
  expect(confirmedIds.shown).toBe(confirmedIds.account);
  expect(confirmedIds.splash).not.toContain(confirmedIds.account.slice(0,10));
  await expect(page.locator("#startup-loading")).toBeVisible();
  await expect(page.locator("#account-onboarding-dialog")).not.toHaveAttribute("open", "");
  const presentation = await page.evaluate(() => {
    const art = document.querySelector(".boot-emblem-art");
    const names = [".boot-emblem-art", ".boot-emblem-ring", ".boot-emblem-ring-outer", ".boot-trace-a", ".boot-title"];
    return {
      loaded:art.complete && art.naturalWidth > 0,
      animations:names.map(name => getComputedStyle(document.querySelector(name)).animationName),
      durations:names.map(name => getComputedStyle(document.querySelector(name)).animationDuration),
      inert:document.querySelector(".battle-shell").inert,
    };
  });
  expect(presentation.loaded).toBe(true);
  expect(presentation.animations).toEqual(["gs-boot-float","gs-boot-spin","gs-boot-spin","gs-boot-trace","gs-boot-glow"]);
  expect(presentation.durations).toEqual(["4.2s","2.2s","5.4s","3.8s","3.2s"]);
  expect(presentation.inert).toBe(true);
  await page.screenshot({path:`test-results/branding-boot-${test.info().project.name}.png`});
  release();
  await expect(page.locator("#startup-loading")).toBeHidden();
  expect(await page.locator(".battle-shell").evaluate(el => el.inert)).toBe(false);
});

test("a mismatched server account never appears as a confirmed startup ID", async ({page}) => {
  await page.route("**/participants/*/bootstrap", async route => {
    const response = await route.fetch();
    const payload = await response.json();
    payload.identity.player_id = "wt-wrong-account-diagnostic";
    await route.fulfill({response, json:payload});
  });
  await page.goto("/?e2e=1", {waitUntil:"domcontentloaded"});
  await expect(page.locator("#boot-retry")).toBeVisible();
  await expect(page.locator("#startup-loading")).toBeVisible();
  await expect(page.locator("#account-player-id")).toBeHidden();
  await expect(page.locator("#account-player-id-value")).toHaveText("");
});

test("unsolicited OAuth return is scrubbed without signing in or blocking guest startup", async ({page}) => {
  let providerRequests = 0;
  await page.route("**/auth/provider-session", route => { providerRequests++; return route.abort(); });
  await page.goto(`/?e2e=1&oauth_provider=google&oauth_status=linked&oauth_handoff=${"h".repeat(32)}&oauth_exchange=${"e".repeat(43)}`,{waitUntil:"domcontentloaded"});
  await expect(page.locator("#startup-loading")).toBeHidden();
  await expect(page.locator('body[data-app-screen="menu"]')).toBeVisible();
  expect(providerRequests).toBe(0);
  const params = new URL(page.url()).searchParams;
  for (const key of ["oauth_provider","oauth_status","oauth_handoff","oauth_exchange"]) expect(params.has(key)).toBe(false);
  expect(await page.evaluate(()=>Boolean(GridshardAuth.session.accessToken))).toBe(true);
});
