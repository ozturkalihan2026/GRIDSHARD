const {test,expect}=require('@playwright/test');
const fs=require('node:fs'),path=require('node:path');
const {createAuthenticatedClient,api}=require('./helpers');
const {waitForParticipantReady}=require('./ui-helpers');

test('capture a real two-player battle at Play phone screenshot dimensions',async({browser,baseURL})=>{
  const target=path.resolve(__dirname,'../artifacts/play-store-battle-20261025');
  fs.mkdirSync(target,{recursive:true});
  const suffix=Date.now(),options={viewport:{width:360,height:640},deviceScaleFactor:3,isMobile:true,hasTouch:true,
    storageState:{cookies:[],origins:[{origin:baseURL,localStorage:[{name:'gridshard.tutorial.v1',value:'complete'}]}]}};
  const a=await createAuthenticatedClient(browser,baseURL,`store-a-${suffix}`,options);
  const b=await createAuthenticatedClient(browser,baseURL,`store-b-${suffix}`,options);
  try{
    await Promise.all([a,b].map(c=>waitForParticipantReady(c.page)));
    await api(a,'POST',`/social/${a.playerId}/requests`,{player_id:a.playerId,target_player_id:b.playerId,request_id:`request-${suffix}`});
    await api(b,'POST',`/social/${b.playerId}/requests/accept`,{player_id:b.playerId,requester_id:a.playerId,request_id:`accept-${suffix}`});
    const invitation=await api(a,'POST',`/social/${a.playerId}/battle-invites`,{player_id:a.playerId,opponent_id:b.playerId,request_id:`invite-${suffix}`});
    const invite=invitation.battle_invites.find(i=>i.opponent_id===b.playerId&&i.status==='pending');
    const accepted=await api(b,'POST',`/social/${b.playerId}/battle-invites/${invite.invite_id}/accept`,{player_id:b.playerId,request_id:`battle-${suffix}`});
    await a.page.evaluate(()=>{
      window.__storeBeams={upper:0,lower:0};
      const original=GridshardModuleVfx.prototype.attack;
      GridshardModuleVfx.prototype.attack=function(sourceId,targetId,definition,defended){
        const result=original.call(this,sourceId,targetId,definition,defended);
        if(definition==='laser'){
          const source=document.querySelector(`[data-module-id="${CSS.escape(sourceId)}"]`);
          if(source)window.__storeBeams[source.closest('#enemy-board')?'upper':'lower']=performance.now();
        }
        return result;
      };
    });
    await Promise.all([a,b].map(c=>c.page.evaluate(battle=>Promise.resolve(window.__GRIDSHARD_TEST_API.launchSocialBattle(battle)).then(r=>Boolean(r.ok)),accepted.battle)));
    for(const c of[a,b]){
      await expect(c.page.locator('body')).toHaveAttribute('data-online-status','battle');
      await expect.poll(()=>c.page.evaluate(()=>window.__GRIDSHARD_TEST_API.getOnlineBattleState().elapsedMs)).toBeGreaterThan(0);
      await expect(c.page.locator('#battle-start-countdown')).toBeHidden();
    }
    for(const id of['shield','battery','laser']){
      await Promise.all([a,b].map(async c=>{
        await expect.poll(async()=>{
          if(await c.page.locator(`#board [data-device="${id}"]`).count())return true;
          await c.page.evaluate(id=>window.__GRIDSHARD_TEST_API.deployModule(id),id);
          await c.page.waitForTimeout(1000);
          return false;
        },{timeout:16000,intervals:[300]}).toBe(true);
        await expect(c.page.locator(`#board [data-device="${id}"]`).first()).toBeVisible();
      }));
    }
    await a.page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.querySelectorAll('.vertical-circuit-arena img')].map(img=>img.decode().catch(()=>{})));});
    const evidence=[];
    for(let i=0;i<6;i++){
      await expect.poll(()=>a.page.evaluate(()=>{
        const now=performance.now(),beam=window.__storeBeams;
        return now-beam.upper<500&&now-beam.lower<500
          &&document.querySelectorAll('#board .module-device-rig:not([data-core="true"])').length>=2
          &&document.querySelectorAll('#enemy-board .module-device-rig:not([data-core="true"])').length>=2;
      }),{timeout:12000,intervals:[30,30,50]}).toBe(true);
      const file=path.join(target,`candidate-${i+1}.png`);
      await a.page.screenshot({path:file,animations:'allow',scale:'device'});
      evidence.push(await a.page.evaluate(()=>({elapsed:window.__GRIDSHARD_TEST_API.getOnlineBattleState().elapsedMs,
        playerModules:document.querySelectorAll('#board .module-device-rig:not([data-core="true"])').length,
        enemyModules:document.querySelectorAll('#enemy-board .module-device-rig:not([data-core="true"])').length})));
    }
    fs.writeFileSync(path.join(target,'capture.json'),JSON.stringify({width:1080,height:1920,viewport:[360,640],dpr:3,ratio:'9:16',format:'PNG',
      authentic:true,source:'real server-authoritative friend battle with two isolated temporary guests',
      alteredGameplay:false,profileUnderInvestigationUntouched:true,evidence,pageErrors:[...a.pageErrors,...b.pageErrors]},null,2));
    expect([...a.pageErrors,...b.pageErrors]).toEqual([]);
  }finally{await Promise.all([a.context.close(),b.context.close()]);}
});

