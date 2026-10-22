const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const {waitForParticipantReady}=require('./ui-helpers');
test('eight authentic 2.1.1 portrait store screenshots',async({page})=>{
  const target=path.resolve(__dirname,'../artifacts/store-2.1.1-20261022/screenshots');
  fs.mkdirSync(target,{recursive:true});
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
  await page.goto('/?e2e=1',{waitUntil:'domcontentloaded'});
  await waitForParticipantReady(page);
  async function shot(name){
    await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width>0).map(i=>i.decode().catch(()=>{})));});
    await page.screenshot({path:path.join(target,name+'.png')});
  }
  await shot('02-savas-ana-ekran');
  await page.locator('[data-shell-screen="modules"]').click();
  await shot('03-moduller');
  await page.locator('[data-card-page="cores"]').click();
  await shot('04-cekirdekler');
  await page.locator('[data-shell-screen="menu"]').click();
  await page.locator('#home-arena-card').click();
  await expect(page.locator('#arena-detail-dialog')).toBeVisible();
  await shot('05-devre-yolu');
  await page.locator('#arena-detail-close').click();
  await page.locator('[data-shell-screen="shop"]').click();
  await shot('06-sandiklar');
  await page.locator('[data-shell-screen="events"]').click();
  await shot('07-etkinlikler');
  await page.locator('[data-shell-screen="team"]').click();
  await expect(page.locator('#team-screen')).toBeVisible();
  await page.locator('[data-team-lobby-tab="create"]').click();
  await shot('08-takimlar');
  await page.locator('[data-shell-screen="menu"]').click();
  await page.locator('#home-battle-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:40000});
  await expect(page.locator('#battle-start-countdown')).toBeHidden({timeout:6000});
  await expect.poll(()=>page.evaluate(()=>window.__GRIDSHARD_TEST_API.getOnlineBattleState().elapsedMs)).toBeGreaterThan(0);
  for(const id of ['laser','battery','shield']){
    await expect.poll(()=>page.evaluate(id=>window.__GRIDSHARD_TEST_API.deployModule(id),id),{timeout:12000}).toBe(true);
    await expect(page.locator('#board [data-device="'+id+'"]')).toBeVisible({timeout:12000});
  }
  // The authentic first-match AI may keep just one device plus its reactor.
  // Wait for that real placement instead of inventing a fuller opponent board.
  await expect.poll(()=>page.locator('#enemy-board .module-device-rig').count(),{timeout:25000}).toBeGreaterThanOrEqual(2);
  await expect.poll(()=>page.locator('.vertical-circuit-arena [data-core="true"].is-struck').count(),{timeout:10000}).toBe(0);
  await shot('01-devre-savasi');
  expect(fs.readdirSync(target).filter(n=>n.endsWith('.png'))).toHaveLength(8);
});
