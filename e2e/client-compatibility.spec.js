const {test,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('./ui-helpers');

test('future runtime version preserves startup through the explicit API contract',async({page})=>{
 await page.route('**/health',async route=>{
  const response=await route.fetch(),body=await response.json();
  await route.fulfill({response,json:{...body,runtime_release_version:'2.4.0'}});
 });
 await page.goto('/?e2e=1');await waitForParticipantReady(page,60000);
 await expect(page.locator('#startup-loading')).toBeHidden();
 await expect(page.locator('#participant-bootstrap-status')).toHaveAttribute('data-status','ready');
});

test('minimum version gives a localized safe update explanation and keeps account storage',async({page},info)=>{
 await page.addInitScript(()=>{
  localStorage.setItem('compat-preserved','existing-account-marker');
  localStorage.setItem('project-relay.web-test.participant-id','wt-compat-remembered-player');
 });
 await page.route('**/health',async route=>{
  const response=await route.fetch(),body=await response.json();
  body.client_compatibility.minimum_client_version='2.4.0';
  await route.fulfill({response,json:body});
 });
 await page.goto('/?e2e=1');
 const message=page.locator('#boot-error-message');
 await expect(message).toContainText('Google Play');await expect(message).toContainText('İlerlemen korunur');
 await expect(page.locator('#startup-loading')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('compat-preserved'))).toBe('existing-account-marker');
 expect(await page.evaluate(()=>localStorage.getItem('project-relay.web-test.participant-id'))).toBe('wt-compat-remembered-player');
 await page.screenshot({path:info.outputPath('update-required-tr.png')});
 await page.evaluate(()=>{document.documentElement.lang='en';globalThis.GridshardI18n.apply('en');});
 await page.locator('#boot-retry').click();
 await expect(message).toContainText('Your progress is preserved');
 await page.screenshot({path:info.outputPath('update-required-en.png')});
});
