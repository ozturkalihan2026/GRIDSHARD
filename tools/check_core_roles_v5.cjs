const {chromium,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('../e2e/ui-helpers');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve('artifacts/core-roles-v5');fs.mkdirSync(out,{recursive:true});
const width=Number(process.argv[2]||393);
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width,height:width===320?740:852},locale:'tr-TR'});
 const errors=[],missing=[],stages=new Set(),events=[];let last;
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).pathname.includes('/assets/'))missing.push(r.url());});
 page.on('websocket',ws=>ws.on('framereceived',f=>{try{
   const m=JSON.parse(String(f.payload));if(m.type==='snapshot'){last=m.payload;if(last.tutorial?.stage)stages.add(last.tutorial.stage);}
   if(m.type==='events')events.push(...(m.payload.events||[]));
 }catch{}}));
 try{
  await page.goto('http://127.0.0.1:8895/?e2e=1&onboarding=1');await waitForParticipantReady(page);
  await page.locator('#home-battle-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:40000});
  await expect(page.locator('.guide-overlay')).toHaveAttribute('data-blocking','false');
  await expect(page.locator('#module-shelf')).toHaveAttribute('data-placement-ready','true',{timeout:15000});
  for(const id of ['shield','laser'])await expect.poll(()=>page.evaluate(id=>window.__GRIDSHARD_TEST_API.deployModule(id),id),{timeout:15000}).toBe(true);
  await expect.poll(()=>last?.elapsed_ms||0,{timeout:23000}).toBeGreaterThanOrEqual(16500);
  await expect(page.locator('.guide-overlay')).toBeHidden();
  expect([...stages].sort()).toEqual(['deploy_laser','watch_laser','current_pressure','core_power'].sort());
  await expect(page.locator('#core-power-button')).toBeEnabled({timeout:20000});
  await page.locator('#core-power-button').click();
  await expect(page.locator('.duel-player-side .battle-core-impact')).toBeVisible({timeout:5000});
  const notice=await page.locator('.duel-player-side .battle-core-impact').textContent();
  expect(notice).toMatch(/hasar/);
  await page.screenshot({path:path.join(out,`core-real-impact-${width}.png`)});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect.poll(()=>last?.players?.[last.viewer_player_id]?.core_contributions?.direct_damage||0,{timeout:5000}).toBeGreaterThan(0);
  const own=last.players[last.viewer_player_id];
  expect(own.core_contributions.direct_damage).toBeGreaterThan(0);
  expect(own.damage_current_threshold).toBe(200);
  const audio=await page.evaluate(async()=>await Promise.all(['burst_cannon','shield_breaker','buffer_shield','last_bastion','cleanser','speed_relay'].map(async id=>({id,status:(await fetch(`/assets/audio/modules/${id}.wav`)).status}))));
  expect(audio.every(x=>x.status===200)).toBe(true);
  await page.locator('#battle-forfeit-button').evaluate(el=>el.click());
  await expect(page.locator('.post-match-panel')).toBeVisible();
  await expect.poll(()=>page.locator('.post-match-core-impact').allTextContents()).not.toEqual([]);
  const resultCoreImpact=await page.locator('.post-match-core-impact').allTextContents();
  await page.locator('#post-match-continue').evaluate(el=>el.click());
  await expect(page.locator('.battle-core-impact')).toHaveCount(0);
  expect(errors).toEqual([]);expect(missing).toEqual([]);
  fs.writeFileSync(path.join(out,`browser-${width}.json`),JSON.stringify({width,errors,missing,stages:[...stages],notice,resultCoreImpact,audio,ownCoreContributions:own.core_contributions,pressureEarned:own.damage_current_earned},null,2));
  console.log('PASS: four nonblocking cues, real core damage, visible impact, pressure state, six sounds, no overflow, cleanup');
 }catch(e){await page.screenshot({path:path.join(out,'browser-failure.png')});console.error('page errors',errors);throw e;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
