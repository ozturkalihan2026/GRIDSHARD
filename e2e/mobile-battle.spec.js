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

test("mobil güvenli viewport'ta dock savaş düğmesini örtmez ve titreşim yatay hizalıdır", async ({page}, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("gridshard.tutorial.v1", "complete"));
  await page.goto("/?e2e=1", {waitUntil:"domcontentloaded"});
  await waitForParticipantReady(page);
  const original = page.viewportSize();
  // Native camera/top padding reduces the WebView once, with no bottom reserve.
  // This checks the resulting web layout, not Android's actual system bars.
  await page.setViewportSize({width:original.width, height:original.height - 48});
  await expect(page.locator("#home-battle-button")).toBeVisible();
  const layout = await page.evaluate(() => {
    const battle = document.querySelector("#home-battle-button").getBoundingClientRect();
    const dock = document.querySelector("#app-bottom-dock").getBoundingClientRect();
    const top = document.querySelector("#app-progress-ribbon").getBoundingClientRect();
    return {separate:battle.bottom <= dock.top + 1, dockFits:dock.bottom <= innerHeight + 1, topFits:top.top >= 0};
  });
  expect(layout).toEqual({separate:true, dockFits:true, topFits:true});
  await page.locator("#lobby-profile-button").click();
  await page.locator("#profile-summary-panel [data-open-screen=settings]").click();
  const row = page.locator("label.settings-toggle").filter({has:page.locator("#settings-vibration")});
  await row.scrollIntoViewIfNeeded();
  const alignment = await row.evaluate(label => {
    const input = label.querySelector("input").getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents([...label.childNodes].find(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()));
    const text = range.getBoundingClientRect();
    return {centers:Math.abs(input.top + input.height / 2 - text.top - text.height / 2), horizontal:input.right < text.left};
  });
  expect(alignment.horizontal).toBe(true);
  expect(alignment.centers).toBeLessThan(4);
  await page.screenshot({path:testInfo.outputPath("settings-vibration-aligned.png")});
});
