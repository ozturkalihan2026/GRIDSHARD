// Exercises only com.gridshard.localdebug's packaged WebView and isolated API.
// No production account, purchases, provider login or test hook is used.
const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const {balancePanels}=require('../e2e/balance-ui-checks');
const {waitForParticipantReady}=require('../e2e/ui-helpers');
const out=path.resolve(process.env.GRIDSHARD_NATIVE_QA_DIR||path.join(__dirname,'../artifacts/native-android-20261028'));
function capturePhone(name){
  const adb=path.resolve(__dirname,'../.mobile-debug/adb-tooling/platform-tools/adb.exe');
  fs.writeFileSync(path.join(out,name),execFileSync(adb,['exec-out','screencap','-p'],{maxBuffer:20*1024*1024}));
}

(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.connectOverCDP('http://127.0.0.1:9224',{timeout:15000});
  let page;
  const errors=[];
  const result={mode:'physical_android_packaged_capacitor_webview',package:'com.gridshard.localdebug'};
  try{
    page=browser.contexts()[0].pages().find(p=>p.url().startsWith('https://localhost/'));
    if(!page)throw Error('The owned test APK WebView was not found');
    page.setDefaultTimeout(20000);
    page.on('pageerror',e=>errors.push(e.message));
    await page.evaluate(()=>{
      if(location.origin!=='https://localhost')throw Error('Unexpected origin');
      localStorage.setItem('gridshard.tutorial.v1','complete');
    });
    result.cards=await balancePanels(page,{baseURL:'https://localhost',widths:null,screenshotDir:out});
    result.runtime=await page.evaluate(()=>({
      native:!!window.Capacitor?.isNativePlatform(),platform:window.Capacitor?.getPlatform(),
      api:globalThis.GRIDSHARD_API_BASE_URL,width:innerWidth,height:innerHeight,dpr:devicePixelRatio,
      testHook:!!window.__GRIDSHARD_TEST_API,
      bundles:[...document.scripts].map(s=>s.src).filter(s=>s.includes('/bundles/'))
    }));
    expect(result.runtime.native).toBe(true);
    expect(result.runtime.platform).toBe('android');
    expect(result.runtime.api).toBe('http://127.0.0.1:8891');
    expect(result.runtime.testHook).toBe(false);
    console.log('Native APK: 36 card values and six detail panels passed');
    result.dock=await page.locator('#app-bottom-dock').evaluate(el=>{
      const r=el.getBoundingClientRect();return {left:r.left,right:innerWidth-r.right,bottom:innerHeight-r.bottom};
    });
    expect(result.dock.left).toBeGreaterThanOrEqual(15);
    expect(result.dock.right).toBeGreaterThanOrEqual(15);
    expect(result.dock.bottom).toBeGreaterThanOrEqual(11);
    capturePhone('phone-dock.png');

    await page.locator('[data-card-page="cores"]').click();
    const icon=page.locator('[data-card-page="cores"] img');
    await expect(icon).toBeVisible();
    result.coreIcon=await icon.getAttribute('src');
    expect(result.coreIcon).toContain('core_resonance');
    await page.screenshot({path:path.join(out,'native-cores.png')});
    capturePhone('phone-cores.png');
    await page.locator('[data-shell-screen="shop"]').click();
    await expect(page.locator('#chest-odds-open')).toBeVisible();
    result.shop=await page.evaluate(()=>{
      const title=document.querySelector('#chest-store-title').getBoundingClientRect();
      const button=document.querySelector('#chest-odds-open'),r=button.getBoundingClientRect();
      return {width:r.width,height:r.height,font:getComputedStyle(button).fontSize,
        sameRow:Math.abs(title.y+title.height/2-r.y-r.height/2)<8,
        afterTitle:r.left>=title.right-1,overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    expect(result.shop.sameRow).toBe(true);expect(result.shop.afterTitle).toBe(true);
    expect(result.shop.width).toBeLessThanOrEqual(83);expect(result.shop.overflow).toBe(false);
    await page.screenshot({path:path.join(out,'native-shop.png')});
    capturePhone('phone-shop.png');

    await page.locator('[data-shell-screen="menu"]').click();
    await waitForParticipantReady(page);
    await page.locator('#home-battle-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:45000});
    await expect(page.locator('#module-shelf')).toHaveAttribute('data-placement-ready','true',{timeout:30000});
    await expect(page.locator('#battle-start-countdown')).toBeHidden({timeout:10000});
    const playable=page.locator('#module-shelf .deck-module-card[data-playable="true"]').first();
    await expect(playable).toBeEnabled();
    const count=await page.locator('#board .module-card').count();
    await playable.click();
    await expect.poll(()=>page.locator('#board .module-card').count(),{timeout:15000}).toBeGreaterThan(count);
    result.battle=await page.evaluate(()=>{
      const arena=document.querySelector('.vertical-circuit-arena'),a=arena.getBoundingClientRect();
      const boards=['board','enemy-board'].map(id=>{
        const r=document.getElementById(id).getBoundingClientRect();
        return {id,cells:document.querySelectorAll(`#${id} .board-cell`).length,
          fits:r.left>=a.left-1&&r.right<=a.right+1&&r.top>=a.top-1&&r.bottom<=a.bottom+1};
      });
      const g=document.querySelector('.duel-player-side .circuit-terrain').getBoundingClientRect();
      const footer=document.querySelector('.duel-player-identity').getBoundingClientRect();
      const shelf=document.querySelector('.shelf-panel').getBoundingClientRect();
      const hand=[...document.querySelectorAll('#module-shelf .deck-module-card')].map(el=>{
        const r=el.getBoundingClientRect(),art=el.querySelector('.module-emblem').getBoundingClientRect();
        return {height:r.height,artHeight:art.height,inside:r.top>=shelf.top&&r.bottom<=shelf.bottom+1};
      });
      const header=document.querySelector('.duel-enemy-identity');
      return {boards,backdrop:getComputedStyle(arena).backgroundColor,
        headerBackdrop:getComputedStyle(header).backgroundColor,
        repeatedCliff:getComputedStyle(document.querySelector('.duel-enemy-side > .circuit-terrain'),'::after').content,
        controlInsets:{left:shelf.left,right:innerWidth-shelf.right,bottom:innerHeight-shelf.bottom},
        hand,shelfHeight:shelf.height,
        bottomPaintingGap:footer.top-(g.top+g.height*(1254-260)/404),
        overflow:document.documentElement.scrollWidth>innerWidth+1};
    });
    expect(result.battle.boards.every(b=>b.cells===15&&b.fits)).toBe(true);
    expect(result.battle.bottomPaintingGap).toBeLessThanOrEqual(10);
    expect(result.battle.overflow).toBe(false);
    expect(result.battle.headerBackdrop).toBe('rgba(0, 0, 0, 0)');
    expect(result.battle.repeatedCliff).toBe('none');
    expect(result.battle.controlInsets.left).toBeGreaterThanOrEqual(14);
    expect(result.battle.controlInsets.right).toBeGreaterThanOrEqual(14);
    expect(result.battle.controlInsets.bottom).toBeGreaterThanOrEqual(12);
    expect(result.battle.hand).toHaveLength(6);
    expect(result.battle.hand.every(c=>c.height>=57&&c.artHeight>=30&&c.inside)).toBe(true);
    const button=page.locator('#battle-emoji-button'),tray=page.locator('#battle-emoji-tray');
    await button.click();await expect(tray).toBeVisible();
    await tray.locator('button').first().click();
    await expect(tray).toBeHidden();await expect(tray.locator('button')).toHaveCount(0);
    await expect(page.locator('#board .battle-emoji-bubble')).toHaveCount(1);
    await page.screenshot({path:path.join(out,'native-battle-emoji.png')});
    capturePhone('phone-battle-emoji.png');
    await expect(page.locator('#board .battle-emoji-bubble')).toHaveCount(0,{timeout:5000});
    await expect(button).toBeEnabled({timeout:5000});
    // Several frames between batches exercise actual layout/animation cleanup.
    for(let batch=0;batch<5;batch++){
      await page.evaluate(()=>{
        const b=document.getElementById('battle-emoji-button');
        for(let i=0;i<20;i++){b.click();b.click();}
      });
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
    }
    await expect(tray).toBeHidden();await expect(tray.locator('button')).toHaveCount(0);
    result.emoji={sent:1,openCloseCycles:100,closedOptions:0,expiredBubbles:0};
    result.frames=await page.evaluate(()=>new Promise(resolve=>{
      const times=[];
      function next(t){times.push(t);if(times.length>1&&t-times[0]>=10000){
        const d=times.slice(1).map((v,i)=>v-times[i]).sort((a,b)=>a-b);
        resolve({durationMs:t-times[0],fps:1000*(times.length-1)/(t-times[0]),p95FrameMs:d[Math.floor(.95*(d.length-1))]});
      }else requestAnimationFrame(next);}requestAnimationFrame(next);
    }));
    await page.screenshot({path:path.join(out,'native-battle.png')});
    capturePhone('phone-battle.png');
    await page.locator('#battle-forfeit-button').evaluate(el=>el.click());
    await expect(page.locator('.post-match-panel')).toBeVisible({timeout:20000});
    await expect(page.locator('#post-match-continue')).toHaveAttribute('data-post-match-stage','damage');
    // Native CDP hit coordinates also differ from its distorted fixed-layer
    // capture. Exercise the real handler for this layout-only stage check.
    await page.locator('#post-match-continue').evaluate(el=>el.click());
    await expect(page.locator('#post-match-reward-stage')).toBeVisible({timeout:15000});
    result.rewards=await page.evaluate(()=>{
      const stage=document.getElementById('post-match-reward-stage');
      const ids=['post-match-reward-list','post-match-premium','post-match-ad-reward'];
      const r=ids.map(id=>document.getElementById(id).getBoundingClientRect());
      return {display:getComputedStyle(stage).display,
        gaps:r.slice(1).map((v,i)=>v.top-r[i].bottom),
        horizontalOverflow:stage.scrollWidth>stage.clientWidth+1};
    });
    expect(result.rewards.display).toBe('grid');
    expect(result.rewards.gaps.every(g=>g>=11)).toBe(true);
    expect(result.rewards.horizontalOverflow).toBe(false);
    capturePhone('phone-result-rewards.png');
    result.captureNote='CDP WebView captures distort fixed bottom layers on this device; phone-*.png files are actual ADB screen captures.';
    expect(errors).toEqual([]);result.errors=errors;
    result.completedAt=new Date().toISOString();
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(result,null,2));
    console.log(JSON.stringify({...result,cards:`${result.cards.length} verified`},null,2));
  }catch(e){
    fs.writeFileSync(path.join(out,'partial.json'),JSON.stringify({...result,errors,failure:e.message},null,2));
    if(page)await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});
    throw e;
  }finally{
    if(page)await page.evaluate(()=>{
      if(document.body.dataset.onlineStatus==='battle')document.getElementById('battle-forfeit-button')?.click();
    }).catch(()=>{});
    await browser.close(); // Disconnect; leave the test app available to the user.
  }
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
