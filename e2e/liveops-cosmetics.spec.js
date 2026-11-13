const {test, expect} = require('@playwright/test');
const {waitForParticipantReady} = require('./ui-helpers');
const catalog = require('../server/data/cosmetic_releases_v1.json');

test('paused purchases and ads stay hidden in TR/EN, after reload and a real battle, and reject direct clicks', async ({page}, info) => {
  test.setTimeout(180000);
  const transactions = [];
  page.on('request', request => {
    if (request.method() === 'POST' && /\/store\//.test(new URL(request.url()).pathname)) {
      transactions.push(new URL(request.url()).pathname);
    }
  });
  page.on('dialog', dialog => dialog.accept());
  // Local presentation fixture: even when the server reports test providers
  // ready, the client pause must prevent a checkout/ad request. No real SDK,
  // payment or production provider is enabled by this response override.
  await page.route(/\/store\/[^/?]+(?:\?.*)?$/, async route => {
    const response = await route.fetch(), body = await response.json();
    body.providers = {...body.providers, purchase:'test', ads:'test'};
    for (const product of [body.season_pass, body.battle_premium,
      ...(body.flux_packs || []), ...(body.credit_packs || [])].filter(Boolean)) {
      Object.assign(product, {active:false, purchasable:true, update_required:false});
    }
    await route.fulfill({response, json:body});
  });
  const selectors = '.paid-store-section, #season-premium-buy, #post-match-premium, #post-match-premium-buy, #post-match-ad-reward, #post-match-ad-button';
  const assertPaused = async () => {
    const visible = await page.locator(selectors).evaluateAll(elements => elements.filter(el => {
      // Async UI renders may remove hidden; the pause CSS must still prevail.
      el.hidden = false;
      el.style.display = 'block';
      return getComputedStyle(el).display !== 'none';
    }).map(el => el.id || el.className));
    expect(visible).toEqual([]);
  };
  await page.goto('/?e2e=1');
  await waitForParticipantReady(page,60000);
  await expect(page.locator('html')).toHaveClass(/monetization-paused/);
  for (const language of ['tr','en']) {
    await page.locator('[data-shell-screen="menu"]').click();
    await page.locator('#lobby-menu-button').click();
    await page.locator('#lobby-menu [data-open-screen="settings"]').click();
    await page.locator('#settings-language').selectOption(language);
    await expect(page.locator('html')).toHaveAttribute('lang',language);
    await page.locator('[data-shell-screen="shop"]').click();
    await expect(page.locator('#chest-store-list .chest-store-card').first()).toBeVisible();
    await expect(page.locator('#paid-flux-packs button').first()).toBeEnabled();
    for (const width of [320,393]) {
      await page.setViewportSize({width,height:852});
      await assertPaused();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({path:info.outputPath(`paused-shop-${language}-${width}.png`)});
    }
  }
  await page.locator('#paid-flux-packs button').first().evaluate(button => button.dispatchEvent(new MouseEvent('click',{bubbles:true})));
  await page.reload();
  await waitForParticipantReady(page,60000);
  await expect(page.locator('html')).toHaveClass(/monetization-paused/);
  await page.locator('[data-shell-screen="menu"]').click();
  await page.locator('#home-battle-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:40000});
  await expect(page.locator('.post-match-panel')).toBeVisible({timeout:90000});
  await page.locator('#post-match-continue').click();
  await expect(page.locator('#post-match-reward-stage')).toBeVisible();
  await assertPaused();
  await page.locator('#post-match-ad-button').evaluate(button => {
    button.disabled = false;
    button.dispatchEvent(new MouseEvent('click',{bubbles:true}));
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  expect(transactions).toEqual([]);
  await expect(page.locator('#post-match-continue')).toBeEnabled();
  await page.screenshot({path:info.outputPath('paused-battle-rewards.png')});
});

test('new player and team cosmetics have distinct previews and remain locked', async ({page}, info) => {
  const errors = [], mutations = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('request', r => {if(['POST','PUT','PATCH'].includes(r.method()) && /\/(cosmetics|avatar)(\?|$)/.test(r.url()))mutations.push(r.url());});
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
  const selectedBefore = await page.locator('#profile-hero-avatar').getAttribute('data-frame');
  await page.locator('#avatar-customization-screen [data-open-cosmetic-collection]').click();
  const preview=page.locator('#cosmetic-collection-dialog');
  await expect(preview).toBeVisible();
  await expect(preview).toContainText('henüz ödül olarak açılmadı');
  for(const theme of ['aurora','solar','abyss']) {
    await preview.locator(`[data-collection-theme="${theme}"]`).click();
    await expect(preview).toHaveAttribute('data-collection-theme',theme);
    await expect(preview.locator('[data-collection-item]')).toHaveCount(5);
    await expect(preview.locator('#cosmetic-collection-player .profile-avatar')).toHaveAttribute('data-frame',theme+'_frame');
    await page.screenshot({path:info.outputPath('collection-'+theme+'.png')});
  }
  await page.keyboard.press('Escape');
  await expect(preview).toBeHidden();
  await expect(page.locator('#profile-hero-avatar')).toHaveAttribute('data-frame',selectedBefore);
  await page.evaluate(()=>window.GridshardI18n.apply('en'));
  await page.locator('#avatar-customization-screen [data-open-cosmetic-collection]').click();
  await expect(preview.locator('h2')).toHaveText('Upcoming Collections');
  await expect(preview).toContainText('Previewing does not grant ownership');
  await preview.locator('[data-collection-theme="solar"]').click();
  await expect(preview.locator('[data-collection-item="solar_frame"]')).toHaveText('Solar Forge Frame');
  await page.screenshot({path:info.outputPath('collection-english.png')});
  await preview.locator('#cosmetic-collection-close').click();
  await page.evaluate(()=>window.GridshardI18n.apply('tr'));
  await page.locator('[data-shell-screen="team"]').click();
  for(const tab of await page.locator('.team-tabs > button').all()){
    await tab.click();
    await expect(tab).toHaveCSS('text-decoration-line','none');
  }
  await page.locator('[data-team-tab="profile"]').click();
  await page.locator('#team-menu-button').click();
  await page.locator('[data-team-management-tab="cosmetics"]').click();
  const teamPreview=page.locator('#team-screen [data-open-cosmetic-collection]');
  await expect(teamPreview).toHaveCSS('color','rgb(48, 37, 20)');
  expect(await teamPreview.evaluate(el=>getComputedStyle(el).getPropertyValue('--gs2-face').trim())).toBe('#d7b66b');
  expect(await teamPreview.evaluate(el=>getComputedStyle(el,'::before').clipPath)).toContain('polygon');
  await expect(page.locator('#team-emblem-options .team-appearance-option[data-locked="true"]')).toHaveCount(3);
  await expect(page.locator('#team-frame-options .team-appearance-option[data-locked="true"]')).toHaveCount(3);
  await expect(page.locator('#team-name-color-options .team-appearance-option[data-locked="true"]')).toHaveCount(3);
  await page.locator('#team-emblem-options').scrollIntoViewIfNeeded();
  await page.screenshot({path:info.outputPath('locked-team-emblems.png')});
  await page.locator('#team-screen [data-open-cosmetic-collection]').click();
  await expect(preview).toBeVisible();
  await expect(preview.locator('#cosmetic-collection-team strong')).toHaveText('Yeni Dönem Takımı');
  await page.keyboard.press('Escape');
  expect(errors).toEqual([]);
  expect(mutations).toEqual([]);
});
