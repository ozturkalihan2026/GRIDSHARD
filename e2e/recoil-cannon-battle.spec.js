const {test,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('./ui-helpers');

test.beforeEach(async({page})=>{
  test.skip(process.env.GRIDSHARD_E2E_RECOIL_CANNON!=='1','Owned future-card fixture only');
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
  // The disposable server admits the future card; its matching compiled
  // browser roster is patched in memory, never in repository/package files.
  await page.route('**/src/canon-data.js',async route=>{
    const [original,card]=await Promise.all([
      route.fetch(),page.request.get('/__e2e/recoil/catalog',{headers:{'x-gridshard-e2e':'recoil-local-only'}}),
    ]);
    if(!card.ok())throw Error('Candidate fixture unavailable');
    await route.fulfill({response:original,body:(await original.text())+
      '\nglobalThis.GRIDSHARD_CANON_MODULES=Object.freeze([...globalThis.GRIDSHARD_CANON_MODULES,'+JSON.stringify(await card.json())+']);\n'});
  });
});

async function scenario(page,kind){
  return page.evaluate(async kind=>{
    const response=await fetch(`/__e2e/recoil/${GridshardAuth.session.playerId}/scenario`,{method:'POST',headers:{'x-gridshard-e2e':'recoil-local-only','Content-Type':'application/json'},body:JSON.stringify({kind})});
    if(!response.ok)throw Error('Scenario '+response.status);return response.json();
  },kind);
}
async function start(page){
  await page.goto('/?e2e=1');await waitForParticipantReady(page,60000);
  await page.evaluate(async()=>{
    const r=await fetch(`/__e2e/recoil/${GridshardAuth.session.playerId}/prepare`,{method:'POST',headers:{'x-gridshard-e2e':'recoil-local-only'}});
    if(!r.ok)throw Error('Prepare '+r.status);
  });
  await page.reload();await waitForParticipantReady(page,60000);
  await page.evaluate(()=>{
    window.recoilAudit={sounds:[],wear:[],projectiles:[]};
    const play=GridshardAudioDirector.prototype.triggerCue;
    GridshardAudioDirector.prototype.triggerCue=function(name,...args){
      const result=play.call(this,name,...args);
      if(['module_recoil_cannon','recoil_cannon_hit'].includes(name)){
        const row={name,played:result.played,playback:null};recoilAudit.sounds.push(row);
        result.playback?.then(ok=>row.playback=ok);
      }return result;
    };
    new MutationObserver(records=>{
      for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1){
        if(node.matches('.battle-floating-feedback.recoil'))recoilAudit.wear.push(node.textContent);
        if(node.matches('.module-vfx-projectile-track[data-weapon="recoil_cannon"]'))recoilAudit.projectiles.push({x:node.style.left,y:node.style.top});
      }
    }).observe(document.body,{childList:true,subtree:true});
  });
  await page.locator('#home-battle-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:40000});
  await expect(page.locator('#module-shelf')).toHaveAttribute('data-placement-ready','true',{timeout:30000});
  await expect.poll(()=>page.evaluate(()=>__GRIDSHARD_TEST_API.getBattleState().elapsed_ms)).toBeGreaterThan(0);
  await expect(page.locator('#battle-start-countdown')).toBeHidden();
  await scenario(page,'normal');
  await expect.poll(()=>page.evaluate(()=>__GRIDSHARD_TEST_API.deployModule('recoil_cannon')),{timeout:14000}).toBe(true);
  await expect(page.locator('#board [data-device="recoil_cannon"]')).toBeVisible({timeout:14000});
}

test('real battle uses painted heading, own wear, projectile and decoded shot/hit audio',async({page},info)=>{
  test.setTimeout(120000);
  await page.setViewportSize({width:393,height:852});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await start(page);
  const rig=page.locator('#board [data-device="recoil_cannon"]');
  await expect(rig).toHaveAttribute('data-heading',/^(e|ne|n|nw|w|sw|s|se)$/);
  await expect(rig.locator('.module-layer-head')).toHaveAttribute('src',/module-candidates-v1\/recoil_cannon-\w+\.webp$/);
  await expect(rig.locator('.module-recoil-pedestal')).toHaveCount(1);
  await expect.poll(()=>page.evaluate(()=>recoilAudit.wear.length),{timeout:16000}).toBeGreaterThan(0);
  await expect.poll(()=>page.evaluate(()=>recoilAudit.projectiles.length),{timeout:16000}).toBeGreaterThan(0);
  await expect.poll(()=>page.evaluate(()=>recoilAudit.sounds.some(s=>s.name==='module_recoil_cannon'&&s.playback===true)),{timeout:16000}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>recoilAudit.sounds.some(s=>s.name==='recoil_cannon_hit'&&s.playback===true)),{timeout:16000}).toBe(true);
  expect(await page.evaluate(()=>recoilAudit.wear.every(t=>/−16 CAN/.test(t)))).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({path:`qa_reports/card01-real-battle-${info.project.name}.png`,fullPage:true});
});

test('EMP silences real shots and own wear; reduced motion keeps the pedestal still',async({page})=>{
  test.setTimeout(120000);
  await page.setViewportSize({width:320,height:852});
  await page.emulateMedia({reducedMotion:'reduce'});
  await start(page);
  await scenario(page,'emp');
  const rig=page.locator('#board [data-device="recoil_cannon"]');
  await expect(rig).toHaveAttribute('data-disabled','true',{timeout:6000});
  const before=await page.evaluate(()=>({wear:recoilAudit.wear.length,shots:recoilAudit.sounds.filter(s=>s.name==='module_recoil_cannon').length}));
  await page.waitForTimeout(1200);
  const after=await page.evaluate(()=>({wear:recoilAudit.wear.length,shots:recoilAudit.sounds.filter(s=>s.name==='module_recoil_cannon').length}));
  expect(after).toEqual(before);
  expect(await rig.locator('.module-recoil-pedestal').evaluate(n=>getComputedStyle(n).translate)).toBe('none');
  expect(await rig.locator('.module-layer-head').evaluate(n=>getComputedStyle(n).animationName)).toBe('none');
});

test('phase preserves own wear in English without playing a damaging impact',async({page})=>{
  test.setTimeout(120000);
  await page.setViewportSize({width:393,height:852});
  await start(page);
  await page.evaluate(()=>GridshardI18n.apply('en'));
  await scenario(page,'phase');
  await page.waitForTimeout(800); // Drain the previous real normal-shot arrival.
  await page.evaluate(()=>{recoilAudit.wear=[];recoilAudit.sounds=[];});
  await expect.poll(()=>page.evaluate(()=>recoilAudit.wear.length),{timeout:10000}).toBeGreaterThan(0);
  await expect.poll(()=>page.evaluate(()=>recoilAudit.sounds.some(s=>s.name==='module_recoil_cannon')),{timeout:6000}).toBe(true);
  await page.waitForTimeout(500);
  expect(await page.evaluate(()=>recoilAudit.wear.every(t=>/−16 HP/.test(t)))).toBe(true);
  expect(await page.evaluate(()=>recoilAudit.sounds.filter(s=>s.name==='recoil_cannon_hit'))).toEqual([]);
});
