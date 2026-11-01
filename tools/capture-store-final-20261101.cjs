// Authentic browser captures only. No profile edits, synthetic effects or invented UI.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const {waitForParticipantReady}=require('../e2e/ui-helpers');
const root=path.resolve(__dirname,'..');
const evidence=path.join(root,'artifacts/store-final-20261101');
const language=process.argv[2]||'tr-TR';
async function main(){
  fs.mkdirSync(evidence,{recursive:true});
  const dir=path.join(evidence,language);fs.mkdirSync(dir,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:360,height:640},deviceScaleFactor:3,isMobile:true,hasTouch:true,locale:language});
  const page=await context.newPage();page.setDefaultTimeout(20000);
  const errors=[],missing=[],checks=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&/\.(webp|png|svg|woff2?)(\?|$)/.test(r.url()))missing.push(new URL(r.url()).pathname);});
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
  try{
    await page.goto('http://127.0.0.1:8899/?e2e=1',{waitUntil:'domcontentloaded'});
    await waitForParticipantReady(page);
    if(language==='en-US'){
      await page.locator('#lobby-menu-button').click();
      await page.locator('[data-open-screen="settings"]').click();
      await page.locator('#settings-language').selectOption('en');
      await page.locator('[data-shell-screen="menu"]').click();
    }
    async function shot(name){
      await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width>0).map(i=>i.decode().catch(()=>{})));});
      const check=await page.evaluate(()=>({lang:document.documentElement.lang,overflow:document.documentElement.scrollWidth>innerWidth,brokenImages:[...document.images].filter(i=>i.getBoundingClientRect().width>0&&!i.complete).length}));
      if(check.overflow||check.brokenImages)throw new Error('Invalid screenshot '+name+JSON.stringify(check));
      await page.screenshot({path:path.join(dir,name+'.png')});checks.push({name,...check});console.log(language+' '+name);
    }
    await shot('08-home');
    await page.locator('[data-shell-screen="modules"]').click();
    await page.locator('[data-card-page="modules"]').click();
    await shot('03-module-classes');
    await page.locator('#module-collection-grid [data-module-definition-id="laser"]').click();
    await page.locator('#module-quick-info').click();
    await expect(page.locator('#module-detail-dialog')).toBeVisible();
    await page.locator('[data-module-detail-tab="talents"]').click();
    await shot('06-module-talents');
    await page.keyboard.press('Escape');
    await page.locator('[data-card-page="cores"]').click();
    await shot('04-core-collection');
    await page.locator('[data-shell-screen="menu"]').click();
    await page.locator('#home-arena-card').click();
    await expect(page.locator('#arena-detail-dialog')).toBeVisible();
    await shot('05-circuit-road');
    await page.locator('#arena-detail-close').click();
    await page.locator('[data-shell-screen="shop"]').click();
    await shot('07-shop');
    const parts=path.join(evidence,language+'-shop-parts');fs.mkdirSync(parts,{recursive:true});
    await page.locator('.chest-store-section').screenshot({path:path.join(parts,'chests.png')});
    await page.locator('#chest-odds-open').click();
    await page.locator('#chest-odds-dialog').screenshot({path:path.join(parts,'odds.png')});
    await page.keyboard.press('Escape');
    await page.locator('#paid-store-premium').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(parts,'premium-screen.png')});
    await page.locator('#paid-flux-packs .paid-product-card').first().scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(parts,'packages-screen.png')});
    if(process.argv.includes('--menus-only')){
      fs.writeFileSync(path.join(evidence,language+'-menus.json'),JSON.stringify({checks,errors,missing},null,2));return;
    }
    await page.locator('[data-shell-screen="menu"]').click();
    await page.locator('#home-battle-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:45000});
    await expect(page.locator('#battle-start-countdown')).toBeHidden({timeout:8000});
    for(const id of ['laser','shield','pulse_cannon','repair']){
      await expect.poll(()=>page.evaluate(id=>window.__GRIDSHARD_TEST_API.deployModule(id),id),{timeout:20000}).toBe(true);
      await expect(page.locator('#board [data-device="'+id+'"]')).toBeVisible();
    }
    await expect.poll(()=>page.locator('#enemy-board .module-device-rig').count(),{timeout:25000}).toBeGreaterThanOrEqual(2);
    await shot('01-circuit-battle');
    await expect(page.locator('#core-power-button')).toBeEnabled({timeout:35000});
    await page.locator('#core-power-button').click();
    await page.locator('.core-vfx').first().waitFor({state:'attached',timeout:10000});
    await shot('02-core-power');
    if(errors.length||missing.length)throw new Error(JSON.stringify({errors,missing}));
    if(checks.length!==8)throw new Error('Expected eight screenshots');
    fs.writeFileSync(path.join(evidence,language+'-capture.json'),JSON.stringify({status:'passed',language,checks,errors,missing,provenance:'Real isolated game; UI language selection; actual AI combat and core command. No altered profile or fabricated effects.'},null,2));
  }catch(e){await page.screenshot({path:path.join(evidence,language+'-failure.png')});throw e;}
  finally{await browser.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
