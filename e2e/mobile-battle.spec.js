const { test, expect } = require("@playwright/test");

test("dokunmatik savaş görünümü tek ekrana sığar ve seç-yerleştir çalışır", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.addInitScript(() => localStorage.setItem("gridshard.tutorial.v1", "complete"));

  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Oyna" }).click();

  const cards = page.locator("#battle-pool-selection .pool-choice");
  await expect(cards).toHaveCount(24);
  await page.getByRole("button", { name: "Hazır Havuzları Yönet" }).click();
  const starterPreset = page.locator(".preset-card", { hasText: "Başlangıç Devresi" });
  await starterPreset.getByRole("button", { name: "Yükle" }).click();
  await expect(page.locator("#battle-pool-count")).toHaveText(/18\s*\/\s*18/);
  await page.getByRole("button", { name: "Kapat" }).click();
  await expect(page.locator("#play-readiness-status")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20_000 }
  );
  await page.locator("#battle-pool-confirm").click();

  await expect(page.locator("body")).toHaveAttribute("data-online-status", "battle", { timeout: 25_000 });
  await expect(page.locator("body")).toHaveAttribute("data-opponent-type", "ai");
  const viewport = await page.evaluate(() => ({
    height: window.innerHeight,
    scrollHeight: document.body.scrollHeight,
    scrollTop: window.scrollY
  }));
  expect(viewport.scrollHeight).toBeLessThanOrEqual(viewport.height + 1);
  expect(viewport.scrollTop).toBe(0);

  const boardBox = await page.locator("#board").boundingBox();
  expect(boardBox).not.toBeNull();
  expect(boardBox.y + boardBox.height).toBeLessThanOrEqual(viewport.height + 1);
  await expect(page.locator("#board .module-card")).toHaveCount(4);

  await page.locator('[data-mobile-battle-panel="shelf"]').click();
  await expect(page.locator("body")).toHaveAttribute("data-mobile-battle-panel", "shelf");
  const reserveCards = page.locator("#module-shelf .module-card");
  const initialReserveCount = await reserveCards.count();
  expect(initialReserveCount).toBeGreaterThan(0);

  await expect(page.locator("#capacity-indicator")).toContainText("/ 5", { timeout: 20_000 });
  await expect(reserveCards.first()).not.toHaveClass(/locked/);
  // WebKit'in emüle edilen görsel viewport'u, ekranda görünen ilk raf kartını
  // layout viewport dışında sayabiliyor; olay hedefini doğrudan doğruluyoruz.
  await reserveCards.first().click({ force: true });
  await expect(page.locator("body")).toHaveAttribute("data-mobile-battle-panel", "player");
  const dropTargets = page.locator("#board .tap-drop-target[data-occupied=false]");
  await expect.poll(() => dropTargets.count()).toBeGreaterThan(0);
  const target = page.locator('#board .tap-drop-target[data-x="2"][data-y="4"][data-occupied=false]');
  await expect(target).toHaveCount(1);
  const coordinates = await target.evaluate(cell => ({ x: cell.dataset.x, y: cell.dataset.y }));
  await target.click();
  await expect(page.locator(
    `#board .board-cell[data-x="${coordinates.x}"][data-y="${coordinates.y}"] .module-card`
  )).toHaveCount(1);
  await expect(page.locator("#module-shelf .module-card")).toHaveCount(initialReserveCount - 1);
  expect(errors).toEqual([]);
});

test("ilk maç eğitimi hazır havuzu yükler ve AI devralmalı eşleştirmeyi başlatır", async ({ page }) => {
  await page.goto("/?e2e=tutorial", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "Oyna" }).click();

  const tutorial = page.locator("#tutorial-overlay");
  await expect(tutorial).toBeVisible();
  await expect(tutorial.locator("[data-tutorial-progress]")).toHaveText("1 / 3");
  await tutorial.getByRole("button", { name: "Başlangıç Devresini Yükle" }).click();
  await expect(page.locator("#battle-pool-count")).toHaveText(/18\s*\/\s*18/);
  await expect(tutorial.locator("[data-tutorial-progress]")).toHaveText("2 / 3");
  await expect(page.locator("#play-readiness-status")).toHaveAttribute(
    "data-ready",
    "true",
    { timeout: 20_000 }
  );

  await tutorial.getByRole("button", { name: "Savaş", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-online-status", "battle", { timeout: 25_000 });
  await expect(page.locator("body")).toHaveAttribute("data-opponent-type", "ai");
  await expect(tutorial.locator("[data-tutorial-progress]")).toHaveText("3 / 3");
  await tutorial.getByRole("button", { name: "Tamamla" }).click();
  await expect(tutorial).toBeHidden();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("gridshard.tutorial.v1"))).toBe("complete");
});
