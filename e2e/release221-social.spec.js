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

test('friend request tabs keep wrapped TR/EN labels clear and retain selection',async({page},info)=>{
 test.setTimeout(120000);
 await page.goto('/?e2e=1');await waitForParticipantReady(page,60000);
 await page.locator('#lobby-menu-button').click();await page.locator('#lobby-menu [data-open-screen="friends"]').click();
 for(const width of [320,393])for(const language of ['tr','en']){
  await page.setViewportSize({width,height:width===320?568:852});
  await page.evaluate(l=>GridshardI18n.apply(l),language);
  for(const tab of ['friends','messages','incoming','outgoing','battle']){
   const button=page.locator(`[data-friends-tab="${tab}"]`);await button.click();
   await expect(button).toHaveAttribute('aria-pressed','true');
   await expect(page.locator(`[data-friends-panel="${tab}"]`)).toBeVisible();
   await expect(button).toHaveCSS('text-decoration-line','none');
   await expect(button).toHaveCSS('border-top-color','rgb(132, 237, 223)');
   if(['incoming','outgoing'].includes(tab))await expect(button).toHaveText(language==='en'?(tab==='incoming'?'INCOMING':'OUTGOING'):(tab==='incoming'?'GELEN İSTEK':'GİDEN İSTEK'));
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:info.outputPath(`friend-${tab}-${language}-${width}.png`)});
  }
 }
});

test('S1 tournament preview keeps its trigger during a delayed event refresh',async({page,isMobile})=>{
 test.skip(process.env.GRIDSHARD_E2E_S1_BOTS!=='1','Owned published-S1 bot fixture only');
 await page.goto('/?e2e=1');await waitForParticipantReady(page,60000);
 const initial=page.waitForResponse(r=>new URL(r.url()).pathname==='/events'&&r.ok());
 await page.locator('[data-shell-screen="events"]').click();await initial;
 let release;
 const gate=new Promise(resolve=>release=resolve);
 await page.route('**/events?*',async route=>{
  const response=await route.fetch();await gate;await route.fulfill({response});
 });
 const refreshed=page.waitForResponse(r=>new URL(r.url()).pathname==='/events'&&r.ok());
 await page.locator('#events-screen [data-open-screen="weekly-event"]').click();
 await page.locator('[data-weekly-event-tab="rewards"]').click();
 const chest=page.locator('#weekly-tournament-rewards .reward-chest-button').first();
 if(isMobile)await chest.tap();else await chest.click();
 await expect(chest).toHaveAttribute('aria-expanded','true');
 const trigger=await chest.elementHandle();
 release();await refreshed;
 await expect(page.locator('#weekly-event-status')).toHaveText('');
 expect(await trigger.evaluate(el=>el.isConnected)).toBe(true);
 await expect(chest).toHaveAttribute('aria-expanded','true');
 if(isMobile)await chest.tap();else await chest.click();
 await expect(page.locator('.reward-preview-panel')).toHaveCount(0);
 await page.locator('#weekly-event-screen .navigation-back').click();
 await expect(page.locator('body')).toHaveAttribute('data-app-screen','events');
});

test('S1 tournament rewards preview uses real prizes without granting and bot boards stay populated',async({page},info)=>{
 test.skip(process.env.GRIDSHARD_E2E_S1_BOTS!=='1','Owned published-S1 bot fixture only');
 test.setTimeout(Math.max(120000,info.project.timeout));
 await page.goto('/?e2e=1');await waitForParticipantReady(page,60000);
 const economy=()=>page.evaluate(async()=>{
  const r=await fetch(GRIDSHARD_API_BASE_URL+'/profile/'+encodeURIComponent(GridshardAuth.session.playerId)+'/meta-progression');
  if(!r.ok)throw Error('Economy HTTP '+r.status);
  const m=await r.json();return {credits:m.circuit_credits,flux:m.flux_shards,
   modules:m.module_collection.map(item=>({id:item.definition_id,shards:item.shards,level:item.level,unlocked:item.unlocked})),
   cores:m.cores,chests:{slots:m.chests.slots,inventory:m.chests.inventory}};
 });
 const before=await economy();expect(typeof before.credits).toBe('number');
 await page.locator('[data-shell-screen="events"]').click();
 for(const width of [320,393])for(const language of ['tr','en']){
  await page.setViewportSize({width,height:width===320?568:852});
  await page.evaluate(l=>GridshardI18n.apply(l),language);
  for(const kind of ['weekly','team']){
   await page.locator(`#events-screen [data-open-screen="${kind}-event"]`).click();
   const tab=page.locator(`[data-${kind}-event-tab="rewards"]`);await tab.click();
   await expect(tab).toHaveText(language==='en'?'REWARDS':'ÖDÜLLER');
   const rows=page.locator(`#${kind}-tournament-rewards > li`);await expect(rows).toHaveCount(3);
   const chest=rows.first().locator('.reward-chest-button');await chest.click();
   await expect(page.locator('.reward-preview-panel')).toBeVisible();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.screenshot({path:info.outputPath(`${kind}-rewards-${language}-${width}.png`)});
   // Clicking the same crate closes the pinned preview, without collection.
   await chest.click();await expect(page.locator('.reward-preview-panel')).toHaveCount(0);
   await page.locator(`#${kind}-event-screen .navigation-back`).click();
  }
 }
 const events=await page.evaluate(async()=>{
  const r=await fetch(GRIDSHARD_API_BASE_URL+'/events?player_id='+encodeURIComponent(GridshardAuth.session.playerId));
  if(!r.ok)throw Error('Events HTTP '+r.status);return r.json();
 });
 expect(events.weekly_tournament.standings.filter(r=>r.is_bot)).toHaveLength(240);
 expect(events.team_tournament.standings.filter(r=>r.is_ai)).toHaveLength(12);
 expect(events.team_tournament.fixtures.length).toBeGreaterThan(0);
 const boards=await page.evaluate(async()=>{
  const r=await fetch(GRIDSHARD_API_BASE_URL+'/leaderboards?player_id='+encodeURIComponent(GridshardAuth.session.playerId));
  if(!r.ok)throw Error('Boards HTTP '+r.status);return r.json();
 });
 expect(boards.trophies.some(row=>row.is_bot)).toBe(true);
 expect(boards.core_damage.some(row=>row.is_bot)).toBe(true);
 expect(boards.teams.filter(row=>row.team_id.startsWith('ai-team-'))).toHaveLength(12);
 expect(new Set(boards.trophy_groups.flatMap(group=>group.standings.filter(row=>row.is_bot).map(row=>row.player_id))).size).toBe(240);
 expect(await economy()).toEqual(before);
});
