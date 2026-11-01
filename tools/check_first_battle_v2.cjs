const {chromium,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('../e2e/ui-helpers');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width:393,height:852},locale:'tr-TR'});
 const errors=[];let last=null;page.on('pageerror',e=>errors.push(e.message));
 page.on('websocket',ws=>ws.on('framereceived',frame=>{try{const m=JSON.parse(String(frame.payload));if(m.type==='snapshot')last=m.payload;}catch{}}));
 try{
  await page.goto('http://127.0.0.1:8894/?e2e=1&onboarding=1');await waitForParticipantReady(page);
  await expect(page.locator('.daily-meta-wheel-labels span')).toHaveCount(5);
  await expect(page.locator('.guide-overlay')).toBeHidden();
  await page.locator('#home-battle-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:40000});
  await expect(page.locator('.guide-overlay')).toBeVisible();
  await expect(page.locator('.guide-overlay')).toHaveAttribute('data-blocking','false');
  await expect(page.locator('#module-shelf')).toHaveAttribute('data-placement-ready','true',{timeout:15000});
  await expect.poll(()=>page.evaluate(()=>window.__GRIDSHARD_TEST_API.getBattleState().elapsed_ms),{timeout:15000}).toBeGreaterThan(0);
  // Play a different card while the first cue points at Laser.
  await page.locator('#module-shelf [data-module-id="shield-1"]').click();
  await expect(page.locator('#board [data-device="shield"]')).toBeVisible();
  await expect.poll(()=>last?.elapsed_ms||0,{timeout:22000}).toBeGreaterThanOrEqual(16500);
  await expect(page.locator('.guide-overlay')).toBeHidden();
  await expect(page.locator('#core-power-button')).toBeEnabled({timeout:25000});
  await page.locator('#core-power-button').click();
  await expect.poll(()=>last?.players?.[last?.viewer_player_id]?.core_power?.uses||0,{timeout:5000}).toBe(1);
  await page.screenshot({path:'artifacts/main-roster-v2/first-battle-core.png'});
  expect(errors).toEqual([]);
  fs.writeFileSync('artifacts/main-roster-v2/first-battle.json',JSON.stringify({errors,nonblocking:true,otherCardPlayed:true,guideEnded:true,automaticCoreUses:1},null,2));
  console.log('PASS: optional menu guide, nonblocking battle cues, different card allowed, core power selected allies automatically.');
 }catch(e){await page.screenshot({path:'artifacts/main-roster-v2/first-battle-failure.png'});console.error(errors);throw e;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
