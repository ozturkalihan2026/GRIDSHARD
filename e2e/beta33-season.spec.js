const { test, expect } = require("@playwright/test");


test("Sezon Sıfır merkezi ve belirgin başlangıç stratejisi gerçek tarayıcıda görünür", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.addInitScript(() =>
    localStorage.setItem("gridshard.tutorial.v1", "complete")
  );

  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Profil", exact: true }).click();
  await expect(page.locator(".season-zero-hub")).toBeVisible();
  await expect(page.locator("#daily-mission-list .daily-mission-card")).toHaveCount(3);
  await expect(page.locator("#season-reward-track .season-reward-card")).toHaveCount(10);
  await expect(page.locator("#season-tier-label")).toContainText("Kademe 0 / 10");
  await expect(page.locator("#season-equipped-title")).toContainText("Devre Çırağı");

  const seasonVisual = await page.locator(".season-zero-hub").evaluate(element => {
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
  expect(seasonVisual.progressHeight).toBeGreaterThanOrEqual(12);
  expect(seasonVisual.scrollWidth).toBeLessThanOrEqual(seasonVisual.clientWidth + 1);

  await page.getByRole("button", { name: "Ana Menüye Dön", exact: true }).click();
  await page.getByRole("button", { name: "Oyna", exact: true }).click();
  const starter = page.locator(".initial-circuit-picker");
  await expect(starter).toBeVisible();
  const starterVisual = await starter.evaluate(element => {
    const style = getComputedStyle(element);
    const badge = getComputedStyle(element, "::before");
    const choices = [...element.querySelectorAll(".initial-module-choice")];
    return {
      borderColor: style.borderColor,
      background: style.backgroundImage,
      badge: badge.content,
      minimumChoiceHeight: Math.min(...choices.map(choice => choice.getBoundingClientRect().height)),
    };
  });
  expect(starterVisual.background).toContain("gradient");
  expect(starterVisual.badge).toContain("BAŞLANGIÇ STRATEJİNİ SEÇ");
  expect(starterVisual.minimumChoiceHeight).toBeGreaterThanOrEqual(38);
  expect(errors).toEqual([]);
});
