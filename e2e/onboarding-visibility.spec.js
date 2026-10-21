const { test, expect } = require("@playwright/test");
const fs = require("node:fs");
const path = require("node:path");
const { waitForParticipantReady } = require("./ui-helpers");

const client = path.resolve(__dirname, "../client");
const html = fs.readFileSync(path.join(client, "index.html"), "utf8");
const styles = [...html.match(/<!-- build:styles -->([\s\S]*?)<!-- \/build:styles -->/)[1]
  .matchAll(/href="([^"]+)"/g)].map(match => path.resolve(client, match[1]));

test("eğitim katmanı arayüzü örtmez; normal pencereler panel stilini korur", async ({ page }) => {
  // Isolated presentation fixture: use EVERY production stylesheet in its real
  // order and the real guide renderer, without accounts, purchases or a battle.
  await page.setContent(`<body data-app-screen="menu">
    <main style="position:fixed;inset:0;background:#173447">
      <button id="guide-fixture-target" style="position:absolute;left:24px;top:100px;width:140px;height:60px">Mağaza</button>
      <div id="guide-fixture-module" style="position:absolute;left:24px;top:180px">Lazer</div>
    </main>
    <dialog id="guide-fixture-panel"><h2>Modül bilgisi</h2></dialog>
  </body>`);
  for (const file of styles) await page.addStyleTag({ path: file });
  await page.addScriptTag({ path: path.join(client, "src/tutorial/onboarding.js") });
  await page.evaluate(() => {
    globalThis.guideFixture = new GridshardGuideOverlay();
    guideFixture.render({ key:"welcome", mode:"next", title:"Başlangıç eğitimi", body:"Menü turu" });
  });
  const guide = page.locator("dialog.guide-overlay");
  const expectClearCanvas = async () => {
    await expect(guide).toHaveCSS("background-image", "none");
    await expect(guide).toHaveCSS("border-top-width", "0px");
    await expect(guide).toHaveCSS("box-shadow", "none");
    expect(await guide.evaluate(element => getComputedStyle(element, "::backdrop").backgroundColor))
      .toBe("rgba(0, 0, 0, 0)");
    await expect(page.locator("#guide-fixture-target")).toBeVisible();
    await expect(page.locator("#guide-fixture-module")).toBeVisible();
  };
  await expectClearCanvas();
  // No target: retain the intended translucent shade, not an opaque panel.
  await expect(guide).toHaveCSS("background-color", "rgba(2, 8, 17, 0.74)");
  await page.evaluate(() => {
    guideFixture.render({ key:"shop", mode:"tap", title:"Mağaza", target:document.getElementById("guide-fixture-target") });
  });
  await expectClearCanvas();
  await expect(guide).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await expect(guide.locator(".guide-hole")).toBeVisible();
  await expect(guide.locator(".guide-arrow")).toBeVisible();
  // A modal guide still owns input and forwards ONLY taps inside its target.
  await page.evaluate(() => {
    globalThis.guideFixtureTaps = 0;
    document.getElementById("guide-fixture-target").addEventListener("click", () => guideFixtureTaps++);
  });
  const target = await page.locator("#guide-fixture-target").boundingBox();
  await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2);
  expect(await page.evaluate(() => guideFixtureTaps)).toBe(1);
  await page.mouse.click(2, 2);
  expect(await page.evaluate(() => guideFixtureTaps)).toBe(1);
  await page.evaluate(() => {
    document.body.dataset.appScreen = "play";
    guideFixture.render({ key:"battle", mode:"wait", title:"Savaş", tone:"battle", shade:"none", blocking:false });
  });
  await expectClearCanvas();
  await expect(guide).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  await page.evaluate(() => {
    guideFixture.hide();
    document.getElementById("guide-fixture-panel").showModal();
  });
  await expect(guide).not.toBeVisible();
  const panel = page.locator("#guide-fixture-panel");
  await expect(panel).toHaveCSS("border-top-width", "2px");
  expect(await panel.evaluate(element => getComputedStyle(element).backgroundImage)).toContain("linear-gradient");
});

test("eşleştirme hatası eğitim altında kilitlenmez; tekrar denemede ilk savaş açılır", async ({ page }) => {
  test.setTimeout(90_000);
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  let failJoin = true;
  await page.route("**/matchmaking/join", route => failJoin
    ? route.fulfill({status:503, contentType:"application/json", body:'{"detail":"Fixture connection failure"}'})
    : route.continue());
  await page.addInitScript(() => {
    localStorage.removeItem("gridshard.tutorial.v1");
    localStorage.setItem("gridshard.onboarding.step.v1", "battle");
  });
  await page.goto("/?e2e=1&onboarding=1", {waitUntil:"domcontentloaded"});
  await waitForParticipantReady(page);
  const guide = page.locator("dialog.guide-overlay");
  const tapBattleTarget = async () => {
    await expect(guide).toBeVisible();
    await expect(guide).toHaveAttribute("data-step", "battle:start");
    const hole = await guide.locator(".guide-hole").boundingBox();
    expect(hole).not.toBeNull();
    await page.mouse.click(hole.x + hole.width / 2, hole.y + hole.height / 2);
  };
  await tapBattleTarget();
  await expect(page.locator("body")).toHaveAttribute("data-online-status", "error");
  await expect(guide).not.toBeVisible();
  await expect(page.locator("#home-matchmaking-copy")).toContainText("Fixture connection failure");
  await page.locator("#home-matchmaking-cancel").click();
  await expect(page.locator("#home-matchmaking-overlay")).toBeHidden();
  failJoin = false;
  await tapBattleTarget();
  await expect(page.locator("body")).toHaveAttribute("data-online-status", "battle", {timeout:40_000});
  await expect(page.locator("#home-matchmaking-overlay")).toBeHidden();
  await expect(page.locator("#board .module-card").first()).toBeVisible();
  await expect(guide).toHaveAttribute("data-step", "battle:arena");
  expect(errors).toEqual([]);
});
