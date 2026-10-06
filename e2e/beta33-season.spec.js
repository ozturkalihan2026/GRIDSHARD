const { test, expect } = require("@playwright/test");
const { waitForParticipantReady } = require("./ui-helpers");


test("Güncel günlük emirler ve 40 kademeli sezon yolu gerçek tarayıcıda görünür", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.addInitScript(() =>
    localStorage.setItem("gridshard.tutorial.v1", "complete")
  );

  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await waitForParticipantReady(page);
  await page.locator("#lobby-profile-button").click();
  await page.locator('[data-screen-panel="profile"] [data-open-screen="daily"]').click();
  await page.locator('#rewards-hub-screen [data-open-screen="daily-missions"]').click();
  await expect(page.locator("#daily-mission-list .daily-mission-card")).toHaveCount(6);
  await page.locator('#daily-missions-screen .reward-back-link').click();
  await page.locator('#rewards-hub-screen [data-open-screen="rewards"]').click();
  await expect(page.locator("#season-reward-track .season-pass-row")).toHaveCount(40);
  await expect(page.locator("#season-tier-label")).toContainText("Kademe 0 / 40");

  const seasonVisual = await page.locator(".season-rewards-screen").evaluate(element => {
    const style = getComputedStyle(element);
    const progress = document.querySelector(".season-progress-track").getBoundingClientRect();
    return {
      background: style.backgroundImage,
      borderColor: style.borderColor,
      progressHeight: progress.height,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    };
  });
  expect(seasonVisual.background).toContain("gradient");
  expect(seasonVisual.borderColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(seasonVisual.progressHeight).toBeGreaterThanOrEqual(10);
  expect(seasonVisual.scrollWidth).toBeLessThanOrEqual(seasonVisual.clientWidth + 1);

  await page.locator('[data-shell-screen="menu"]').click();
  await expect(page.locator('body[data-app-screen="menu"]')).toBeVisible();
  // Operatör unvanı artık sezon ekranında değil, Ev ekranından açılan unvan
  // penceresinde gösterilir.
  await page.locator("#lobby-player-details").click();
  await expect(page.locator("#operator-titles-title")).toContainText("Devre Çırağı");
  await page.locator("#operator-titles-close").click();
  // Retired manual initial placement must not become a test prerequisite.
  await expect(page.locator(".initial-circuit-picker")).not.toBeVisible();
  expect(errors).toEqual([]);
});
