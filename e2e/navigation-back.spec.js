const {test,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('./ui-helpers');

test('all navigation backs share the arrow-only 44px gold control and retain destinations',async({page},info)=>{
 await page.goto('/?e2e=1');await waitForParticipantReady(page,60000);
 const buttons=page.locator('button.navigation-back');
 await expect(buttons).toHaveCount(11);
 for(const button of await buttons.all()) {
  await expect(button).toHaveText('');
  await expect(button.locator('svg path')).toHaveAttribute('d','m12 5-7 7 7 7M5 12h15');
  await expect(button).toHaveAttribute('aria-label',/.+/);
 }
 const appearances=await buttons.evaluateAll(nodes=>nodes.map(node=>{
  const s=getComputedStyle(node);return {width:s.width,height:s.height,background:s.backgroundImage,border:s.borderColor,radius:s.borderRadius,before:getComputedStyle(node,'::before').content,after:getComputedStyle(node,'::after').content};
 }));
 expect(new Set(appearances.map(a=>JSON.stringify(a))).size).toBe(1);
 expect(appearances[0].width).toBe('44px');expect(appearances[0].height).toBe('44px');
 expect(appearances[0].before).toBe('none');expect(appearances[0].after).toBe('none');
 await page.locator('[data-shell-screen="events"]').click();
 for(const screen of ['weekly-event','team-event']) {
  await page.locator(`#events-screen [data-open-screen="${screen}"]`).click();
  await expect(page.locator(`#${screen}-screen`)).toBeVisible();
  await page.locator(`#${screen}-screen .navigation-back`).click();
  await expect(page.locator('#events-screen')).toBeVisible();
 }
 await page.locator('[data-shell-screen="menu"]').click();
 await page.locator('#lobby-menu-button').click();
 await page.locator('#lobby-menu [data-open-screen="daily"]').click();
 for(const screen of ['daily-rewards','daily-missions','rewards']) {
  await page.locator(`#rewards-hub-screen [data-open-screen="${screen}"]`).click();
  const back=page.locator(`[data-screen-panel="${screen}"] .navigation-back`);
  await expect(back).toBeVisible();
  await back.click();
  await expect(page.locator('#rewards-hub-screen')).toBeVisible();
 }
 await page.evaluate(()=>window.GridshardI18n.apply('en'));
 for(const button of await buttons.all())await expect(button).toHaveText('');
 await page.screenshot({path:info.outputPath('shared-arrow-back.png')});
});

test('team management and direct-message back arrows return without a mutation',async({page},info)=>{
 test.setTimeout(120000);
 const mutations=[];
 page.on('request',r=>{if(r.method()!=='GET'&&/\/(teams|social)\//.test(r.url()))mutations.push(r.url());});
 await page.route('**/teams/player/*',async route=>{
  const response=await route.fetch(),body=await response.json();
  await route.fulfill({response,json:{...body,joined:true,is_owner:true,team_id:'navigation-fixture',name:'Gezinme Takımı',member_count:1,member_limit:30,
   appearance:{emblem_id:'shield',frame_id:'steel',name_color_id:'cyan'},members:[],applications:[],messages:[],training_challenges:[],module_requests:[],statistics:{},tournament:{}}});
 });
 await page.route(/\/social\/[a-zA-Z0-9_-]+$/,async route=>{
  const response=await route.fetch(),body=await response.json();
  await route.fulfill({response,json:{...body,friends:[{player_id:'navigation-peer',display_name:'Gezinme Denemesi',online:false,rating:0}],conversations:[]}});
 });
 await page.route('**/social/*/messages?*',route=>route.fulfill({json:{messages:[]}}));
 await page.goto('/?e2e=1');await waitForParticipantReady(page,60000);
 for(const [width,height] of [[320,568],[393,852]])for(const language of ['tr','en']){
  await page.setViewportSize({width,height});await page.evaluate(l=>GridshardI18n.apply(l),language);
  await page.locator('[data-shell-screen="team"]').click();await page.locator('#team-menu-button').click();
  await page.locator('[data-team-management-tab="cosmetics"]').click();
  const teamBack=page.locator('#team-management-back');await expect(teamBack).toBeVisible();
  await expect(teamBack).toHaveCSS('width','44px');await teamBack.focus();
  expect(await teamBack.evaluate(b=>getComputedStyle(b).backgroundImage)).toContain('255, 233, 156');
  await page.screenshot({path:info.outputPath(`team-management-${language}-${width}.png`)});
  await teamBack.click();await expect(page.locator('[data-team-panel="management"]')).toBeHidden();
  await expect(page.locator('[data-team-panel="profile"]')).toBeVisible();
  await page.locator('[data-shell-screen="menu"]').click();await page.locator('#lobby-menu-button').click();
  await page.locator('#lobby-menu [data-open-screen="friends"]').click();
  await page.locator('[data-friends-tab="messages"]').click();
  await page.locator('#direct-message-starters .social-player-actions button').first().click();
  const dmBack=page.locator('#direct-message-back');await expect(dmBack).toBeVisible();await dmBack.focus();
  expect(await dmBack.evaluate(b=>getComputedStyle(b).backgroundImage)).toContain('255, 233, 156');
  await page.screenshot({path:info.outputPath(`direct-message-${language}-${width}.png`)});
  await dmBack.click();await expect(page.locator('#direct-message-inbox')).toBeVisible();
 }
 expect(mutations).toEqual([]);
});

test('gold back/forward surfaces keep one face in TR/EN at 320 and 393px, including all interaction states',async({page},info)=>{
 test.setTimeout(120000);
 await page.goto('/?e2e=1');await waitForParticipantReady(page,60000);
 for(const [width,height] of [[320,568],[393,852]]) for(const language of ['tr','en']){
  await page.setViewportSize({width,height});
  await page.evaluate(language=>window.GridshardI18n.apply(language),language);
  await page.locator('[data-shell-screen="menu"]').click();
  await page.locator('#lobby-menu-button').click();
  await page.locator('#lobby-menu [data-open-screen="daily"]').click();
  for(const screen of ['daily-rewards','daily-missions','rewards']){
   await page.locator(`#rewards-hub-screen [data-open-screen="${screen}"]`).click();
   const back=page.locator(`[data-screen-panel="${screen}"] .navigation-back`);
   await expect(back).toBeVisible();
   await page.mouse.move(0,0);await back.scrollIntoViewIfNeeded();
   const face=await back.evaluate(b=>({background:getComputedStyle(b).backgroundImage,before:getComputedStyle(b,'::before').content,after:getComputedStyle(b,'::after').content}));
   expect(face.before).toBe('none');expect(face.after).toBe('none');expect(face.background).toContain('255, 233, 156');
   await page.keyboard.press('Tab');await back.focus();await expect(back).toHaveCSS('outline-style','solid');
   const box=await back.boundingBox();await page.mouse.move(box.x+22,box.y+22);await page.mouse.down();
   await expect(back).toHaveCSS('transform','matrix(1, 0, 0, 1, 0, 2)');
   // Release outside the button so the test can inspect disabled state before navigating.
   await page.mouse.move(box.x+60,box.y);await page.mouse.up();
   await back.evaluate(b=>b.disabled=true);await expect(back).toHaveCSS('opacity','0.55');
   expect(await back.evaluate(b=>getComputedStyle(b).backgroundImage)).toBe(face.background);
   await back.evaluate(b=>b.disabled=false);
   await page.screenshot({path:info.outputPath(`${screen}-${language}-${width}.png`)});
   await back.click();await expect(page.locator('#rewards-hub-screen')).toBeVisible();
  }
  await page.evaluate(()=>{
   const guide=window.__navGuide=new GridshardGuideOverlay();
   guide.render({key:'arrow-first',mode:'next',title:'Gezinme',body:'Sonraki adım',nextLabel:'İLERİ',onNext:()=>{
    guide.render({key:'arrow-last',mode:'next',title:'Tamamlandı',body:'Son adım',nextLabel:'TAMAM',onNext:()=>guide.hide()});
   }});
  });
  const forward=page.locator('.guide-overlay[open] .navigation-forward');
  await expect(forward).toBeVisible();await expect(forward).toHaveText('');
  await expect(forward).toHaveCSS('width','44px');await expect(forward).toHaveCSS('height','44px');
  expect(await forward.evaluate(b=>getComputedStyle(b,'::before').content)).toBe('none');
  await page.screenshot({path:info.outputPath(`forward-${language}-${width}.png`)});
  await forward.focus();await page.keyboard.press('Enter');
  const complete=page.locator('.guide-overlay[open] .guide-next');
  await expect(complete.locator('svg')).toHaveCount(0);await expect(complete).not.toHaveText('');
  await complete.click();await expect(page.locator('.guide-overlay[open]')).toHaveCount(0);
  await page.evaluate(()=>window.__navGuide.root.remove());
 }
});
