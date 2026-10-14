const {test,expect}=require("@playwright/test");
const {waitForParticipantReady}=require("./ui-helpers");

test("gömülü Rowdies Bold: Türkçe, korunmuş gövde/marka ve küçük ekran yerleşimi",async({page},testInfo)=>{
  test.setTimeout(120000);
  const errors=[],externalFonts=[];
  page.on("pageerror",error=>errors.push(String(error)));
  page.on("request",request=>{
    if(/fonts\.(googleapis|gstatic)\.com/.test(request.url())) externalFonts.push(request.url());
  });
  await page.addInitScript(()=>localStorage.setItem("gridshard.tutorial.v1","complete"));
  await page.goto("/?e2e=1",{waitUntil:"domcontentloaded"});
  await waitForParticipantReady(page);
  await page.evaluate(async()=>{
    await document.fonts.load('700 24px "Rowdies"',"SAVAŞ ÇĞİÖŞÜ çğıöşü 0123456789");
    await document.fonts.ready;
  });
  const families=await page.evaluate(()=>({
    heading:getComputedStyle(document.querySelector("#home-arena-name")).fontFamily,
    button:getComputedStyle(document.querySelector("#home-battle-button > span")).fontFamily,
    copy:getComputedStyle(document.querySelector("#home-battle-button > small")).fontFamily,
    brand:getComputedStyle(document.querySelector(".boot-title")).fontFamily,
    loaded:[...document.fonts].some(face=>face.family==='Rowdies' && face.weight==='700' && face.status==='loaded'),
    synthesis:getComputedStyle(document.body).fontSynthesis
  }));
  expect(families.heading).toContain("Rowdies");
  expect(families.button).toContain("Rowdies");
  expect(families.copy).toContain("Rajdhani");
  expect(families.brand).toContain("Orbitron");
  expect(families.loaded).toBe(true);
  expect(families.synthesis).toBe("style");
  expect(await page.locator('[data-license="OFL-Rowdies.txt"]').textContent()).toContain("SIL OPEN FONT LICENSE Version 1.1");
  const checks=[];
  for(const {width,height} of [{width:320,height:568},{width:393,height:852}]){
    await page.setViewportSize({width,height});
    for(const screen of ["menu","shop","modules","team","events"]){
      await page.locator(`#app-bottom-dock [data-shell-screen="${screen}"]`).click();
      await expect(page.locator(`body[data-app-screen="${screen}"]`)).toBeVisible();
      const layout=await page.evaluate(()=>({
        overflow:document.documentElement.scrollWidth>innerWidth+1,
        dock:[...document.querySelectorAll("#app-bottom-dock .menu-action-title")].filter(el=>getComputedStyle(el).display!=="none").every(el=>el.scrollWidth<=el.clientWidth+1),
        prices:[...document.querySelectorAll(".shop-chest-action .cost-chip > b")].filter(el=>el.getBoundingClientRect().width>0).every(el=>el.scrollWidth<=el.clientWidth+1)
      }));
      checks.push({width,height,screen,...layout});
      expect(layout,{width,screen}).toEqual({overflow:false,dock:true,prices:true});
      if(["menu","shop","modules"].includes(screen)) await page.screenshot({path:testInfo.outputPath(`${screen}-${width}.png`)});
    }
    await page.locator('[data-shell-screen="modules"]').click();
    await page.locator('#module-collection-grid [data-module-definition-id="laser"]').click();
    await page.locator('#module-quick-info').click();
    await expect(page.locator("#module-detail-dialog")).toBeVisible();
    const title=page.locator("#module-detail-dialog .module-detail-title h2");
    expect(await title.evaluate(el=>getComputedStyle(el).fontFamily)).toContain("Rowdies");
    expect(await title.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`module-detail-${width}.png`)});
    await page.keyboard.press("Escape");
    await page.locator('[data-shell-screen="menu"]').click();
    await page.locator("#reward-inbox-button").click();
    await expect(page.locator("#reward-inbox-dialog")).toBeVisible();
    await page.screenshot({path:testInfo.outputPath(`inbox-${width}.png`)});
    await page.locator("#reward-inbox-close").click();
  }
  // Change only this isolated browser's UI language, using normal controls.
  await page.locator("#lobby-menu-button").click();
  await page.locator('#lobby-menu [data-open-screen="settings"]').click();
  await page.locator("#settings-language").selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang","en");
  for(const screen of ["menu","shop","events"]){
    await page.locator(`#app-bottom-dock [data-shell-screen="${screen}"]`).click();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
    expect(await page.locator("#app-bottom-dock .menu-action-title").evaluateAll(labels=>labels.every(el=>getComputedStyle(el).display==="none" || el.scrollWidth<=el.clientWidth+1))).toBe(true);
  }
  await testInfo.attach("typography-layout",{body:JSON.stringify({families,checks,externalFonts,errors},null,2),contentType:"application/json"});
  expect(externalFonts).toEqual([]);
  expect(errors).toEqual([]);
});
