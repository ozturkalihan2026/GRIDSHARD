const { test, expect } = require("@playwright/test");


test("savaş rafı viewportta kalır ve 30. saniye güçlendiricisi sunucuya uygulanır", async ({ page }) => {
  test.setTimeout(100_000);
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.setViewportSize({width:1366, height:630});
  await page.addInitScript(() =>
    localStorage.setItem("gridshard.tutorial.v1", "complete")
  );

  await page.goto("/?e2e=1", {waitUntil:"domcontentloaded"});
  await page.getByRole("button", {name:"Oyna"}).click();
  await page.getByRole("button", {name:"Hazır Havuzları Yönet"}).click();
  const starter = page.locator(".preset-card", {hasText:"Başlangıç Devresi"});
  await starter.getByRole("button", {name:"Yükle"}).click();
  await page.getByRole("button", {name:"Kapat"}).click();
  const initialChoices = page.locator("#initial-module-picker select");
  await initialChoices.nth(0).selectOption("shield-1");
  await initialChoices.nth(1).selectOption("laser-1");
  await expect(page.locator("#play-readiness-status")).toHaveAttribute(
    "data-ready",
    "true",
    {timeout:20_000}
  );
  await page.locator("#battle-pool-confirm").click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-online-status",
    "battle",
    {timeout:25_000}
  );

  const viewport = await page.evaluate(() => {
    const shelfPanel = document.querySelector(".shelf-panel").getBoundingClientRect();
    const moduleShelf = document.getElementById("module-shelf").getBoundingClientRect();
    return {
      bodyHeight:document.documentElement.scrollHeight,
      innerHeight:window.innerHeight,
      shelfBottom:Math.round(shelfPanel.bottom),
      moduleShelfBottom:Math.round(moduleShelf.bottom),
      moduleShelfHeight:Math.round(moduleShelf.height),
    };
  });
  expect(viewport.bodyHeight).toBeLessThanOrEqual(viewport.innerHeight + 1);
  expect(viewport.shelfBottom).toBeLessThanOrEqual(viewport.innerHeight);
  expect(viewport.moduleShelfBottom).toBeLessThanOrEqual(viewport.innerHeight);
  expect(viewport.moduleShelfHeight).toBeGreaterThan(80);

  await expect(page.locator("#booster-status")).toContainText(
    "3 seçenekten 1'ini seç",
    {timeout:45_000}
  );
  await page.getByRole("button", {name:"Çift Port Adaptörü"}).click();
  await page.locator('#board .module-card[data-module-id="core-1"]').click();
  await expect(page.locator("#event-log")).toContainText(
    '"kind":"select_booster"',
    {timeout:2_000}
  );
  await expect(page.locator("#event-log")).toContainText(
    '"kind":"apply_booster"',
    {timeout:2_000}
  );
  await page.waitForTimeout(700);
  await expect(page.locator("#event-log")).not.toContainText(
    "Savaş komutu reddedildi"
  );
  expect(errors).toEqual([]);
});
