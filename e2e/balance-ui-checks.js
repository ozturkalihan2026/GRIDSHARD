const {expect}=require('@playwright/test');
const {waitForParticipantReady}=require('./ui-helpers');
const fs=require('node:fs');
const path=require('node:path');

async function balancePanels(page,{baseURL='',widths=[320,393],screenshotDir}={}) {
  const canon=JSON.parse(fs.readFileSync(path.join(__dirname,'../server/data/arena_progression_v1.json'),'utf8')).modules;
  const ready=page.waitForResponse(r=>/\/meta-progression$/.test(new URL(r.url()).pathname)&&r.ok());
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
  await page.goto(`${baseURL}/?e2e=1`,{waitUntil:'domcontentloaded'});
  await waitForParticipantReady(page);
  const payload=await(await ready).json();
  expect(payload.module_collection).toHaveLength(36);
  for(const item of payload.module_collection){
    const source=canon.find(row=>row.id===item.definition_id);
    expect(item.current_cost).toBe(source.current_cost);
    if(item.stats.level===1){
      expect(item.stats.max_hp).toBe(source.max_hp);
      expect(item.stats.base_damage).toBe(source.base_damage);
    }
  }
  const ids=['quantum_cannon','prism_shield','virus','jammer','singularity_projector','precision_matrix'];
  for(const width of widths||[null]){
    if(width)await page.setViewportSize({width,height:width===320?568:852});
    await page.locator('[data-shell-screen="modules"]').click();
    await page.locator('[data-card-page="modules"]').click();
    for(const id of ids){
      const item=payload.module_collection.find(row=>row.definition_id===id);
      await page.locator(`#module-collection-grid [data-module-definition-id="${id}"]`).click();
      await page.locator('#module-quick-info').click();
      await page.locator('[data-module-detail-tab="stats"]').click();
      const dialog=page.locator('#module-detail-dialog');
      await expect(dialog).toBeVisible();
      await expect(dialog.locator('[data-stat="current"] dd')).toHaveText(String(item.current_cost));
      for(const special of item.stats.specials){
        await expect(dialog.locator(`[data-stat="special-${special.key}"]`)).toBeVisible();
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      expect(await dialog.locator('.module-stat-tiles > div').evaluateAll(rows=>rows.every(row=>row.scrollWidth<=row.clientWidth+1))).toBe(true);
      if(screenshotDir){
        fs.mkdirSync(screenshotDir,{recursive:true});
        await page.screenshot({path:path.join(screenshotDir,`balance-${id}-${width||'physical'}.png`)});
      }
      await page.keyboard.press('Escape');
    }
  }
  return payload.module_collection.map(item=>({id:item.definition_id,cost:item.current_cost,level:item.stats.level,hp:item.stats.max_hp,damage:item.stats.base_damage,specials:item.stats.specials}));
}

module.exports={balancePanels};
