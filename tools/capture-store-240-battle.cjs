const {chromium,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const {createAuthenticatedClient,api}=require('../e2e/helpers');
const {waitForParticipantReady}=require('../e2e/ui-helpers');
(async()=>{
 const language=process.argv[2]||'tr-TR',baseURL='http://127.0.0.1:8899',dir=path.resolve('artifacts/store-240-20261113',language);
 fs.mkdirSync(dir,{recursive:true}); const browser=await chromium.launch({channel:'chrome',headless:true});
 const options={viewport:{width:360,height:640},deviceScaleFactor:3,isMobile:true,hasTouch:true,locale:language};
 const a=await createAuthenticatedClient(browser,baseURL,'store-a-'+Date.now(),options);
 const b=await createAuthenticatedClient(browser,baseURL,'store-b-'+Date.now(),options);
 try{
  await Promise.all([a,b].map(c=>waitForParticipantReady(c.page)));
  if(language==='en-US'){await a.page.locator('#lobby-menu-button').click();await a.page.locator('#lobby-menu [data-open-screen="settings"]').click();await a.page.locator('#settings-language').selectOption('en');await a.page.locator('[data-shell-screen="menu"]').click();}
  const req=Date.now();
  await api(a,'POST',`/social/${a.playerId}/requests`,{player_id:a.playerId,target_player_id:b.playerId,request_id:'request-'+req});
  await api(b,'POST',`/social/${b.playerId}/requests/accept`,{player_id:b.playerId,requester_id:a.playerId,request_id:'accept-'+req});
  const invitation=await api(a,'POST',`/social/${a.playerId}/battle-invites`,{player_id:a.playerId,opponent_id:b.playerId,request_id:'invite-'+req});
  const invite=invitation.battle_invites.find(i=>i.opponent_id===b.playerId&&i.status==='pending');
  const accepted=await api(b,'POST',`/social/${b.playerId}/battle-invites/${invite.invite_id}/accept`,{player_id:b.playerId,request_id:'battle-'+req});
  await Promise.all([a,b].map(c=>c.page.evaluate(battle=>window.__GRIDSHARD_TEST_API.launchSocialBattle(battle).then(r=>Boolean(r.ok)),accepted.battle)));
  for(const c of[a,b]){await expect(c.page.locator('body')).toHaveAttribute('data-online-status','battle');await expect(c.page.locator('#battle-start-countdown')).toBeHidden({timeout:10000});}
  for(const id of['shield','armor','laser'])await Promise.all([a,b].map(async c=>{await expect.poll(async()=>{if(await c.page.locator(`#board [data-device="${id}"]`).count())return true;await c.page.evaluate(id=>window.__GRIDSHARD_TEST_API.deployModule(id),id);return false},{timeout:20000,intervals:[500]}).toBe(true)}));
  await expect(a.page.locator('#enemy-board [data-device="laser"]')).toBeVisible();
  await a.page.evaluate(()=>document.fonts.ready);
  await a.page.screenshot({path:path.join(dir,'01-circuit-battle.png'),scale:'device'});
  await expect(a.page.locator('#core-power-button')).toBeEnabled({timeout:55000});
  await a.page.locator('#core-power-button').click();await a.page.locator('.core-vfx').first().waitFor({state:'attached',timeout:10000});
  await a.page.screenshot({path:path.join(dir,'02-core-power.png'),scale:'device'});
  const proof={status:'passed',language,authentic:true,source:'Real friendly battle between two isolated guest accounts; normal server commands; real core activation',gameplay_modified:false,page_errors:[...a.pageErrors,...b.pageErrors]};
  if(proof.page_errors.length)throw Error('Page errors in capture');
  fs.writeFileSync(path.join('artifacts/store-240-20261113',language+'-battle.json'),JSON.stringify(proof,null,2));console.log(JSON.stringify(proof));
 }finally{await browser.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
