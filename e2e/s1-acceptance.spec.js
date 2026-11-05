const {test,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('./ui-helpers');

for(const width of [320,393])for(const language of ['tr','en'])test(`S1 real receipts and orders ${language} ${width}px`,async({page,isMobile},info)=>{
 test.skip(process.env.GRIDSHARD_E2E_S1_ACCEPTANCE!=='1','Run only with the owned published-S1 loopback fixture');
 test.setTimeout(120000);
 await page.setViewportSize({width,height:width===320?568:852});
 await page.emulateMedia({reducedMotion:language==='en'?'reduce':'no-preference'});
 await page.goto('/?e2e=1');await waitForParticipantReady(page,60000);
 const seeded=await page.evaluate(async()=>{
  const owner=GridshardAuth.session.playerId;
  const response=await fetch(`/__e2e/s1/${owner}/prepare`,{method:'POST',headers:{'x-gridshard-e2e':'s1-local-only'}});
  if(!response.ok)throw new Error('S1 fixture HTTP '+response.status);
  return response.json();
 });
 await page.reload();await waitForParticipantReady(page,60000);
 await page.evaluate(l=>GridshardI18n.apply(l),language);
 await page.locator('#lobby-menu-button').click();await page.locator('#lobby-menu [data-open-screen="daily"]').click();
 await page.locator('#rewards-hub-screen [data-open-screen="daily-missions"]').click();
 await expect(page.locator('#daily-mission-list .daily-mission-card')).toHaveCount(8);
 await page.locator('#mission-tab-seasonal').click();await expect(page.locator('#daily-mission-list .daily-mission-card')).toHaveCount(12);
 await page.locator('#daily-missions-screen .navigation-back').click();
 await page.locator('#rewards-hub-screen [data-open-screen="rewards"]').click();
 await expect(page.locator('#season-reward-track .season-pass-row')).toHaveCount(40);
 const previewTrigger=page.locator('#season-reward-track .reward-chest-button').first();
 if(isMobile)await previewTrigger.tap();else await previewTrigger.click();
 await expect(page.locator('.reward-preview-panel')).toBeVisible();
 // Both rectangles belong to one browser frame. Separate CDP boundingBox
 // calls can observe different layout frames on an emulated touch viewport.
 const layout=await page.locator('.reward-preview-panel').evaluate(panel=>{
  const preview=panel.getBoundingClientRect(),dock=document.getElementById('app-bottom-dock').getBoundingClientRect();
  return {previewWidth:preview.width,previewHeight:preview.height,previewBottom:preview.bottom,dockHeight:dock.height,dockTop:dock.top};
 });
 expect(layout.previewWidth).toBeGreaterThan(0);expect(layout.previewHeight).toBeGreaterThan(0);
 expect(layout.dockHeight).toBeGreaterThanOrEqual(44);expect(layout.previewBottom).toBeLessThanOrEqual(layout.dockTop);
 await page.screenshot({path:info.outputPath('s1-road.png')});
 await page.locator('[data-shell-screen="menu"]').click();await page.locator('#reward-inbox-button').click();
 await page.locator('#inbox-tab-reward').click();
 const receipts=[];
 for(let index=0;index<3;index++){
  const confirmed=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes('/claim?chest_delivery=open'));
  await page.locator('#reward-inbox-list .reward-inbox-card > button:last-child').first().click();
  const payload=await (await confirmed).json();receipts.push(payload.opened_receipt);
  await expect(page.locator('#chest-reveal-card')).toHaveAttribute('data-state','revealed');
  if(language==='en')await expect(page.locator('#chest-reveal-visual')).toHaveCSS('animation-name','none');
  await expect(page.locator('#chest-reveal-rewards .reward-resource-row').first()).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`confirmed-crate-${index}.png`)});
  await page.locator('#chest-reveal-close').click();
 }
 expect(receipts.every(r=>r&&r.rewards)).toBe(true);
 expect(receipts.some(r=>r.rewards.core_shards===3)).toBe(true);
 expect(receipts.some(r=>r.rewards.module_definition_id==='laser'&&r.rewards.module_shards===36)).toBe(true);
 expect(receipts.some(r=>r.rewards.avatar_frame_id==='solar_frame')).toBe(true);
 await info.attach('actual-server-receipts',{body:JSON.stringify({fixture:true,inbox:seeded.inbox.messages,receipts},null,2),contentType:'application/json'});
 await page.reload();await waitForParticipantReady(page,60000);
 await page.locator('#reward-inbox-button').click();await page.locator('#inbox-tab-reward').click();
 await expect(page.locator('#reward-inbox-list .reward-inbox-card')).toHaveCount(0);
});
