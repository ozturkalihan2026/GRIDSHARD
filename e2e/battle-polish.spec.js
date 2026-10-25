const {test,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('./ui-helpers');
test.beforeEach(async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
  await page.goto('/?e2e=1',{waitUntil:'domcontentloaded'});await waitForParticipantReady(page);
});

test('resource plus is a crisp upright gold shape and keeps its shop navigation',async({page},info)=>{
  const plus=page.locator('#app-resource-bar .app-resource-plus');await expect(plus).toHaveCount(2);
  for(const node of await plus.all()){
    await expect(node.locator('svg')).toBeVisible();
    await expect(node.locator('svg')).toHaveCSS('width','20px');
    await expect(node.locator('svg')).toHaveCSS('height','23px');
    await expect(node).toHaveCSS('text-shadow','none');await expect(node).toHaveCSS('filter','none');
    await expect(node.locator('svg')).toHaveCSS('transform','none');
    await expect(node.locator('.resource-plus-face')).toHaveCSS('fill','rgb(255, 204, 69)');
    expect(await node.textContent()).toBe('');
  }
  await page.screenshot({path:info.outputPath('resource-plus.png')});
  await plus.first().locator('..').click();await expect(page.locator('body')).toHaveAttribute('data-app-screen','shop');
});

test('matchmaking opens the battlefield without the stray energy-transfer sound',async({page})=>{
  test.setTimeout(90_000);
  await page.evaluate(()=>{
    window.entrySoundAudit=[];
    const original=GridshardAudioDirector.prototype.triggerCue;
    GridshardAudioDirector.prototype.triggerCue=function(name,...args){
      window.entrySoundAudit.push(name);
      return original.call(this,name,...args);
    };
  });
  await page.locator('#home-battle-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:40_000});
  await expect(page.locator('#board [data-module-id="core-1"]')).toBeVisible();
  expect(await page.evaluate(()=>window.entrySoundAudit.filter(name=>name==='energy_transfer'))).toEqual([]);
});

test('dead core becomes an opaque wreck without live crystal light and rebirth restores the living sprite',async({page})=>{
  test.setTimeout(90_000);
  await page.locator('#home-battle-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:40_000});
  await expect(page.locator('#battle-start-countdown')).toBeHidden({timeout:6000});
  const card=page.locator('#board [data-module-id="core-1"]');await expect(card).toBeVisible();
  const living=await card.locator('.module-layer-art').getAttribute('src');
  await page.evaluate(async src=>{const img=new Image();img.src=src.replace('cores-physical-v1','cores-wrecked-v1');await img.decode();},living);
  // Read one coherent view update, before the next authoritative LIVE server
  // snapshot restores this visual-only preview to its real, healthy state.
  const preview=(hp,quality='yuksek')=>page.evaluate(({hp,quality})=>{
    const updated=window.__GRIDSHARD_TEST_API.previewCoreState({hp});
    // Auto quality may fall to low on shared CI/mobile runners. Assert each
    // CSS quality contract explicitly in the same coherent preview snapshot.
    document.body.dataset.graphics=quality;
    const card=document.querySelector('#board [data-module-id="core-1"]'),img=card.querySelector('.module-layer-art');
    return {updated,wreck:card.dataset.coreWreck||null,opacity:getComputedStyle(card).opacity,filter:getComputedStyle(card).filter,
      src:img.getAttribute('src'),pulse:card.querySelectorAll('.module-core-pulse').length,
      animation:getComputedStyle(img).animationName,imageOpacity:getComputedStyle(img).opacity};
  },{hp,quality});
  const dead=await preview(0);
  expect(dead.updated).toBe(true);expect(dead.wreck).toBe('true');expect(dead.opacity).toBe('1');expect(dead.filter).toBe('none');
  expect(dead.src).toContain('cores-wrecked-v1');expect(dead.pulse).toBe(0);expect(dead.animation).toBe('gs-core-wreck-reveal');
  await expect(page.locator('#battle-ended-banner')).toHaveCount(0);
  const revived=await preview(300);
  expect(revived.wreck).toBe(null);expect(revived.src).toBe(living);expect(revived.pulse).toBe(1);
  const low=await preview(0,'dusuk');
  expect(low.wreck).toBe('true');expect(low.animation).toBe('none');expect(low.imageOpacity).toBe('1');
  await preview(300);
  await page.emulateMedia({reducedMotion:'reduce'});
  const reduced=await preview(0);expect(reduced.animation).toBe('none');expect(reduced.imageOpacity).toBe('1');
  await preview(300);
});
