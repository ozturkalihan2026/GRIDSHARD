const {test, expect} = require("@playwright/test");
const {waitForParticipantReady} = require("./ui-helpers");

test.beforeEach(async ({page}) => {
  await page.addInitScript(() => localStorage.setItem("gridshard.tutorial.v1", "complete"));
  await page.goto("/?e2e=1", {waitUntil:"domcontentloaded"});
  await waitForParticipantReady(page);
});


test("mesaj kutusu doğru sekmeyi açar ve gerçek geri eylemiyle kapanır", async ({page}) => {
  test.setTimeout(90_000);
  await page.locator('#reward-inbox-button').click();
  await expect(page.locator('#reward-inbox-dialog')).toBeVisible();
  await expect(page.locator('#inbox-tab-system')).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#reward-inbox-notices')).toContainText('GRIDSHARD 2.1.1');
  await page.locator('#reward-inbox-close').click();
  await expect(page.locator('#reward-inbox-dialog')).not.toBeVisible();
});

test("devre yolu çekirdekleri yalnız görselle sunar ve gerçek geri eylemiyle kapanır", async ({page}) => {
  test.setTimeout(90_000);
  await page.locator('#home-arena-card').click();
  await expect(page.locator('#arena-detail-dialog')).toBeVisible();
  // One browser snapshot avoids 4 IPC/layout round trips per unlock on
  // software WebKit; every unlock still has all four visual/accessibility checks.
  const coreUnlocks=await page.locator('.arena-core-unlocks button').evaluateAll(buttons=>buttons.map(button=>{
    const rect=button.getBoundingClientRect(),img=button.querySelector('img'),art=img?.getBoundingClientRect();
    return {text:button.textContent.trim(),label:button.getAttribute('aria-label'),
      imageVisible:Boolean(art?.width && art?.height && getComputedStyle(img).visibility==='visible'),
      square:rect.width>0 && Math.abs(rect.width-rect.height)<2};
  }));
  expect(coreUnlocks.length).toBeGreaterThan(0);
  for(const core of coreUnlocks) {
    expect(core.text).toBe(''); expect(core.label).toMatch(/.+/);
    expect(core.imageVisible).toBe(true); expect(core.square).toBe(true);
  }
  await page.locator('#arena-detail-close').click();
  await expect(page.locator('#arena-detail-dialog')).not.toBeVisible();
});

test("mağaza başlıkları ve düşük kalite sandık açılışı mevcut görsel dili korur", async ({page}) => {
  test.setTimeout(90_000);
  await page.locator('[data-shell-screen="shop"]').click();
  for (const heading of await page.locator(".shop-section > .mobile-section-heading").all()) {
    await expect(heading).toHaveCSS("border-left-width", "0px");
  }
  await page.evaluate(() => document.body.dataset.graphics = "dusuk");
  for (const [tier, id] of [["bronze","field_3h"],["silver","circuit_8h"],["gold","core_24h"],["diamond","diamond_24h"]]) {
    await page.evaluate(tier => window.__GRIDSHARD_TEST_API.showChestOpening({tier}), tier);
    await expect(page.locator("#chest-reveal-visual .casual-chest-open")).toHaveCSS("opacity", "0");
    await page.evaluate(id => window.__GRIDSHARD_TEST_API.showChestReveal({definition_id:id, rewards:{circuit_credits:1}}), id);
    await expect(page.locator("#chest-reveal-card")).toHaveAttribute("data-tier", tier);
    await expect(page.locator("#chest-reveal-visual .casual-chest-open")).toHaveCSS("opacity", "1");
    await expect(page.locator("#chest-reveal-visual .casual-chest-burst")).toBeVisible();
    await expect.poll(() => page.locator("#chest-reveal-visual .casual-chest-burst").evaluate(node => Number(getComputedStyle(node).opacity))).toBeGreaterThan(.25);
    await page.locator("#chest-reveal-close").click();
  }
});

test("çekirdek parçası ödülleri eski SVG yerine güncel fiziksel çizimi gösterir",async({page})=>{
  const ids=["core_resonance","core_guardian","core_overdrive","core_disruptor","core_capacitor","core_phoenix","core_quantum"];
  for(const id of ids){
    await page.evaluate(id=>window.__GRIDSHARD_TEST_API.showChestReveal({definition_id:"core_24h",rewards:{core_shards:1,core_type_id:id}}),id);
    const art=page.locator('#chest-reveal-rewards .resource-symbol-core-card img.core-physical-art');
    await expect(art).toHaveAttribute('src',`./assets/ui/cores-physical-v1/${id}.webp`);
    await expect(art).toBeVisible();
    await expect.poll(()=>art.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
    await expect(page.locator('#chest-reveal-rewards .resource-symbol-core-card svg')).toHaveCount(0);
  }
  await page.locator('#chest-reveal-close').click();
});

test("kupa seçimi, günlük meta ve tüm modül çizimleri mevcut arayüze bağlıdır", async ({page},info) => {
  test.setTimeout(90_000);
  await page.locator('[data-shell-screen="team"]').click();
  await page.locator('[data-team-lobby-tab="create"]').click();
  const picker = page.locator("#team-create-min-trophies-button");
  await picker.click();
  const options = page.locator("#team-create-min-trophies-options [role=option]");
  expect(await options.count()).toBeGreaterThan(5);
  for (const option of await options.all()) {
    if (await option.getAttribute("data-value") === "0") continue;
    await expect(option.locator("img.trophy-value-icon")).toHaveCount(1);
    expect(await option.textContent()).not.toContain("En az");
  }
  await page.getByRole("option", {name:"100 Kupa", exact:true}).click();
  await expect(page.locator("#team-create-min-trophies")).toHaveValue("100");
  await expect(picker.locator("img")).toHaveCount(1);
  await picker.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator("#team-create-min-trophies")).toHaveValue("300");
  await expect(picker).toHaveAttribute("aria-expanded", "false");
  await picker.click(); await page.keyboard.press("Escape");
  await expect(page.locator("#team-create-min-trophies")).toHaveValue("300");
  await page.locator('[data-shell-screen="events"]').click();
  await expect(page.locator('#daily-meta-card [data-event-emblem="wheel"] > svg')).toHaveCount(1);
  const eventCards = await page.locator(".event-directory > button").evaluateAll(cards => cards.map(card => {
    const c=card.getBoundingClientRect(), icon=card.querySelector(".event-hub-emblem").getBoundingClientRect();
    const title=card.querySelector("strong").getBoundingClientRect(), subtitle=card.querySelector("small").getBoundingClientRect();
    return { centred:Math.abs((title.top+subtitle.bottom)/2-(icon.top+icon.bottom)/2)<3,
      fits:subtitle.right<c.right && title.left>icon.right, background:getComputedStyle(card).backgroundImage };
  }));
  expect(eventCards.every(card=>card.centred && card.fits)).toBe(true);
  expect(eventCards[0].background).toContain("event-circuit-podium.svg");
  expect(eventCards[1].background).toContain("event-team-banners.svg");
  await page.screenshot({path:info.outputPath("daily-meta-physical.png")});
  await page.locator('[data-shell-screen="modules"]').click();
  await expect(page.locator(".module-deck-editor > .mobile-section-heading")).toHaveCSS("border-left-width","0px");
  const collectionArt = page.locator("#module-collection-grid .unified-module-tile .module-emblem");
  await expect(collectionArt).toHaveCount(36);
  expect(await collectionArt.evaluateAll(images=>images.every(image=>image.tagName==="IMG" && image.src.includes("modules-physical-")))).toBe(true);
});

test("çekirdek baskın ölçekte sokete oturur, isabette kırpılmaz; kalkan ve fiziksel patlama görünür", async ({page}, info) => {
  test.setTimeout(90_000);
  await page.locator("#home-battle-button").click();
  await expect(page.locator("body")).toHaveAttribute("data-online-status", "battle", {timeout:40_000});
  await expect(page.locator("#enemy-board .module-device-rig[data-core=true]")).toBeVisible();
  const raster=await page.locator('.module-device-rig[data-core=true] .module-layer-art').evaluateAll(images=>images.map(img=>{
    const chain=[];
    for(let node=img;node && chain.length<12;node=node.parentElement) {
      const style=getComputedStyle(node),rect=node.getBoundingClientRect();
      chain.push({tag:node.className,size:[style.width,style.height],rect:[rect.width,rect.height],
        transform:style.transform,scale:style.scale,zoom:style.zoom,filter:style.filter,
        willChange:style.willChange,backface:style.backfaceVisibility,imageRendering:style.imageRendering,
        transformStyle:style.transformStyle,opacity:style.opacity,overflow:style.overflow,
        contain:style.contain,isolation:style.isolation,mask:style.maskImage});
    }
    return {src:img.currentSrc,natural:[img.naturalWidth,img.naturalHeight],chain};
  }));
  await info.attach('core-art-raster',{body:JSON.stringify(raster,null,2),contentType:'application/json'});
  for (const card of await page.locator('.module-card:has([data-core="true"])').all()) {
    await expect(card).toHaveClass(/physical-module-card/);
    await expect(card.locator(":scope > .name")).toBeHidden();
    await expect(card).toHaveCSS("background-color","rgba(0, 0, 0, 0)");
  }
  await page.evaluate(() => document.body.dataset.battlePerspective = "on");
  const bounds = await page.evaluate(async () => {
    const result = [];
    for (const rig of document.querySelectorAll(".module-device-rig[data-core=true]")) {
      const host = rig.parentElement, original = rig.dataset.device;
      const registration=getComputedStyle(host);
      if(Math.abs(parseFloat(registration.width)-parseFloat(registration.height))>1)
        throw new Error('Core registration must stay square; object-fit letterboxing invalidates opaque bounds');
      const cell = host.closest(".board-cell,.enemy-board-cell");
      for (const [id, data] of Object.entries(GridshardModuleLayerData).filter(([,data]) => data.core)) {
        GridshardModuleDeviceArt.mountCore(host, id);
        const img = host.querySelector(".module-layer-art"); await img.decode();
        const canvas = document.createElement("canvas"); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d"); ctx.drawImage(img,0,0);
        const pixels = ctx.getImageData(0,0,canvas.width,canvas.height).data;
        let x0=canvas.width,y0=canvas.height,x1=0,y1=0;
        for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>140){x0=Math.min(x0,x);x1=Math.max(x1,x+1);y0=Math.min(y0,y);y1=Math.max(y1,y+1);}
        const c=cell.getBoundingClientRect(),stage=host.querySelector(".module-layer-stage");
        // Project opaque-pixel corners through the actual sprite plane. A
        // fraction of an axis-aligned image BCR is wrong under 3D perspective
        // (notably WebKit), even when the painted sprite looks upright.
        const corners=[...host.querySelectorAll(".sprite-plane-point")].map(marker=>{const r=marker.getBoundingClientRect();return {x:r.left,y:r.top};});
        const plane=GridshardLaserAim.plane(corners);
        const size=parseFloat(stage.style.width)/100,left=parseFloat(stage.style.left)/100,top=parseFloat(stage.style.top)/100;
        const points=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]].map(([x,y])=>GridshardLaserAim.project(plane,{
          x:left+size*(data.art.left+data.art.size*x/canvas.width),y:top+size*(data.art.top+data.art.size*y/canvas.height)}));
        const visible={left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),
          top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
        const before=stage.getBoundingClientRect();
        host.closest(".module-card").classList.add("fx-hit"); host.querySelector(".module-device-rig").classList.add("is-struck");
        const after=stage.getBoundingClientRect();
        // Standing art may rise above the PCB, but must not become a tiny
        // floor token or spill across another socket's horizontal footprint.
        const unit=Math.hypot(corners[1].x-corners[0].x,corners[1].y-corners[0].y);
        const health=host.closest('.module-card').querySelector('.core-health-bar').getBoundingClientRect();
        result.push({id, fits:visible.left>=c.left-1&&visible.right<=c.right+1
            &&visible.top>=c.top-c.height*.8&&visible.bottom<=health.top-.5,
          prominent:Math.abs(Math.max(visible.right-visible.left,visible.bottom-visible.top)-unit)<1.5,
          unit,cell:[c.width,c.height],silhouette:[visible.right-visible.left,visible.bottom-visible.top],
          overflow:[c.left-visible.left,visible.right-c.right,c.top-visible.top,visible.bottom-c.bottom].map(n=>Math.round(n)),
          stable:Math.abs(after.width-before.width)<1&&Math.abs(after.height-before.height)<1});
        host.closest(".module-card").classList.remove("fx-hit");
      }
      GridshardModuleDeviceArt.mountCore(host, original);
    }
    return result;
  });
  await info.attach('all-core-opaque-bounds',{body:JSON.stringify(bounds,null,2),contentType:'application/json'});
  expect(bounds.length).toBe(14);
  for(const core of bounds) { expect(core.stable, core.id).toBe(true); expect(core.fits, JSON.stringify(core)).toBe(true); expect(core.prominent,JSON.stringify(core)).toBe(true); }
  await expect(page.locator("#battle-start-countdown")).toBeHidden({timeout:6000});
  await expect.poll(() => page.evaluate(() => window.__GRIDSHARD_TEST_API.getOnlineBattleState().elapsedMs), {timeout:10_000}).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => window.__GRIDSHARD_TEST_API.deployModule("shield")), {timeout:15_000}).toBe(true);
  await expect(page.locator('[data-device="shield"] .module-vfx-ambient[data-kind="shield"]').first()).toBeVisible();
  const shield=page.locator('[data-device="shield"]').first();
  await expect(shield.locator('.module-layer-stage > .module-vfx-ambient[data-kind="shield"]')).toHaveCount(1);
  for(const quality of ['dusuk','yuksek']) {
    await page.evaluate(quality=>document.body.dataset.graphics=quality,quality);
    const shell=shield.locator('.module-vfx-ambient[data-kind="shield"]');
    await expect(shell).toBeVisible();
    const registered=await shell.evaluate(svg=>{
      const stage=svg.parentElement.getBoundingClientRect(),shell=svg.getBoundingClientRect();
      const socket=svg.closest('.module-device-billboard').getBoundingClientRect();
      return {widthRatio:shell.width/stage.width,top:shell.top,stageTop:stage.top,
        bottom:shell.bottom,stageBottom:stage.bottom,socketTop:socket.top,height:socket.height};
    });
    expect(registered.widthRatio).toBeGreaterThan(.95);
    expect(registered.widthRatio).toBeLessThan(1.05);
    // The module now fits its equal socket rather than towering over it.
    // Its protective shell must still cover the registered painting stage.
    expect(registered.top).toBeLessThanOrEqual(registered.stageTop+1);
    expect(registered.bottom).toBeGreaterThanOrEqual(registered.stageBottom-1);
  }
  const coreId = await page.locator('#board .module-card:has([data-core="true"])').getAttribute("data-module-id");
  await page.screenshot({path:info.outputPath("core-and-shield.png")});
  await page.evaluate(id => window.__GRIDSHARD_TEST_API.emitModuleExplosion(id, {core:true}), coreId);
  const explosion = page.locator('.core-explosion[data-material="painted-device"]');
  await expect(explosion.locator('[data-fragment="casing"]').first()).toBeAttached();
  await expect(explosion.locator(".explosion-flash")).toHaveCSS("clip-path", "none");
  await expect(explosion).toHaveCount(0, {timeout:5000});
});
