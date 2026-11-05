const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('../e2e/ui-helpers');
const spec=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),base=new URL(spec.base_url);
assert.equal(base.hostname,'127.0.0.1');
(async()=>{
 const browser=await chromium.launch(process.env.CI?{headless:true}:{channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:393,height:852},serviceWorkers:'block'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==base.origin)return route.abort();
  const name=url.pathname==='/'?'index.html':url.pathname.slice(1);
  const source=path.resolve(spec.old_client_root,name),root=path.resolve(spec.old_client_root);
  if(source.startsWith(root+path.sep)&&fs.existsSync(source)&&fs.statSync(source).isFile())
   return route.fulfill({path:source,contentType:name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html'});
  return route.continue();
 });
 try{
  await page.goto(spec.base_url+'/?e2e=1');await waitForParticipantReady(page,60000);
  await expect(page.locator('#release-announcement-dialog')).toHaveCount(0);
  await page.locator('#reward-inbox-button').click();await page.locator('#inbox-tab-system').click();
  const notice=page.locator('#reward-inbox-notices .inbox-notice-card').filter({hasText:'Yeni devre açılıyor'});
  await expect(notice).toHaveCount(1);
  await notice.locator('strong').first().click();
  await expect(notice).toContainText('23 Kasım 2026');await expect(notice).toContainText('30 Kasım 2026');
  await expect(notice).toContainText('22.00');await expect(notice).toContainText('2 saat');
  for(const width of [320,393])for(const language of ['tr','en']){
   await page.setViewportSize({width,height:width===320?568:852});await page.evaluate(l=>GridshardI18n.apply(l),language);
   await page.screenshot({path:path.join(spec.output,`legacy-system-${language}-${width}.png`)});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  }
  assert.equal(errors.length,0,JSON.stringify(errors));
  console.log(JSON.stringify({passed:true,unchanged_230_app:true,actual_230_api:true,source_ui_base:spec.old_client_root,
    system_notice:true,automatic_popup:false,aab_changed:false,physical_device:false,language_size_cases:4}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
