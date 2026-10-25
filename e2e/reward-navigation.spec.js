const {test,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('./ui-helpers');

test('reward focus, wallet-sensitive core arrows and account UI defaults',async({page},info)=>{
  test.setTimeout(150000);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let wallet={circuit_credits:0,flux_shards:0};
  // UI fixtures derive from real response schemas; no live profile is edited.
  await page.route(/\/profile\/[^/?]+\/meta-progression$/,async route=>{
    const response=await route.fetch(),json=await response.json();
    Object.assign(json,wallet);
    const core=json.cores.types.find(c=>c.id==='core_resonance');
    Object.assign(core,{level:8,shards:320,legacy_shards:0});
    core.next_upgrade_cost={circuit_credits:6000,shards:320,flux_shards:0};
    await route.fulfill({response,json});
  });
  await page.route(/\/profile\/[^/?]+(?:\/notifications\/[^/?]+\/seen)?$/,async route=>{
    const response=await route.fetch(),json=await response.json(),e=json.engagement;
    if(e){
      e.daily_login.today=26;
      for(const r of e.daily_login.rewards){r.claimed=r.day<26;r.claimable=r.day===26;}
      const earned=e.reward_track.find(r=>r.tier===18);
      e.season_xp=earned.required_xp;e.current_tier=18;
      for(const r of e.reward_track){r.claimed=r.tier<18;r.claimable=r.tier===18;}
    }
    await route.fulfill({response,json});
  });
  await page.addInitScript(()=>localStorage.setItem('gridshard.tutorial.v1','complete'));
  await page.goto('/?e2e=1',{waitUntil:'domcontentloaded'});
  await waitForParticipantReady(page);
  async function open(screen){
    await page.locator(`[data-open-screen="${screen}"]`).first().evaluate(b=>b.click());
    await expect(page.locator('body')).toHaveAttribute('data-app-screen',screen);
  }
  async function inScrollView(selector){
    return page.locator(selector).evaluate(node=>{
      let p=node.parentElement;
      while(p&&!/(auto|scroll)/.test(getComputedStyle(p).overflowY))p=p.parentElement;
      const a=node.getBoundingClientRect(),b=p?.getBoundingClientRect();
      return b&&a.top>=b.top-1&&a.bottom<=b.bottom+1;
    });
  }
  await open('daily-rewards');
  const today='.monthly-login-card:has([data-login-claim="26"])';
  await expect.poll(()=>inScrollView(today)).toBe(true);
  await page.screenshot({path:info.outputPath('daily-focused.png')});
  await open('rewards');
  const earned='.season-pass-row:has([data-tier-claim="18"])';
  await expect.poll(()=>inScrollView(earned)).toBe(true);
  await page.screenshot({path:info.outputPath('season-focused.png')});

  await open('modules');
  await page.locator('[data-card-page="cores"]').click();
  const tile=page.locator('#core-collection-list [data-core-type="core_resonance"]');
  await expect(tile.locator('.upgrade-arrow')).toHaveCount(0);
  wallet={circuit_credits:6000,flux_shards:0};
  await open('menu');await open('modules');await page.locator('[data-card-page="cores"]').click();
  await expect(tile.locator('.upgrade-arrow')).toHaveCount(1);
  await expect(page.locator('[data-card-page="cores"] > .upgrade-arrow')).toHaveCount(1);
  await expect.poll(()=>tile.locator('.upgrade-arrow').evaluate(n=>{const a=n.getBoundingClientRect(),b=n.parentElement.getBoundingClientRect();return a.width>0&&a.left>=b.left&&a.right<=b.right;})).toBe(true);
  wallet={circuit_credits:2000,flux_shards:0};
  await open('menu');await open('modules');await page.locator('[data-card-page="cores"]').click();
  await expect(tile.locator('.upgrade-arrow')).toHaveCount(1); // skill only
  await expect.poll(()=>page.locator('[data-card-page-panel="cores"] .mobile-section-heading').evaluateAll(nodes=>nodes.every(n=>getComputedStyle(n).borderLeftWidth==='0px'))).toBe(true);
  await page.locator('#active-core-card .core-collection-tile').click();
  await page.locator('[data-core-detail-tab="skills"]').click();
  await expect(page.locator('[data-core-detail-tab="skills"] > .upgrade-arrow')).toHaveCount(1);
  const closeStyle=await page.locator('#core-detail-dialog .detail-card-close').evaluate(n=>{
    const s=getComputedStyle(n);return[s.width,s.height,s.borderRadius,s.backgroundImage,s.fontSize];
  });
  await page.locator('#core-detail-dialog .detail-card-close').click();
  await open('menu');
  await page.locator('#reward-inbox-button').click();
  const inbox=page.locator('#reward-inbox-close');
  await expect(inbox).toBeVisible();
  expect(await inbox.evaluate(n=>{const s=getComputedStyle(n);return[s.width,s.height,s.borderRadius,s.backgroundImage,s.fontSize];})).toEqual(closeStyle);
  await inbox.click();
  await open('friends');
  await expect(page.locator('#friends-summary')).toHaveCount(0);
  expect(await page.locator('.friends-hero h3').evaluate(n=>getComputedStyle(n).justifyContent)).toBe('center');

  await open('menu');await page.locator('#home-arena-card').click();
  await page.locator('#arena-leaderboard-button').click();
  await page.locator('[data-leaderboard-tab="core_damage"]').click();
  await expect(page.locator('[data-leaderboard-tab="core_damage"] .core-emblem-set')).toHaveCount(1);
  await page.locator('#leaderboard-back').click();
  await page.locator('#arena-leaderboard-button').click();
  await expect(page.locator('[data-leaderboard-tab="trophies"]')).toHaveClass(/is-active/);
  await page.locator('[data-leaderboard-scope="group"]').evaluate(b=>b.click());
  await page.locator('#leaderboard-back').click();await page.locator('#arena-leaderboard-button').click();
  await expect(page.locator('[data-leaderboard-scope="general"]')).toHaveClass(/is-active/);
  expect(errors).toEqual([]);
});
