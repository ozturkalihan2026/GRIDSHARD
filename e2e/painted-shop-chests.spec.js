const {test,expect}=require("@playwright/test");
const {waitForParticipantReady}=require("./ui-helpers");

test("painted shop chests load and keep one aligned action per card on narrow screens",async({page},testInfo)=>{
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error)));
  await page.addInitScript(()=>localStorage.setItem("gridshard.tutorial.v1","complete"));
  await page.goto("/?e2e=1",{waitUntil:"domcontentloaded"});
  await waitForParticipantReady(page);
  await page.locator('#app-bottom-dock [data-shell-screen="shop"]').click();
  const tiers=["bronze","silver","gold","diamond"];
  const images=page.locator("#chest-store-list .chest-painted-art");
  await expect(images).toHaveCount(4);
  await expect.poll(()=>images.evaluateAll(list=>list.every(img=>img.complete && img.naturalWidth===256 && img.naturalHeight===256))).toBe(true);
  for(const tier of tiers){
    await expect(page.locator(`#chest-store-list [data-tier="${tier}"] .chest-painted-art`)).toHaveAttribute("src",`./assets/ui/chests-casual-v2/${tier}.webp`);
  }
  const proofs=[];
  for(const viewport of [{width:320,height:568},{width:393,height:852}]){
    await page.setViewportSize(viewport);
    const disclosure = await page.locator('#chest-odds-open').evaluate(button => {
      const b=button.getBoundingClientRect(), h=button.closest('.mobile-section-heading').getBoundingClientRect();
      const title=document.getElementById('chest-store-title').getBoundingClientRect();
      return {height:b.height,width:b.width,
        centered:Math.abs((b.top+b.bottom-title.top-title.bottom)/2)<1,
        inside:b.left>=title.right+3&&b.right<=h.right+1&&b.top>=h.top&&b.bottom<=h.bottom};
    });
    expect(disclosure.height).toBeLessThanOrEqual(22);
    expect(disclosure.width).toBeLessThanOrEqual(82);
    expect(disclosure.centered).toBe(true);
    expect(disclosure.inside).toBe(true);
    const geometry=await page.locator("#chest-store-list > .chest-store-card").evaluateAll(cards=>cards.map(card=>{
      const image=card.querySelector(".chest-painted-art"),button=card.querySelector(".shop-chest-action");
      const a=image.getBoundingClientRect(),b=button.getBoundingClientRect(),c=card.getBoundingClientRect();
      return {tier:card.dataset.tier,actions:card.querySelectorAll(".shop-chest-action").length,
        bottom:b.bottom,cardBottom:c.bottom,artInside:a.left>=c.left && a.right<=c.right && a.bottom<=b.top,
        width:a.width,height:a.height,filter:getComputedStyle(image.parentElement).filter};
    }));
    expect(geometry.map(card=>card.actions)).toEqual([1,1,1,1]);
    expect(geometry.every(card=>card.artInside && card.filter==="none" && card.width===96 && card.height===96),JSON.stringify(geometry)).toBe(true);
    expect(Math.abs(geometry[0].bottom-geometry[1].bottom)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry[2].bottom-geometry[3].bottom)).toBeLessThanOrEqual(1);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    proofs.push({viewport,disclosure,cards:geometry});
    await page.locator("#chest-store-list").screenshot({path:testInfo.outputPath(`chests-${viewport.width}.png`)});
    await page.locator('#chest-store-title').evaluate(title=>title.scrollIntoView({block:'start'}));
    await page.locator('.chest-store-section > .mobile-section-heading').screenshot({path:testInfo.outputPath(`shop-heading-${viewport.width}.png`)});
    await page.screenshot({path:testInfo.outputPath(`shop-${viewport.width}.png`)});
  }
  // Reward disclosure remains accessible; don't buy or open a chest in this art test.
  await page.locator("#chest-odds-open").click();
  await expect(page.locator("#chest-odds-dialog")).toBeVisible();
  await page.locator('#chest-odds-close').click();
  await page.locator('#app-bottom-dock [data-shell-screen="modules"]').click();
  const coreIcon=page.locator('[data-card-page="cores"] .core-physical-art');
  await expect(coreIcon).toHaveAttribute('src','./assets/ui/cores-physical-v1/core_resonance.webp');
  await expect.poll(()=>coreIcon.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('cards-core-icon.png')});
  await testInfo.attach("painted-chest-layout",{body:JSON.stringify({proofs,errors},null,2),contentType:"application/json"});
  expect(errors).toEqual([]);
});
