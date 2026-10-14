const {test,expect}=require("@playwright/test");
const fs=require("node:fs");
const path=require("node:path");
const {waitForParticipantReady}=require("./ui-helpers");
const root=path.resolve(__dirname,"../qa_reports/typography-pilot-20261014");
const allowed=new Set(["compare.html","pilot.css","LilitaOne-Regular.ttf","Rowdies-Bold.ttf"]);

// Read the font's Unicode cmap, not just document.fonts.check (which can hide fallback).
function hasGlyph(bytes,code){
  let cmap;
  for(let i=0;i<bytes.readUInt16BE(4);i++){
    const at=12+i*16;
    if(bytes.toString("ascii",at,at+4)==="cmap") cmap=bytes.readUInt32BE(at+8);
  }
  if(cmap===undefined) throw new Error("Missing cmap");
  for(let i=0;i<bytes.readUInt16BE(cmap+2);i++){
    const record=cmap+4+i*8, platform=bytes.readUInt16BE(record);
    if(platform!==0 && platform!==3) continue;
    const base=cmap+bytes.readUInt32BE(record+4);
    if(bytes.readUInt16BE(base)!==4) continue;
    const count=bytes.readUInt16BE(base+6)/2, ends=base+14, starts=ends+count*2+2;
    const deltas=starts+count*2, offsets=deltas+count*2;
    for(let j=0;j<count;j++){
      const start=bytes.readUInt16BE(starts+j*2), end=bytes.readUInt16BE(ends+j*2);
      if(code<start || code>end) continue;
      const delta=bytes.readInt16BE(deltas+j*2), offset=bytes.readUInt16BE(offsets+j*2);
      if(!offset) return ((code+delta)&65535)!==0;
      const glyph=bytes.readUInt16BE(offsets+j*2+offset+(code-start)*2);
      return glyph!==0 && ((glyph+delta)&65535)!==0;
    }
  }
  return false;
}

test("onay öncesi iki font: yerel dosyalar, Türkçe glifler ve gerçek ekran önizlemesi",async({page},testInfo)=>{
  test.setTimeout(120000);
  for(const [font,license] of [["LilitaOne-Regular.ttf","OFL-LilitaOne.txt"],["Rowdies-Bold.ttf","OFL-Rowdies.txt"]]){
    const bytes=fs.readFileSync(path.join(root,font));
    const missing=[..."ÇĞİÖŞÜçğıöşü"].filter(char=>!hasGlyph(bytes,char.codePointAt(0))).join("");
    // The full official Lilita file lacks these glyphs. Keep the warning,
    // rather than treating a browser's silent fallback as Turkish support.
    expect(missing).toBe(font.startsWith("Lilita")?"ĞİŞğş":"");
    expect(fs.readFileSync(path.join(root,license),"utf8")).toContain("SIL OPEN FONT LICENSE Version 1.1");
  }
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error)));
  await page.route("**/__font-pilot/*",async route=>{
    const name=new URL(route.request().url()).pathname.split("/").pop();
    if(!allowed.has(name)) return route.abort();
    await route.fulfill({body:fs.readFileSync(path.join(root,name)),contentType:name.endsWith(".ttf")?"font/ttf":name.endsWith(".css")?"text/css":"text/html"});
  });
  await page.addInitScript(()=>localStorage.setItem("gridshard.tutorial.v1","complete"));
  await page.goto("/?e2e=1",{waitUntil:"domcontentloaded"});
  await waitForParticipantReady(page);
  const css=fs.readFileSync(path.join(root,"pilot.css"),"utf8").replaceAll('url("./','url("/__font-pilot/');
  await page.addStyleTag({content:css});
  const viewport=page.viewportSize();
  const copySelector="#home-battle-button > small";
  const originalCopy=await page.locator(copySelector).evaluate(el=>getComputedStyle(el).fontFamily);
  for(const [key,font] of [["current","Oxanium"],["lilita","Pilot Lilita One"],["rowdies","Pilot Rowdies"]]){
    await page.evaluate(key=>document.body.dataset.fontPilot=key,key);
    await page.evaluate(async({font,key})=>{
      await document.fonts.load(`${key==="lilita"?400:key==="rowdies"?700:800} 24px "${font}"`,"SAVAŞ ÇĞİÖŞÜ çğıöşü");
      await document.fonts.ready;
    },{font,key});
    expect(await page.locator("#home-arena-name").evaluate(el=>getComputedStyle(el).fontFamily)).toContain(font);
    expect(await page.locator(copySelector).evaluate(el=>getComputedStyle(el).fontFamily)).toBe(originalCopy);
    await page.screenshot({path:testInfo.outputPath(`home-${key}.png`)});
    for(const width of [320,393]){
      await page.setViewportSize({width,height:852});
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
      const fits=await page.locator("#app-bottom-dock .menu-action-title").evaluateAll(labels=>labels.every(el=>getComputedStyle(el).display==="none" || el.scrollWidth<=el.clientWidth+1));
      expect(fits).toBe(true);
    }
    await page.setViewportSize(viewport);
    await page.locator('[data-shell-screen="events"]').click();
    await page.screenshot({path:testInfo.outputPath(`events-${key}.png`)});
    await page.locator('[data-shell-screen="menu"]').click();
  }
  await page.setViewportSize({width:1120,height:680});
  await page.goto("/__font-pilot/compare.html",{waitUntil:"load"});
  await page.evaluate(async()=>{await Promise.all([document.fonts.load('400 24px "Pilot Lilita One"'),document.fonts.load('700 24px "Pilot Rowdies"')]);await document.fonts.ready;});
  await expect(page.locator(".pilot-column")).toHaveCount(3);
  await page.screenshot({path:testInfo.outputPath("font-comparison.png"),fullPage:true});
  expect(errors).toEqual([]);
});
