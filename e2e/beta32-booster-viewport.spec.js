const { test, expect } = require("@playwright/test");


test("savaş rafı viewportta kalır ve 30. saniye güçlendiricisi sunucuya uygulanır", async ({ page }) => {
  test.setTimeout(100_000);
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.setViewportSize({width:1366, height:630});
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
  await initialChoices.nth(0).selectOption("shield-1");
  await initialChoices.nth(1).selectOption("laser-1");
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

  const viewport = await page.evaluate(() => {
    const shelfPanel = document.querySelector(".shelf-panel").getBoundingClientRect();
    const moduleShelf = document.getElementById("module-shelf").getBoundingClientRect();
    return {
      bodyHeight:document.documentElement.scrollHeight,
      innerHeight:window.innerHeight,
      shelfBottom:Math.round(shelfPanel.bottom),
      moduleShelfBottom:Math.round(moduleShelf.bottom),
      moduleShelfHeight:Math.round(moduleShelf.height),
    };
  });
  expect(viewport.bodyHeight).toBeLessThanOrEqual(viewport.innerHeight + 1);
  expect(viewport.shelfBottom).toBeLessThanOrEqual(viewport.innerHeight);
  expect(viewport.moduleShelfBottom).toBeLessThanOrEqual(viewport.innerHeight);
  expect(viewport.moduleShelfHeight).toBeGreaterThan(80);

  const geometry = await page.locator(
    '#board .module-card[data-module-id="generator-1"]'
  ).evaluate((card) => {
    const capture = () => {
      const box = card.getBoundingClientRect();
      const iconBox = card.querySelector(".module-icon").getBoundingClientRect();
      const ports = [...card.querySelectorAll(".port-dot")].map((port) => {
        const portBox = port.getBoundingClientRect();
        return {
          side:[...port.classList].find(
            name => name !== "port-dot" && name.startsWith("port-")
          ),
          x:portBox.left + portBox.width / 2,
          y:portBox.top + portBox.height / 2,
        };
      });
      return {
        card:[box.left, box.top, box.right, box.bottom],
        icon:[iconBox.left, iconBox.top, iconBox.right, iconBox.bottom],
        ports,
        iconContained:
          iconBox.left >= box.left - 1
          && iconBox.top >= box.top - 1
          && iconBox.right <= box.right + 1
          && iconBox.bottom <= box.bottom + 1,
        aligned:ports.every((port) => {
          if (port.side === "port-up" || port.side === "port-down") {
            const expectedY = port.side === "port-up" ? box.top : box.bottom;
            return Math.abs(port.x - (box.left + box.width / 2)) <= 1
              && Math.abs(port.y - expectedY) <= 1;
          }
          const expectedX = port.side === "port-left" ? box.left : box.right;
          return Math.abs(port.x - expectedX) <= 1
            && Math.abs(port.y - (box.top + box.height / 2)) <= 1;
        }),
      };
    };
    const flatten = (value) => [
      ...value.card,
      ...value.icon,
      ...value.ports.flatMap(port => [port.x, port.y]),
    ];
    const delta = (first, second) => Math.max(
      ...flatten(first).map((value, index) => Math.abs(value - flatten(second)[index]))
    );

    const powered = capture();
    card.classList.remove("energy-flowing");
    const unpowered = capture();

    card.classList.add("fx-hit");
    void card.offsetWidth;
    const hitAnimation = card.getAnimations().find(
      animation => animation.animationName === "gs-card-impact-static"
    );
    if (hitAnimation) {
      hitAnimation.pause();
      hitAnimation.currentTime = 180;
    }
    const hit = capture();
    card.classList.remove("fx-hit");

    card.classList.add("fx-fire");
    void card.offsetWidth;
    const fireAnimation = card.getAnimations().find(
      animation => animation.animationName === "gs-card-fire-static"
    );
    if (fireAnimation) {
      fireAnimation.pause();
      fireAnimation.currentTime = 90;
    }
    const fire = capture();
    card.classList.remove("fx-fire");
    card.classList.add("energy-flowing");

    return {
      energyDelta:delta(powered, unpowered),
      hitDelta:delta(unpowered, hit),
      fireDelta:delta(unpowered, fire),
      portAlignment:[powered, unpowered, hit, fire].every(value => value.aligned),
      iconContainment:[powered, unpowered, hit, fire].every(
        value => value.iconContained
      ),
      hitAnimationFound:Boolean(hitAnimation),
      fireAnimationFound:Boolean(fireAnimation),
      powered,
      unpowered,
      hit,
      fire,
    };
  });
  expect(geometry.portAlignment, JSON.stringify(geometry)).toBe(true);
  expect(geometry.iconContainment, JSON.stringify(geometry)).toBe(true);
  expect(geometry.hitAnimationFound).toBe(true);
  expect(geometry.fireAnimationFound).toBe(true);
  expect(geometry.energyDelta).toBeLessThanOrEqual(.75);
  expect(geometry.hitDelta).toBeLessThanOrEqual(.75);
  expect(geometry.fireDelta).toBeLessThanOrEqual(.75);

  const lockedBooster = await page.locator("#booster-panel").evaluate((panel) => {
    const button = panel.querySelector(".booster-option");
    const buttonStyle = getComputedStyle(button);
    return {
      state:panel.dataset.state,
      panelHeight:panel.getBoundingClientRect().height,
      buttonHeight:button.getBoundingClientRect().height,
      buttonFontSize:Number.parseFloat(buttonStyle.fontSize),
    };
  });
  expect(lockedBooster.state).toBe("locked");
  expect(lockedBooster.panelHeight).toBeGreaterThanOrEqual(78);
  expect(lockedBooster.buttonHeight).toBeGreaterThanOrEqual(40);
  expect(lockedBooster.buttonFontSize).toBeGreaterThanOrEqual(10);

  await expect(page.locator("#booster-status")).toContainText(
    "3 seçenekten 1'ini seç",
    {timeout:45_000}
  );
  await expect(page.locator("#booster-panel")).toHaveAttribute(
    "data-state",
    "ready"
  );
  const readyBooster = await page.locator("#booster-panel").evaluate((panel) => ({
    borderWidth:Number.parseFloat(getComputedStyle(panel).borderTopWidth),
    optionOpacity:Number.parseFloat(
      getComputedStyle(panel.querySelector(".booster-option")).opacity
    ),
  }));
  expect(readyBooster.borderWidth).toBeGreaterThanOrEqual(2);
  expect(readyBooster.optionOpacity).toBe(1);
  await page.getByRole("button", {name:"Çift Port Adaptörü"}).click();
  await expect(page.locator("#booster-panel")).toHaveAttribute(
    "data-state",
    "target"
  );
  await page.locator('#board .module-card[data-module-id="core-1"]').click();
  await expect(page.locator("#event-log")).toContainText(
    '"kind":"select_booster"',
    {timeout:2_000}
  );
  await expect(page.locator("#event-log")).toContainText(
    '"kind":"apply_booster"',
    {timeout:2_000}
  );
  await page.waitForTimeout(700);
  await expect(page.locator("#event-log")).not.toContainText(
    "Savaş komutu reddedildi"
  );
  expect(errors).toEqual([]);
});
