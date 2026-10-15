"use strict";
const {test}=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const read=name=>fs.readFileSync(path.join(__dirname,"..",name),"utf8");
const html=read("index.html"),app=read("src/app.js"),css=read("src/canon.css");
const tiers=["bronze","silver","gold","diamond"];
const template=/<template id="painted-shop-chest-assets">([\s\S]*?)<\/template>/.exec(html)?.[1];

test("four painted chests are local decorative WebP assets; PNG masters stay out of runtime",()=>{
  assert.ok(template);
  assert.equal((template.match(/<img /g)||[]).length,4);
  assert.equal((template.match(/alt=""/g)||[]).length,4);
  assert.equal((template.match(/draggable="false"/g)||[]).length,4);
  for(const tier of tiers){
    assert.ok(template.includes(`data-painted-chest-tier="${tier}"`));
    assert.ok(template.includes(`src="./assets/ui/chests-casual-v2/${tier}.webp"`));
    const bytes=fs.readFileSync(path.join(__dirname,`../assets/ui/chests-casual-v2/${tier}.webp`));
    assert.equal(bytes.toString("ascii",0,4),"RIFF");
    assert.equal(bytes.toString("ascii",8,12),"WEBP");
    assert.ok(bytes.length<100000,`${tier}: oversized derivative`);
    // A checkout needs only the runtime derivative, not the high-res master.
  }
  assert.ok(!template.includes(".png"));
  assert.ok(!template.includes("http"));
});

test("shop artwork selector whitelists tiers, supports missing-template fallback and never queries arbitrary IDs",()=>{
  const source=app.slice(app.indexOf("  function casualChestAsset("),app.indexOf("  function shopChestAction("));
  let queries=[],available=true;
  const sandbox={chestVisualMarkup:tier=>`fallback:${tier}`,document:{getElementById:id=>{
    assert.equal(id,"painted-shop-chest-assets");
    return available?{content:{querySelector:selector=>{
      queries.push(selector);
      return {outerHTML:`painted:${selector}`};
    }}}:null;
  }}};
  vm.runInNewContext(source+"this.render=paintedShopChestMarkup;",sandbox);
  for(const tier of tiers) assert.equal(sandbox.render(tier),`painted:[data-painted-chest-tier="${tier}"]`);
  assert.equal(queries.length,4);
  assert.equal(sandbox.render('unknown"'), 'fallback:unknown"');
  assert.equal(queries.length,4);
  available=false;
  assert.equal(sandbox.render("bronze"),"fallback:bronze");
  assert.ok(!/fetch|addEventListener|state\./.test(source));
});

test("casual artwork keeps SVG fallbacks and the existing action/price layout",()=>{
  assert.equal((app.match(/paintedShopChestMarkup\(item.tier\)/g)||[]).length,1);
  assert.match(app,/card\.innerHTML = paintedShopChestMarkup\(item.tier\);/);
  assert.match(app,/visual\.innerHTML = shopChestSvg\(tier\);/);
  assert.match(app,/if \(selectedAction.kind === "gift"\) void claimGiftChest\(gift.id\);/);
  assert.match(app,/else if \(selectedAction.kind === "open-all"\) void openAllAvailableChests\(item.definition_id\);/);
  assert.match(app,/else void buyStoreChest\(item.definition_id\);/);
  const block=css.split("/* Painted shop chests:")[1]?.split("/* Casual chest reveal:")[0];
  assert.ok(block);
  assert.match(block,/object-fit:contain;/);
  assert.match(block,/filter:none !important;/);
  assert.match(block,/pointer-events:none;/);
  assert.ok(!/animation:|transform:|width:\d+px|height:\d+px/.test(block));
});

test("four reveal pairs are packaged as decorative closed/open images with no baked-in rewards",()=>{
  const reveal=/<template id="casual-chest-reveal-assets">([\s\S]*?)<\/template>/.exec(html)?.[1];
  assert.ok(reveal);
  assert.equal((reveal.match(/<img /g)||[]).length,8);
  assert.equal((reveal.match(/alt=""/g)||[]).length,8);
  assert.equal((reveal.match(/casual-chest-stage/g)||[]).length,4);
  for(const tier of tiers){
    for(const suffix of ["-reveal","-open"]){
      const file=fs.readFileSync(path.join(__dirname,`../assets/ui/chests-casual-v2/${tier}${suffix}.webp`));
      assert.equal(file.toString("ascii",8,12),"WEBP");
      assert.ok(file.length<300000);
      assert.ok(reveal.includes(`./assets/ui/chests-casual-v2/${tier}${suffix}.webp`));
    }
  }
  assert.ok(!/\.png|http|coin|reward-resource/.test(reveal));
});

test("open art and finite effects are gated by confirmed reveal state, not waiting/error/claimed",()=>{
  const block=css.split("/* Casual chest reveal:")[1];
  assert.ok(block);
  assert.match(block,/#chest-reveal-visual \.casual-chest-open \{ opacity:0; \}/);
  assert.match(block,/\[data-state="revealed"\] #chest-reveal-visual \.casual-chest-open \{ opacity:1;/);
  assert.match(block,/\[data-state="revealed"\] #chest-reveal-visual \.casual-chest-particles > i \{ animation:casual-chest-spark/);
  for(const state of ["error","claimed","opening"]) assert.ok(!block.includes(`[data-state="${state}"] #chest-reveal-visual .casual-chest-open`));
  assert.match(block,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(block,/body\[data-graphics="dusuk"\]/);
  assert.match(block,/\.casual-chest-burst,\.casual-chest-particles \{ display:none; \}/);
  const claimed=app.slice(app.indexOf("  function showClaimedChest("),app.indexOf("  async function buyStoreChest("));
  assert.match(claimed,/if \(receipt\?\.rewards\) \{\s*showChestReveal\(receipt\);/);
  assert.match(claimed,/card.dataset.state = "claimed"/);
  const purchase=app.slice(app.indexOf("  async function buyStoreChest("),app.indexOf("  const PAID_ICON_TOKENS"));
  assert.ok(purchase.indexOf("await metaProgressionMutation(")<purchase.indexOf("showChestReveal(payload.receipt)"));
  assert.match(purchase,/showChestFailure\(error\);/);
});

test("standard reward icons use the same family while custom tournament/large SVGs remain separate",()=>{
  const body=app.slice(app.indexOf("  function chestVisualMarkup("),app.indexOf("  function shopChestAction("));
  assert.match(body,/if \(!large && !safeVisual && \["bronze", "silver", "gold", "diamond"\]\.includes\(tier\)\)/);
  assert.match(body,/const painted = casualChestAsset\(safeTier\);/);
  assert.match(body,/return asset\?\.outerHTML \|\| "";/);
});

test("each standard chest emits its own sustained colored rays, cavity glow and sparks",()=>{
  const block=css.split("/* Casual chest reveal:")[1];
  const colors={bronze:"255,150,55",silver:"149,210,255",gold:"255,205,51",diamond:"80,235,255"};
  for(const [tier,color] of Object.entries(colors)){
    assert.ok(block.includes(`#chest-reveal-card[data-tier="${tier}"] { --casual-glow:${color};`));
  }
  assert.match(block,/conic-gradient\(from -42deg at 50% 100%/);
  assert.match(block,/rgba\(var\(--casual-glow\),\.8\)/);
  assert.match(block,/\[data-state="revealed"\] \.casual-chest-stage::before \{ animation:casual-chest-rays 2\.4s/);
  assert.match(block,/\[data-state="revealed"\] \.casual-chest-stage::after \{ animation:casual-chest-cavity 2\.4s/);
  assert.match(block,/100% \{ opacity:\.34; transform:scale\(1\); \}/);
  assert.match(block,/animation-delay:calc\(\.75s \+ var\(--reveal-index,0\) \* \.1s\)/);
  assert.ok(!block.includes("#fff1b1"));
  assert.match(block,/\.casual-chest-stage::before,\.casual-chest-stage::after \{ display:none; \}/);
  assert.match(block,/body\[data-graphics="dusuk"\] \.casual-chest-stage::after \{ display:none; \}/);
});
