// Controls only the owned localhost test tab; never reads other phone tabs.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const {balancePanels}=require('../e2e/balance-ui-checks');
const {waitForParticipantReady}=require('../e2e/ui-helpers');

(async()=>{
  const baseURL='http://127.0.0.1:8891';
  const out=path.resolve(__dirname,'../artifacts/balance-rollout-20261028/physical-android');
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.connectOverCDP('http://127.0.0.1:9223',{timeout:15000});
  let page;
  try{
    const context=browser.contexts()[0];
    page=context.pages().find(candidate=>candidate.url().startsWith(baseURL))||await context.newPage();
    await page.bringToFront();
    await page.goto(`${baseURL}/?e2e=1`,{waitUntil:'domcontentloaded'});
    // The isolated server can be restarted between runs. Clear only this
    // owned localhost origin's disposable test identity, never other origins.
    await page.evaluate(()=>{if(location.origin==='http://127.0.0.1:8891')localStorage.clear();});
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    const cards=await balancePanels(page,{baseURL,widths:null,screenshotDir:out});
    console.log('Physical phone: 36 server values and six detail panels verified');
    await page.locator('[data-shell-screen="menu"]').click();
    await waitForParticipantReady(page);
    await page.locator('#home-battle-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:40000});
    await expect(page.locator('#module-shelf')).toHaveAttribute('data-placement-ready','true',{timeout:30000});
    await expect.poll(()=>page.evaluate(()=>window.__GRIDSHARD_TEST_API.getBattleState().elapsed_ms),{timeout:30000}).toBeGreaterThan(0);
    await expect(page.locator('#battle-start-countdown')).toBeHidden({timeout:6000});
    for(const id of ['laser','battery','shield']){
      await expect.poll(()=>page.evaluate(id=>window.__GRIDSHARD_TEST_API.deployModule(id),id),{timeout:14000}).toBe(true);
      await expect(page.locator(`#board [data-device="${id}"]`)).toBeVisible({timeout:14000});
    }
    const screen=await page.evaluate(()=>({width:innerWidth,height:innerHeight,dpr:devicePixelRatio,
      overflow:document.documentElement.scrollWidth>innerWidth+1,
      playerSockets:document.querySelectorAll('#board .board-cell').length,
      enemySockets:document.querySelectorAll('#enemy-board .board-cell').length,
      userAgent:navigator.userAgent}));
    expect(screen.overflow).toBe(false);
    expect(screen.playerSockets).toBe(15);expect(screen.enemySockets).toBe(15);
    await page.screenshot({path:path.join(out,'physical-battle.png')});
    const frames=await page.evaluate(()=>new Promise(resolve=>{
      const times=[];
      function next(t){times.push(t);if(times.length>1&&t-times[0]>=5000){
        const deltas=times.slice(1).map((v,i)=>v-times[i]).sort((a,b)=>a-b);
        resolve({fps:1000*(times.length-1)/(t-times[0]),p95FrameMs:deltas[Math.floor(.95*(deltas.length-1))]});
      }else requestAnimationFrame(next);}
      requestAnimationFrame(next);
    }));
    expect(errors).toEqual([]);
    const result={mode:'physical_android_chrome_local_isolated_server',screen,frames,errors,cards};
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify({screen,frames,errors},null,2));
  }finally{
    if(page&&page.url().startsWith(baseURL)){
      await page.evaluate(()=>{
        if(document.body.dataset.onlineStatus==='battle')document.getElementById('battle-forfeit-button')?.click();
      }).catch(()=>{});
    }
    // Disconnect CDP without closing the user's Chrome app or unrelated tabs.
    await browser.close();
  }
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
