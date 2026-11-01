// Real first-battle cues from a fresh account's home button, no menu-tour fixture.
const {chromium,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('../e2e/ui-helpers');
const fs=require('node:fs'),path=require('node:path');
const width=Number(process.argv[2]||393),language=process.argv[3]||'tr',english=language==='en',suffix=english?`${width}-en`:String(width),out=path.resolve('artifacts/current-v8-browser');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width,height:width===320?740:852},locale:'tr-TR'});
 let last;const snapshots=[],stages=[],errors=[],missing=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).pathname.includes('/assets/'))missing.push(new URL(r.url()).pathname);});
 page.on('websocket',ws=>ws.on('framereceived',f=>{try{
  const m=JSON.parse(String(f.payload));if(m.type!=='snapshot')return;last=m.payload;
  if(last.tutorial?.stage&&!stages.includes(last.tutorial.stage))stages.push(last.tutorial.stage);
  if(snapshots.length<3)snapshots.push(last);
 }catch{}}));
 try{
  await page.goto('http://127.0.0.1:8898/?e2e=1&onboarding=1');await waitForParticipantReady(page);
  await page.locator('#lobby-menu-button').click();
  await page.locator('[data-open-screen="settings"]').click();
  if(english)await page.locator('#settings-language').selectOption('en');
  await page.locator('#game-current-guide summary').click();
  await expect(page.locator('#game-current-guide')).toContainText(english?'AND lose 50 HP on Defense':'VE Savunma');
  await page.locator('#game-current-guide').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(out,`guide-${suffix}.png`)});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('[data-shell-screen="menu"]').evaluate(e=>e.click());
  const guide=page.locator('dialog.guide-overlay');
  await page.locator('#home-battle-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:40000});
  await expect.poll(()=>last?.tutorial?.stage,{timeout:15000}).toBe('deploy_laser');
  const first=last.players[last.viewer_player_id];expect(first.current_bonus).toMatchObject({mode:'attack_defense_hp',starting:7,damage_threshold:100,defense_threshold:50});
  expect(first.current).toBe(7);
  const enemy=Object.keys(last.players).find(k=>k!==last.viewer_player_id);
  expect(last.players[enemy].current_bonus).toBeUndefined();
  await expect.poll(()=>page.evaluate(()=>window.__GRIDSHARD_TEST_API.deployModule('laser'))).toBe(true);
  await expect.poll(()=>last?.tutorial?.stage,{timeout:15000}).toBe('deploy_defense');
  await expect(guide).toHaveAttribute('data-step','battle:deploy_defense');
  await expect.poll(()=>page.evaluate(()=>window.__GRIDSHARD_TEST_API.deployModule('shield'))).toBe(true);
  await expect.poll(()=>last?.tutorial?.stage,{timeout:10000}).toBe('current_pressure');
  await expect(guide.locator('.guide-body')).toContainText(english?'AND lose 50 HP on Defense':'VE Savunma');
  await page.screenshot({path:path.join(out,`tutorial-${suffix}.png`)});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const rect=await guide.locator('.guide-card').boundingBox();expect(rect.x).toBeGreaterThanOrEqual(0);expect(rect.x+rect.width).toBeLessThanOrEqual(width+1);
  await expect(page.locator('#shelf-credit-indicator')).toHaveAttribute('title',english?/Attack .*\/100 \+ Defense HP lost .*\/50/:/Saldırı .*\/100 \+ Savunma CAN kaybı .*\/50/);
  await expect.poll(()=>last?.tutorial?.stage,{timeout:12000}).toBe('core_power');
  await expect.poll(()=>last?.tutorial==null&&last.elapsed_ms>=24000,{timeout:15000}).toBe(true);
  expect(stages).toEqual(['deploy_laser','watch_laser','deploy_defense','current_pressure','core_power']);
  await page.screenshot({path:path.join(out,`battle-${suffix}.png`)});
  await page.locator('#battle-forfeit-button').evaluate(e=>e.click());
  await expect(page.locator('.post-match-panel')).toBeVisible({timeout:15000});
  expect(errors).toEqual([]);expect(missing).toEqual([]);
  const result={width,language,realTutorial:true,startsFromHome:true,stages,initialCurrent:first.current,privateCounters:true,overflow:false,errors,missing};
  fs.writeFileSync(path.join(out,`result-${suffix}.json`),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }catch(e){await page.screenshot({path:path.join(out,`failure-${suffix}.png`)});throw e;}
 finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
