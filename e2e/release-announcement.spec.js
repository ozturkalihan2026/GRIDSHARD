const {test,expect}=require('@playwright/test');
const {completeFirstLaunch}=require('./ui-helpers');

async function start(page) {
  await page.goto('/?e2e=1');
  await page.waitForFunction(()=>document.querySelector('#participant-bootstrap-status')?.dataset.status==='ready');
  await completeFirstLaunch(page,{ackAnnouncements:false});
}

for (const width of [320,393]) test(`announcement at ${width}px acknowledges once and remains in system mail`,async({page},info)=>{
  await page.setViewportSize({width,height:width===320 ? 568 : 852});
  await start(page);
  const dialog=page.locator('#release-announcement-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('13 Kasım 2026 saat 22.00');
  await expect(dialog).toContainText('30 Kasım');
  const button=page.locator('#release-announcement-confirm');
  const bounds=await button.boundingBox();
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  expect(bounds.y+bounds.height).toBeLessThanOrEqual(page.viewportSize().height);
  await page.screenshot({path:info.outputPath('announcement-tr.png')});
  await page.evaluate(()=>{document.documentElement.lang='en';});
  await expect(dialog).toContainText('November 13, 2026 at 22:00');
  await expect(button).toHaveText('OK');
  await page.screenshot({path:info.outputPath('announcement-en.png')});
  const acknowledged=page.waitForResponse(r=>r.url().includes('/release-announcements/') && r.status()===200);
  await button.click();await acknowledged;
  await expect(dialog).toBeHidden();
  // Erase only the popup's device cache: server acknowledgement must suffice.
  await page.evaluate(()=>{for(const k of Object.keys(localStorage))if(k.startsWith('project-relay.release-announcement.v1:'))localStorage.removeItem(k);});
  await start(page);
  await expect(dialog).toHaveAttribute('data-delivery','idle');
  await expect(dialog).toBeHidden();
  await page.locator('#reward-inbox-button').click();
  await page.locator('#inbox-tab-system').click();
  await expect(page.locator('#reward-inbox-notices')).toContainText('2.4.0 bakım tarihi öne alındı');
});

test('offline confirmation closes the popup, survives reload and retries later',async({page})=>{
  await page.route('**/release-announcements/*/acknowledge',r=>r.abort('failed'));
  await start(page);
  await expect(page.locator('#release-announcement-dialog')).toBeVisible();
  await page.locator('#release-announcement-confirm').click();
  await expect(page.locator('#release-announcement-dialog')).toBeHidden();
  await start(page);
  await expect(page.locator('#release-announcement-dialog')).toHaveAttribute('data-delivery','idle');
  await page.unroute('**/release-announcements/*/acknowledge');
  // A fresh launch resets the request throttle while retaining the durable outbox.
  const saved=page.waitForResponse(r=>r.url().includes('/release-announcements/') && r.status()===200);
  await start(page);await saved;
  expect(await page.evaluate(()=>Object.keys(localStorage).filter(k=>k.startsWith('project-relay.release-announcement.v1:'))
    .every(k=>JSON.parse(localStorage.getItem(k)).pending.length===0))).toBe(true);
});

test('post-upgrade tournament popup explains the schedule and prizes in TR/EN at both mobile sizes',async({page},info)=>{
 test.setTimeout(120000);
 const catalog=require('../server/data/release_announcements_v1.json');
 const tournament=catalog.announcements.find(i=>i.notice_id==='preview-2-4-0-tournament-launch');
 // Presentation fixture only. Real publication/version gates and the distinct
 // account acknowledgement are exercised by test_release_announcements.py.
 let latest={},acknowledged=false;
 await page.route(/\/profile\/[^/]+\/reward-inbox(?:\?.*)?$/,async route=>{
  const response=await route.fetch();latest=await response.json();
  await route.fulfill({response,json:{...latest,announcement:acknowledged?null:{...tournament,phase:'season-preview'}}});
 });
 await page.route('**/release-announcements/preview-2-4-0-tournament-launch/acknowledge',async route=>{
  acknowledged=true;await route.fulfill({json:{...latest,announcement:null}});
 });
 await start(page);
 const dialog=page.locator('#release-announcement-dialog');await expect(dialog).toBeVisible();
 for(const width of [320,393])for(const language of ['tr','en']){
  await page.setViewportSize({width,height:width===320?568:852});
  await page.evaluate(l=>document.documentElement.lang=l,language);
  await expect(dialog).toContainText(language==='tr'?'30 Kasım 2026':'November 30, 2026');
  await expect(page.locator('#release-announcement-label')).toHaveText(language==='tr'?'SEZON VE TURNUVALAR':'SEASON AND TOURNAMENTS');
  await expect(dialog).toContainText('36/24/18');
  const confirm=await page.locator('#release-announcement-confirm').boundingBox();
  expect(confirm.y+confirm.height).toBeLessThanOrEqual(page.viewportSize().height);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:info.outputPath(`tournaments-${language}-${width}.png`)});
 }
 await page.locator('#release-announcement-confirm').click();await expect(dialog).toBeHidden();
 expect(acknowledged).toBe(true);
});
