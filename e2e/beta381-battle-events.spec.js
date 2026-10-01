const { test, expect } = require("@playwright/test");
const { waitForParticipantReady } = require("./ui-helpers");

test("Beta 38.1 FCT and audio ownership", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(String(error)));
  await page.addInitScript(() =>
    localStorage.setItem("gridshard.tutorial.v1", "complete")
  );
  await page.goto("/?e2e=1", { waitUntil:"domcontentloaded" });
  await waitForParticipantReady(page);
  await page.evaluate(() => window.__GRIDSHARD_TEST_API.startQuickLocalBattle());
  await expect(page.locator("body")).toHaveAttribute("data-local-status", "battle");
  await expect(page.locator("body")).toHaveAttribute("data-audio-state", /^(battle_intro|battle|battle_pressure|critical_core)$/);

  await page.locator("#board").click({ position:{ x:4, y:4 } });
  await expect.poll(async () => page.evaluate(
    () => window.__GRIDSHARD_TEST_API.getAudioPlaybackStatus()?.gestureObserved
  )).toBe(true);

  await expect(page.locator('#board [data-module-id="core-1"]')).toBeVisible();
  const stacked = await page.evaluate(() => {
    const api = window.__GRIDSHARD_TEST_API;
    const accepted = [8,5,7].map(amount => api.emitFloatingFeedback("core-1", `+${amount} CAN · ONARIM`, "heal"));
    return { accepted, texts:[...document.querySelectorAll('.battle-floating-feedback.heal')].map(chip => chip.textContent) };
  });
  expect(stacked.accepted).toEqual([true,true,true]);
  expect(stacked.texts.filter(text => text === "+20 CAN · ONARIM")).toHaveLength(1);

  await page.evaluate(() => {
    window.__GRIDSHARD_TEST_API.emitFloatingFeedback(
      "core-1", "-4 ENERJİ", "energy"
    );
  });
  await expect(page.locator('.battle-floating-feedback.energy', { hasText:"-4 ENERJİ" })).toHaveCount(1);

  expect(errors).toEqual([]);
});
