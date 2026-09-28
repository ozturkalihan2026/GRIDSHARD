const { test, expect } = require("@playwright/test");

test("Ana menü güncel alt gezintideki ekranlara gidip geri döner", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("gridshard.tutorial.v1", "complete")
  );
  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator('body[data-app-screen="menu"]')).toBeVisible();

  const screens = ["shop", "modules", "team", "events"];

  for (const screen of screens) {
    await page.locator(`[data-shell-screen="${screen}"]`).click();
    await expect(page.locator(`body[data-app-screen="${screen}"]`)).toBeVisible();
    await expect(page.locator(`[data-screen-panel="${screen}"]:visible`).first()).toBeVisible();
    await page.locator('[data-shell-screen="menu"]').click();
    await expect(page.locator('body[data-app-screen="menu"]')).toBeVisible();
  }

  await page.locator("#lobby-profile-button").click();
  await expect(page.locator('body[data-app-screen="profile"]')).toBeVisible();
  await page.locator('[data-shell-screen="menu"]').click();
  await expect(page.locator('body[data-app-screen="menu"]')).toBeVisible();
});
