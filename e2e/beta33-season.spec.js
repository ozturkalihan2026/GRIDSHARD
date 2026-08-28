const { test, expect } = require("@playwright/test");


test("Sezon Sıfır ekranları ve belirgin başlangıç stratejisi gerçek tarayıcıda görünür", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.addInitScript(() =>
    localStorage.setItem("gridshard.tutorial.v1", "complete")
  );

  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await page.locator('[data-open-screen="daily"]').click();
  await expect(page.locator("#daily-mission-list .daily-mission-card")).toHaveCount(3);
  await page.locator('[data-open-screen="menu"]').click();
  await page.locator('[data-open-screen="rewards"]').click();
  await expect(page.locator("#season-reward-track .season-reward-card")).toHaveCount(10);
  await expect(page.locator("#season-tier-label")).toContainText("Kademe 0 / 10");
  await expect(page.locator("#season-equipped-title")).toContainText("Devre Çırağı");

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

  await page.locator('[data-open-screen="menu"]').click();
  await page.locator('[data-open-screen="play"]').click();
  const starter = page.locator(".initial-circuit-picker");
  await expect(starter).toBeVisible();
  const starterVisual = await starter.evaluate(element => {
    const strategy = element.querySelector(".initial-strategy-panel");
    const style = getComputedStyle(strategy);
    const badge = element.querySelector(".initial-circuit-kicker");
    const choices = [...element.querySelectorAll(".initial-module-choice")];
    return {
      borderColor: style.borderColor,
      background: style.backgroundImage,
      badge: badge?.textContent || "",
      minimumChoiceHeight: Math.min(...choices.map(choice => choice.getBoundingClientRect().height)),
    };
  });
  expect(starterVisual.background).toContain("gradient");
  expect(starterVisual.badge).toContain("BAŞLANGIÇ STRATEJİNİ SEÇ");
  expect(starterVisual.minimumChoiceHeight).toBeGreaterThanOrEqual(34);
  expect(errors).toEqual([]);
});
