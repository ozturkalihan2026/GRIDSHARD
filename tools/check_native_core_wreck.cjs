// Real battle/death in the separately installed localdebug APK, not an art preview.
const {chromium,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('../e2e/ui-helpers');
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');
const out=path.resolve(__dirname,'../artifacts/core-wreck-title-fixes-20261028/native');
const adb=path.resolve(__dirname,'../.mobile-debug/adb-tooling/platform-tools/adb.exe');
const capture=name=>fs.writeFileSync(path.join(out,name),execFileSync(adb,['exec-out','screencap','-p'],{maxBuffer:20*1024*1024}));

(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.connectOverCDP('http://127.0.0.1:9224');
  let page;
  const errors=[];
  try{
    page=browser.contexts()[0].pages().find(p=>p.url().startsWith('https://localhost/'));
    if(!page)throw Error('Owned test APK WebView missing');
    page.on('pageerror',e=>errors.push(e.message));
    await waitForParticipantReady(page);
    expect(await page.evaluate(()=>globalThis.GRIDSHARD_API_BASE_URL)).toBe('http://127.0.0.1:8891');
    await page.locator('#home-battle-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:40000});
    await expect(page.locator('#module-shelf')).toHaveAttribute('data-placement-ready','true',{timeout:30000});
    await expect(page.locator('#battle-start-countdown')).toBeHidden({timeout:10000});
    const header=await page.evaluate(()=>({
      background:getComputedStyle(document.querySelector('.duel-enemy-identity')).backgroundColor,
      repeatedCliff:getComputedStyle(document.querySelector('.duel-enemy-side > .circuit-terrain'),'::after').content
    }));
    expect(header.background).toBe('rgba(0, 0, 0, 0)');expect(header.repeatedCliff).toBe('none');
    capture('phone-battle-side-towers.png');
    console.log('Native battle started; waiting for a real undefended core defeat');
    const wreck=page.locator('#board [data-module-id="core-1"][data-core-wreck="true"]');
    await expect(wreck).toHaveCount(1,{timeout:90000});
    await expect(page.locator('.post-match-panel')).toBeVisible({timeout:15000});
    await expect(wreck.locator('.module-layer-art')).toHaveAttribute('src',/cores-wrecked-v1/);
    await expect(page.locator('.core-explosion')).toHaveCount(0,{timeout:6000});
    const state=await wreck.evaluate(el=>({
      x:el.closest('.board-cell').dataset.x,y:el.closest('.board-cell').dataset.y,
      art:el.querySelector('.module-layer-art').getAttribute('src'),
      hp:el.dataset.hpState,liveLights:el.querySelectorAll('.module-core-pulse').length
    }));
    expect(state).toMatchObject({x:'2',y:'1',hp:'destroyed',liveLights:0});
    // Only uncover the existing board for the QA photo; always restore dialog.
    const panel=page.locator('.post-match-panel');
    const oldVisibility=await panel.evaluate(el=>el.style.visibility);
    try{
      await panel.evaluate(el=>el.style.visibility='hidden');
      capture('phone-persistent-wreck.png');
    }finally{await panel.evaluate((el,value)=>el.style.visibility=value,oldVisibility);}
    await page.locator('#post-match-continue').evaluate(el=>el.click());
    await expect(page.locator('#post-match-reward-stage')).toBeVisible();
    await expect(wreck).toHaveCount(1);
    const spacing=await page.evaluate(()=>{
      const outcome=document.getElementById('post-match-reward-outcome').getBoundingClientRect();
      const heading=document.getElementById('post-match-reward-heading').getBoundingClientRect();
      const rows=['post-match-reward-list','post-match-premium','post-match-ad-reward'].map(id=>document.getElementById(id).getBoundingClientRect());
      return {titles:heading.top-outcome.bottom,toRewards:rows[0].top-heading.bottom,
        offerGaps:rows.slice(1).map((r,i)=>r.top-rows[i].bottom),overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    expect(spacing.titles).toBeCloseTo(4,0);expect(spacing.toRewards).toBeCloseTo(12,0);
    expect(spacing.offerGaps.every(g=>g>=11)).toBe(true);expect(spacing.overflow).toBe(false);
    capture('phone-compact-rewards.png');
    expect(errors).toEqual([]);
    const result={mode:'physical_android_localdebug_real_server_core_death',header,state,spacing,errors};
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify(result));
    await page.locator('#post-match-continue').evaluate(el=>el.click());
  }catch(e){
    if(page)capture('phone-failure.png');
    throw e;
  }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
