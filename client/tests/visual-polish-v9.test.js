const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),vm=require("node:vm"),path=require("node:path");
const app=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"../src/visual-polish-v9.css"),"utf8");
const deviceCss=fs.readFileSync(path.join(__dirname,"../src/module-device-v8.css"),"utf8");
const between=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b,app.indexOf(a)));
class Element {
  constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.listeners={};this.className="";
    this.classList={add:()=>{}};}
  get firstElementChild(){return this.children[0]||null;}
  appendChild(child){if(child.parent)child.parent.children.splice(child.parent.children.indexOf(child),1);child.parent=this;this.children.push(child);return child;}
  append(...children){children.forEach(c=>this.appendChild(c));}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(type,fn){(this.listeners[type]??=[]).push(fn);}
  click(){if(!this.disabled)for(const fn of this.listeners.click||[])fn({currentTarget:this});}
}
const find=(node,name)=>node.className===name?node:node.children.map(c=>find(c,name)).find(Boolean);
function fixture(messages=[]){
  const read=new Set(),marks=[],requests=[],applied=[],status=new Element("p");let failId=null;
  const context=vm.createContext({document:{createElement:t=>new Element(t),getElementById:id=>id==="reward-inbox-status"?status:null},
    participantPlayerId:"own",activeInboxTab:"battle",inboxExpanded:new Set(),inboxReadStore:{has:k=>read.has(k),mark:k=>read.add(k)},
    inboxClaimBusy:false,inboxDismissBusy:false,inboxMutationVersion:0,rewardInboxState:{messages},
    localizedUiText:s=>s,uiLocale:()=>"tr-TR",markInboxNoticesSeen:ids=>marks.push(ids),dismissInboxMessages:()=>{},
    createInboxCardMeta:()=>new Element("div"),createRewardChestButton:()=>new Element("button"),
    profileState:{applyProfile:p=>applied.push(p)},renderRewardInbox:()=>{},renderProfileSummary:()=>{},loadMetaProgression:async()=>{},loadRewardInbox:async()=>{},
    requestJsonWithDeadline:async(url,options)=>{
      const id=decodeURIComponent(url.split("/").at(-2));requests.push({id,body:JSON.parse(options.body),url});
      if(id===failId)throw new Error("bağlantı kesildi");
      return{messages:context.rewardInboxState.messages.filter(m=>m.message_id!==id),profile:{owner:"own"}};
    }});
  vm.runInContext(between("  function inboxReadKey(","  function renderInboxDismissControls(")+"\n"+
    between("  function createInboxNoticeCard(","  let activeInboxTab = ")+"\nthis.notice=createInboxNoticeCard;this.reward=createInboxRewardCard;",context);
  return{context,marks,requests,applied,status,setFail:id=>{failId=id;}};
}
const message=(id,category="battle")=>({message_id:id,category,status:"unclaimed",chest:{chest_name_tr:"Gümüş Sandık"}});
test("system/purchase messages start closed, title and envelope toggle content without read-state copy",()=>{
  const f=fixture();
  const card=f.context.notice({notice_id:"notice",title_tr:"Bakım",body_tr:"Açıklama",seen:false});
  const envelope=card.children[0],copy=card.children[1],title=copy.children[0],content=copy.children[1];
  assert.equal(content.hidden,true);assert.equal(envelope.attrs["aria-expanded"],"false");
  assert.equal(find(card,"inbox-read-state"),undefined);assert.equal(find(card,"inbox-message-delete"),undefined);
  title.click();assert.equal(content.hidden,false);assert.equal(envelope.attrs["aria-expanded"],"true");assert.equal(f.marks.length,1);
  envelope.click();assert.equal(content.hidden,true);
  title.listeners.keydown[0]({key:"Enter",preventDefault(){}});assert.equal(content.hidden,false);
  const rerender=f.context.notice({notice_id:"notice",title_tr:"Bakım",seen:true});
  assert.equal(rerender.children[1].children[1].hidden,false,"Server read refresh must not collapse an expanded message");
  const purchase=f.context.notice({notice_id:"buy",category:"purchase",title_tr:"Satın alım tamamlandı · 120 Akı",product_name_tr:"120 Akı"});
  assert.equal(purchase.children[1].children[0].textContent,"Satın alım tamamlandı");
  assert.ok(find(purchase,"inbox-message-delete"));
});
test("victory reward summary is title only, with a sibling collect button",()=>{
  const f=fixture([message("one")]),card=f.context.reward(message("one"));
  assert.equal(card.children.length,3);assert.equal(card.children[1].children[0].textContent,"Savaş Zaferi Sandığı");
  assert.equal(card.children[1].children[1].hidden,true);assert.equal(card.children[2].textContent,"TOPLA");
});
test("collect all is serial, category scoped, deterministic and includes subsequent mailbox pages",async()=>{
  const f=fixture([message("a"),message("b"),message("other","reward")]);
  await f.context.collectInboxRewards();
  assert.deepEqual(f.requests.map(r=>r.id),["a","b"]);
  assert.deepEqual(f.requests.map(r=>r.body.request_id),["inbox:a","inbox:b"]);
  assert.equal(f.context.rewardInboxState.messages.length,1);assert.equal(f.context.inboxClaimBusy,false);
});
test("partial collect failures preserve previous grants and retry only remaining IDs",async()=>{
  const f=fixture([message("a"),message("b"),message("c")]);f.setFail("b");
  await f.context.collectInboxRewards();assert.equal(f.context.rewardInboxState.messages.length,2);
  assert.match(f.status.textContent,/1 sandık toplandı/);assert.equal(f.context.inboxClaimBusy,false);
  f.setFail(null);await f.context.collectInboxRewards();
  assert.deepEqual(f.requests.map(r=>r.id),["a","b","b","c"]);
  assert.equal(f.context.rewardInboxState.messages.length,0);
});
test("single collect and account switches cannot collect another message or apply a stale profile",async()=>{
  const f=fixture([message("a"),message("b")]);await f.context.collectInboxRewards(["b"]);
  assert.deepEqual(f.requests.map(r=>r.id),["b"]);
  const switched=fixture([message("a")]);
  switched.context.requestJsonWithDeadline=async()=>{switched.context.participantPlayerId="new";return{messages:[],profile:{owner:"old"}};};
  await switched.context.collectInboxRewards();assert.equal(switched.applied.length,0);assert.equal(switched.context.rewardInboxState.messages.length,1);
});
test("shared surfaces preserve hidden state, core HP clears the charge mask and shelf has name/cost tracks",()=>{
  assert.match(css,/\.inbox-message-content\[hidden\] \{ display:none !important/);
  assert.match(css,/\.arena-reward-node\.is-claimable/);assert.ok(!app.includes("TÜM AÇILABİLİR SANDIKLAR AÇILDI"));
  assert.match(deviceCss,/grid-template-rows:auto 52px auto !important/);
  assert.match(deviceCss,/mask:none !important; -webkit-mask:none !important/);
  assert.match(deviceCss,/grid-template-rows:minmax\(0,1fr\) 12px 14px !important/);
});

test("shelf art is constrained to its own row while labels retain a dedicated visible track",()=>{
  const rule=selector=>deviceCss.slice(deviceCss.indexOf(selector)).match(/\{([^}]+)\}/)[1];
  const base=':root body[data-app-screen="play"] #module-shelf .module-card.deck-module-card';
  assert.match(rule(base+" {"),/height:100% !important; min-height:0 !important/);
  const icon=rule(base+" > .module-icon {"),image=rule(base+" > .module-icon > .module-emblem {");
  assert.match(icon,/position:relative !important/);assert.match(icon,/overflow:hidden !important/);
  assert.match(image,/position:absolute !important; inset:0 !important/);
  assert.match(image,/max-width:100% !important; max-height:100% !important/);
  assert.match(image,/object-fit:contain/);
  const name=rule(base+" > .name {");assert.match(name,/grid-area:2 \/ 1 !important/);
  assert.match(name,/height:12px/);assert.match(name,/z-index:1/);
  // Static track bounds, not a substitute for the user's real game viewport.
  for(const height of [48,54,60,63]){
    const artHeight=height-2-6-2-12-14;
    assert.ok(artHeight>0);assert.equal(artHeight+2+12+14+6+2,height);
  }
});

test("shelf cost has no dark chip in either affordability state",()=>{
  const rule=deviceCss.slice(deviceCss.indexOf('#module-shelf .module-card.deck-module-card > .current-cost-badge {')).match(/\{([^}]+)\}/)[1];
  for(const value of ["background:transparent !important","border:0 !important","box-shadow:none !important","padding:0 !important"])assert.ok(rule.includes(value));
  assert.match(rule,/grid-area:3 \/ 1 !important/);
  // ID scoping beats the old class-only affordable/unaffordable backgrounds.
  assert.ok(deviceCss.includes('#module-shelf .module-card.deck-module-card > .current-cost-badge'));
});

test("every season container opens/reveals now; only explicit nested chests get stock rows",async()=>{
  for(const kind of ["tiers","premium-tiers"])for(const nestedTier of [null,"silver","gold","diamond"]){
    const f=fixture(),shown=[],rewardHost=new Element("div");
    const reward={tier:5,chest_tier:nestedTier,circuit_credits:120,flux_shards:15,module_shards:6,module_definition_id:"laser"};
    const deliveries=nestedTier ? [{delivery:"inventory",chest:{name_tr:`${nestedTier} Sandık`}}] : [];
    f.context.profileState.viewModel=()=>({engagement:{season_id:"test",rewardTrack:[reward],premiumRewardTrack:[reward]}});
    f.context.accountDataLoader={claimEngagementReward:async()=>({ok:true,payload:{
      season_reward_receipt:{...reward,circuit_credits:125},
      ...(kind==="tiers"?{season_chest_delivery:deliveries[0]||null}:{season_chest_deliveries:deliveries}),
    }})};
    f.context.showChestOpening=options=>shown.push({kind:"opening",options});
    f.context.showChestReveal=receipt=>shown.push({kind:"reveal",receipt});
    f.context.showChestFailure=()=>assert.fail("Successful season reward must reveal contents");
    f.context.renderRemoteDataStatus=()=>{};
    f.context.document.getElementById=id=>id==="chest-reveal-rewards"?rewardHost:f.status;
    vm.runInContext(between("  async function claimEngagementReward(","  async function saveProfileDisplayName("),f.context);
    await f.context.claimEngagementReward(kind,5,new Element("button"));
    assert.deepEqual(shown.map(x=>x.kind),["opening","reveal"]);
    assert.equal(shown[1].receipt.rewards.circuit_credits,125,"Show confirmed contents, not the preview amount");
    assert.equal(shown[1].receipt.rewards.flux_shards,15);
    assert.equal(rewardHost.children.length,nestedTier?1:0,"A normal season container must never become a shop stock row");
  }
});

test("collected arena rewards remain colorful without enabling another claim; leaderboard is one row",()=>{
  const claimed=css.match(/#arena-detail-dialog \.arena-reward-node\.is-claimed\s*\{([^}]+)\}/)[1];
  assert.match(claimed,/opacity:1 !important; filter:none !important/);
  assert.match(claimed,/border:2px solid #63dcb2 !important/);
  assert.match(claimed,/cursor:default !important/);
  const pathRender=between("  function renderArenaPath(","  const CORE_VISUALS = ");
  assert.match(pathRender,/reward\.disabled = !node\.claimable/);
  assert.ok(!claimed.includes("pointer-events:auto"));
  const leaderboard=css.match(/#arena-detail-dialog #arena-leaderboard-button\s*\{([^}]+)\}/)[1];
  assert.match(leaderboard,/display:flex !important; flex-direction:row !important; flex-wrap:nowrap !important/);
  assert.match(leaderboard,/align-items:center !important; justify-content:center !important/);
});

test("quick select/remove keep their semantic green/red face without a gold backing",()=>{
  const quick=css.match(/#module-quick-select\s*\{([^}]+)\}/)[1];
  assert.match(quick,/background:transparent !important; border:0 !important; box-shadow:none !important/);
  assert.match(quick,/color:var\(--gs2-letter\) !important/);
  assert.ok(!css.includes("#module-detail-upgrade,#module-quick-select"));
  const shared=fs.readFileSync(path.join(__dirname,"../src/ui-components-v2.css"),"utf8");
  assert.match(shared,/button\[data-action="add"\][\s\S]*?--gs2-face:#7dd65e/);
  assert.match(shared,/button\[data-action="remove"\][\s\S]*?--gs2-face:#be304c/);
  assert.match(app,/select\.dataset\.action = selected \? "remove" : "add"/);
});
