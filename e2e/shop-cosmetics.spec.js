const {test,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('./ui-helpers');
const pairs={dockyard:['dockyard_latch_frame','dockyard_deck_background'],workshop:['workshop_shelf_frame','workshop_bay_background']};
test.beforeEach(async({page})=>{
  test.skip(process.env.GRIDSHARD_E2E_SHOP_COSMETICS!=='1','Isolated owned shop art fixture only');
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
});
async function prepare(page,owned=false,theme='dockyard'){
  await page.goto('/?e2e=1');await waitForParticipantReady(page,60000);
  const seeded=await page.evaluate(async state=>{
    const r=await fetch(`/__e2e/shop-cosmetics/${GridshardAuth.session.playerId}/prepare`,{method:'POST',headers:{'x-gridshard-e2e':'shop-art-local-only','Content-Type':'application/json'},body:JSON.stringify(state)});
    if(!r.ok)throw Error('Fixture '+r.status);return r.json();
  },{owned,theme});
  await page.reload();await waitForParticipantReady(page,60000);return seeded;
}
async function navigate(page,screen){await page.evaluate(screen=>document.querySelector(`button[data-open-screen="${screen}"]`).click(),screen);await expect(page.locator('body')).toHaveAttribute('data-app-screen',screen);}
async function appearance(page,frame,background,host='#profile-summary-panel .profile-hero',avatar='#profile-hero-avatar'){
  await expect(page.locator(avatar)).toHaveAttribute('data-frame',frame);
  await expect(page.locator(host)).toHaveAttribute('data-profile-background',background);
  expect(await page.locator(avatar).evaluate(n=>getComputedStyle(n,'::after').backgroundImage)).toContain(frame.split('_frame')[0]+'.svg');
  expect(await page.locator(host).evaluate(n=>getComputedStyle(n).backgroundImage)).toContain(background.split('_background')[0]+'.svg');
}
for(const width of [320,393])for(const language of ['tr','en'])test(`shop cosmetic locked preview ${language} ${width}px`,async({page},info)=>{
  test.setTimeout(120000);await page.setViewportSize({width,height:width===320?568:852});
  const errors=[],mutations=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(['POST','PUT'].includes(r.method())&&/\/cosmetics$/.test(r.url()))mutations.push(r.url());});
  await prepare(page);await page.evaluate(l=>GridshardI18n.apply(l),language);await navigate(page,'avatar');
  if(width===320&&language==='tr'){
    const apertures=await page.evaluate(async()=>{
      const result=[];
      for(const name of ['dockyard_latch','workshop_shelf']){
        const image=new Image();image.src=`/assets/ui/cosmetics-shop-v1/${name}.svg`;await image.decode();
        const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,128,128);
        result.push(ctx.getImageData(64,64,1,1).data[3]);
      }
      return result;
    });expect(apertures).toEqual([0,0]);
  }
  await page.locator('[data-cosmetic-tab="frame"]').click();
  for(const [frame] of Object.values(pairs)){const b=page.locator(`[data-frame-id="${frame}"]`);await expect(b).toBeDisabled();await expect(b).toHaveAttribute('data-state','locked');await b.scrollIntoViewIfNeeded();}
  await page.locator('[data-cosmetic-tab="background"]').click();
  for(const [,background] of Object.values(pairs))await expect(page.locator(`[data-background-id="${background}"]`)).toBeDisabled();
  await page.locator('#avatar-customization-screen [data-open-cosmetic-collection]').click();
  for(const [theme,[frame,background]] of Object.entries(pairs)){
    await page.locator(`[data-collection-theme="${theme}"]`).click();await expect(page.locator('#cosmetic-collection-items li')).toHaveCount(2);
    await expect(page.locator('#cosmetic-collection-team')).toBeHidden();
    await appearance(page,frame,background,'#cosmetic-collection-player','#cosmetic-collection-player .profile-avatar');
    expect(await page.locator('#cosmetic-collection-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
    await page.locator('#cosmetic-collection-dialog').screenshot({path:info.outputPath(`preview-${theme}.png`)});
  }
  await page.locator('[data-collection-theme="aurora"]').click();await expect(page.locator('#cosmetic-collection-team')).toBeVisible();await expect(page.locator('#cosmetic-collection-items li')).toHaveCount(5);
  await page.keyboard.press('Escape');await expect(page.locator('#profile-hero-avatar')).toHaveAttribute('data-frame','none');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(mutations).toEqual([]);expect(errors).toEqual([]);
});
for(const theme of Object.keys(pairs))test(`shop cosmetic owned selection and real public visit ${theme}`,async({page},info)=>{
  test.setTimeout(120000);const [frame,background]=pairs[theme];const seeded=await prepare(page,true,theme);await navigate(page,'avatar');
  await page.locator('[data-cosmetic-tab="frame"]').click();const f=page.locator(`[data-frame-id="${frame}"]`);await expect(f).toHaveAttribute('data-state','available');await f.click();await expect(f).toHaveAttribute('data-state','selected');
  await page.locator('[data-cosmetic-tab="background"]').click();const b=page.locator(`[data-background-id="${background}"]`);await expect(b).toBeEnabled();await b.click();await expect(b).toHaveAttribute('data-state','selected');
  await navigate(page,'profile');await appearance(page,frame,background);await page.locator('#profile-summary-panel .profile-hero').screenshot({path:info.outputPath(`own-${theme}.png`)});
  for(const width of [320,393])for(const language of ['tr','en']){
    await page.setViewportSize({width,height:852});await page.evaluate(l=>GridshardI18n.apply(l),language);
    await appearance(page,frame,background);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.locator('#profile-summary-panel .profile-identity-card').screenshot({path:info.outputPath(`own-${theme}-${language}-${width}.png`)});
  }
  await page.reload();await waitForParticipantReady(page,60000);await navigate(page,'profile');await appearance(page,frame,background);
  await navigate(page,'friends');await page.locator('#friend-search-input').fill(seeded.visitor_name);await page.locator('#friend-search-form').evaluate(form=>form.requestSubmit());
  await page.locator('#friend-search-results .public-player-link').filter({hasText:seeded.visitor_name}).click();
  await expect(page.locator('#public-profile-dialog')).toBeVisible();await appearance(page,frame,background,'#public-profile-identity','#public-profile-avatar');
  await page.locator('#public-profile-dialog').screenshot({path:info.outputPath(`visited-${theme}.png`)});
  for(const width of [320,393])for(const language of ['tr','en']){
    await page.setViewportSize({width,height:852});await page.evaluate(l=>GridshardI18n.apply(l),language);
    await appearance(page,frame,background,'#public-profile-identity','#public-profile-avatar');
    expect(await page.locator('#public-profile-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBe(true);
    await page.locator('#public-profile-dialog').screenshot({path:info.outputPath(`visited-${theme}-${language}-${width}.png`)});
  }
});
