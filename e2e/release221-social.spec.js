const {test, expect} = require('@playwright/test');
const {waitForParticipantReady} = require('./ui-helpers');

const deck = ['burst_cannon','shield_breaker','buffer_shield','last_bastion','cleanser','speed_relay'];

async function loadedArt(locator) {
  await expect(locator).toHaveCount(6);
  await expect.poll(() => locator.evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
}

test('current deck paintings, public team navigation, visible back buttons and painted event wheel', async ({page}, info) => {
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  // Fresh isolated accounts have no ranked matches. Put a real canonical bot
  // in the presentation fixture; its profile/team still load from the server.
  await page.route('**/leaderboards?*', async route => {
    const response = await route.fetch(), body = await response.json();
    body.trophies = [{position:1,player_id:'bot_b01_01',display_name:'Profil Denemesi',value:70,rank_name_tr:'Başlangıç Devresi'}];
    await route.fulfill({response,json:body});
  });
  // Presentation fixtures use real API shapes; history filtering is verified
  // against real profile/meta services in test_release_221_profiles_updates.py.
  await page.route('**/profile/*/meta-progression', async route => {
    const response = await route.fetch(), body = await response.json();
    body.statistics.most_used_decks = [{module_ids:deck, matches:4}];
    await route.fulfill({response,json:body});
  });
  await page.route('**/public-profiles/*', async route => {
    const response = await route.fetch(), body = await response.json();
    body.featured_deck = {module_ids:deck, matches:4};
    await route.fulfill({response,json:body});
  });
  await page.goto('/?e2e=1');
  await waitForParticipantReady(page,60000);
  await page.locator('#lobby-profile-button').click();
  await loadedArt(page.locator('#profile-most-used-deck img.module-device-icon'));
  await page.locator('#profile-most-used-deck').scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath('own-profile.png')});
  await page.locator('[data-shell-screen="menu"]').click();
  await page.locator('#home-arena-card').click();
  await page.locator('#arena-leaderboard-button').click();
  await page.locator('#leaderboard-list .public-player-link').first().click({timeout:10000});
  await expect(page.locator('#public-profile-content .profile-deck-module img')).toHaveCount(6);
  await loadedArt(page.locator('#public-profile-content .profile-deck-module img'));
  const back = page.locator('#public-profile-close');
  await expect(back).toBeVisible();
  await expect(back).toHaveText('');
  await expect(back.locator('svg')).toHaveCount(1);
  expect((await back.boundingBox()).width).toBe(44);
  expect((await back.boundingBox()).height).toBeGreaterThanOrEqual(44);
  await expect(back).not.toHaveCSS('background-image','none');
  await page.screenshot({path:info.outputPath('visited-profile.png')});
  await page.locator('#public-profile-content .profile-clan-card .team-profile-link').click();
  await expect(page.locator('#team-profile-dialog')).toBeVisible();
  await expect(page.locator('#team-profile-content .team-public-identity')).toBeVisible();
  await expect(page.locator('#team-profile-status')).toBeEmpty();
  await expect(page.locator('#team-profile-close')).not.toHaveCSS('background-image','none');
  await page.screenshot({path:info.outputPath('public-team.png')});
  await page.locator('#team-profile-close').click();
  await expect(page.locator('#public-profile-dialog')).toBeVisible();
  await page.locator('#public-profile-close').click();
  await expect(page.locator('#leaderboard-dialog')).toBeVisible();
  await page.locator('#leaderboard-back').click();
  await page.locator('#arena-detail-close').click();
  await page.locator('[data-shell-screen="events"]').click();
  const wheel = page.locator('#daily-meta-card .event-painted-wheel');
  await expect(wheel).toBeVisible();
  await expect.poll(() => wheel.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(page.locator('#daily-meta-card [data-event-emblem="wheel"] svg')).toHaveCount(0);
  await page.screenshot({path:info.outputPath('events-wheel.png')});
  expect(errors).toEqual([]);
});

test('2.2.0 and 2.2.1 notes expand in System and stay read after reload', async ({page}, info) => {
  await page.goto('/?e2e=1');
  await waitForParticipantReady(page,60000);
  await page.locator('#reward-inbox-button').click();
  await page.locator('#inbox-tab-system').click();
  await expect(page.locator('#reward-inbox-notices .inbox-notice-card[data-kind="announcement"]')).toHaveCount(1);
  const notes = page.locator('#reward-inbox-notices .inbox-notice-card[data-kind="update"]');
  await expect(notes.nth(0)).toContainText('GRIDSHARD 2.3.0');
  await expect(notes.nth(1)).toContainText('GRIDSHARD 2.2.1');
  for (const version of ['2.2.0','2.2.1','2.3.0']) {
    const card = notes.filter({hasText:`GRIDSHARD ${version}`});
    await expect(card).toHaveCount(1);
    await card.locator('div > strong').first().click();
    await expect(card.locator('.inbox-message-content')).toBeVisible();
    await expect(card.locator('.inbox-card-date')).not.toHaveText(/Tarih kaydı yok/);
    await expect(card).toHaveAttribute('data-seen','true');
  }
  await page.screenshot({path:info.outputPath('system-updates.png')});
  await page.reload();
  await waitForParticipantReady(page,60000);
  await page.locator('#reward-inbox-button').click();
  await page.locator('#inbox-tab-system').click();
  for (const version of ['2.2.0','2.2.1','2.3.0']) {
    await expect(page.locator('#reward-inbox-notices .inbox-notice-card').filter({hasText:`GRIDSHARD ${version}`})).toHaveAttribute('data-seen','true');
  }
});
