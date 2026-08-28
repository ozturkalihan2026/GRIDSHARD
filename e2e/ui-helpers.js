async function waitForParticipantReady(page, timeout = 30_000) {
  await page.waitForFunction(
    () => document.querySelector("#participant-bootstrap-status")?.dataset.status === "ready",
    undefined,
    { timeout }
  );
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
