const { test, expect } = require("@playwright/test");
const { waitForParticipantReady, closeActiveBattle } = require("./ui-helpers");

test("mobil savaşta iki devre aynı ekranda ve tek dokunuşla yerleştirme çalışır", async ({ page }) => {
  test.setTimeout(150_000);
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.addInitScript(() => localStorage.setItem("gridshard.tutorial.v1", "complete"));

  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await waitForParticipantReady(page);
  await expect(page.locator("#home-active-deck .unified-module-tile")).toHaveCount(6);
  await expect(page.locator("#home-battle-button")).toBeEnabled();
  await page.locator("#home-battle-button").click();

  await expect(page.locator("body")).toHaveAttribute("data-online-status", "battle", {
    timeout: 40_000,
  });
  await expect(page.locator("body")).toHaveAttribute("data-opponent-type", "ai");
  await expect(page.locator("#board .board-cell")).toHaveCount(15);
  await expect(page.locator("#enemy-board .board-cell")).toHaveCount(15);
  await expect(page.locator("#board")).toBeVisible();
  await expect(page.locator("#enemy-board")).toBeVisible();

  const layout = await page.evaluate(() => {
    const own = document.querySelector("#board").getBoundingClientRect();
    const rival = document.querySelector("#enemy-board").getBoundingClientRect();
    const tolerance = 2;
    return {
      bothFitWidth: own.left >= -tolerance && rival.left >= -tolerance
        && own.right <= innerWidth + tolerance && rival.right <= innerWidth + tolerance,
      bothFitHeight: own.top >= -tolerance && rival.top >= -tolerance
        && own.bottom <= innerHeight + tolerance && rival.bottom <= innerHeight + tolerance,
      separate: rival.bottom <= own.top + tolerance,
    };
  });
  expect(layout).toEqual({ bothFitWidth: true, bothFitHeight: true, separate: true });

  const shelf = page.locator("#module-shelf");
  await expect(shelf).toHaveAttribute("data-placement-ready", "true", { timeout: 30_000 });
  const playable = shelf.locator(".deck-module-card[data-playable=true]").first();
  await expect(playable).toBeEnabled();
  const initialCount = await page.locator("#board .module-card").count();
  await playable.click();
  await expect.poll(() => page.locator("#board .module-card").count(), {
    timeout: 15_000,
  }).toBeGreaterThan(initialCount);
  expect(errors).toEqual([]);
  await closeActiveBattle(page);
});
