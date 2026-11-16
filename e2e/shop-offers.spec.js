const {test,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('./ui-helpers');
const dialog='#shop-offer-dialog',action='#shop-offer-body [data-shop-action]';
test.beforeEach(async({page})=>{
  test.skip(process.env.GRIDSHARD_E2E_SHOP_OFFERS!=='1','Isolated future shop fixture only');
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
});
async function prepare(page,state='ready'){
  await page.goto('/?e2e=1');await waitForParticipantReady(page,60000);
  const seeded=await page.evaluate(async state=>{
    const owner=GridshardAuth.session.playerId;
    const r=await fetch(`/__e2e/shop/${owner}/prepare`,{method:'POST',headers:{'x-gridshard-e2e':'shop-local-only','Content-Type':'application/json'},body:JSON.stringify({state})});
    if(!r.ok)throw Error('Fixture '+r.status);return {owner,...await r.json()};
  },state);
  await page.reload();await waitForParticipantReady(page,60000);return seeded;
}
async function shop(page){await page.locator('#app-bottom-dock [data-shell-screen="shop"]').click();await expect(page.locator('#shop-tabs')).toBeVisible();}
async function inspect(page){await page.locator('#shop-offer-list button').click();await expect(page.locator(dialog)).toHaveAttribute('data-state','detail');}
async function review(page){await expect(page.locator(action)).toBeEnabled();await page.locator(action).click();await expect(page.locator(dialog)).toHaveAttribute('data-state','review');await expect(page.locator(action)).toBeEnabled();}
for(const width of [320,393])for(const language of ['tr','en'])test(`shop real purchase ${language} ${width}px`,async({page},info)=>{
  test.setTimeout(120000);await page.setViewportSize({width,height:width===320?568:852});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await prepare(page);await page.evaluate(l=>GridshardI18n.apply(l),language);await shop(page);
  await expect(page.locator('#shop-offer-list article')).toHaveCount(1);await expect(page.locator('#chest-store-list .chest-store-card')).toHaveCount(4);
  expect(await page.locator('#shop-tabs button').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return r.width>=44&&r.height>=44&&getComputedStyle(n,'::after').content==='none';}))).toBe(true);
  if(width===320&&language==='tr'){await page.locator('#shop-tab-featured').focus();await page.keyboard.press('End');await expect(page.locator('#shop-tab-cosmetics')).toBeFocused();await page.keyboard.press('Home');await expect(page.locator('#shop-tab-featured')).toBeFocused();}
  await page.locator('#shop-tab-chests').click();await expect(page.locator('#shop-panel-chests #chest-store-list')).toBeVisible();
  await expect(page.locator('#chest-store-list .gift-chest-action')).toHaveCount(1);
  await page.locator('#chest-odds-open').click();await expect(page.locator('#chest-odds-dialog')).toBeVisible();await page.locator('#chest-odds-close').click();
  await page.locator('#shop-tab-cosmetics').click();await page.locator('#shop-collections-preview').click();await expect(page.locator('#cosmetic-collection-dialog')).toBeVisible();await page.keyboard.press('Escape');
  await page.locator('#shop-tab-modules').click();await page.locator('#shop-panel-modules').screenshot({path:info.outputPath('shop-modules.png')});
  let posts=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().includes('/shop-offers/'))posts++;});
  await inspect(page);await expect(page.locator('.shop-module-art').last()).toHaveJSProperty('complete',true);
  await review(page);expect(posts).toBe(0);await page.keyboard.press('Escape');await expect(page.locator(dialog)).toHaveAttribute('data-state','detail');
  await page.keyboard.press('Escape');await expect(page.locator(dialog)).toBeHidden();await expect(page.locator('#shop-offer-list button')).toBeFocused();
  await inspect(page);await review(page);await page.locator(dialog).screenshot({path:info.outputPath('shop-review.png')});
  const response=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/purchase'));
  await page.locator(action).evaluate(b=>{b.click();b.click();});const payload=await(await response).json();
  await expect(page.locator(dialog)).toHaveAttribute('data-state','delivered');
  expect(payload.meta_progression.circuit_credits).toBe(1500);expect(payload.shop_purchase_receipt.charged.amount).toBe(500);expect(posts).toBe(1);
  await page.locator(dialog).screenshot({path:info.outputPath('shop-delivered.png')});await page.keyboard.press('Escape');
  await expect(page.locator('#shop-offer-list')).toContainText(language==='en'?'1 / 2':'1 / 2');
  await expect(page.locator('#shop-offer-list button')).toBeFocused();
  await inspect(page);await review(page);await page.locator(action).click();await expect(page.locator(dialog)).toHaveAttribute('data-state','delivered');await page.keyboard.press('Escape');
  await inspect(page);await expect(page.locator(action)).toBeDisabled();expect(posts).toBe(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
});
test('lost committed response survives reload and recovers same receipt after listing closes',async({page},info)=>{
  test.setTimeout(120000);await page.setViewportSize({width:320,height:568});const {owner}=await prepare(page);await shop(page);await inspect(page);await review(page);
  const bindings=[];let receipt;
  await page.route('**/shop-offers/*/purchase',async route=>{bindings.push(route.request().postDataJSON());const r=await route.fetch();expect(r.status()).toBe(200);receipt=(await r.json()).shop_purchase_receipt;await route.abort('failed');});
  await page.locator(action).click();await expect(page.locator(dialog)).toHaveAttribute('data-state','uncertain');
  await page.reload();await waitForParticipantReady(page,60000);await page.unroute('**/shop-offers/*/purchase');
  await page.route('**/shop-offers',route=>route.fulfill({json:{protocol:'shop-offers-v1',availability:'closed',offers:[]}}));
  await shop(page);await expect(page.locator('#shop-offer-list article')).toHaveCount(0);await page.locator('#shop-pending-purchase button').click();
  await page.route('**/shop-offers/*/purchase',route=>route.fulfill({status:403,json:{detail:'Session unavailable'}}));
  await page.locator('#shop-offer-body > button').first().click();await expect(page.locator(dialog)).toHaveAttribute('data-state','uncertain');
  expect(await page.evaluate(owner=>Boolean(localStorage.getItem('gridshard.shop.pending.v1:'+encodeURIComponent(owner))),owner)).toBe(true);
  await page.unroute('**/shop-offers/*/purchase');
  const recovered=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/purchase'));
  await page.locator('#shop-offer-body > button').first().click();const payload=await(await recovered).json();
  await expect(page.locator(dialog)).toHaveAttribute('data-state','delivered');expect(payload.shop_purchase_receipt).toEqual(receipt);expect(payload.meta_progression.circuit_credits).toBe(1500);expect((await recovered).request().postDataJSON()).toEqual(bindings[0]);
  expect(bindings.length).toBeGreaterThanOrEqual(1);expect(bindings.every(x=>JSON.stringify(x)===JSON.stringify(bindings[0]))).toBe(true);
  expect(await page.evaluate(owner=>localStorage.getItem('gridshard.shop.pending.v1:'+encodeURIComponent(owner)),owner)).toBeNull();
  await page.locator(dialog).screenshot({path:info.outputPath('shop-recovered.png')});
});
test('insufficient funds cannot confirm; unavailable price never renders a zero-price purchase',async({page})=>{
  test.setTimeout(120000);await prepare(page,'funds');await shop(page);await inspect(page);await expect(page.locator(action)).toBeDisabled();await expect(page.locator('#shop-offer-body')).toContainText('yetersiz');await page.keyboard.press('Escape');
  await page.route('**/shop-offers/*?revision=*',async route=>{const r=await route.fetch();const data=await r.json();delete data.offer.price;await route.fulfill({json:data});});
  await page.locator('#shop-offer-list button').click();await expect(page.locator(dialog)).toHaveAttribute('data-state','error');await expect(page.locator(action)).toHaveCount(0);
});
test('expired detail, offline listing and corrupt receipt retain safe actionable states',async({page},info)=>{
  test.setTimeout(120000);await prepare(page);await shop(page);
  await page.route('**/shop-offers/*?revision=*',route=>route.fulfill({status:409,json:{code:'offer_expired',detail:'expired'}}));
  await page.locator('#shop-offer-list button').click();await expect(page.locator(dialog)).toHaveAttribute('data-state','error');await expect(page.locator('#shop-offer-body')).toContainText('süresi doldu');await page.keyboard.press('Escape');await page.unroute('**/shop-offers/*?revision=*');
  await inspect(page);await review(page);await page.route('**/shop-offers/*/purchase',async route=>{const r=await route.fetch();const data=await r.json();data.shop_purchase_receipt.charged.amount=1;await route.fulfill({json:data});});
  await page.locator(action).click();await expect(page.locator(dialog)).toHaveAttribute('data-state','uncertain');
  await page.locator(dialog).screenshot({path:info.outputPath('shop-uncertain.png')});await page.keyboard.press('Escape');
  await expect(page.locator('#shop-pending-purchase')).toBeVisible();await expect(page.locator('#shop-offer-list button')).toBeDisabled();
});
test('locked offer, already-owned response and offline retry cannot create an unreviewed purchase',async({page},info)=>{
  test.setTimeout(120000);await prepare(page,'locked');await shop(page);await page.locator('#shop-offer-list button').click();await expect(page.locator(dialog)).toHaveAttribute('data-state','error');await expect(page.locator('#shop-offer-body')).toContainText('arena');await expect(page.locator(action)).toHaveCount(0);await page.keyboard.press('Escape');
  // Update only this disposable actor, then request a fresh server quote.
  await page.evaluate(async()=>fetch(`/__e2e/shop/${GridshardAuth.session.playerId}/prepare`,{method:'POST',headers:{'x-gridshard-e2e':'shop-local-only','Content-Type':'application/json'},body:'{}'}));
  await page.locator('#app-bottom-dock [data-shell-screen="menu"]').click();await shop(page);await inspect(page);await review(page);
  let posts=0;await page.route('**/shop-offers/*/purchase',route=>{posts++;return route.fulfill({status:409,json:{code:'already_owned',detail:'owned'}});});
  await page.locator(action).click();await expect(page.locator(dialog)).toHaveAttribute('data-state','error');await expect(page.locator('#shop-offer-body')).toContainText('zaten sahipsin');await page.keyboard.press('Escape');expect(posts).toBe(1);
  await page.locator('#app-bottom-dock [data-shell-screen="menu"]').click();await page.context().setOffline(true);await shop(page);
  await expect(page.locator('#shop-offers-state')).toContainText('Bağlantı yok');await expect(page.locator('#shop-offer-list article')).toHaveCount(0);
  await page.context().setOffline(false);await page.locator('#shop-offers-state button').click();await expect(page.locator('#shop-offer-list article')).toHaveCount(1);
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#shop-tab-modules').click();await inspect(page);await review(page);
  expect(await page.locator(dialog).evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);await page.locator(dialog).screenshot({path:info.outputPath('shop-reduced-motion.png')});
});
test('cancelled slow detail and corrupt local recovery records cannot restore purchasability',async({page})=>{
  test.setTimeout(120000);const {owner}=await prepare(page);await shop(page);
  let release,arrivals=0;
  await page.route('**/shop-offers/*?revision=*',async route=>{
    const r=await route.fetch(),data=await r.json();
    if(++arrivals===1)await new Promise(resolve=>{release=resolve;});else delete data.offer.price;
    await route.fulfill({json:data});
  });
  await page.locator('#shop-offer-list button').click();await expect(page.locator(dialog)).toHaveAttribute('data-state','loading');await expect.poll(()=>Boolean(release)).toBe(true);
  await page.keyboard.press('Escape');await page.locator('#shop-offer-list button').click();await expect(page.locator(dialog)).toHaveAttribute('data-state','error');
  const stale=page.waitForResponse(r=>r.url().includes('/shop-offers/')&&r.request().method()==='GET');release();await(await stale).finished();
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  await expect(page.locator(dialog)).toHaveAttribute('data-state','error');await expect(page.locator(action)).toHaveCount(0);await page.keyboard.press('Escape');
  await page.evaluate(owner=>localStorage.setItem('gridshard.shop.pending.v1:'+encodeURIComponent(owner),'{'),owner);
  await page.reload();await waitForParticipantReady(page,60000);await shop(page);await expect(page.locator('#shop-pending-purchase')).toBeVisible();await expect(page.locator('#shop-offer-list button')).toBeDisabled();
  expect(await page.evaluate(owner=>localStorage.getItem('gridshard.shop.pending.v1:'+encodeURIComponent(owner)),owner)).toBe('{');
});
