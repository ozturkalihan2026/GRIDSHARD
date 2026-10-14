const {test, expect} = require("@playwright/test");
const {waitForParticipantReady} = require("./ui-helpers");

test("devre atmosferi, ortak dock ve kazanılmış profil koleksiyonu", async ({page}, testInfo) => {
  test.setTimeout(120000);
  const errors=[];
  page.on("pageerror", error=>errors.push(String(error)));
  await page.addInitScript(()=>localStorage.setItem("gridshard.tutorial.v1","complete"));
  await page.route("**/src/app.js", async route=>{
    const response=await route.fetch(), source=await response.text();
    const closing=source.lastIndexOf("\n})();");
    expect(closing).toBeGreaterThan(0);
    const seam=`globalThis.__visualAudit={profile:renderPublicProfile,team:renderTeamProfile,
      meta(value){dailyMetaState=value;renderDailyMetaCard();},
      ownTeam(value){teamState=value;renderTeamHub();},
      ownHonors(ids){fillHonorCollection(document.getElementById("profile-rank-trophy-collection"),{ids,definitions:PROFILE_RANK_TROPHIES,kind:"trophy"});}};`;
    await route.fulfill({response,body:source.slice(0,closing)+seam+source.slice(closing)});
  });
  await page.goto("/?e2e=1",{waitUntil:"domcontentloaded"});
  await waitForParticipantReady(page);
  for(const screen of ["menu","shop","modules","team","events"]) {
    await page.locator(`[data-shell-screen="${screen}"]`).click();
    await expect(page.locator("body")).toHaveAttribute("data-app-screen",screen);
    const material=await page.locator("#app-bottom-dock .menu-action").evaluateAll(buttons=>buttons.map(button=>{
      const style=getComputedStyle(button), icon=button.querySelector(".lobby-dock-icon");
      return {background:style.backgroundImage,icon:getComputedStyle(icon).color,
        fill:getComputedStyle(icon.querySelector(".de-body")).fill,
        stroke:getComputedStyle(icon.querySelector(".de-body")).stroke};
    }));
    expect(new Set(material.map(item=>item.background)).size).toBe(1);
    expect(new Set(material.map(item=>item.icon)).size).toBe(5);
    expect(new Set(material.map(item=>item.fill)).size).toBe(5);
    expect(new Set(material.map(item=>item.stroke)).size).toBe(1);
    expect(material.every(item=>item.fill!=="none")).toBe(true);
    const fits=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
    expect(fits).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`${screen}.png`)});
    if (screen==="menu") {
      // The selected cell lifts above the nav border; include that overhang.
      const dockBox=await page.locator("#app-bottom-dock").boundingBox();
      const top=Math.max(0,dockBox.y-16);
      await page.screenshot({path:testInfo.outputPath("dock-pilot.png"),clip:{
        x:dockBox.x,y:top,width:dockBox.width,height:dockBox.height+dockBox.y-top}});
    }
  }
  await expect(page.locator("#events-screen .event-hub-emblem svg")).toHaveCount(3);
  const events=await page.evaluate(()=>[...document.querySelectorAll("#events-screen .event-directory .event-hub-emblem")].map(element=>{
    const box=element.getBoundingClientRect(),parent=element.parentElement.getBoundingClientRect();
    return box.width>=55 && box.height>=55 && box.left>=parent.left && box.right<=parent.right;
  }));
  expect(events).toEqual([true,true]);
  await expect(page.locator("#daily-meta-heading")).toHaveText("Günlük Meta");
  await expect(page.locator("#events-screen .event-directory")).toHaveAccessibleName("Turnuvalar");
  await page.evaluate(()=>__visualAudit.meta({selected:true,meta:{meta_name_tr:"Çekirdek Metası",
    description_tr:"Çekirdek bugün daha yüksek dayanıklılıkla savaşa girer.",effect_tr:"Çekirdek CAN +%10",accent:"#ffe06d"}}));
  await expect(page.locator("#daily-meta-name")).toHaveText("Çekirdek Metası");
  await expect(page.locator("#daily-meta-effect")).toBeVisible();
  expect(await page.evaluate(()=>{
    const meta=document.getElementById("daily-meta-card"), tournament=document.querySelector(".event-directory button");
    return !meta.closest(".event-directory") && !meta.classList.contains("events-hero")
      && meta.getBoundingClientRect().height<tournament.getBoundingClientRect().height
      && meta.querySelector(".event-hub-emblem").getBoundingClientRect().width===38;
  })).toBe(true);
  await page.screenshot({path:testInfo.outputPath("events-meta-separated.png")});
  await page.evaluate(()=>GridshardI18n.apply("en"));
  await expect(page.locator("#daily-meta-heading")).toHaveText("Daily Meta");
  await expect(page.locator("#events-screen .event-directory")).toHaveAccessibleName("Tournaments");
  await page.evaluate(()=>GridshardI18n.apply("tr"));
  const tournamentBackgrounds=await page.locator("#events-screen .event-directory button").evaluateAll(buttons=>buttons.map(button=>getComputedStyle(button).backgroundImage));
  expect(tournamentBackgrounds[0]).not.toBe(tournamentBackgrounds[1]);
  expect(tournamentBackgrounds.every(background=>background.includes("data:image/svg+xml"))).toBe(true);
  const originalViewport=page.viewportSize();
  await page.setViewportSize({width:320,height:700});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
  const narrowCards=await page.locator("#events-screen .event-directory button").evaluateAll(buttons=>buttons.every(button=>{
    const outer=button.getBoundingClientRect(), title=button.querySelector("strong").getBoundingClientRect();
    return title.left>=outer.left && title.right<=outer.right && outer.right<=innerWidth+1;
  }));
  expect(narrowCards).toBe(true);
  await page.setViewportSize(originalViewport);
  expect(await page.locator("#events-screen").evaluate(element=>getComputedStyle(element).scrollbarWidth)).toBe("none");

  await page.evaluate(()=>{
    __visualAudit.profile({player_id:"isolated-visual",display_name:"Görsel Test",rating:4374,
      honors:{rank_trophy_ids:[],badge_ids:[]},selected_core:{id:"core_resonance",level:1},
      featured_deck:{module_ids:["laser","shield","cooler","battery","emp","amplifier"],matches:12}});
    document.getElementById("public-profile-dialog").showModal();
  });
  await expect(page.locator("#public-profile-content .profile-honor-item")).toHaveCount(0);
  await expect(page.locator("#public-profile-content .profile-honor-empty")).toHaveCount(2);
  await page.evaluate(()=>GridshardI18n.apply("en"));
  await expect(page.locator("#public-profile-content .profile-honor-empty").first()).toHaveText("Not earned yet");
  await page.evaluate(()=>GridshardI18n.apply("tr"));
  await expect(page.locator("#public-profile-content .profile-honor-empty").first()).toHaveText("Henüz kazanılmadı");
  await expect(page.locator("#public-profile-content .profile-deck-showcase h3 .ui-icon")).toHaveCount(1);
  const shared=await page.evaluate(()=>{
    const own=document.querySelector(".profile-summary-panel .profile-deck-showcase");
    const publicPanel=document.querySelector("#public-profile-content .profile-deck-showcase");
    return getComputedStyle(own).backgroundImage===getComputedStyle(publicPanel).backgroundImage;
  });
  expect(shared).toBe(true);
  // Scroll bars stay hidden without disabling wheel/touch/keyboard scrolling.
  const scrolling=await page.locator("#public-profile-content").evaluate(element=>{
    const style=getComputedStyle(element);
    element.scrollTop=100;
    return {hiddenBar:style.scrollbarWidth==="none",canScroll:element.scrollHeight>element.clientHeight,advanced:element.scrollTop>0};
  });
  expect(scrolling).toEqual({hiddenBar:true,canScroll:true,advanced:true});
  await page.locator("#public-profile-content").evaluate(element=>{element.scrollTop=0;});
  await page.screenshot({path:testInfo.outputPath("visited-profile-empty.png")});
  await page.evaluate(()=>{
    __visualAudit.profile({display_name:"Görsel Test",rating:4374,
      honors:{rank_trophy_ids:["season_first"],badge_ids:[]}});
    __visualAudit.ownHonors(["season_first"]);
  });
  // Use the real definition id returned by the current catalog, not an assumed
  // earned title. Unknown awarded ids are also preserved by the renderer.
  await expect(page.locator("#public-profile-content .profile-honor-item[data-earned=true]")).toHaveCount(1);
  await expect(page.locator("#profile-rank-trophy-collection .profile-honor-item[data-earned=true]")).toHaveCount(1);
  await page.evaluate(()=>document.getElementById("public-profile-dialog").close());
  await page.evaluate(()=>{
    const payload={joined:true,team_id:"isolated-visual-team",name:"Test Takımı",member_count:1,total_trophies:27,average_trophies:27,
      statistics:{total_matches:1,win_rate:1},members:[],requests:[],tournament:{}};
    __visualAudit.ownTeam(payload);
    __visualAudit.team(payload);
    document.getElementById("team-profile-dialog").showModal();
  });
  await expect(page.locator("#team-profile-total-trophies .trophy-value-icon")).toHaveCount(1);
  await expect(page.locator("#team-profile-average-trophies .trophy-value-icon")).toHaveCount(1);
  await expect(page.locator("#team-profile-content .team-profile-stat-grid .trophy-value-icon")).toHaveCount(2);
  await page.screenshot({path:testInfo.outputPath("team-profile.png")});
  await page.evaluate(()=>document.getElementById("team-profile-dialog").close());
  expect(errors).toEqual([]);
});
