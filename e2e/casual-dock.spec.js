const {test,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('./ui-helpers');

test('casual dock stays readable, navigable and aligned; Home becomes Battle',async({page},testInfo)=>{
  test.setTimeout(120000);
  const errors=[];
  page.on('pageerror',error=>errors.push(String(error)));
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
  await page.goto('/?e2e=1',{waitUntil:'domcontentloaded'});
  await waitForParticipantReady(page);
  const dock=page.locator('#app-bottom-dock');
  const mapping={shop:'shop-chamfer-v2',modules:'cards',menu:'battle-swords-v2',team:'team',events:'events'};
  await expect(dock.locator('img')).toHaveCount(5);
  await expect.poll(()=>dock.locator('img').evaluateAll(list=>list.every(img=>img.complete && img.naturalWidth===256))).toBe(true);
  for(const [screen,name]of Object.entries(mapping)){
    await expect(dock.locator(`[data-shell-screen="${screen}"] img`)).toHaveAttribute('src',`./assets/ui/dock-casual-v1/${name}.webp`);
  }
  for(const width of [320,393,768]){
    await page.setViewportSize({width,height:852});
    for(const screen of ['menu','shop','modules','team','events']){
      const button=dock.locator(`[data-shell-screen="${screen}"]`);
      await button.click();
      await expect(page.locator('body')).toHaveAttribute('data-app-screen',screen);
      await expect(button).toHaveClass(/is-active/);
      await expect(button.locator('img')).toHaveCSS('width','40px');
      await expect(button.locator('.menu-action-title')).toBeVisible();
      const layout=await dock.locator('button').evaluateAll(buttons=>buttons.map(button=>{
        const box=button.getBoundingClientRect(),art=button.querySelector('img').getBoundingClientRect();
        return {left:box.left,right:box.right,top:box.top,bottom:box.bottom,
          artInside:art.left>=box.left && art.right<=box.right && art.top>=box.top && art.bottom<=box.bottom,
          hitSize:box.width>=44 && box.height>=44};
      }));
      expect(layout.every((button,index)=>button.artInside && button.hitSize && (!index || button.left>=layout[index-1].right-1))).toBe(true);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      // The selected button intentionally lifts above the nav box. Include
      // that existing overflow in the QA crop rather than clipping its artwork.
      const bounds=await dock.boundingBox();
      await page.screenshot({clip:{x:bounds.x,y:Math.max(0,bounds.y-12),width:bounds.width,height:bounds.height+12},path:testInfo.outputPath(`dock-${width}-${screen}.png`)});
    }
  }
  await page.setViewportSize({width:393,height:852});
  await dock.locator('[data-shell-screen="menu"]').click();
  await expect(dock.locator('[data-shell-screen="menu"]')).toHaveAttribute('aria-label','Savaş');
  await expect(dock.locator('[data-shell-screen="menu"] .menu-action-title')).toHaveText('SAVAŞ');
  await page.screenshot({path:testInfo.outputPath('battle-393.png')});
  // Translation uses the same production bridge, without changing saved settings.
  await page.evaluate(()=>GridshardI18n.apply('en'));
  await expect(dock.locator('[data-shell-screen="menu"]')).toHaveAttribute('aria-label','Battle');
  await expect(dock.locator('[data-shell-screen="menu"] .menu-action-title')).toHaveText('BATTLE');
  expect(errors).toEqual([]);
});
