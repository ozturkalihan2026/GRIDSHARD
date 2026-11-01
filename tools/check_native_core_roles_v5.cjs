// Verify the installed TEST package without a battle, purchase or progress reset.
const {chromium,expect}=require('@playwright/test');
const {waitForParticipantReady,completeFirstLaunch}=require('../e2e/ui-helpers');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(process.env.GRIDSHARD_NATIVE_QA_OUT || 'artifacts/core-roles-v5/phone-20261031');
const adb=path.resolve('.mobile-debug/adb-tooling/platform-tools/adb.exe');
const capture=name=>fs.writeFileSync(path.join(out,name),execFileSync(adb,['exec-out','screencap','-p'],{maxBuffer:20*1024*1024}));
(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.connectOverCDP('http://127.0.0.1:9224');
  let page;
  const errors=[],missing=[];
  try{
    await expect.poll(()=>{
      page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().startsWith('https://localhost/'));
      return Boolean(page);
    },{timeout:10000}).toBe(true);
    page.setDefaultTimeout(20000);
    page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).pathname.includes('/assets/'))missing.push(new URL(r.url()).pathname);});
    const metaReady=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/meta-progression')&&r.status()===200,{timeout:30000});
    const dailyReady=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/daily-meta')&&r.status()===200,{timeout:30000});
    await page.reload({waitUntil:'domcontentloaded'});
    await waitForParticipantReady(page);
    const meta=await (await metaReady).json();
    await dailyReady;
    await completeFirstLaunch(page);
    expect(meta.module_collection).toHaveLength(24);
    expect(meta.cores.types).toHaveLength(7);
    expect(meta.cores.types.every(c=>c.skills.length===6&&c.power_values?.kind)).toBe(true);
    const runtime=await page.evaluate(()=>({
      native:Capacitor.isNativePlatform(),platform:Capacitor.getPlatform(),api:GRIDSHARD_API_BASE_URL,
      width:innerWidth,height:innerHeight,dpr:devicePixelRatio,testHook:!!window.__GRIDSHARD_TEST_API,
      bundles:[...document.scripts].map(s=>s.src).filter(s=>s.includes('/bundles/')),
      overflow:document.documentElement.scrollWidth>innerWidth+1
    }));
    expect(runtime.native).toBe(true);expect(runtime.platform).toBe('android');
    expect(runtime.api).toBe('http://127.0.0.1:8891');expect(runtime.testHook).toBe(false);expect(runtime.overflow).toBe(false);
    if(process.env.GRIDSHARD_EXPECTED_NATIVE_BUNDLE)expect(runtime.bundles.some(src=>src.endsWith('/'+process.env.GRIDSHARD_EXPECTED_NATIVE_BUNDLE))).toBe(true);
    await page.locator('[data-shell-screen="modules"]').click();
    await page.locator('[data-card-page="modules"]').click();
    await expect(page.locator('#module-collection-grid [data-module-definition-id]')).toHaveCount(24);
    await page.locator('[data-card-page="cores"]').click();
    await page.locator('#core-collection-list .core-collection-tile[data-core-type="core_resonance"]').click();
    await page.locator('#core-quick-info').click();
    await page.locator('[data-core-detail-tab="stats"]').click();
    const stats=await page.locator('#core-detail-tab-content').textContent();
    expect(stats).toContain('hasar');expect(stats).not.toContain('undefined');expect(stats).not.toContain('ENERJİ');
    capture('phone-core-stats.png');
    await page.locator('[data-core-detail-tab="skills"]').click();
    await expect(page.locator('#core-detail-dialog .module-talent-choices button')).toHaveCount(6);
    capture('phone-core-talents.png');
    await page.locator('#core-detail-dialog .detail-card-close').click();
    await page.locator('[data-shell-screen="menu"]').click();
    await expect(page.locator('#home-battle-button')).toBeVisible();
    capture('phone-ready.png');
    expect(errors).toEqual([]);expect(missing).toEqual([]);
    const result={package:'com.gridshard.localdebug',runtime,modules:24,cores:7,coreTalentChoices:42,
      selectedCore:meta.cores.selected_core_type,coreRoles:meta.cores.types.map(c=>({id:c.id,role:c.power_values.kind,level:c.level,firstCharge:c.first_charge_seconds,recharge:c.recharge_seconds})),
      stats,errors,missing,completedAt:new Date().toISOString(),leftOnHomeScreen:true};
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify({modules:24,cores:7,coreTalentChoices:42,runtime,errors,missing,leftOnHomeScreen:true}));
  }catch(e){if(page)capture('phone-failure.png');throw e;}
  finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
