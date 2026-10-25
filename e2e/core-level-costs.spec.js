const {test,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('./ui-helpers');
test.use({actionTimeout:10000});

test('all core rarity level costs fit small phones and use the right resource icons',async({page},info)=>{
  test.setTimeout(150000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const mutations=[];page.on('request',r=>{if(r.method()==='POST'&&/\/cores\/[^/]+\/upgrade$/.test(r.url()))mutations.push(r.url());});
  const expected={common:[40000,1200,0],rare:[55000,800,0],epic:[70000,200,0],legendary:[80000,90,10000]};
  let cores;
  await page.route(/\/profile\/[^/?]+\/meta-progression$/,async route=>{
    const response=await route.fetch(),json=await response.json();
    // Rendering-only level-14 fixture, same last-step prices as the server
    // contract. Real accounts and server progression remain untouched.
    json.circuit_credits=100000;json.flux_shards=10000;
    for(const core of json.cores.types){
      const [credits,pieces,flux]=expected[core.rarity];
      Object.assign(core,{unlocked:true,level:14,shards:pieces,legacy_shards:0,
        next_upgrade_cost:{circuit_credits:credits,shards:pieces,flux_shards:flux}});
    }
    cores=json.cores.types;
    await route.fulfill({response,json});
  });
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
  await page.goto('/?e2e=1',{waitUntil:'domcontentloaded'});
  await waitForParticipantReady(page);
  for(const width of [320,393]){
    await page.setViewportSize({width,height:width===320?568:852});
    await page.locator('[data-shell-screen="modules"]').click();
    await page.locator('[data-card-page="cores"]').click();
    for(const rarity of Object.keys(expected)){
      const core=cores.find(c=>c.rarity===rarity),[credits,,flux]=expected[rarity];
      await page.locator(`#core-collection-list button[data-core-type="${core.id}"]`).click();
      // This test measures the detail dialog, not quick-menu hit geometry.
      await page.locator('#core-quick-info').evaluate(button=>button.click());
      const upgrade=page.locator('#core-detail-upgrade');
      await expect(upgrade).toBeEnabled();
      expect(await upgrade.locator('.cost-chip').evaluateAll(nodes=>nodes.map(n=>[n.dataset.kind,n.querySelector('b').textContent])))
        .toEqual([['credit',credits.toLocaleString('tr-TR')],...(flux?[['flux',flux.toLocaleString('tr-TR')]]:[])]);
      expect(await upgrade.evaluate(button=>{
        const b=button.getBoundingClientRect();
        return [...button.children].every(n=>{const a=n.getBoundingClientRect();return a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;})
          &&button.scrollWidth<=button.clientWidth+1;
      })).toBe(true);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      if(rarity==='legendary')await page.screenshot({path:info.outputPath(`core-level-legendary-${width}.png`)});
      await page.locator('#core-detail-dialog .detail-card-close').click();
      await page.locator('[data-card-page="cores"]').click();
    }
  }
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});
