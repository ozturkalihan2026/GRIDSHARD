const { test, expect } = require("@playwright/test");
const {waitForParticipantReady} = require("./ui-helpers");

test("Ana menü güncel alt gezintideki ekranlara gidip geri döner", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("gridshard.tutorial.v1", "complete")
  );
  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await waitForParticipantReady(page);
  await expect(page.locator('body[data-app-screen="menu"]')).toBeVisible();

  const screens = ["shop", "modules", "team", "events"];

  for (const screen of screens) {
    await page.locator(`[data-shell-screen="${screen}"]`).click();
    await expect(page.locator(`body[data-app-screen="${screen}"]`)).toBeVisible();
    await expect(page.locator(`[data-screen-panel="${screen}"]:visible`).first()).toBeVisible();
    await page.locator('[data-shell-screen="menu"]').click();
    await expect(page.locator('body[data-app-screen="menu"]')).toBeVisible();
  }

  // Profil simgesi profili doğrudan açar; sayfada sekme çubuğu yoktur.
  await page.locator("#lobby-profile-button").click();
  await expect(page.locator('body[data-app-screen="profile"]')).toBeVisible();
  await expect(page.locator(".profile-terminal-tabs")).toHaveCount(0);
  await page.locator('[data-shell-screen="menu"]').click();
  await expect(page.locator('body[data-app-screen="menu"]')).toBeVisible();

  // Üç çizgi menüsü dört sayfayı alt alta listeler ve dokunulanı açar.
  const menuButton = page.locator("#lobby-menu-button");
  const menu = page.locator("#lobby-menu");
  await expect(menu).toBeHidden();
  await menuButton.click();
  await expect(menu).toBeVisible();
  await expect(menuButton).toHaveAttribute("aria-expanded", "true");
  await expect(menu.locator("button")).toHaveText(["KOZMETİK", "ÖDÜLLER", "ARKADAŞ", "AYARLAR"]);
  const placement = await page.evaluate(() => {
    const box = (selector) => document.querySelector(selector).getBoundingClientRect();
    const inbox = box("#reward-inbox-button");
    const button = box("#lobby-menu-button");
    const rows = [...document.querySelectorAll("#lobby-menu > button")].map((row) => row.getBoundingClientRect());
    return {
      rightOfInbox: button.left >= inbox.right,
      belowButton: box("#lobby-menu").top >= button.bottom,
      stacked: rows.every((row, index) => index === 0 || (row.top >= rows[index - 1].bottom - 1 && row.left === rows[0].left)),
    };
  });
  expect(placement).toEqual({ rightOfInbox:true, belowButton:true, stacked:true });

  // Dışarıya dokunmak yalnız menüyü kapatır; alttaki düğme çalışmaz.
  await page.locator("#home-battle-button").click({ force:true });
  await expect(menu).toBeHidden();
  await expect(page.locator('body[data-app-screen="menu"]')).toBeVisible();
  await expect(page.locator("#home-matchmaking-overlay")).toBeHidden();

  for (const screen of ["avatar", "daily", "friends", "settings"]) {
    await menuButton.click();
    await menu.locator(`[data-open-screen="${screen}"]`).click();
    await expect(page.locator(`body[data-app-screen="${screen}"]`)).toBeVisible();
    await page.locator('[data-shell-screen="menu"]').click();
    await expect(page.locator('body[data-app-screen="menu"]')).toBeVisible();
    await expect(menu).toBeHidden();
  }
});

test("Kart sırası, kısa otomatik ad ve sade operatör bildirimleri", async ({ page }) => {
  await page.setViewportSize({ width:393, height:852 });
  await page.addInitScript(() => localStorage.setItem("gridshard.tutorial.v1", "complete"));
  await page.goto("/?e2e=1", { waitUntil:"domcontentloaded" });
  await waitForParticipantReady(page);
  await expect(page.locator("#lobby-player-name")).toHaveText(/^Pilot-[A-F0-9]{8}$/);
  const typography = await page.evaluate(() => ({
    name:parseFloat(getComputedStyle(document.querySelector("#lobby-player-name")).fontSize),
    title:parseFloat(getComputedStyle(document.querySelector("#lobby-player-details")).fontSize),
  }));
  expect(typography.title).toBeLessThan(typography.name * .8);

  await page.locator('[data-shell-screen="modules"]').click();
  const tiles = page.locator("#module-collection-grid .collection-module-tile");
  await expect(tiles.first()).toHaveAttribute("data-module-definition-id", "laser");
  const order = await tiles.evaluateAll((elements) => elements.map((element) => element.dataset.moduleDefinitionId));
  const expected = await page.evaluate(() => {
    const rarity = { common:0, rare:1, epic:2, legendary:3 };
    return [...GRIDSHARD_CANON_MODULES].sort((a, b) => a.unlock_arena - b.unlock_arena || rarity[a.rarity] - rarity[b.rarity]).map((item) => item.id);
  });
  expect(order).toEqual(expected);
  await page.locator('[data-module-filter="saldırı"]').click();
  const attackIds = await page.evaluate(() => GRIDSHARD_CANON_MODULES.filter((item) => item.category === "saldırı").map((item) => item.id));
  expect(await tiles.evaluateAll((elements) => elements.map((element) => element.dataset.moduleDefinitionId)))
    .toEqual(order.filter((id) => attackIds.includes(id)));
  await page.locator('[data-module-filter="all"]').click();
  expect(await tiles.evaluateAll((elements) => elements.map((element) => element.dataset.moduleDefinitionId))).toEqual(order);

  // Deliberately exercise both pending sources; they must share one indicator.
  const light = await page.evaluate(() => {
    const menuButton = document.querySelector("#lobby-menu-button");
    menuButton.classList.add("has-avatar-notification", "has-social-notification");
    const style = getComputedStyle(menuButton, "::after");
    return { width:style.width, height:style.height, animation:style.animationName, background:style.backgroundImage };
  });
  expect(light).toEqual({ width:"8px", height:"8px", animation:"none", background:"none" });
  await page.screenshot({ path:"test-results/operator-cards-mobile.png" });
});
