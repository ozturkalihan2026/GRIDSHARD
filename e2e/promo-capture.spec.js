const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const {waitForParticipantReady}=require('./ui-helpers');

test('record authentic local GRIDSHARD footage without desktop interaction',async({page})=>{
  const target=path.resolve(__dirname,'../artifacts/promo-20261023');
  fs.mkdirSync(target,{recursive:true});
  const started=Date.now(),scenes=[],errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const mark=name=>scenes.push({name,seconds:(Date.now()-started)/1000});
  // Hold one real read briefly so the new splash is visible, not a fake loading bar.
  let release;
  const gate=new Promise(resolve=>{release=resolve;});
  await page.route('**/accounts/*',async route=>{await gate;await route.continue();});
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
  await page.goto('/?e2e=1',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#boot-bar')).toHaveAttribute('aria-valuenow','75');
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('#startup-loading img')].map(i=>i.decode()));});
  mark('startup');
  await page.screenshot({path:path.join(target,'startup.png')});
  await page.waitForTimeout(3500);release();
  await waitForParticipantReady(page);
  await expect(page.locator('#daily-meta-dialog')).toBeHidden();
  await page.locator('[data-shell-screen="menu"]').click();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await page.screenshot({path:path.join(target,'home.png')});
  mark('home');await page.waitForTimeout(3500);
  await page.locator('[data-shell-screen="modules"]').click();
  mark('modules');await page.waitForTimeout(3500);
  await page.locator('[data-card-page="cores"]').click();
  mark('cores');await page.waitForTimeout(3500);
  await page.locator('[data-shell-screen="shop"]').click();
  mark('shop');await page.waitForTimeout(3500);
  await page.locator('[data-shell-screen="events"]').click();
  mark('events');await page.waitForTimeout(3000);
  await page.locator('[data-shell-screen="menu"]').click();
  mark('matchmaking');await page.locator('#home-battle-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:40000});
  await expect(page.locator('#battle-start-countdown')).toBeHidden({timeout:6000});
  mark('battle');
  // The same deployment path and costs as a human player; no fabricated state.
  for(const id of ['laser','battery','shield','laser']){
    await expect.poll(()=>page.evaluate(id=>window.__GRIDSHARD_TEST_API.deployModule(id),id),{timeout:16000}).toBe(true);
    await page.waitForTimeout(2400);
  }
  await page.waitForTimeout(11000);
  await page.screenshot({path:path.join(target,'battle.png')});
  mark('end');
  const video=page.video();
  await page.close();
  await video.saveAs(path.join(target,'GRIDSHARD-gercek-oyun-ham.webm'));
  fs.writeFileSync(path.join(target,'capture-timeline.json'),JSON.stringify({viewport:{width:540,height:960},video:{width:540,height:960},browser:'headless Chrome',local:true,simulatedState:false,scenes,errors},null,2));
  expect(errors).toEqual([]);
});
