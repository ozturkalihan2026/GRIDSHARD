const { test, expect } = require("@playwright/test");
const { waitForParticipantReady } = require("./ui-helpers");

test('extra daily and seasonal mission claims preserve their period in TR and EN', async ({page}, info) => {
  // Presentation fixture only; server tests prove eligibility, XP and replay.
  const claimed = new Set(), requests = [];
  let latest;
  function decorate(profile) {
    const engagement = profile.engagement;
    engagement.season_active = true;
    engagement.season_id = 'fixture-s1';
    engagement.season_ends_at = '2026-11-29T23:59:59Z';
    engagement.season_xp = (claimed.has('daily_battles_4') ? 15 : 0) + (claimed.has('season_battles_20') ? 150 : 0);
    for (const mission of [...engagement.extra_daily_missions, ...engagement.seasonal_missions]) {
      mission.season_id = 'fixture-s1';
      mission.completed = ['daily_battles_4','season_battles_20'].includes(mission.id);
      mission.progress = mission.completed ? mission.target : 0;
      mission.claimed = claimed.has(mission.id);
      mission.claimable = mission.completed && !mission.claimed;
    }
    latest = profile;
    return profile;
  }
  await page.route(/\/(?:profile\/[^/?]+(?:\/notifications\/[^/?]+\/seen)?|participants\/[^/?]+\/bootstrap)(?:\?.*)?$/, async route => {
    const response = await route.fetch();
    const json = await response.json();
    if (json.engagement) decorate(json);
    if (json.profile?.engagement) decorate(json.profile);
    await route.fulfill({response, json});
  });
  await page.route(/\/engagement\/season-missions\/[^/]+\/claim$/, async route => {
    const id = decodeURIComponent(route.request().url().split('/').at(-2));
    const body = route.request().postDataJSON();
    requests.push({id, body});
    expect(body.season_id).toBe('fixture-s1');
    expect(body.day_key).toBe(id.startsWith('daily_') ? latest.engagement.daily_mission_day : '');
    claimed.add(id);
    await route.fulfill({json:{...decorate(latest), season_mission_receipt:{mission_id:id, season_xp_reward:id.startsWith('daily_') ? 15 : 150}}});
  });
  await page.setViewportSize({width:393,height:852});
  await page.goto('/?e2e=1');
  await waitForParticipantReady(page);
  await page.locator('#lobby-menu-button').click();
  await page.locator('#lobby-menu [data-open-screen="daily"]').click();
  await page.locator('#rewards-hub-screen [data-open-screen="daily-missions"]').click();
  const daily = page.locator('[data-mission-claim="daily_battles_4"]');
  await expect(page.locator('#daily-mission-list .daily-mission-card')).toHaveCount(8);
  await daily.click();
  await expect(daily).toBeDisabled();
  await expect(daily).toHaveText('Alındı');
  await page.screenshot({path:info.outputPath('daily-eight-tr-393.png')});
  await page.locator('#mission-tab-seasonal').click();
  await expect(page.locator('#daily-mission-list .daily-mission-card')).toHaveCount(12);
  const seasonal = page.locator('[data-mission-claim="season_battles_20"]');
  await seasonal.click();
  await expect(seasonal).toBeDisabled();
  await expect(seasonal).toHaveText('Alındı');
  await page.setViewportSize({width:320,height:568});
  await page.evaluate(() => window.GridshardI18n.apply('en'));
  await expect(page.locator('#mission-tab-seasonal')).toHaveText('Seasonal');
  await expect(page.locator('#daily-mission-reset')).toContainText('Season ends');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath('seasonal-twelve-en-320.png')});
  await page.locator('#mission-tab-seasonal').press('ArrowLeft');
  await expect(page.locator('#mission-tab-daily')).toBeFocused();
  await expect(page.locator('#daily-mission-list .daily-mission-card')).toHaveCount(8);
  expect(requests).toHaveLength(2);
});


test("Güncel günlük emirler ve 40 kademeli sezon yolu gerçek tarayıcıda görünür", async ({ page }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(String(error)));
  await page.addInitScript(() =>
    localStorage.setItem("gridshard.tutorial.v1", "complete")
  );

  await page.goto("/?e2e=1", { waitUntil: "domcontentloaded" });
  await waitForParticipantReady(page);
  await page.locator("#lobby-menu-button").click();
  await page.locator('#lobby-menu [data-open-screen="daily"]').click();
  await page.locator('#rewards-hub-screen [data-open-screen="daily-missions"]').click();
  await expect(page.locator("#daily-mission-list .daily-mission-card")).toHaveCount(8);
  await page.locator('#mission-tab-seasonal').click();
  await expect(page.locator('#daily-mission-list .daily-mission-card')).toHaveCount(12);
  await expect(page.locator('#mission-tab-seasonal')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#daily-missions-screen .reward-back-link').click();
  await page.locator('#rewards-hub-screen [data-open-screen="rewards"]').click();
  await expect(page.locator("#season-reward-track .season-pass-row")).toHaveCount(40);
  await expect(page.locator("#season-tier-label")).toContainText("Kademe 0 / 40");

  const seasonVisual = await page.locator(".season-rewards-screen").evaluate(element => {
    const style = getComputedStyle(element);
    const progress = document.querySelector(".season-progress-track").getBoundingClientRect();
    return {
      background: style.backgroundImage,
      borderColor: style.borderColor,
      progressHeight: progress.height,
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    };
  });
  expect(seasonVisual.background).toContain("gradient");
  expect(seasonVisual.borderColor).not.toBe("rgba(0, 0, 0, 0)");
  expect(seasonVisual.progressHeight).toBeGreaterThanOrEqual(10);
  expect(seasonVisual.scrollWidth).toBeLessThanOrEqual(seasonVisual.clientWidth + 1);

  await page.locator('[data-shell-screen="menu"]').click();
  await expect(page.locator('body[data-app-screen="menu"]')).toBeVisible();
  // Operatör unvanı artık sezon ekranında değil, Ev ekranından açılan unvan
  // penceresinde gösterilir.
  await page.locator("#lobby-player-details").click();
  await expect(page.locator("#operator-titles-title")).toContainText("Devre Çırağı");
  await page.locator("#operator-titles-close").click();
  // Retired manual initial placement must not become a test prerequisite.
  await expect(page.locator(".initial-circuit-picker")).not.toBeVisible();
  expect(errors).toEqual([]);
});
