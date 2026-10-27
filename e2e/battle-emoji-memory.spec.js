const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const path=require('node:path');
const {waitForParticipantReady}=require('./ui-helpers');

// Instrument the real closure only in this isolated browser test. No audit
// hooks, player-store mutations or artificial emoji spam enter a release.
const auditHook=`window.__GRIDSHARD_TEST_API={
  emojiAudit:{
    begin(){openAppScreen('play');activePlayMode='local';localBattleStarted=true;localBattleFinished=false;document.body.dataset.playMode='local';document.body.dataset.localStatus='battle';document.body.dataset.localFinished='false';renderPlayModeUi();renderBattleEmojiControl();},
    cycles(n){for(let i=0;i<n;i++){battleEmojiButtonEl.click();battleEmojiButtonEl.click();}},
    refresh(n){let reads=0;const original=profileState.viewModel;profileState.viewModel=function(...args){reads++;return original.apply(this,args);};const glyph=battleEmojiButtonGlyphEl.firstElementChild;try{for(let i=0;i<n;i++)renderBattleEmojiControl();}finally{profileState.viewModel=original;}return{profileClones:reads,glyphStable:glyph===battleEmojiButtonGlyphEl.firstElementChild};},
    show(id='respect_signal',peer=false){presentBattleEmoji(peer?'audit-peer':participantPlayerId,id);},
    send(){const original=client.emitCommand;let command;client.emitCommand=value=>{command=value;return{ok:true};};const glyph=battleEmojiButtonGlyphEl.firstElementChild;try{sendBattleEmoji('thumbs_up');}finally{client.emitCommand=original;}return{command,glyphStable:glyph===battleEmojiButtonGlyphEl.firstElementChild};},
    open(){openBattleEmojiTray();},
    leave(){openAppScreen('menu');},
    clear(){clearBattleEffects();},
    finish(){localBattleFinished=true;renderBattleEmojiControl();},
    hide(){Object.defineProperty(document,'hidden',{configurable:true,value:true});handleBattleVisibilityChange();},
    resume(){delete document.hidden;handleBattleVisibilityChange();},
    reset(){resetBattleVisualSurface();},
    flush(){runBattleSweep(performance.now()+10000);},
    state(){return{trayHidden:battleEmojiTrayEl.hidden,options:battleEmojiTrayEl.childElementCount,bubbles:document.querySelectorAll('.battle-emoji-bubble').length,emojiElements:document.querySelectorAll('#battle-emoji-button *,#battle-emoji-tray *,.battle-emoji-bubble,.battle-emoji-bubble *').length,cooldownTimer:!!battleEmojiCooldownTimer,emojiAnimations:document.getAnimations().filter(a=>a.effect?.target?.closest?.('.battle-emoji-bubble,#battle-emoji-tray')).length};}
  },`;

test.use({trace:'off',video:'off'});
test('emoji controls retain no per-open listeners and release their battle resources',async({page},info)=>{
  test.setTimeout(90000);
  const phase=process.env.GRIDSHARD_EMOJI_AUDIT_PHASE||'after';
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const source=fs.readFileSync(path.join(__dirname,'../client/src/app.js'),'utf8');
  expect(source.includes('window.__GRIDSHARD_TEST_API={')).toBe(true);
  await page.route('**/src/app.js',route=>route.fulfill({contentType:'application/javascript',body:source.replace('window.__GRIDSHARD_TEST_API={',auditHook)}));
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
  await page.goto('/?e2e=1',{waitUntil:'domcontentloaded'});
  await waitForParticipantReady(page);
  await page.evaluate(()=>window.__GRIDSHARD_TEST_API.emojiAudit.begin());
  await expect(page.locator('#battle-emoji-button')).toBeVisible();
  await page.waitForTimeout(1000); // Let initial profile/navigation work settle before forced-GC samples.
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const sample=async()=>{
    await cdp.send('HeapProfiler.collectGarbage');
    const counters=await cdp.send('Memory.getDOMCounters');
    const {metrics}=await cdp.send('Performance.getMetrics');
    const heap=metrics.find(m=>m.name==='JSHeapUsedSize').value;
    const state=await page.evaluate(()=>window.__GRIDSHARD_TEST_API.emojiAudit.state());
    return{...counters,heap,...state};
  };
  await page.evaluate(()=>window.__GRIDSHARD_TEST_API.emojiAudit.cycles(50));
  const samples=[await sample()];
  for(let i=0;i<5;i++){
    await page.evaluate(()=>window.__GRIDSHARD_TEST_API.emojiAudit.cycles(200));
    samples.push(await sample());
  }
  const refresh=await page.evaluate(()=>window.__GRIDSHARD_TEST_API.emojiAudit.refresh(10000));
  const lifecycle=await page.evaluate(()=>{
    const audit=window.__GRIDSHARD_TEST_API.emojiAudit;
    audit.show();audit.show('thumbs_up',true);
    const send=audit.send();
    const active=audit.state();audit.leave();const exited=audit.state();
    return{send,active,exited};
  });
  await page.waitForTimeout(2100);
  const settled=await sample();
  const report={project:info.project.name,phase,scope:'Isolated real UI handlers; no real-player data, no full-game FPS claim.',
    openCloseCycles:1050,refreshCalls:10000,samples,refresh,lifecycle,settled,errors};
  const output=path.resolve('artifacts/battle-emoji-memory-20261027');fs.mkdirSync(output,{recursive:true});
  fs.writeFileSync(path.join(output,`${phase}-${info.project.name}.json`),JSON.stringify(report,null,2));
  await info.attach('emoji-memory',{body:JSON.stringify(report,null,2),contentType:'application/json'});
  const stable=samples.slice(1);
  expect(Math.max(...stable.map(s=>s.jsEventListeners))-Math.min(...stable.map(s=>s.jsEventListeners))).toBeLessThanOrEqual(2);
  expect(new Set(stable.map(s=>s.emojiElements)).size).toBe(1);
  // Other live HUD effects can briefly allocate nodes between GC samples;
  // they must be released by the final sample rather than accumulating.
  expect(samples.at(-1).nodes-samples[0].nodes).toBeLessThanOrEqual(10);
  expect(errors).toEqual([]);
  if(phase==='after'){
    expect(refresh.profileClones).toBe(0);
    expect(refresh.glyphStable).toBe(true);
    expect(lifecycle.send.glyphStable).toBe(true);
    expect(lifecycle.exited).toMatchObject({trayHidden:true,options:0,bubbles:0,cooldownTimer:false,emojiAnimations:0});
    expect(settled.bubbles).toBe(0);
    const transitions=await page.evaluate(()=>{
      const audit=window.__GRIDSHARD_TEST_API.emojiAudit;
      audit.begin();audit.reset();
      for(let i=0;i<200;i++){audit.show('respect_signal');audit.show('thumbs_up',true);}
      const capped=audit.state();audit.flush();const expired=audit.state();
      audit.show();audit.send();audit.hide();const hidden=audit.state();
      audit.show();const hiddenIncoming=audit.state();audit.resume();
      const stillCooling=document.getElementById('battle-emoji-button').disabled;
      audit.reset();
      const reset=audit.state();audit.open();const reopened=audit.state();
      audit.show();audit.finish();const finished=audit.state();
      return{capped,expired,hidden,hiddenIncoming,stillCooling,reset,reopened,finished};
    });
    expect(transitions.capped.bubbles).toBe(2);
    for(const key of ['expired','hidden','hiddenIncoming','reset','finished'])expect(transitions[key]).toMatchObject({bubbles:0,cooldownTimer:false});
    expect(transitions.hidden.options).toBe(0);
    expect(transitions.hiddenIncoming.emojiAnimations).toBe(0);
    expect(transitions.stillCooling).toBe(true);
    expect(transitions.reopened.options).toBeGreaterThan(0);
    expect(transitions.finished).toMatchObject({trayHidden:true,options:0,emojiAnimations:0});
    report.transitions=transitions;
    fs.writeFileSync(path.join(output,`${phase}-${info.project.name}.json`),JSON.stringify(report,null,2));
  }
});

test('emoji selection still reaches a real battle and is cleared on forfeit',async({page},info)=>{
  test.skip(process.env.GRIDSHARD_EMOJI_AUDIT_PHASE==='before','The before comparison isolates UI allocations.');
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
  await page.goto('/?e2e=1',{waitUntil:'domcontentloaded'});await waitForParticipantReady(page);
  await page.locator('#home-battle-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-online-status','battle',{timeout:40000});
  await expect.poll(()=>page.evaluate(()=>window.__GRIDSHARD_TEST_API.getBattleState().elapsed_ms)).toBeGreaterThan(0);
  await expect(page.locator('#battle-start-countdown')).toBeHidden({timeout:6000});
  const button=page.locator('#battle-emoji-button'),tray=page.locator('#battle-emoji-tray');
  await button.click();await expect(tray).toBeVisible();
  await tray.locator('button').first().click();
  await expect(button).toBeDisabled();await expect(tray).toBeHidden();
  await expect(tray.locator('button')).toHaveCount(0);
  await expect(page.locator('#board .battle-emoji-bubble')).toHaveCount(1);
  await expect(page.locator('#board .battle-emoji-bubble')).toHaveCount(0,{timeout:4000});
  await expect(button).toBeEnabled({timeout:5000});
  await button.click();await tray.locator('button').first().click();
  await expect(page.locator('#board .battle-emoji-bubble')).toHaveCount(1);
  // The current battle theme hides this legacy header button. Invoke its
  // existing handler; emoji selection/delivery above uses visible user clicks.
  await page.locator('#battle-forfeit-button').evaluate(button=>button.click());
  await expect.poll(()=>page.evaluate(()=>window.__GRIDSHARD_TEST_API.getOnlineBattleState().phase)).toBe('finished');
  await expect(page.locator('.battle-emoji-bubble')).toHaveCount(0);
  await expect(tray).toBeHidden();await expect(tray.locator('button')).toHaveCount(0);
  await info.attach('real-battle-emoji',{body:JSON.stringify({sent:2,lifetimeMs:1900,cooldownMs:3000,cleanOnForfeit:true}),contentType:'application/json'});
});
