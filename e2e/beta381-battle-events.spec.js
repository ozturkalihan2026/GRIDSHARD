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
  await expect(page.locator("body")).toHaveAttribute("data-audio-state", "battle");

  await page.locator("#board").click({ position:{ x:4, y:4 } });
  await expect.poll(async () => page.evaluate(
    () => window.__GRIDSHARD_TEST_API.getAudioPlaybackStatus()?.gestureObserved
  )).toBe(true);

  await page.evaluate(() => {
    const api = window.__GRIDSHARD_TEST_API;
    api.emitFloatingFeedback("core-1", "+8 CAN · ONARIM", "heal");
    api.emitFloatingFeedback("core-1", "+5 CAN · ONARIM", "heal");
    api.emitFloatingFeedback("core-1", "+7 CAN · ONARIM", "heal");
  });
  const feedback = page.locator(
    '.battle-floating-feedback[data-lane="0"]',
    { hasText:"+20 CAN · ONARIM" }
  );
  await expect(feedback).toHaveCount(1);

  await page.evaluate(() => {
    window.__GRIDSHARD_TEST_API.emitFloatingFeedback(
      "core-1", "-4 ENERJİ", "energy"
    );
  });
  await expect(page.locator('.battle-floating-feedback[data-lane="1"]')).toHaveCount(1);

  expect(errors).toEqual([]);
});
