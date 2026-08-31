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
    if (status === "ready") return;
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

module.exports = { waitForParticipantReady, closeActiveBattle };
