const {test,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('./ui-helpers');

test('all navigation backs share the arrow-only 44px gold control and retain destinations',async({page},info)=>{
 await page.goto('/?e2e=1');await waitForParticipantReady(page,60000);
 const buttons=page.locator('button.navigation-back');
 await expect(buttons).toHaveCount(11);
 for(const button of await buttons.all()) {
  await expect(button).toHaveText('');
  await expect(button.locator('svg path')).toHaveAttribute('d','m12 5-7 7 7 7M5 12h15');
  await expect(button).toHaveAttribute('aria-label',/.+/);
 }
 const appearances=await buttons.evaluateAll(nodes=>nodes.map(node=>{
  const s=getComputedStyle(node);return {width:s.width,height:s.height,background:s.backgroundImage,border:s.borderColor,radius:s.borderRadius};
 }));
 expect(new Set(appearances.map(a=>JSON.stringify(a))).size).toBe(1);
 expect(appearances[0].width).toBe('44px');expect(appearances[0].height).toBe('44px');
 await page.locator('[data-shell-screen="events"]').click();
 for(const screen of ['weekly-event','team-event']) {
  await page.locator(`#events-screen [data-open-screen="${screen}"]`).click();
  await expect(page.locator(`#${screen}-screen`)).toBeVisible();
  await page.locator(`#${screen}-screen .navigation-back`).click();
  await expect(page.locator('#events-screen')).toBeVisible();
 }
 await page.locator('[data-shell-screen="menu"]').click();
 await page.locator('#lobby-menu-button').click();
 await page.locator('#lobby-menu [data-open-screen="daily"]').click();
 for(const screen of ['daily-rewards','daily-missions','rewards']) {
  await page.locator(`#rewards-hub-screen [data-open-screen="${screen}"]`).click();
  const back=page.locator(`[data-screen-panel="${screen}"] .navigation-back`);
  await expect(back).toBeVisible();
  await back.click();
  await expect(page.locator('#rewards-hub-screen')).toBeVisible();
 }
 await page.evaluate(()=>window.GridshardI18n.apply('en'));
 for(const button of await buttons.all())await expect(button).toHaveText('');
 await page.screenshot({path:info.outputPath('shared-arrow-back.png')});
});
