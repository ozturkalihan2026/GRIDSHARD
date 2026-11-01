const {test,expect} = require('@playwright/test');
const {waitForParticipantReady} = require('./ui-helpers');
const costs = {
  common:[[1000,0],[2000,0],[4000,0],[8000,1000]],
  rare:[[2000,0],[4000,0],[10000,1000],[20000,2000]],
  epic:[[10000,0],[20000,1000],[30000,2000],[40000,3000]],
  legendary:[[10000,1000],[20000,2000],[30000,3000],[40000,4000]],
};
test('authoritative dual-currency talents fit small phones without charging on preview', async ({page},info) => {
  test.setTimeout(150000);
  const mutations=[];
  page.on('request', request => {if(request.method()==='POST' && /\/(talents|skills)\//.test(request.url())) mutations.push(request.url());});
  await page.addInitScript(() => localStorage.setItem('gridshard.tutorial.v1','complete'));
  const payloadReady=page.waitForResponse(response => /\/meta-progression$/.test(new URL(response.url()).pathname) && response.ok());
  await page.goto('/?e2e=1',{waitUntil:'domcontentloaded'});
  await waitForParticipantReady(page);
  const payload=await (await payloadReady).json();
  for(const item of payload.module_collection) expect(item.talents.map(n=>[n.circuit_credits_cost,n.flux_cost])).toEqual(costs[item.rarity]);
  const coreCosts={common:[[2000,0],[5000,0],[10000,1000]],rare:[[4000,0],[10000,0],[20000,2000]],epic:[[10000,0],[20000,2000],[30000,3000]],legendary:[[20000,2000],[30000,3000],[40000,4000]]};
  for(const core of payload.cores.types) expect(core.skills.map(n=>[n.circuit_credits_cost,n.flux_cost])).toEqual(coreCosts[core.rarity].flatMap(c=>[c,c]));
  async function checkPrices(dialog,expected){
    const levels=page.locator(`${dialog} .module-talent-level`);
    await expect(levels).toHaveCount(expected.length);
    expect(await levels.evaluateAll(nodes=>nodes.map(node=>[...node.querySelectorAll('.cost-chip')].map(chip=>[chip.dataset.kind,chip.querySelector('b').textContent]))))
      .toEqual(expected.map(([dk,flux])=>[['credit',dk.toLocaleString('tr-TR')],...(flux?[['flux',flux.toLocaleString('tr-TR')]]:[])]));
    expect(await levels.evaluateAll(nodes=>nodes.every(node=>[...node.querySelectorAll('.cost-chip')].every(chip=>{
      const a=node.getBoundingClientRect(),b=chip.getBoundingClientRect();
      return b.left>=a.left-1 && b.right<=a.right+1 && chip.scrollWidth<=chip.clientWidth+1;
    })))).toBe(true);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  }
  for(const width of [320,393]){
    await page.setViewportSize({width,height:width===320?568:852});
    await page.locator('[data-shell-screen="modules"]').click();
    await page.locator('[data-card-page="modules"]').click();
    for(const rarity of ['common','rare','epic','legendary']){
      const item=payload.module_collection.find(item=>item.rarity===rarity);
      await page.locator(`#module-collection-grid [data-module-definition-id="${item.definition_id}"]`).click();
      await page.locator('#module-quick-info').click();
      await page.locator('[data-module-detail-tab="talents"]').click();
      await checkPrices('#module-detail-dialog',costs[rarity]);
      await expect(page.locator('#module-detail-dialog .module-talent-choices button')).toHaveCount(8);
      await page.locator('#module-detail-dialog .module-talent-choices button').first().click();
      const expected=payload.module_collection.find(m=>m.definition_id===item.definition_id).talents[0].choices[0].description_tr;
      await expect(page.locator('#module-detail-tab-content .module-detail-tab-intro')).toHaveText(expected);
      await page.screenshot({path:info.outputPath(`talent-${rarity}-${width}.png`)});
      await page.keyboard.press('Escape');
    }
    await page.locator('[data-card-page="cores"]').click();
    await page.locator('.core-collection-tile[data-core-type="core_quantum"]').click();
    await page.locator('#core-quick-info').click();
    await page.locator('[data-core-detail-tab="skills"]').click();
    await checkPrices('#core-detail-dialog',coreCosts.legendary);
    await expect(page.locator('#core-detail-dialog .module-talent-choices button')).toHaveCount(6);
    await page.locator('#core-detail-dialog .module-talent-choices button').first().click();
    await expect(page.locator('#core-detail-tab-content .module-detail-tab-intro')).toHaveText(payload.cores.types.find(c=>c.id==='core_quantum').skills[0].description_tr);
    await page.screenshot({path:info.outputPath(`core-talents-${width}.png`)});
    await page.keyboard.press('Escape');
  }
  expect(mutations).toEqual([]);
});

test('selected talent branches and the unchanged reset price fit a small phone',async({page},info)=>{
  // UI fixture only: real spending and save/load are verified in server tests.
  const mutations=[];
  page.on('request',r=>{if(r.method()==='POST'&&/\/talents\//.test(r.url()))mutations.push(r.url());});
  await page.route('**/profile/*/meta-progression',async route=>{
    if(route.request().method()!=='GET')return route.continue();
    const response=await route.fetch(),body=await response.json();
    const laser=body.module_collection.find(m=>m.definition_id==='laser');
    laser.level=14;laser.selected_talent_count=4;laser.talent_reset_cost_flux=100;
    laser.talents.forEach((n,i)=>n.selected=i%2?'resilience':'power');
    body.flux_shards=100;
    await route.fulfill({response,json:body});
  });
  await page.setViewportSize({width:320,height:568});
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
  await page.goto('/?e2e=1');await waitForParticipantReady(page);
  await page.locator('[data-shell-screen="modules"]').click();
  await page.locator('#module-collection-grid [data-module-definition-id="laser"]').click();
  await page.locator('#module-quick-info').click();
  await page.locator('[data-module-detail-tab="talents"]').click();
  await expect(page.locator('.module-talent-choices .is-selected')).toHaveCount(4);
  await expect(page.locator('.module-talent-reset .cost-chip[data-kind="flux"] b')).toHaveText('100');
  await expect(page.locator('.module-talent-reset')).toBeEnabled();
  await page.locator('.module-talent-choices button').first().click();
  expect(mutations).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  await page.screenshot({path:info.outputPath('talents-selected-320.png')});
});
