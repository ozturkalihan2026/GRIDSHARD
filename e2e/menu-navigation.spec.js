const { test, expect } = require("@playwright/test");

test("Ana Menü dört ana ekrana gidip geri döner", async ({ page }) => {
  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await expect(page.locator('body[data-app-screen="menu"]')).toBeVisible();

  const screens = [
    ["play", "Oyna"],
    ["profile", "Profil"],
    ["statistics", "İstatistikler"],
    ["settings", "Ayarlar"],
  ];

  for (const [screen, label] of screens) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.locator(`body[data-app-screen="${screen}"]`)).toBeVisible();
    await expect(page.locator(`[data-screen-panel="${screen}"]:visible`).first()).toBeVisible();
    await page.getByRole("button", { name: "Ana Menüye Dön", exact: true }).click();
    await expect(page.locator('body[data-app-screen="menu"]')).toBeVisible();
  }
});
