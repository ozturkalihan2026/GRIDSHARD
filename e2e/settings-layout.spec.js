const {test, expect} = require("@playwright/test");
const {waitForParticipantReady} = require("./ui-helpers");

test("responsive tablet, seasons and categorized settings with one rename", async ({page}, info) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => localStorage.setItem("gridshard.tutorial.v1", "complete"));
  await page.goto("/?e2e=1");
  await waitForParticipantReady(page);
  for (const width of [360, 800]) {
    await page.setViewportSize({width, height:1280});
    const layout = await page.evaluate(() => {
      const shell = document.querySelector(".battle-shell").getBoundingClientRect();
      const dock = document.querySelector("#app-bottom-dock").getBoundingClientRect();
      const title = getComputedStyle(document.querySelector("#lobby-player-details"));
      return {ratio:shell.width/innerWidth, inset:dock.left, bottom:innerHeight-dock.bottom, shadow:title.boxShadow};
    });
    expect(layout.ratio).toBeGreaterThan(.97);
    expect(layout.inset).toBeGreaterThanOrEqual(11);
    expect(layout.bottom).toBeLessThan(10);
    expect(layout.shadow).toBe("none");
    await page.screenshot({path:info.outputPath(`home-${width}.png`)});
  }
  await page.setViewportSize({width:360, height:800});
  await page.locator("#lobby-profile-button").click();
  const season = page.locator("#profile-summary-panel .profile-current-season");
  await season.scrollIntoViewIfNeeded();
  const positions = await season.evaluate(row => [...row.children].map(x => x.getBoundingClientRect().top));
  expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(15);
  await page.screenshot({path:info.outputPath("profile-season.png")});
  await page.locator("#profile-summary-panel [data-open-screen=settings]").click();
  const tab = category => page.locator(`[data-settings-tab=${category}]`);
  await expect(page.locator("#profile-display-name")).toBeVisible();
  await expect(page.locator("#settings-sound")).toBeHidden();
  await tab("audio").click();
  await expect(page.locator("#settings-sound")).toBeVisible();
  await page.locator("#settings-sound-muted").check();
  await tab("graphics").click();
  await expect(page.locator("#settings-graphics")).toBeVisible();
  await tab("account").click();
  await expect(page.locator("#account-platform-status")).toBeVisible();
  // A web/disabled-ad session must not expose a nonfunctional native UMP button.
  await expect(page.locator("#ad-privacy-panel")).toBeHidden();
  await expect(page.locator("#ad-privacy-options")).toBeHidden();
  await tab("account").press("Home");
  await expect(tab("general")).toBeFocused();
  await expect(tab("general")).toHaveAttribute("aria-selected", "true");
  await page.locator("#profile-display-name").fill(`Tek-${Date.now()}`);
  page.once("dialog", dialog => dialog.accept());
  await page.locator("#profile-display-name-save").click();
  await expect(page.locator("#profile-display-name-save")).toBeDisabled();
  await expect(page.locator("#profile-name-change-note")).toContainText("kullanıldı");
  await page.reload();
  await waitForParticipantReady(page);
  await page.locator("#lobby-profile-button").click();
  await page.locator("#profile-summary-panel [data-open-screen=settings]").click();
  await expect(page.locator("#profile-display-name-save")).toBeDisabled();
  await tab("audio").click();
  await expect(page.locator("#settings-sound-muted")).toBeChecked();
  await page.screenshot({path:info.outputPath("settings-audio.png")});
});
