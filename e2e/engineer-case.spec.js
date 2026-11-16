const {test,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('./ui-helpers');

test.beforeEach(async({page})=>{
  test.skip(process.env.GRIDSHARD_E2E_FREE_ECONOMY!=='1','Owned isolated future-release fixture only');
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
});
async function prepare(page) {
  await page.goto('/?e2e=1');await waitForParticipantReady(page,60000);
  const data=await page.evaluate(async()=>{
    const response=await fetch(`/__e2e/free-economy/${GridshardAuth.session.playerId}/engineer`,{method:'POST',headers:{'x-gridshard-e2e':'free-economy-local-only'}});
    if(!response.ok)throw new Error('Fixture failed '+response.status);return response.json();
  });
  await page.reload();await waitForParticipantReady(page,60000);return data;
}
async function rewards(page) {
  await page.locator('#lobby-menu-button').click();await page.locator('#lobby-menu [data-open-screen="daily"]').click();
  await expect(page.locator('#engineer-case-hub .engineer-pending')).toHaveCount(2);
}
async function select(page,option='attack',keyboard=false) {
  const card=page.locator('#engineer-case-body button[data-option="'+option+'"]');
  if(keyboard){await card.focus();await page.keyboard.press('Enter');}else await card.click();
  await expect(card).toHaveAttribute('aria-pressed','true');
  await page.locator('#engineer-case-body > .engineer-primary').click();
  await expect(page.locator('#engineer-final-confirm')).toBeVisible();
}
for(const width of [320,393])for(const language of ['tr','en'])test(`engineer real choice ${language} ${width}px`,async({page},info)=>{
  test.setTimeout(120000);await page.setViewportSize({width,height:width===320?568:852});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const seeded=await prepare(page);await page.evaluate(l=>GridshardI18n.apply(l),language);await rewards(page);
  await page.locator('#engineer-case-hub').screenshot({path:info.outputPath('engineer-hub.png')});
  await page.locator('#engineer-case-hub .engineer-pending').first().click();
  await expect(page.locator('#engineer-case-card')).toHaveAttribute('data-state','choices');
  await expect(page.locator('#engineer-case-body .engineer-option')).toHaveCount(3);
  await expect(page.locator('#engineer-case-body > .engineer-primary')).toBeDisabled();
  await expect.poll(()=>page.locator('.engineer-case-image').evaluateAll(nodes=>nodes.every(n=>n.complete&&n.naturalWidth===512))).toBe(true);
  const identity=await page.locator('#engineer-case-dialog').getAttribute('data-entitlement');
  const expected=seeded.choices.pending.find(x=>x.entitlement_id===identity).options.find(x=>x.option_id==='attack');
  await page.locator('#engineer-case-dialog').screenshot({path:info.outputPath('engineer-choices.png')});
  await select(page,'attack',width===320&&language==='tr');
  if(width===393&&language==='en')await page.evaluate(()=>{
    const input=document.getElementById('settings-sound-muted');input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));
    window.__engineerCue=[];const original=GridshardAudioDirector.prototype.triggerCue;
    GridshardAudioDirector.prototype.triggerCue=function(name,options){const value=original.call(this,name,options);if(name==='energy_transfer')window.__engineerCue.push({played:value.played,suppression:value.suppression});return value;};
  });
  await expect(page.locator('#engineer-case-body .engineer-piece-count')).toHaveText(`+${expected.module_shards} ${language==='en'?'module pieces':'modül parçası'}`);
  await expect(page.locator('#engineer-final-confirm')).toHaveAttribute('data-tone','primary');
  let claims=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/claim')&&r.url().includes('/reward-choices/'))claims++;});
  const response=page.waitForResponse(r=>r.request().method()==='POST'&&r.url().includes(`/reward-choices/${identity}/claim`));
  await page.locator('#engineer-final-confirm').click();
  const payload=await(await response).json();
  expect(payload.reward_choice_receipt.rewards).toEqual({module_definition_id:expected.module_definition_id,module_shards:expected.module_shards});
  await expect(page.locator('#engineer-case-card')).toHaveAttribute('data-state','revealed');
  if(width===393&&language==='en')expect(await page.evaluate(()=>window.__engineerCue)).toEqual([{played:false,suppression:'preferences_or_inactive'}]);
  await expect(page.locator('#engineer-case-body .engineer-piece-count')).toContainText(`+${expected.module_shards}`);
  if(width===393&&language==='tr'){
    await page.locator('#engineer-case-body .engineer-skip').click();
    await expect(page.locator('.engineer-case-image.is-open')).toHaveCSS('animation-name','none');
  }
  await expect(page.locator('#engineer-case-body .engineer-delivered')).toHaveCSS('opacity','1');
  await page.locator('#engineer-case-dialog').screenshot({path:info.outputPath('engineer-delivered.png')});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.locator('#engineer-case-close').click();
  await expect(page.locator('#engineer-case-hub .engineer-pending')).toHaveCount(1);
  await page.reload();await waitForParticipantReady(page,60000);await page.locator('#reward-inbox-button').click();await page.locator('#inbox-tab-reward').click();
  await expect(page.locator('#engineer-case-inbox')).toBeVisible();
  await page.locator('#engineer-case-inbox button').click();
  await expect(page.locator('#engineer-case-body .engineer-option')).toHaveCount(3);
  await page.locator('#engineer-case-close').click();expect(claims).toBe(1);expect(errors).toEqual([]);
});

test('engineer keeps unselected right, recovers lost response and reopens real receipt with reduced motion',async({page},info)=>{
  test.setTimeout(120000);await page.setViewportSize({width:320,height:568});const seeded=await prepare(page);await rewards(page);
  const current=seeded.choices.week.entitlement_id;
  await page.locator(`.engineer-pending[data-entitlement="${current}"]`).click();await expect(page.locator('#engineer-case-body .engineer-option')).toHaveCount(3);
  await page.keyboard.press('Escape');await expect(page.locator('#engineer-case-dialog')).toBeHidden();
  await page.locator(`.engineer-pending[data-entitlement="${current}"]`).click();await select(page,'defense');
  let claims=0;const bindings=[];
  await page.route(new RegExp(`/reward-choices/${current}/claim$`),async route=>{
    claims++;const data=JSON.parse(route.request().postData());bindings.push(data);expect(Object.keys(data).sort()).toEqual(['option_id','request_id']);
    const response=await route.fetch();expect(response.status()).toBe(200);await route.abort('failed');
  });
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#engineer-final-confirm').click();
  await expect(page.locator('#engineer-case-card')).toHaveAttribute('data-state','revealed');
  await expect(page.locator('.engineer-case-image.is-open')).toHaveCSS('animation-name','none');
  await expect(page.locator('.engineer-lock-sparks')).toBeHidden();
  await page.locator('#engineer-case-dialog').screenshot({path:info.outputPath('engineer-recovered-reduced.png')});
  await page.locator('#engineer-case-close').click();await page.locator('.engineer-receipt-link').click();
  await expect(page.locator('#engineer-case-card')).toHaveAttribute('data-state','revealed');expect(claims).toBeGreaterThanOrEqual(1);expect(bindings.every(x=>JSON.stringify(x)===JSON.stringify(bindings[0]))).toBe(true);
  const completedClaims=claims;
  await page.reload();await waitForParticipantReady(page,60000);await rewardsWithOne(page);
  await page.locator('.engineer-receipt-link').click();await expect(page.locator('#engineer-case-card')).toHaveAttribute('data-state','revealed');expect(claims).toBe(completedClaims);
});
async function rewardsWithOne(page){await page.locator('#lobby-menu-button').click();await page.locator('#lobby-menu [data-open-screen="daily"]').click();await expect(page.locator('#engineer-case-hub .engineer-pending')).toHaveCount(1);}

test('engineer offline retry keeps same request and choice across reload, double tap grants once',async({page},info)=>{
  test.setTimeout(120000);await page.setViewportSize({width:393,height:852});const seeded=await prepare(page);await rewards(page);
  const current=seeded.choices.week.entitlement_id;await page.locator(`.engineer-pending[data-entitlement="${current}"]`).click();await select(page,'tactical');
  const requests=[];let refuse=true;
  await page.route(new RegExp(`/reward-choices/${current}/claim$`),async route=>{
    requests.push(JSON.parse(route.request().postData()));if(refuse)return route.abort('failed');
    await new Promise(r=>setTimeout(r,350));return route.continue();
  });
  await page.locator('#engineer-final-confirm').click();await expect(page.locator('#engineer-case-body .engineer-error')).toBeVisible();
  await page.locator('#engineer-case-dialog').screenshot({path:info.outputPath('engineer-retry.png')});
  await page.reload();await waitForParticipantReady(page,60000);await rewards(page);
  await page.locator(`.engineer-pending[data-entitlement="${current}"]`).click();await expect(page.locator('#engineer-case-card')).toHaveAttribute('data-state','confirm');
  refuse=false;await page.evaluate(()=>document.body.dataset.graphics='dusuk');
  await page.locator('#engineer-final-confirm').evaluate(b=>{b.click();b.click();});
  await expect(page.locator('#engineer-case-card')).toHaveAttribute('data-state','revealed');
  await expect(page.locator('.engineer-case-image.is-open')).toHaveCSS('animation-name','none');
  // The shared transport retries a dropped idempotent request automatically.
  // All wire attempts must bind to the same choice; only the final one arrives.
  expect(requests.length).toBeGreaterThanOrEqual(2);expect(requests.every(x=>JSON.stringify(x)===JSON.stringify(requests[0]))).toBe(true);
  await page.locator('#engineer-case-close').click();await page.locator('.engineer-pending').click();await select(page,'attack');
  await page.locator('#engineer-final-confirm').click();await expect(page.locator('#engineer-case-card')).toHaveAttribute('data-state','revealed');
  await page.locator('#engineer-case-close').click();await expect(page.locator('.engineer-pending')).toHaveCount(0);
  await expect(page.locator('#engineer-case-hub')).toContainText('Bu haftanın kasası kazanıldı. Yeni ilerleme Pazartesi başlar.');
  await page.locator('.engineer-receipt-link').click();await expect(page.locator('#engineer-case-card')).toHaveAttribute('data-state','revealed');
});

test('engineer empty progress, failed list and paged older rights remain reachable',async({page},info)=>{
  test.setTimeout(120000);await page.setViewportSize({width:320,height:568});
  await page.goto('/?e2e=1');await waitForParticipantReady(page,60000);
  await page.locator('#lobby-menu-button').click();await page.locator('#lobby-menu [data-open-screen="daily"]').click();
  await expect(page.locator('.engineer-progress')).toHaveAttribute('value','0');await expect(page.locator('.engineer-pending')).toHaveCount(0);
  await page.locator('#engineer-case-hub').screenshot({path:info.outputPath('engineer-progress-locked.png')});
  await page.evaluate(async()=>{await fetch(`/__e2e/free-economy/${GridshardAuth.session.playerId}/engineer`,{method:'POST',headers:{'x-gridshard-e2e':'free-economy-local-only'}});});
  let fail=true;
  await page.route(/\/reward-choices\?limit=20(?:&after=[0-9a-f]+)?$/,async route=>{
    if(fail)return route.abort('failed');
    const response=await route.fetch(),data=await response.json();
    if(!route.request().url().includes('&after=')){
      data.pending=data.pending.slice(0,1);data.next_cursor=data.pending[0]?.entitlement_id||null;
    }
    return route.fulfill({response,json:data});
  });
  await page.reload();await waitForParticipantReady(page,60000);await page.locator('#lobby-menu-button').click();await page.locator('#lobby-menu [data-open-screen="daily"]').click();
  await expect(page.locator('#engineer-case-hub .engineer-error')).toBeVisible();fail=false;
  await page.locator('#engineer-case-hub .engineer-secondary').first().click();
  await expect(page.locator('.engineer-pending')).toHaveCount(1);
  await page.locator('#engineer-case-hub .engineer-secondary').first().click();await expect(page.locator('.engineer-pending')).toHaveCount(2);
  await page.locator('.engineer-pending').last().click();await expect(page.locator('#engineer-case-body .engineer-option')).toHaveCount(3);
  await page.locator('#engineer-case-close').click();await expect(page.locator('.engineer-pending')).toHaveCount(2);
});
