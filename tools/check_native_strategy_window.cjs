// Actual UI commands and authoritative WebSocket snapshots in the separate APK.
const {chromium,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('../e2e/ui-helpers');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const out=path.resolve(__dirname,'../artifacts/strategy-window-20261028/native');
const adb=path.resolve(__dirname,'../.mobile-debug/adb-tooling/platform-tools/adb.exe');
const capture=name=>fs.writeFileSync(path.join(out,name),execFileSync(adb,['exec-out','screencap','-p'],{maxBuffer:20*1024*1024}));

(async()=>{
  fs.mkdirSync(out,{recursive:true});
  const browser=await chromium.connectOverCDP('http://127.0.0.1:9224');
  const page=browser.contexts()[0].pages().find(p=>p.url().startsWith('https://localhost/'));
  if(!page)throw Error('Owned debug APK missing');
  let latest=null,lastSample=-5000,peak=0,captured=false;
  const samples=[],errors=[],commands=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('websocket',ws=>ws.on('framereceived',frame=>{
    let message;try{message=JSON.parse(String(frame.payload));}catch{return;}
    if(message.type!=='snapshot')return;
    latest=message.payload;
    const own=latest.players?.[latest.viewer_player_id];
    if(!own)return;
    const active=own.modules.filter(m=>m.definition_id!=='core'&&m.status==='active'&&m.hp>0);
    peak=Math.max(peak,active.length);
    if(latest.elapsed_ms-lastSample>=5000||latest.status==='finished'){
      samples.push({atMs:latest.elapsed_ms,status:latest.status,current:own.circuit_credits,
        live:active.map(m=>({id:m.definition_id,hp:m.hp,maxHp:m.max_hp})),
        core:own.modules.find(m=>m.definition_id==='core')?.hp});
      lastSample=latest.elapsed_ms;
    }
  }));
  try{
    expect(await page.evaluate(()=>globalThis.GRIDSHARD_API_BASE_URL)).toBe('http://127.0.0.1:8891');
    await page.evaluate(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
    const meta=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/meta-progression')&&r.ok());
    await page.reload({waitUntil:'domcontentloaded'});
    await waitForParticipantReady(page);
    const payload=await(await meta).json();
    const canon=JSON.parse(fs.readFileSync(path.join(__dirname,'../server/data/arena_progression_v1.json'),'utf8')).modules;
    for(const item of payload.module_collection){
      const source=canon.find(m=>m.id===item.definition_id);
      expect(item.current_cost).toBe(source.current_cost);
      if(item.stats.level===1){expect(item.stats.max_hp).toBe(source.max_hp);expect(item.stats.base_damage).toBe(source.base_damage);}
    }
    expect(payload.module_collection).toHaveLength(36);
    for(let i=0;i<3&&await page.locator('.post-match-panel').isVisible();i++){
      await page.locator('#post-match-continue').evaluate(el=>el.click());
      await page.waitForTimeout(500);
    }
    latest=null;lastSample=-5000;peak=0;samples.length=0;
    await page.locator('#home-battle-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:45000});
    await expect(page.locator('#module-shelf')).toHaveAttribute('data-placement-ready','true',{timeout:30000});
    await expect(page.locator('#battle-start-countdown')).toBeHidden({timeout:10000});
    await expect.poll(()=>latest?.players?.[latest.viewer_player_id]?.modules.find(m=>m.definition_id==='core')?.max_hp||0).toBeGreaterThan(0);
    const coreMaxHp=latest.players[latest.viewer_player_id].modules.find(m=>m.definition_id==='core').max_hp;
    // A daily modifier may change battle HP (e.g. 450 -> 495). Compare the
    // rendered value with the authoritative match, not an unmodified fixture.
    await expect(page.locator('#board [data-core="true"] [role="meter"]')).toHaveAttribute('aria-valuemax',String(coreMaxHp));
    const deadline=Date.now()+360000;
    let progressAt=0;
    while(Date.now()<deadline&&latest?.status!=='finished'){
      const own=latest?.players?.[latest.viewer_player_id];
      if(own){
        const living=own.modules.filter(m=>m.status==='active'&&m.hp>0),counts={};
        for(const m of living)counts[m.definition_id]=(counts[m.definition_id]||0)+1;
        const priorities=[];
        if(!counts.laser)priorities.push('laser');
        if(!counts.shield)priorities.push('shield');
        if((counts.laser||0)<2)priorities.push('laser');
        if(!counts.battery)priorities.push('battery');
        if(!counts.amplifier)priorities.push('amplifier');
        if(!counts.cooler)priorities.push('cooler');
        if((counts.shield||0)<2)priorities.push('shield');
        if((counts.laser||0)<3)priorities.push('laser');
        if(!counts.emp)priorities.push('emp');
        priorities.push('laser');
        const key=priorities[0],card=page.locator(`#module-shelf [data-module-id="${key.replaceAll('_','-')}-1"]`);
        if(await card.getAttribute('data-playable')==='true'&&await card.isEnabled()){
          await card.click();commands.push({atMs:latest.elapsed_ms,id:key});
        }
        const power=page.locator('#core-power-button');
        if(await power.isEnabled())await power.click();
      }
      if(peak>=4&&!captured){capture('phone-formation.png');captured=true;}
      if(latest&&latest.elapsed_ms-progressAt>=30000){
        console.log(`Native battle ${latest.elapsed_ms/1000}s, peak ${peak} modules`,{flush:true});
        progressAt=latest.elapsed_ms;
      }
      await page.waitForTimeout(1000);
    }
    expect(latest?.status).toBe('finished');
    expect(peak).toBeGreaterThanOrEqual(4);
    expect(samples.every(s=>s.current>=0&&s.current<=12)).toBe(true);
    expect(errors).toEqual([]);
    await expect(page.locator('.post-match-panel')).toBeVisible({timeout:15000});
    capture('phone-result.png');
    fs.writeFileSync(path.join(out,'result.json'),JSON.stringify({mode:'real_android_ui_real_local_server',
      cards:payload.module_collection.map(m=>({id:m.definition_id,hp:m.stats.max_hp,cost:m.current_cost,damage:m.stats.base_damage})),
      coreMaxHp,elapsedMs:latest.elapsed_ms,finishReason:latest.finish_reason,peak,commands,samples,errors},null,2));
    console.log(JSON.stringify({elapsedMs:latest.elapsed_ms,finishReason:latest.finish_reason,peak,commands:commands.length,errors}));
    // Finish the ordinary result flow and leave the app on the home screen.
    for(let step=0;step<2;step++){
      await page.locator('#post-match-continue').evaluate(el=>el.click());
      await page.waitForTimeout(500);
    }
  }catch(error){
    capture('phone-failure.png');
    fs.writeFileSync(path.join(out,'partial.json'),JSON.stringify({failure:error.message,peak,samples,commands,errors},null,2));
    if(await page.locator('#battle-forfeit-button').isVisible())await page.locator('#battle-forfeit-button').evaluate(el=>el.click());
    throw error;
  }finally{await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
