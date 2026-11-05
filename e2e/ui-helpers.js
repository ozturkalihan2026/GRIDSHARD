const {expect} = require("@playwright/test");

async function completeFirstLaunch(page, {ackAnnouncements = true} = {}) {
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
  const announcement = page.locator('#release-announcement-dialog');
  // Unchanged installed 2.3.0 has System mail but no popup DOM/controller.
  if (await announcement.count() === 0) return;
  await expect(announcement).not.toHaveAttribute('data-delivery', 'loading');
  if (ackAnnouncements && await announcement.getAttribute('data-delivery') === 'pending') {
    await expect(announcement).toBeVisible();
    await page.locator('#release-announcement-confirm').click();
    await expect(announcement).toBeHidden();
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
