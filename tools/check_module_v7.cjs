// Real starter battle + collection contract + explicitly isolated V7 VFX fixture.
const {chromium,expect}=require('@playwright/test');
const {waitForParticipantReady,completeFirstLaunch}=require('../e2e/ui-helpers');
const fs=require('node:fs'),path=require('node:path');
const width=Number(process.argv[2]||393),out=path.resolve('artifacts/module-v7-rollout');
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 const page=await browser.newPage({viewport:{width,height:width===320?740:852},locale:'tr-TR'});
 const errors=[],missing=[],events=[];let last;
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&new URL(r.url()).pathname.includes('/assets/'))missing.push(new URL(r.url()).pathname);});
 page.on('websocket',ws=>ws.on('framereceived',frame=>{try{const msg=JSON.parse(String(frame.payload));if(msg.type==='snapshot')last=msg.payload;if(msg.type==='events')events.push(...(msg.payload.events||[]));}catch{}}));
 try{
  const metaReady=page.waitForResponse(r=>new URL(r.url()).pathname.endsWith('/meta-progression')&&r.status()===200);
  await page.goto('http://127.0.0.1:8897/?e2e=1&onboarding=1');await waitForParticipantReady(page);
  const meta=await(await metaReady).json();await completeFirstLaunch(page);
  expect(meta.module_collection).toHaveLength(24);
  const plasma=meta.module_collection.find(m=>m.definition_id==='plasma_mortar');
  expect(plasma.stats.parameters.dot_per_tick_ratio).toBe(.05);
  expect(plasma.talents[1].choices.map(c=>c.name_tr)).toEqual(['Kalıcı İz','Geniş Yayılım']);
  const buffer=meta.module_collection.find(m=>m.definition_id==='buffer_shield');
  expect(buffer.stats.parameters.absorb_ratio).toBe(.70);expect(buffer.stats.max_hp).toBe(375);
  await page.locator('[data-shell-screen="modules"]').click();
  await page.locator('[data-card-page="modules"]').click();
  await expect(page.locator('#module-collection-grid [data-module-definition-id]')).toHaveCount(24);
  await page.screenshot({path:path.join(out,`collection-${width}.png`)});
  await page.locator('[data-shell-screen="menu"]').click();await page.locator('#home-battle-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:40000});
  await expect(page.locator('#module-shelf')).toHaveAttribute('data-placement-ready','true',{timeout:15000});
  for(const id of ['shield','laser'])await expect.poll(()=>page.evaluate(id=>window.__GRIDSHARD_TEST_API.deployModule(id),id),{timeout:15000}).toBe(true);
  await expect.poll(()=>last?.combat_ruleset,{timeout:10000}).toBe('modules_v7');
  await expect(page.locator('.vertical-circuit-arena .module-heat-bar')).toHaveCount(0);
  await expect.poll(()=>events.some(e=>e.type==='attack_performed'),{timeout:15000}).toBe(true);
  await page.screenshot({path:path.join(out,`battle-${width}.png`)});
  // Renderer fixture only; never changes server modules, ownership or damage.
  await page.evaluate(snapshot=>{
   const own=snapshot.viewer_player_id,enemy=Object.keys(snapshot.players).find(k=>k!==own);
   const target=snapshot.players[enemy].modules.find(m=>m.hp>0&&m.x!=null);
   const layer=document.createElement('div');layer.id='v7-proof';layer.style.cssText='position:absolute;inset:0;pointer-events:none';
   document.getElementById('battle-effect-layer').appendChild(layer);
   const anchor=id=>{const [side,uid]=JSON.parse(id),m=snapshot.players[side].modules.find(v=>v.instance_id===uid);
    const cell=document.querySelector(`${side===own?'#board':'#enemy-board'} .board-cell[data-x="${m?.x}"][data-y="${m?.y}"]`);
    const r=cell?.getBoundingClientRect(),l=layer.getBoundingClientRect();return r?{center:{x:r.left+r.width/2-l.left,y:r.top+r.height/2-l.top}}:null;};
   window.__v7Proof=new GridshardModuleVfx({doc:document,layer:()=>layer,anchor,domId:(p,m)=>JSON.stringify([p,m.instance_id]),now:()=>performance.now(),schedule:()=>{},sound:()=>{},rigFor:()=>null,boardRect:()=>null});
   window.__v7Proof.derivedImpact({damage_kind:'dot',damage:3,target_player_id:enemy,target_module_id:target.instance_id},snapshot);
  },last);
  await expect(page.locator('#v7-proof [data-signature-v7="dot"]')).toBeVisible();
  await page.screenshot({path:path.join(out,`dot-fixture-${width}.png`)});
  await page.evaluate(()=>{window.__v7Proof.reset();document.getElementById('v7-proof').remove();});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#battle-forfeit-button').evaluate(el=>el.click());await expect(page.locator('.post-match-panel')).toBeVisible();
  expect(errors).toEqual([]);expect(missing).toEqual([]);
  const result={width,modules:24,ruleset:last.combat_ruleset,heatBars:0,realBattle:true,derivedVfxProof:'presentation_fixture_only',errors,missing,overflow:false};
  fs.writeFileSync(path.join(out,`browser-${width}.json`),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }catch(e){await page.screenshot({path:path.join(out,`failure-${width}.png`)});throw e;}
 finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
