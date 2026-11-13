const {test, expect} = require('@playwright/test');
const {waitForParticipantReady} = require('./ui-helpers');

test('tournament cards distinguish scheduled opening, weekly dates and the four-week period', async ({page}) => {
  let started = false;
  await page.route('**/events?*', async route => {
    const response = await route.fetch();
    const state = await response.json();
    Object.assign(state.weekly_tournament, {
      status: started ? 'active' : 'waiting_for_launch', starts_at:'2026-11-30T00:00:00Z',
      registration_open:started, standings:[],
      period:{id:started ? '2026-W50' : '2026-W49', starts_at:started ? '2026-12-07T00:00:00Z' : '2026-11-30T00:00:00Z',
        ends_at:started ? '2026-12-13T23:59:59Z' : '2026-12-06T23:59:59Z'},
    });
    Object.assign(state.team_tournament, {
      status:started ? 'matches' : 'waiting_for_launch', phase:started ? 'matches' : 'waiting_for_launch',
      starts_at:'2026-11-30T00:00:00Z', week:started ? 2 : 1, registration_open:false, standings:[], fixtures:[],
      period:{id:'2026-11-30', starts_at:'2026-11-30T00:00:00Z', ends_at:'2026-12-27T23:59:59Z'},
    });
    await route.fulfill({response, json:state});
  });
  await page.goto('/?e2e=1');
  await waitForParticipantReady(page);
  await page.locator('[data-shell-screen="events"]').click();
  for (const id of ['weekly-event-link-period', 'team-event-link-period']) {
    await expect(page.locator('#'+id)).toHaveText('30 Kas · Başlangıç bekleniyor');
  }
  await page.locator('#events-screen [data-open-screen="weekly-event"]').click();
  await expect(page.locator('#weekly-tournament-reset')).toHaveText('30 Kas · Başlangıç bekleniyor');
  await expect(page.locator('#weekly-event-summary')).toContainText('30 Kas — 06 Ara');
  await page.locator('[data-weekly-event-tab="standings"]').click();
  await expect(page.locator('#weekly-tournament-standings li')).toHaveCount(0);
  await page.locator('#weekly-event-screen .navigation-back').click();
  await page.locator('#events-screen [data-open-screen="team-event"]').click();
  await expect(page.locator('#team-tournament-week')).toHaveText('30 Kas · Başlangıç bekleniyor');
  await page.locator('[data-team-event-tab="standings"]').click();
  await expect(page.locator('#team-tournament-standings li')).toHaveCount(0);
  started = true;
  await page.locator('#team-event-screen .navigation-back').click();
  await expect(page.locator('#weekly-event-link-period')).toHaveText('07 Ara — 13 Ara');
  await expect(page.locator('#team-event-link-period')).toHaveText('2. hafta · 30 Kas — 27 Ara');
});
