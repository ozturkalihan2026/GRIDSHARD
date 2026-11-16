const {test,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('./ui-helpers');
const sets={dockyard:['dockyard_latch_frame','dockyard_deck_background'],workshop:['workshop_shelf_frame','workshop_bay_background']};
const dialog='#shop-offer-dialog',action='#shop-offer-body [data-shop-action]';
test.beforeEach(async({page})=>{
  test.skip(process.env.GRIDSHARD_E2E_SHOP_PILOT!=='1','Isolated earned-credit pilot only');
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
});
async function prepare(page,state='ready',theme='dockyard'){
  await page.goto('/?e2e=1');await waitForParticipantReady(page,60000);
  const seeded=await page.evaluate(async({state,theme})=>{
    const owner=GridshardAuth.session.playerId;
    const r=await fetch(`/__e2e/shop/${owner}/prepare`,{method:'POST',headers:{'x-gridshard-e2e':'shop-local-only','Content-Type':'application/json'},body:JSON.stringify({state})});
    if(!r.ok)throw Error('Pilot fixture '+r.status);
    const v=await fetch(`/__e2e/shop-cosmetics/${owner}/prepare`,{method:'POST',headers:{'x-gridshard-e2e':'shop-art-local-only','Content-Type':'application/json'},body:JSON.stringify({theme})});
    if(!v.ok)throw Error('Visit fixture '+v.status);return {owner,...await v.json()};
  },{state,theme});
  await page.reload();await waitForParticipantReady(page,60000);return seeded;
}
async function shop(page){await page.locator('#app-bottom-dock [data-shell-screen="shop"]').click();await page.locator('#shop-tab-cosmetics').click();await expect(page.locator('#shop-cosmetic-list article')).toHaveCount(2);}
async function inspect(page,theme='dockyard'){await page.locator(`[data-shop-offer="cosmetic.${theme}"] button`).click();await expect(page.locator(dialog)).toHaveAttribute('data-state','detail');}
async function review(page){await expect(page.locator(action)).toBeEnabled();await page.locator(action).click();await expect(page.locator(dialog)).toHaveAttribute('data-state','review');await expect(page.locator(action)).toBeEnabled();}
async function navigate(page,screen){await page.evaluate(screen=>document.querySelector(`button[data-open-screen="${screen}"]`).click(),screen);await expect(page.locator('body')).toHaveAttribute('data-app-screen',screen);}
for(const width of [320,393])for(const language of ['tr','en'])test(`earned-credit set purchase and full profile bar ${language} ${width}px`,async({page},info)=>{
  test.setTimeout(120000);await page.setViewportSize({width,height:852});const theme=width===320?'dockyard':'workshop';
  const errors=[],payments=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\/purchases\/|\/ads\/|play\.google|admob/i.test(r.url()))payments.push(r.url());});
  const seed=await prepare(page,'ready',theme);await page.evaluate(l=>GridshardI18n.apply(l),language);await shop(page);await inspect(page,theme);await review(page);
  await expect(page.locator('#shop-offer-body')).toContainText(language==='en'?'No real money or ads':'Gerçek para veya reklam yok');
  const charged=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes(`/cosmetic.${theme}/purchase`));
  await page.locator(action).evaluate(b=>{b.click();b.click();});const payload=await(await charged).json();
  await expect(page.locator(dialog)).toHaveAttribute('data-state','delivered');expect(payload.meta_progression.circuit_credits).toBe(3500);
  expect(payload.shop_purchase_receipt.charged).toEqual({currency:'circuit_credits',amount:1500});
  await page.keyboard.press('Escape');await inspect(page,theme);await expect(page.locator(action)).toBeDisabled();await page.keyboard.press('Escape');
  const [frame,background]=sets[theme];await navigate(page,'avatar');await page.locator('[data-cosmetic-tab="frame"]').click();await page.locator(`[data-frame-id="${frame}"]`).click();await expect(page.locator(`[data-frame-id="${frame}"]`)).toHaveAttribute('data-state','selected');
  await page.locator('[data-cosmetic-tab="background"]').click();await page.locator(`[data-background-id="${background}"]`).click();await expect(page.locator(`[data-background-id="${background}"]`)).toHaveAttribute('data-state','selected');
  await navigate(page,'profile');await expect(page.locator('.profile-hero')).toHaveAttribute('data-profile-background',background);
  expect(await page.locator('.profile-hero').evaluate(n=>getComputedStyle(n).backgroundImage)).toContain(theme==='dockyard'?'dockyard_deck.svg':'workshop_bay.svg');
  await page.locator('.profile-hero').screenshot({path:info.outputPath('own-bar.png')});
  await navigate(page,'friends');await page.locator('#friend-search-input').fill(seed.visitor_name);await page.locator('#friend-search-form').evaluate(f=>f.requestSubmit());await page.locator('#friend-search-results .public-player-link').filter({hasText:seed.visitor_name}).click();
  const bar=page.locator('#public-profile-identity');await expect(bar).toHaveAttribute('data-profile-background',background);
  const bounds=await bar.evaluate(n=>{const a=n.getBoundingClientRect(),b=n.querySelector('#public-profile-trophies').getBoundingClientRect();return {inside:b.right<=a.right-3&&b.left>=a.left,width:a.width};});expect(bounds.inside).toBe(true);
  // Test the actual SVG renderer at bar dimensions: both edges must stay opaque.
  const alpha=await bar.evaluate(async(n,theme)=>{const image=new Image();image.src=`/assets/ui/cosmetics-shop-v1/${theme==='dockyard'?'dockyard_deck':'workshop_bay'}.svg`;await image.decode();const c=document.createElement('canvas');c.width=Math.round(n.clientWidth);c.height=Math.round(n.clientHeight);const ctx=c.getContext('2d');ctx.drawImage(image,0,0,c.width,c.height);return [ctx.getImageData(0,Math.floor(c.height/2),1,1).data[3],ctx.getImageData(c.width-1,Math.floor(c.height/2),1,1).data[3]];},theme);expect(alpha).toEqual([255,255]);
  await page.locator('#public-profile-dialog').screenshot({path:info.outputPath('visited-bar.png')});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect(payments).toEqual([]);expect(errors).toEqual([]);
});
test('pilot blocks arena, partial ownership and empty credits without sending a purchase',async({page})=>{
  test.setTimeout(120000);await prepare(page,'partial');await shop(page);let posts=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/purchase'))posts++;});
  await inspect(page);await expect(page.locator(action)).toBeDisabled();await expect(page.locator('#shop-offer-body')).toContainText('zaten sahipsin');await page.keyboard.press('Escape');
  await page.evaluate(async()=>fetch(`/__e2e/shop/${GridshardAuth.session.playerId}/prepare`,{method:'POST',headers:{'x-gridshard-e2e':'shop-local-only','Content-Type':'application/json'},body:JSON.stringify({state:'funds'})}));
  await navigate(page,'menu');await shop(page);await inspect(page,'workshop');await expect(page.locator(action)).toBeDisabled();await expect(page.locator('#shop-offer-body')).toContainText('yetersiz');await page.keyboard.press('Escape');
  await page.evaluate(async()=>fetch(`/__e2e/shop/${GridshardAuth.session.playerId}/prepare`,{method:'POST',headers:{'x-gridshard-e2e':'shop-local-only','Content-Type':'application/json'},body:JSON.stringify({state:'locked'})}));
  await navigate(page,'menu');await shop(page);await page.locator('[data-shop-offer="cosmetic.workshop"] button').click();await expect(page.locator(dialog)).toHaveAttribute('data-state','error');expect(posts).toBe(0);
});
test('a lost cosmetic response recovers its original receipt after reload and listing closure',async({page})=>{
  test.setTimeout(120000);await prepare(page);await shop(page);await inspect(page);await review(page);
  const ids=[];let saved;
  await page.route('**/cosmetic.dockyard/purchase',async route=>{ids.push(route.request().postDataJSON());const r=await route.fetch();expect(r.status()).toBe(200);saved=(await r.json()).shop_purchase_receipt;await route.abort('failed');});
  await page.locator(action).click();await expect(page.locator(dialog)).toHaveAttribute('data-state','uncertain');await page.reload();await waitForParticipantReady(page,60000);await page.unroute('**/cosmetic.dockyard/purchase');
  await page.route('**/shop-offers',route=>route.fulfill({json:{protocol:'shop-offers-v1',availability:'closed',offers:[]}}));
  await page.locator('#app-bottom-dock [data-shell-screen="shop"]').click();await page.locator('#shop-pending-purchase button').click();
  const response=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/cosmetic.dockyard/purchase'));await page.locator('#shop-offer-body > button').first().click();const replay=await(await response).json();
  await expect(page.locator(dialog)).toHaveAttribute('data-state','delivered');expect(replay.shop_purchase_receipt).toEqual(saved);expect(replay.meta_progression.circuit_credits).toBe(3500);
  expect((await response).request().postDataJSON()).toEqual(ids[0]);expect(ids.every(x=>JSON.stringify(x)===JSON.stringify(ids[0]))).toBe(true);
});
