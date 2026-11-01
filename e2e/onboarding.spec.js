const {test,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('./ui-helpers');

test('first battle teaches the paired Current rule without blocking card choices or combat',async({page})=>{
 test.setTimeout(90000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?e2e=1&onboarding=1',{waitUntil:'domcontentloaded'});
 await waitForParticipantReady(page,60000);
 const guide=page.locator('.guide-overlay');
 await expect(guide).toBeHidden();
 await page.locator('#home-battle-button').click();
 await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:40000});
 await expect(guide).toBeVisible();
 await expect(guide).toHaveAttribute('data-blocking','false');
 await expect(page.locator('#module-shelf')).toHaveAttribute('data-placement-ready','true',{timeout:20000});
 await expect.poll(()=>page.evaluate(()=>window.__GRIDSHARD_TEST_API.getBattleState().elapsed_ms),{timeout:20000}).toBeGreaterThan(0);
 // The cue points at Laser, but the actual server accepts Shield first.
 await page.locator('#module-shelf [data-module-id="shield-1"]').click();
 await expect(page.locator('#board [data-device="shield"]')).toBeVisible();
 await expect(guide).toHaveAttribute('data-step','battle:current_pressure',{timeout:20000});
 await expect(guide).toContainText('100');await expect(guide).toContainText('50');
 await expect(guide).toContainText('3');
 await expect(guide).toBeHidden({timeout:20000});
 await expect(page.locator('#core-power-button')).toBeEnabled({timeout:25000});
 await page.locator('#core-power-button').click();
 await expect(page.locator('#core-power-button')).toBeDisabled({timeout:5000});
 expect(errors).toEqual([]);
});
