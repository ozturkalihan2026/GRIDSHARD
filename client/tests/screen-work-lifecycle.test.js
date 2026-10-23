"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const app=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
function extract(start,end){const i=app.indexOf(start),j=app.indexOf(end,i);assert.ok(i>=0&&j>i);return app.slice(i,j);}

test("battle presentation releases scheduled work outside play and resumes with one frame",()=>{
  const cancelled=[],frames=[];
  const c=vm.createContext({document:{hidden:false,body:{dataset:{appScreen:"menu"}}},battleClockFrame:4,battleClockTimer:5,battleClockUpdating:false,
    updateClock(){},requestAnimationFrame(fn){frames.push(fn);return frames.length+10;},window:{cancelAnimationFrame(id){cancelled.push(id);},clearTimeout(id){cancelled.push(id);}}});
  vm.runInContext(extract("  function syncBattleClockVisibility()","  function updateClock("),c);
  c.syncBattleClockVisibility();assert.deepEqual(cancelled,[4,5]);assert.equal(c.battleClockFrame,null);assert.equal(c.battleClockTimer,null);
  c.document.body.dataset.appScreen="play";c.syncBattleClockVisibility();c.syncBattleClockVisibility();assert.equal(frames.length,1);
  c.document.hidden=true;c.syncBattleClockVisibility();assert.equal(c.battleClockFrame,null);
  c.document.hidden=false;c.syncBattleClockVisibility();assert.equal(frames.length,2);
});

test("core idle emitters never read hidden/off-screen/finished board geometry",()=>{
  let queries=0,emissions=0;
  const c=vm.createContext({document:{hidden:false,body:{dataset:{appScreen:"menu",onlineStatus:"battle"}},getElementById(){queries++;return{getBoundingClientRect:()=>({left:0,top:0,width:300})};},querySelectorAll(){return[{getBoundingClientRect:()=>({left:10,top:10,width:20,height:20}),closest:()=>null}];}},activePlayMode:"online",localBattleStarted:false,localBattleFinished:false,lastCoreIdleAt:0,moduleFx:{coreIdle(){emissions++;}},battleGraphicsQuality:()=>"orta"});
  vm.runInContext(extract("  function isBattlePresentationRunning()","  function syncBattleClockVisibility()"),c);
  c.emitCoreIdleMotes(1000);assert.equal(queries,0);
  c.document.body.dataset.appScreen="play";c.document.hidden=true;c.emitCoreIdleMotes(1000);assert.equal(queries,0);
  c.document.hidden=false;c.document.body.dataset.onlineStatus="finished";c.emitCoreIdleMotes(1000);assert.equal(queries,0);
  c.document.body.dataset.onlineStatus="battle";c.emitCoreIdleMotes(1000);assert.equal(emissions,1);
});

test("late navigation jobs cannot paint a later screen and release their callback record",()=>{
  const jobs=[];let calls=0;
  const c=vm.createContext({performance:{now:()=>0},document:{hidden:false},window:{setTimeout(fn){jobs.push(fn);return jobs.length;}},task(){calls++;}});
  vm.runInContext(extract("  const NAVIGATION_SETTLE_MS", "  function openAppScreen("),c);
  vm.runInContext("navigationSettleUntil=360;afterNavigationSettle(task);navigationRevision++;",c);
  jobs[0]();assert.equal(calls,0);assert.equal(vm.runInContext("navigationTasks.size",c),0);
  vm.runInContext("afterNavigationSettle(task)",c);jobs[1]();assert.equal(calls,1);
});

test("one lifecycle owns normal navigation, menu return and server-driven battle entry",()=>{
  const jobs=new Map(),calls=[];let serial=0;
  const c=vm.createContext({performance:{now:()=>0},document:{hidden:false,getElementById:()=>null},window:{setTimeout(fn){jobs.set(++serial,fn);return serial;},clearTimeout(id){jobs.delete(id);}},hideRewardPreview(){calls.push("preview");},clearBattleEffects(){calls.push("effects");},stopShopCountdownTimer(){calls.push("shop");},task(){throw new Error("stale job");}});
  vm.runInContext(extract("  const NAVIGATION_SETTLE_MS", "  function openAppScreen("),c);
  c.syncScreenLifecycle("play");vm.runInContext("navigationSettleUntil=360;afterNavigationSettle(task)",c);assert.equal(jobs.size,1);
  c.syncScreenLifecycle("menu");assert.equal(jobs.size,0);assert.deepEqual(calls,["preview","effects","shop"]);
  c.syncScreenLifecycle("menu");assert.equal(calls.length,3,"same-screen rendering never repeats exit cleanup");
});

test("outgoing panels become inert and close their native top-layer dialogs",()=>{
  let closes=0;
  const panel=id=>({dataset:{screenPanel:id},hidden:false,querySelectorAll:()=>[{close(){closes++;}}]});
  const panels=[panel("menu"),panel("modules")];
  const document={body:{dataset:{}},querySelectorAll(selector){return selector==="[data-screen-panel]"?panels:[];},getElementById:()=>null};
  const c=vm.createContext({document});vm.runInContext(fs.readFileSync(path.join(__dirname,"../src/screens/screen-controller.js"),"utf8"),c);
  const router={currentScreen:"modules"},controller=new c.GridshardScreenController({router,screenEnum:{MENU:"menu"},documentRef:document});
  controller.render();assert.equal(closes,1);assert.equal(panels[0].inert,true);assert.equal(panels[1].inert,false);
  controller.render();assert.equal(closes,1,"no repeated close on unchanged screens");
  router.currentScreen="menu";controller.render();assert.equal(panels[0].inert,false);assert.equal(panels[1].inert,true);assert.equal(closes,2);
});
