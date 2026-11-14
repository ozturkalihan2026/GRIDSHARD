// Authentic 2.4.0 menu captures on the owned loopback server. Battle capture is separate.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const {waitForParticipantReady}=require('../e2e/ui-helpers');
const root=path.resolve(__dirname,'..');
const evidence=path.join(root,'artifacts/store-240-20261113');
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
    await expect(page.locator('.paid-store-section')).toBeHidden();
    await shot('07-shop');
    if(errors.length||missing.length||checks.length!==6)throw new Error('Invalid menu capture evidence');
    fs.writeFileSync(path.join(evidence,language+'-menus.json'),JSON.stringify({checks,errors,missing},null,2));
  }catch(e){await page.screenshot({path:path.join(evidence,language+'-failure.png')});throw e;}
  finally{await browser.close();}
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
