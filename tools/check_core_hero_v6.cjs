// Real Rezonans battle proof + explicitly labelled presentation fixtures for all 7 cores.
const {chromium,expect}=require('@playwright/test'),{waitForParticipantReady}=require('../e2e/ui-helpers');
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve('artifacts/core-hero-v6');fs.mkdirSync(out,{recursive:true});
const width=Number(process.argv[2]||393);
(async()=>{
  const browser=await chromium.launch({headless:true,channel:'chrome'}),page=await browser.newPage({viewport:{width,height:width===320?740:852},locale:'tr-TR'});
  const errors=[],missing=[],events=[];let last;
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).pathname.includes('/assets/'))missing.push(new URL(r.url()).pathname);});
  page.on('websocket',ws=>ws.on('framereceived',f=>{try{const m=JSON.parse(String(f.payload));if(m.type==='snapshot')last=m.payload;if(m.type==='events')events.push(...(m.payload.events||[]));}catch{}}));
  try{
    await page.goto('http://127.0.0.1:8896/?e2e=1&onboarding=1');await waitForParticipantReady(page);await page.locator('#home-battle-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:40000});
    await expect(page.locator('#module-shelf')).toHaveAttribute('data-placement-ready','true',{timeout:15000});
    for(const id of ['shield'])await expect.poll(()=>page.evaluate(id=>window.__GRIDSHARD_TEST_API.deployModule(id),id),{timeout:12000}).toBe(true);
    await expect(page.locator('#core-power-button')).toBeEnabled({timeout:30000});
    await expect(page.locator('.vertical-circuit-arena .module-heat-bar')).toHaveCount(0);
    await page.locator('#core-power-button').click();
    await expect(page.locator('.core-vfx-resonance[data-core-event="impact"]').first()).toBeVisible();
    const activation=events.find(e=>e.type==='core_power_used'&&e.data.player_id===last.viewer_player_id);
    expect(activation).toBeTruthy();
    const expected=events.filter(e=>e.type==='attack_performed'&&e.data.core_attack&&e.data.attacker_player_id===last.viewer_player_id&&e.at_ms===activation.at_ms).map(e=>e.data.target_module_id).sort();
    const visible=await page.locator('.core-vfx-resonance[data-core-event="impact"]').evaluateAll(nodes=>nodes.map(n=>n.dataset.coreTarget).sort());
    expect(visible).toEqual(expected);expect(visible.length).toBeGreaterThan(0);
    await page.screenshot({path:path.join(out,`real-resonance-${width}.png`)});
    const roles={core_resonance:'shockwave',core_guardian:'fortress',core_overdrive:'flame',core_disruptor:'execution',core_capacitor:'reinforcement',core_phoenix:'drain',core_quantum:'fracture'};
    const fixtureProof=[];
    for(const [power,role]of Object.entries(roles)){
      const snapshot=JSON.parse(JSON.stringify(last));
      await page.evaluate(({snapshot,power,role})=>{
        window.__coreProof?.clear();
        let proofLayer=document.getElementById('core-proof-layer');
        if(!proofLayer){
          proofLayer=document.createElement('div');proofLayer.id='core-proof-layer';proofLayer.style.cssText='position:absolute;inset:0;pointer-events:none';
          document.getElementById('battle-effect-layer').appendChild(proofLayer);
          const style=document.createElement('style');style.id='core-proof-style';style.textContent='#battle-effect-layer > :not(#core-proof-layer), .battle-core-impact {visibility:hidden!important}';document.head.appendChild(style);
        }
        const own=snapshot.viewer_player_id,enemy=Object.keys(snapshot.players).find(k=>k!==own);
        const core=snapshot.players[own].modules.find(m=>m.definition_id==='core');
        const target=snapshot.players[enemy].modules.find(m=>m.definition_id!=='core'&&m.hp>0&&m.x!=null);
        const ally=snapshot.players[own].modules.find(m=>m.definition_id!=='core'&&m.hp>0&&m.x!=null)||core;
        if(!target)throw Error('Fixture needs actual board modules');
        snapshot.players[own].core_type=power;snapshot.players[own].core_power.id=power;
        core.signature_badges=['fortress','flame'].includes(role)?[{kind:'core_firing',value:6}]:[];
        if(role==='execution')target.signature_badges=[{kind:'execution',value:2}];
        const anchor=id=>{
          const [player,moduleId]=JSON.parse(id),m=snapshot.players[player].modules.find(m=>m.instance_id===moduleId);
          const cell=document.querySelector(`${player===own?'#board':'#enemy-board'} .board-cell[data-x="${m.x}"][data-y="${m.y}"]`);
          const layer=document.querySelector('#battle-effect-layer').getBoundingClientRect(),r=cell?.getBoundingClientRect();
          return r?{center:{x:r.left+r.width/2-layer.left,y:r.top+r.height/2-layer.top}}:null;
        };
        const fx=window.__coreProof=new GridshardCoreVfx({doc:document,layer:()=>proofLayer,anchor,
          domId:(p,m)=>JSON.stringify([p,m.instance_id]),now:()=>performance.now(),schedule:(ms,f)=>setTimeout(f,ms),sound:()=>{}});
        const chosen=role==='reinforcement'?{player_id:own,module_id:ally.instance_id}:{player_id:enemy,module_id:target.instance_id};
        const events=[{type:'core_power_used',at_ms:snapshot.elapsed_ms,data:{player_id:own,power_id:power,role,affected_targets:[chosen],effects:role==='drain'?[{kind:'repair',value:50}]:[]}}];
        if(!['reinforcement','execution'].includes(role))events.push({type:'attack_performed',at_ms:snapshot.elapsed_ms,data:{core_attack:true,power_id:power,attacker_player_id:own,attacker_module_id:core.instance_id,target_player_id:enemy,target_module_id:target.instance_id,damage:90}});
        fx.receive(events,snapshot);
      },{snapshot,power,role});
      await expect(page.locator(`#core-proof-layer .core-vfx[data-core-power="${power}"]`).first()).toBeVisible();
      await page.screenshot({path:path.join(out,`fixture-${power}-${width}.png`)});
      fixtureProof.push({power,roots:await page.locator(`#core-proof-layer .core-vfx[data-core-power="${power}"]`).count()});
    }
    await page.evaluate(()=>{window.__coreProof.clear();document.getElementById('core-proof-layer')?.remove();document.getElementById('core-proof-style')?.remove();});
    const audio=await page.evaluate(async powers=>await Promise.all(powers.flatMap(p=>['activate','shot'].map(async k=>({name:p+'_'+k,status:(await fetch(`/assets/audio/${p}_${k}.wav`)).status})))),Object.keys(roles));
    expect(audio.every(a=>a.status===200)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('#battle-forfeit-button').evaluate(el=>el.click());await expect(page.locator('.post-match-panel')).toBeVisible();
    await expect(page.locator('.core-vfx')).toHaveCount(0);
    expect(errors).toEqual([]);expect(missing).toEqual([]);
    fs.writeFileSync(path.join(out,`browser-${width}.json`),JSON.stringify({width,realHitTargets:expected,visibleHitTargets:visible,fixtureProof,audio,errors,missing,heatBars:0},null,2));
    console.log('PASS real target-linked core volley, zero heat bars, seven visual fixtures, 14 sounds, cleanup',width);
  }catch(e){await page.screenshot({path:path.join(out,`failure-${width}.png`)});throw e;}
  finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
