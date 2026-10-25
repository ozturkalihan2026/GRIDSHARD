const {test, expect} = require("@playwright/test");
const {waitForParticipantReady} = require("./ui-helpers");

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => localStorage.setItem("gridshard.tutorial.v1", "complete"));
  await page.goto("/?e2e=1", {waitUntil:"domcontentloaded"});
  await waitForParticipantReady(page);
});

// No screen/video recorder in a timing benchmark; functional visual tests
// retain normal failure traces in presentation-refinements.spec.js.
test.use({trace:"off",video:"off"});

test("savaş hareketleri ve VFX aynı kare bütçesinde kalır", async ({page}, info) => {
  test.setTimeout(90_000);
  const errors=[]; page.on("pageerror", error=>errors.push(String(error)));
  const menuBackground=await page.evaluate(()=>getComputedStyle(document.body).backgroundImage);
  expect(menuBackground).not.toBe('none');
  await page.evaluate(()=>window.__GRIDSHARD_TEST_API.startRenderCostProbe());
  await page.evaluate(() => {
    const sample=window.__battleCost={rigLayoutReads:0, rectReads:0, methods:{}, longTasks:0, maxTaskMs:0};
    const width=Object.getOwnPropertyDescriptor(HTMLElement.prototype,"offsetWidth");
    Object.defineProperty(HTMLElement.prototype,"offsetWidth",{...width,get(){
      if(this.classList.contains("module-device-rig"))sample.rigLayoutReads++;
      return width.get.call(this);
    }});
    const rect=Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect=function(){sample.rectReads++;return rect.call(this);};
    for(const [name,Type,method] of [["motion",GridshardModuleMotion,"tick"],["canvas",GridshardModuleFxCanvas,"tick"],["vfx",GridshardModuleVfx,"receive"]]) {
      const original=Type.prototype[method],stats=sample.methods[name]={calls:0,totalMs:0,maxMs:0};
      Type.prototype[method]=function(...args){const start=performance.now();try{return original.apply(this,args);}finally{
        const ms=performance.now()-start;stats.calls++;stats.totalMs+=ms;stats.maxMs=Math.max(stats.maxMs,ms);
      }};
    }
    if(PerformanceObserver.supportedEntryTypes.includes("longtask"))new PerformanceObserver(list=>{
      for(const entry of list.getEntries()){sample.longTasks++;sample.maxTaskMs=Math.max(sample.maxTaskMs,entry.duration);}
    }).observe({type:"longtask",buffered:false});
  });
  await page.locator("#home-battle-button").click();
  await expect(page.locator("body")).toHaveAttribute("data-online-status","battle",{timeout:40_000});
  await expect(page.locator("#battle-start-countdown")).toBeHidden({timeout:6000});
  await expect.poll(()=>page.evaluate(()=>window.__GRIDSHARD_TEST_API.getOnlineBattleState().elapsedMs)).toBeGreaterThan(0);
  const cdp=info.project.name.includes("safari")?null:await page.context().newCDPSession(page);
  if(cdp)await cdp.send("Performance.enable");
  const before=cdp?await cdp.send("Performance.getMetrics"):null;
  await page.evaluate(async()=>{
    const frames=window.__battleNativeFrames={count:0,last:0,maxGap:0,slow:0,active:true};
    const observe=now=>{if(!frames.active)return;if(frames.last){const gap=now-frames.last;frames.maxGap=Math.max(frames.maxGap,gap);if(gap>50)frames.slow++;}frames.last=now;frames.count++;requestAnimationFrame(observe);};
    requestAnimationFrame(observe);
    const deck=["laser","battery","cooler","shield","laser","amplifier","laser","battery","cooler","laser"];
    const start=performance.now();let next=0;
    while(performance.now()-start<18_000){
      if(next<deck.length && window.__GRIDSHARD_TEST_API.deployModule(deck[next]))next++;
      await new Promise(resolve=>setTimeout(resolve,1000));
    }
    frames.active=false;
  });
  const after=cdp?await cdp.send("Performance.getMetrics"):null;
  const evidence=await page.evaluate(()=>({...window.__battleCost,performance:window.__GRIDSHARD_PERF?.current,
    nativeFrames:window.__battleNativeFrames,quality:document.body.dataset.graphics,perspective:document.body.dataset.battlePerspective,
    phases:window.__battlePhaseCost,
    animations:document.getAnimations().map(a=>({name:a.animationName,state:a.playState,
      target:a.effect?.target?.getAttribute('class'),iterations:String(a.effect?.getTiming().iterations)})),
    devices:document.querySelectorAll(".vertical-circuit-arena .module-device-rig").length,
    effects:document.querySelectorAll("#battle-effect-layer *").length}));
  evidence.surfaces=await page.evaluate(()=>['html','body','.battle-shell','.battle-layout','.arena-panel','.vertical-circuit-arena','#battle-effect-layer'].map(selector=>{
    const el=document.querySelector(selector),s=getComputedStyle(el),r=el.getBoundingClientRect();
    const pseudo=kind=>{const p=getComputedStyle(el,kind);return {content:p.content,display:p.display,
      background:p.backgroundImage,filter:p.filter,backdrop:p.backdropFilter||p.webkitBackdropFilter,
      animation:p.animationName,willChange:p.willChange};};
    return {selector,size:[r.width,r.height],background:s.backgroundImage,color:s.backgroundColor,
      filter:s.filter,backdrop:s.backdropFilter||s.webkitBackdropFilter,shadow:s.boxShadow,
      transform:s.transform,contain:s.contain,willChange:s.willChange,before:pseudo('::before'),after:pseudo('::after')};
  }));
  if(before&&after){const previous=new Map(before.metrics.map(m=>[m.name,m.value]));evidence.browser=Object.fromEntries(after.metrics
    .filter(m=>["LayoutCount","RecalcStyleCount","LayoutDuration","RecalcStyleDuration","ScriptDuration","TaskDuration"].includes(m.name))
    .map(m=>[m.name,m.value-(previous.get(m.name)||0)]));}
  await info.attach("battle-render-cost",{body:JSON.stringify(evidence,null,2),contentType:"application/json"});
  console.log('BATTLE_RENDER_BUDGET',JSON.stringify({project:info.project.name,...evidence}));
  await page.screenshot({path:info.outputPath("battle-proportions.png")});
  expect(evidence.devices).toBeGreaterThanOrEqual(5);
  expect(evidence.surfaces.find(s=>s.selector==='body').background).toBe('none');
  expect(evidence.surfaces.find(s=>s.selector==='.arena-panel').shadow).toBe('none');
  expect(evidence.rigLayoutReads).toBe(0);
  expect(evidence.performance?.freeze_count).toBe(0);
  expect(evidence.performance?.budget_passed).toBe(true);
  expect(errors).toEqual([]);
});
