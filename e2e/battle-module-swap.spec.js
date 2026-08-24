const { test, expect } = require("@playwright/test");


test("aktif modüller sürüklemeyle takas olur ve tıklamayla port yönü döner", async ({ page }) => {
  test.setTimeout(120_000);
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.setViewportSize({width:1366, height:768});
  await page.addInitScript(() =>
    localStorage.setItem("gridshard.tutorial.v1", "complete")
  );

  await page.goto("/?e2e=1", {waitUntil:"domcontentloaded"});
  await page.getByRole("button", {name:"Oyna"}).click();
  await page.getByRole("button", {name:"Hazır Havuzları Yönet"}).click();
  const starter = page.locator(".preset-card", {hasText:"Başlangıç Devresi"});
  await starter.getByRole("button", {name:"Yükle"}).click();
  await page.getByRole("button", {name:"Kapat"}).click();
  const initialChoices = page.locator("#initial-module-picker select");
  await expect(initialChoices).toHaveCount(2);
  await initialChoices.nth(0).selectOption("armor-1");
  await initialChoices.nth(1).selectOption("barrier-1");
  await expect(page.locator("#play-readiness-status")).toHaveAttribute(
    "data-ready",
    "true",
    {timeout:20_000}
  );
  await page.locator("#battle-pool-confirm").click();
  await expect(page.locator("body")).toHaveAttribute(
    "data-online-status",
    "battle",
    {timeout:25_000}
  );
  await expect(page.locator("#capacity-indicator")).toContainText(
    "/ 5",
    {timeout:25_000}
  );

  const energyCell = page.locator(
    '#board .board-cell[data-x="2"][data-y="4"]'
  );
  await page.locator(
    '#module-shelf .module-card[data-module-id="shield-1"]'
  ).click();
  await energyCell.click();
  await expect(energyCell.locator(
    '.module-card[data-module-id="shield-1"]'
  )).toHaveCount(1, {timeout:3_000});

  const openBranch = page.locator(
    '#board .board-cell[data-x="1"][data-y="3"][data-occupied="false"], '
    + '#board .board-cell[data-x="3"][data-y="3"][data-occupied="false"]'
  ).first();
  await expect(openBranch).toHaveCount(1);
  await page.locator(
    '#module-shelf .module-card[data-module-id="reflector-1"]'
  ).click();
  await openBranch.click();
  const first = page.locator(
    '#board .module-card[data-module-id="shield-1"]'
  );
  const second = page.locator(
    '#board .module-card[data-module-id="reflector-1"]'
  );
  await expect(first).toHaveCount(1, {timeout:3_000});
  await expect(second).toHaveCount(1, {timeout:3_000});
  const cardPosition = card => ({
    id:card.dataset.moduleId,
    x:card.closest(".board-cell").dataset.x,
    y:card.closest(".board-cell").dataset.y,
  });
  const firstBefore = await first.evaluate(cardPosition);
  const secondBefore = await second.evaluate(cardPosition);

  const transfer = await page.evaluateHandle(() => new DataTransfer());
  const targetCell = page.locator(
    `#board .board-cell[data-x="${secondBefore.x}"][data-y="${secondBefore.y}"]`
  );
  await first.dispatchEvent("dragstart", {dataTransfer:transfer});
  await targetCell.dispatchEvent("dragover", {dataTransfer:transfer});
  await targetCell.dispatchEvent("drop", {dataTransfer:transfer});
  await expect(page.locator("#event-log")).toContainText(
    '"kind":"swap_modules"',
    {timeout:2_000}
  );
  await first.dispatchEvent("dragend", {dataTransfer:transfer});
  await page.waitForTimeout(500);
  await expect(page.locator("#event-log")).not.toContainText(
    "Savaş komutu reddedildi",
    {timeout:1_000}
  );
  await expect.poll(async () => first.evaluate(cardPosition)).toEqual({
    id:firstBefore.id,
    x:secondBefore.x,
    y:secondBefore.y,
  });
  await expect.poll(async () => second.evaluate(cardPosition)).toEqual({
    id:secondBefore.id,
    x:firstBefore.x,
    y:firstBefore.y,
  });

  const swappedFirst = page.locator(
    `#board .module-card[data-module-id="${firstBefore.id}"]`
  );
  const portsBefore = await swappedFirst.locator(".port-dot").evaluateAll(
    ports => ports.map(port => port.className).sort()
  );
  await swappedFirst.click();
  await expect.poll(async () => swappedFirst.locator(".port-dot").evaluateAll(
    ports => ports.map(port => port.className).sort()
  )).not.toEqual(portsBefore);

  expect(errors).toEqual([]);
});
