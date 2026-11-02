const {test, expect} = require('@playwright/test');
const {waitForParticipantReady} = require('./ui-helpers');
const catalog = require('../server/data/cosmetic_releases_v1.json');

test('new player and team cosmetics have distinct previews and remain locked', async ({page}, info) => {
  const errors = [], mutations = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('request', r => {if(r.method()==='POST' && /\/(cosmetics|avatar)(\?|$)/.test(r.url()))mutations.push(r.url());});
  // Presentation only: an owner fixture exposes the existing team editor.
  // Ownership, publication and actual grants are covered by server tests.
  await page.route('**/teams/player/*', async route => {
    const response = await route.fetch(), body = await response.json();
    const id = new URL(route.request().url()).pathname.split('/').pop();
    const fields = {emblem_id:'team_emblem_id',frame_id:'team_frame_id',name_color_id:'team_name_color_id'};
    const defaults = {emblem_id:'shield',frame_id:'steel',name_color_id:'cyan'};
    const options = Object.fromEntries(Object.entries(fields).map(([field,reward]) => [field,[defaults[field],...catalog.items.filter(i=>i.field===reward).map(i=>i.id)]]));
    await route.fulfill({response,json:{...body,joined:true,is_owner:true,team_id:'preview-team',owner_id:id,name:'Yeni Dönem Takımı',member_count:1,member_limit:30,
      appearance:defaults,appearance_options:options,appearance_unlocked:Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,[v]])),
      members:[{player_id:id,display_name:'Operatör',role:'owner',trophies:0}],applications:[],messages:[],training_challenges:[],module_requests:[],statistics:{},tournament:{}}});
  });
  await page.goto('/?e2e=1');
  await waitForParticipantReady(page,60000);
  await page.locator('#lobby-menu-button').click();
  await page.locator('#lobby-menu [data-open-screen="avatar"]').click();
  await page.locator('[data-cosmetic-tab="frame"]').click();
  for(const id of ['aurora_frame','solar_frame','abyss_frame']) {
    const button=page.locator(`#avatar-frame-choice-list [data-frame-id="${id}"]`);
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute('data-state','locked');
  }
  const borderStyles = await page.locator('#avatar-frame-choice-list [data-frame-id$="_frame"] .profile-avatar').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).borderTopStyle));
  expect(new Set(borderStyles).size).toBe(3);
  await page.locator('[data-frame-id="aurora_frame"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath('locked-player-frames.png')});
  await page.locator('[data-cosmetic-tab="background"]').click();
  for(const id of ['aurora_banner','solar_banner','abyss_banner']) {
    await expect(page.locator(`[data-background-id="${id}"]`)).toBeDisabled();
  }
  await page.locator('[data-background-id="aurora_banner"]').scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath('locked-player-backgrounds.png')});
  await page.locator('[data-shell-screen="team"]').click();
  await page.locator('#team-menu-button').click();
  await page.locator('[data-team-management-tab="cosmetics"]').click();
  await expect(page.locator('#team-emblem-options .team-appearance-option[data-locked="true"]')).toHaveCount(3);
  await expect(page.locator('#team-frame-options .team-appearance-option[data-locked="true"]')).toHaveCount(3);
  await expect(page.locator('#team-name-color-options .team-appearance-option[data-locked="true"]')).toHaveCount(3);
  await page.locator('#team-emblem-options').scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath('locked-team-emblems.png')});
  expect(errors).toEqual([]);
  expect(mutations).toEqual([]);
});
