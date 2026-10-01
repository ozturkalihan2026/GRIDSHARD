const {expect} = require("@playwright/test");

async function completeFirstLaunch(page) {
  await expect(page.locator("#startup-loading")).toBeHidden();
  const guest = page.locator("#account-onboarding-guest");
  if (await guest.isVisible()) {
    const dailyLoaded = page.waitForResponse(response => /\/daily-meta$/.test(new URL(response.url()).pathname) && response.status() === 200);
    await guest.click();
    await dailyLoaded;
    await expect(page.locator("#daily-meta-dialog")).toBeVisible();
  }
  const daily = page.locator("#daily-meta-dialog");
  if (await daily.isVisible()) {
    const roll = page.locator("#daily-meta-roll");
    if ((await roll.textContent()).includes("METAYI")) {
      await roll.click();
      await expect(roll).toHaveText("DEVAM", {timeout:15000});
    }
    await roll.click();
    await expect(daily).toBeHidden();
  }
}

async function waitForParticipantReady(page, timeout = 30_000) {
  const startedAt = Date.now();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const remaining = Math.max(1_000, timeout - (Date.now() - startedAt));
    await page.waitForFunction(
      () => ["ready", "error"].includes(
        document.querySelector("#participant-bootstrap-status")?.dataset.status
      ),
      undefined,
      { timeout:remaining }
    );
    const status = await page.locator("#participant-bootstrap-status").getAttribute("data-status");
    if (status === "ready") {
      await completeFirstLaunch(page);
      return;
    }
    if (attempt === 0) {
      await page.reload({ waitUntil:"domcontentloaded" });
    }
  }
  throw new Error("Participant bootstrap did not recover after one reload.");
}

async function closeActiveBattle(page) {
  const forfeit = page.locator("#battle-forfeit-button");
  if (await forfeit.isVisible()) {
    await forfeit.click({ force: true });
    await page.locator(".post-match-panel").waitFor({
      state: "visible",
      timeout: 15_000
    });
  }
}

module.exports = { waitForParticipantReady, closeActiveBattle, completeFirstLaunch };
