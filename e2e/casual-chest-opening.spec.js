const {test,expect}=require("@playwright/test");
const {waitForParticipantReady}=require("./ui-helpers");

test.use({viewport:{width:393,height:852},video:{mode:"on",size:{width:393,height:852}}});
test("casual opening stays closed until a receipt; all four tiers, errors and reduced motion",async({page},testInfo)=>{
  test.setTimeout(120000);
  page.setDefaultTimeout(10000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error)));
  await page.addInitScript(()=>localStorage.setItem("gridshard.tutorial.v1","complete"));
  await page.goto("/?e2e=1",{waitUntil:"domcontentloaded"});
  await waitForParticipantReady(page);
  await page.locator('[data-shell-screen="shop"]').click();
  await expect(page.locator("#chest-store-list .chest-painted-art")).toHaveCount(4);
  const examples=[['bronze','field_3h'],['silver','circuit_8h'],['gold','core_24h'],['diamond','diamond_24h']];
  for(const [tier,id] of examples){
    await page.evaluate(tier=>window.__GRIDSHARD_TEST_API.showChestOpening({tier,title:'Deneme sandığı'}),tier);
    await expect(page.locator("#chest-reveal-card")).toHaveAttribute("data-state","opening");
    const closed=page.locator("#chest-reveal-visual .casual-chest-closed"),open=page.locator("#chest-reveal-visual .casual-chest-open");
    await expect.poll(()=>page.locator("#chest-reveal-visual img").evaluateAll(images=>images.every(img=>img.complete && img.naturalWidth===512))).toBe(true);
    await expect(open).toHaveCSS("opacity","0");
    await expect(closed).toHaveCSS("opacity","1");
    expect(await page.locator('.casual-chest-stage').evaluate(el=>getComputedStyle(el,'::before').opacity)).toBe('0');
    await expect(page.locator("#chest-reveal-close")).toBeDisabled();
    await expect(page.locator("#chest-reveal-rewards .reward-resource-row")).toHaveCount(0);
    await page.locator("#chest-reveal-dialog").screenshot({path:testInfo.outputPath(`${tier}-waiting.png`)});
    // Visual-only receipt fixture; never sends a purchase or modifies a real account.
    await page.evaluate(id=>window.__GRIDSHARD_TEST_API.showChestReveal({definition_id:id,rewards:{circuit_credits:17,flux_shards:3,experience:5}}),id);
    await expect(page.locator("#chest-reveal-card")).toHaveAttribute("data-state","revealed");
    await expect(page.locator("#chest-reveal-card")).toHaveAttribute("data-tier",tier);
    await expect(open).toHaveCSS("opacity","1");
    await expect(closed).toHaveCSS("opacity","0");
    // Sample the visible opening beat, not just the final still. Freeze only
    // local CSS chest effects; no payment/state timers are involved.
    const light=await page.locator('#chest-reveal-visual').evaluate(el=>{
      for(const animation of el.getAnimations({subtree:true})){
        if(animation.animationName?.startsWith('casual-chest-')){animation.pause();animation.currentTime=800;}
      }
      const stage=el.querySelector('.casual-chest-stage');
      return {rgb:getComputedStyle(el).getPropertyValue('--casual-glow').trim(),
        rays:Number(getComputedStyle(stage,'::before').opacity),
        cavity:Number(getComputedStyle(stage,'::after').opacity)};
    });
    expect(light.rgb).toBe({bronze:'255,150,55',silver:'149,210,255',gold:'255,205,51',diamond:'80,235,255'}[tier]);
    expect(light.rays).toBeGreaterThan(.5);
    expect(light.cavity).toBeGreaterThan(.5);
    await expect(page.locator("#chest-reveal-close")).toBeEnabled();
    expect(await page.locator("#chest-reveal-rewards .reward-resource-row").count()).toBeGreaterThan(0);
    await page.locator("#chest-reveal-dialog").screenshot({path:testInfo.outputPath(`${tier}-open.png`)});
    await page.locator("#chest-reveal-close").click();
    await expect(page.locator("#chest-reveal-dialog")).toBeHidden();
  }
  await page.evaluate(()=>window.__GRIDSHARD_TEST_API.showBulkChestReveal({definition_id:'core_24h',receipts:[{rewards:{circuit_credits:7}},{rewards:{circuit_credits:11}}]}));
  await expect(page.locator("#chest-reveal-card")).toHaveAttribute("data-state","revealed");
  await expect(page.locator("#chest-reveal-visual .casual-chest-open")).toHaveCSS("opacity","1");
  await expect(page.locator("#chest-reveal-rewards")).toContainText("18");
  await page.locator("#chest-reveal-close").click();
  await page.setViewportSize({width:320,height:568});
  await page.evaluate(()=>window.__GRIDSHARD_TEST_API.showChestOpening({tier:'gold'}));
  await expect(page.locator("#chest-reveal-dialog")).toBeVisible();
  await page.evaluate(()=>window.__GRIDSHARD_TEST_API.showChestFailure(new Error('Deneme: bağlantı kesildi')));
  await expect(page.locator("#chest-reveal-dialog")).toBeVisible();
  await expect(page.locator("#chest-reveal-card")).toHaveAttribute("data-state","error");
  await expect(page.locator(".casual-chest-open").last()).toHaveCSS("opacity","0");
  await expect(page.locator("#chest-reveal-close")).toBeEnabled();
  await page.locator("#chest-reveal-close").click();
  await page.evaluate(()=>window.__GRIDSHARD_TEST_API.showChestOpening({tier:'gold'}));
  await page.evaluate(()=>window.__GRIDSHARD_TEST_API.showClaimedChest({chest:{definition_id:'core_24h',name_tr:'Altın Sandık'}}));
  await expect(page.locator("#chest-reveal-card")).toHaveAttribute("data-state","claimed");
  await expect(page.locator("#chest-reveal-visual .casual-chest-open")).toHaveCSS("opacity","0");
  await page.locator("#chest-reveal-close").click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(()=>window.__GRIDSHARD_TEST_API.showChestOpening({tier:'gold'}));
  await expect(page.locator("#chest-reveal-visual")).toHaveCSS("animation-name","none");
  await page.evaluate(()=>window.__GRIDSHARD_TEST_API.showChestReveal({definition_id:'core_24h',rewards:{circuit_credits:17}}));
  await expect(page.locator("#chest-reveal-visual .casual-chest-open")).toHaveCSS("opacity","1");
  await expect(page.locator("#chest-reveal-visual .casual-chest-particles")).toBeHidden();
  await page.locator("#chest-reveal-dialog").screenshot({path:testInfo.outputPath('reduced-320.png')});
  await page.locator("#chest-reveal-close").click();
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>document.body.dataset.graphics='dusuk');
  await page.evaluate(()=>window.__GRIDSHARD_TEST_API.showChestOpening({tier:'bronze'}));
  await expect(page.locator("#chest-reveal-visual")).toHaveCSS("animation-name","none");
  await expect(page.locator("#chest-reveal-visual .casual-chest-particles")).toBeHidden();
  expect(errors).toEqual([]);
});
