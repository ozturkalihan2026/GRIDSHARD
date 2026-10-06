const { test, expect } = require("@playwright/test");

// İlk oyun deneyimi: hiç maçı olmayan misafir hesap, atlama seçeneği olmadan
// menü turunu ve sunucunun sahne sahne yönettiği ilk savaşı baştan sona oynar.
// Akış metinlerden değil adım kimliklerinden (`data-step`) izlenir.
//
// Bazı adımlar yalnız önceki iş gerçekten yapıldıysa görünür; sıranın tam
// tutması bunları da kanıtlar: `laser-upgraded` Lazer seviye atladıysa,
// `weekly-joined` turnuva kaydı yapıldıysa, `victory:*` savaş kazanıldıysa çıkar.
const MENU_STEPS = [
  "welcome", "open-shop", "gift-chest", "chest-reward", "currencies",
  "open-cards", "deck", "select-laser", "laser-info", "laser-upgrade", "laser-upgraded",
  "open-team", "team",
  "open-events", "open-weekly", "weekly-register", "weekly-joined",
  "open-home", "home",
];
// server/app/game/tutorial.py içindeki STAGES ile aynı sıra.
const BATTLE_STAGES = [
  "arena", "current", "deploy_laser", "watch_laser",
  "type_attack", "type_defense", "type_support", "type_system", "limits",
  "hp_bar", "heat_bar", "deploy_cooler", "watch_cooler",
  "enemy_attack", "deploy_repair", "watch_repair",
  "energy_low", "deploy_battery", "watch_battery",
  "enemy_boost", "deploy_laser_2", "deploy_amplifier", "finale",
];
const EXPECTED_STEPS = [
  ...MENU_STEPS.map((id) => `${id}:`),
  "battle:start",
  ...BATTLE_STAGES.map((stage) => `battle:${stage}`),
  "victory:damage",
  "victory:rewards",
  "farewell:",
];

async function enterAsNewGuest(page) {
  await page.goto("/?e2e=1&onboarding=1", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (
    ["ready", "error"].includes(document.querySelector("#participant-bootstrap-status")?.dataset.status)
  ), undefined, { timeout: 60_000 });
  await page.locator("#startup-loading").waitFor({ state: "hidden", timeout: 60_000 });
  const guest = page.locator("#account-onboarding-guest");
  if (await guest.isVisible()) await guest.click();
  const daily = page.locator("#daily-meta-dialog");
  await daily.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
  if (await daily.isVisible()) {
    const roll = page.locator("#daily-meta-roll");
    if ((await roll.textContent()).includes("METAYI")) {
      await roll.click();
      await expect(roll).toContainText("DEVAM", { timeout: 20_000 });
    }
    await roll.click();
  }
}

function guideState(page) {
  return page.evaluate(() => {
    const root = document.querySelector(".guide-overlay");
    const open = Boolean(root?.open);
    const hole = open ? root.querySelector(".guide-hole") : null;
    const box = hole && !hole.hidden ? hole.getBoundingClientRect() : null;
    return {
      open,
      modal: open && root.matches(":modal"),
      step: open ? root.dataset.step : "",
      mode: open ? root.dataset.mode : "",
      target: box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : null,
      buttons: open ? root.querySelectorAll("button").length : 0,
      complete: localStorage.getItem("gridshard.tutorial.v1") === "complete",
      screen: document.body.dataset.appScreen,
      status: document.body.dataset.onlineStatus,
    };
  });
}

test("yeni oyuncu ilk oyun deneyimini atlamadan baştan sona tamamlar", async ({ page, browserName }) => {
  // Windows'taki WebKit öykünmesi ekran kartı hızlandırması olmadan çizer; akış
  // aynı, yalnız birkaç kat yavaştır.
  const pace = browserName === "webkit" ? 3 : 1;
  test.setTimeout(240_000 * pace);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));
  await enterAsNewGuest(page);

  const visited = [];
  let actedStep = "";
  let actedAt = 0;
  let blockingChecked = false;
  const deadline = Date.now() + 200_000 * pace;
  let state = await guideState(page);
  while (!state.complete && Date.now() < deadline) {
    if (state.open && visited.at(-1) !== state.step) visited.push(state.step);

    if (state.open && state.modal) {
      // Katmanda atlama düğmesi yoktur: tek düğme "İLERİ"dir.
      expect(state.buttons).toBe(1);

      if (state.step === "open-shop:" && !blockingChecked) {
        // Gösterilen hedefin dışına dokunmak hiçbir şeyi başlatmaz.
        blockingChecked = true;
        const battle = await page.locator("#home-battle-button").boundingBox();
        await page.touchscreen.tap(battle.x + battle.width / 2, battle.y + battle.height / 2);
        await page.waitForTimeout(400);
        const after = await guideState(page);
        expect(after.status).toBe("idle");
        expect(after.screen).toBe("menu");
        expect(after.step).toBe("open-shop:");
      }

      // Her adımda bir kez davranılır; hedef henüz hazır değilse yeniden denenir.
      const retry = actedStep === state.step && Date.now() - actedAt > 2_000;
      if (actedStep !== state.step || retry) {
        if (state.mode === "next") {
          await page.locator(".guide-overlay .guide-next").click();
        } else if (state.mode === "tap" && state.target) {
          await page.touchscreen.tap(state.target.x, state.target.y);
        }
        actedStep = state.step;
        actedAt = Date.now();
      }
    }
    await page.waitForTimeout(100);
    state = await guideState(page);
  }

  expect(visited).toEqual(EXPECTED_STEPS);
  expect(state.complete).toBe(true);
  expect(state.open).toBe(false);
  expect(state.screen).toBe("menu");
  expect(pageErrors).toEqual([]);

  // Tamamlanan eğitim yeniden açılışta başlamaz.
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("#startup-loading").waitFor({ state: "hidden", timeout: 60_000 });
  await page.waitForTimeout(1_500);
  expect((await guideState(page)).open).toBe(false);
});
