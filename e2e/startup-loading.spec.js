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
  await expect(page.locator("#startup-retry")).toBeVisible();
  await expect(page.locator("#startup-progress")).toHaveJSProperty("value", 0);
  const bounds = await overlay.boundingBox();
  const viewport = page.viewportSize();
  expect(bounds.x).toBe(0);
  expect(bounds.y).toBe(0);
  expect(Math.round(bounds.width)).toBe(viewport.width);
  expect(Math.round(bounds.height)).toBe(viewport.height);
  await page.screenshot({path:`qa_reports/startup-${test.info().project.name}.png`});
  offline = false;
  await page.locator("#startup-retry").click();
  await expect(overlay).toBeHidden();
  await expect(page.locator("#startup-progress")).toHaveJSProperty("value", 4);
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
  await expect(page.locator("#startup-retry")).toBeVisible();
  await expect(page.locator("#startup-progress")).toHaveJSProperty("value", 1);
  await expect(page.locator("#startup-loading")).toBeVisible();
  failProfile = false;
  await page.locator("#startup-retry").click();
  await expect(page.locator("#startup-loading")).toBeHidden();
  await expect(page.locator("#startup-progress")).toHaveJSProperty("value", 4);
});
