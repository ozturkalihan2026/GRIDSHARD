const { test, expect } = require("@playwright/test");

test("Ana Menü dört ana ekrana gidip geri döner", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("gridshard.tutorial.v1", "complete")
  );
  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator('body[data-app-screen="menu"]')).toBeVisible();

  const screens = ["play", "profile", "statistics", "settings"];

  for (const screen of screens) {
    await page.locator(`[data-open-screen="${screen}"]`).first().click();
    await expect(page.locator(`body[data-app-screen="${screen}"]`)).toBeVisible();
    await expect(page.locator(`[data-screen-panel="${screen}"]:visible`).first()).toBeVisible();
    await page.locator('[data-open-screen="menu"]').click();
    await expect(page.locator('body[data-app-screen="menu"]')).toBeVisible();
  }
});
