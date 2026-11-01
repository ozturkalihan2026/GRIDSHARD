const {chromium,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('../e2e/ui-helpers');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve('artifacts/main-roster-v2');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width:393,height:852},locale:'tr-TR'});
 const errors=[],missing=[],snapshots=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).pathname.includes('/assets/'))missing.push({url:r.url(),status:r.status()});});
 page.on('websocket',ws=>ws.on('framereceived',frame=>{try{const m=JSON.parse(String(frame.payload));if(m.type==='snapshot')snapshots.push(m.payload);}catch{}}));
 try{
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
  await page.goto('http://127.0.0.1:8894/?e2e=1');await waitForParticipantReady(page);
  const catalog=await page.evaluate(async()=>await(await fetch('/game/module-catalog')).json());
  expect(catalog.modules).toHaveLength(24);expect(catalog.category_order).toEqual(['saldırı','savunma','taktik']);
  await page.locator('#app-bottom-dock [data-open-screen="modules"]').click();
  await expect(page.locator('#module-collection-grid .collection-module-tile')).toHaveCount(24);
  expect(await page.locator('#module-category-tabs button').allTextContents()).toEqual(['Tümü','Saldırı','Savunma','Taktik']);
  for(const [kind,count]of [['saldırı',10],['savunma',8],['taktik',6]]){
   await page.locator(`[data-module-filter="${kind}"]`).click();
   await expect(page.locator('#module-collection-grid .collection-module-tile')).toHaveCount(count);
  }
  await page.locator('[data-module-filter="all"]').click();
  await page.screenshot({path:path.join(out,'collection-mobile.png')});
  const paintings=await page.evaluate(async()=>{
   const ids=['burst_cannon','shield_breaker','buffer_shield','last_bastion','cleanser','speed_relay'];
   const checks=[];
   for(const id of ids){
    const host=document.createElement('div');host.style.cssText='position:fixed;top:100px;left:50px;width:160px;height:160px';document.body.append(host);
    GridshardModuleDeviceArt.mount(host,{definitionId:id});
    for(const img of host.querySelectorAll('img'))await img.decode();
    checks.push({id,src:host.querySelector('img')?.getAttribute('src'),mounted:!!host.querySelector('.module-device-rig')});host.remove();
   }
   return checks;
  });expect(paintings.every(p=>p.mounted)).toBe(true);
  await page.locator('#app-bottom-dock [data-open-screen="menu"]').click();
  await page.locator('#home-battle-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:40000});
  await expect.poll(()=>page.evaluate(()=>window.__GRIDSHARD_TEST_API.getBattleState().elapsed_ms),{timeout:30000}).toBeGreaterThan(0);
  await expect(page.locator('#battle-start-countdown')).toBeHidden();
  for(const id of ['laser','shield','amplifier']){
   await expect.poll(()=>page.evaluate(id=>window.__GRIDSHARD_TEST_API.deployModule(id),id),{timeout:15000}).toBe(true);
   await expect(page.locator(`#board [data-device="${id}"]`)).toBeVisible();
  }
  const layouts=[];
  for(const [width,height]of [[320,740],[393,852],[1080,1000]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(150);
   layouts.push(await page.evaluate(()=>({width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,
    categories:[...document.querySelectorAll('#module-shelf .deck-module-card')].map(el=>el.dataset.category),
    names:[...document.querySelectorAll('#module-shelf .name')].map(el=>el.textContent)})));
   await page.screenshot({path:path.join(out,`battle-${width}.png`)});
  }
  expect(layouts.every(l=>l.overflow===0)).toBe(true);
  const own=snapshots.at(-1)?.players?.[snapshots.at(-1)?.viewer_player_id];expect(own).toBeTruthy();
  expect(own).not.toHaveProperty('energy_stock');expect(own.modules.some(m=>Object.hasOwn(m,'heat'))).toBe(false);
  await page.locator('#battle-forfeit-button').evaluate(el=>el.click());await expect(page.locator('.post-match-panel')).toBeVisible();
  await page.screenshot({path:path.join(out,'result.png')});
  expect(errors).toEqual([]);expect(missing).toEqual([]);
  fs.writeFileSync(path.join(out,'browser.json'),JSON.stringify({errors,missing,paintings,layouts,catalog:catalog.modules.map(m=>m.id)},null,2));
  console.log('PASS: main collection 24 / classes 3 / six paintings / live placement / 3 viewport layouts / result / no JS or asset errors');
 }catch(e){await page.screenshot({path:path.join(out,'browser-failure.png')});console.error('page errors',errors);throw e;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

