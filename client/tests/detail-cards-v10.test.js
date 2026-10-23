"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const api=require("../src/detail-card-layout.js");
const read=n=>fs.readFileSync(path.join(__dirname,n),"utf8");
const app=read("../src/app.js"),css=read("../src/detail-cards-v10.css"),layout=read("../src/detail-card-layout.js"),html=read("../index.html");
const between=(a,b)=>app.slice(app.indexOf(a),app.indexOf(b,app.indexOf(a)));
function fixture(){
  const byId=new Map();let creations=0;
  const doc={hidden:false,documentElement:{lang:"tr"},events:{},addEventListener(t,fn){(this.events[t]??=[]).push(fn);},
    createElement:t=>{creations++;return new Element(t);},getElementById:id=>byId.get(id)||null,
    querySelectorAll:s=>s==="dialog.module-detail-dialog"?[...byId.values()].filter(e=>e.tag==="dialog"):[],querySelector:()=>null,
    createTextNode:text=>{const e=new Element("text");e.textContent=text;return e;}};
  class Element{
    constructor(tag){this.tag=tag;this.className="";this.children=[];this.dataset={};this.attrs={};this.events={};this.ownerDocument=doc;this.style={setProperty(){}};
      this.classList={add:(...names)=>{this.className+=" "+names.join(" ");},toggle:(n,on)=>{const names=new Set(this.className.split(" "));on?names.add(n):names.delete(n);this.className=[...names].join(" ");}};}
    setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}
    append(...nodes){for(let n of nodes){if(typeof n==="string")n=doc.createTextNode(n);n.remove();n.parentElement=this;this.children.push(n);}}
    prepend(...nodes){this.append(...nodes);this.children.unshift(...this.children.splice(this.children.length-nodes.length));}
    appendChild(n){this.append(n);return n;}replaceChildren(...nodes){for(const n of this.children)n.parentElement=null;this.children=[];this.append(...nodes);}
    remove(){if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.parentElement=null;}}
    closest(tag){return this.tag===tag?this:this.parentElement?.closest(tag)||null;}
    querySelector(s){return this.querySelectorAll(s)[0]||null;}
    querySelectorAll(s){const match=n=>s.startsWith(".")?n.className.split(" ").includes(s.slice(1)):s.startsWith("[")?Boolean(n.dataset.moduleDetailTab||n.dataset.coreDetailTab):n.tag===s;
      return this.children.flatMap(n=>[...(match(n)?[n]:[]),...n.querySelectorAll(s)]);}
    addEventListener(t,fn){(this.events[t]??=[]).push(fn);}async click(){if(!this.disabled)for(const fn of this.events.click||[])await fn();}
    close(){this.open=false;for(const fn of this.events.close||[])fn();}showModal(){this.open=true;}
  }
  function make(tag,cls="",id=""){const n=doc.createElement(tag);n.className=cls;if(id)byId.set(id,n);return n;}
  function card(prefix){
    const dialog=make("dialog","module-detail-dialog",prefix+"-detail-dialog"),header=make("header","module-detail-hero"),art=make("div","module-detail-art",prefix+"-detail-art"),image=make("img","module-emblem"),title=make("div","module-detail-title"),subtitle=make("small","detail-section-label"),host=make("section","module-detail-tab-content",prefix+"-detail-tab-content");
    art.append(image);title.append(subtitle);header.append(art,title);dialog.append(header,host);
    for(const key of ["name","rarity","level","selected-state","shards","progress","shard-icon","universal","stats","upgrade","select","status"]){
      const node=make(key==="upgrade"||key==="select"?"button":"span","",prefix+"-detail-"+key);dialog.append(node);
    }
    for(const tab of ["overview","stats",prefix==="core"?"skills":"talents"]){const b=make("button");b.dataset[prefix==="core"?"coreDetailTab":"moduleDetailTab"]=tab;dialog.append(b);}
    return{dialog,header,art,image,host,subtitle};
  }
  return{doc,make,byId,card,get creations(){return creations;}};
}
test("both dialogs are partial-screen, ID-scoped and have red close/true disabled surfaces",()=>{
  assert.match(css,/:is\(#module-detail-dialog,#core-detail-dialog\)/);
  assert.match(css,/width:min\(384px,calc\(100vw - 28px\)\)/);assert.match(css,/height:min\(680px,86dvh\)/);
  assert.match(css,/\.detail-card-close\s*\{[^}]*#ff6c7d/);
  assert.match(css,/> button:disabled\s*\{[^}]*background:linear-gradient\(#56728c,#3b526c\) !important/);
  assert.match(css,/:not\(\[data-detail-tab="overview"\]\)[\s\S]*?\.module-detail-tab-content \{ flex:1 1 0 !important/);
  assert.match(css,/\.module-detail-art \{[\s\S]*?padding:0 !important/);
  assert.doesNotMatch(layout,/ResizeObserver|requestAnimationFrame|setTimeout|setInterval|replaceChildren|scrollHeight|clientHeight/);
});
test("overview stays concise for all 36 modules with no preview animation or caption",()=>{
  require("../src/canon-data.js");
  for(const item of globalThis.GRIDSHARD_CANON_MODULES){const model={...item,definition_id:item.id,description_tr:"Birinci cümle. İkinci cümle."};

    assert.ok(api.description(model).length<=100);
  }
  assert.equal(api.description({description_tr:"Hasar 1.2 oranındadır. İkinci cümle."}),"Hasar 1.2 oranındadır.");
  assert.equal(api.description({role_tr:"Devreye enerji sağlar."},{core:true}),"Devreye enerji sağlar.");
  assert.equal(api.demoKind,undefined);assert.doesNotMatch(layout,/detail-demo-|Temsili çalışma|Illustrative preview/);assert.doesNotMatch(css,/detail-demo-|@keyframes detail-/);
  assert.equal(api.description({definition_id:"laser",description_en:"Burns the target. Another sentence."},{english:true}),"Burns the target.");
  assert.doesNotMatch(layout,/detail-page-controls|detail-page-body/);
});
test("static card mounting preserves art and controls without preview listeners or allocations",()=>{
  const f=fixture(),m=f.card("module"),c=f.card("core"),control=f.make("button");m.host.append(control);
  m.host.dataset.tab="overview";api.mount(m.host);
  assert.equal(m.art.children.length,1);assert.equal(m.art.children[0],m.image);assert.equal(m.host.children[0],control);
  const close=m.header.querySelector(".detail-card-close");assert.ok(close);
  const count=f.creations;api.mount(m.host);assert.equal(f.creations,count);
  c.host.dataset.tab="overview";api.mount(c.host);assert.equal(f.doc.events.visibilitychange,undefined);
  assert.equal(m.dialog.events.close,undefined);
  m.host.dataset.tab="stats";api.mount(m.host);assert.equal(m.subtitle.textContent,"İstatistikler");
  assert.equal(m.header.querySelector(".detail-card-close"),close);
  m.dialog.open=true;close.click();assert.equal(m.dialog.open,false);assert.equal(m.art.children.length,1);
  assert.match(css,/left:50% !important; top:48%/);
});
function appFixture(){
  const f=fixture(),m=f.card("module"),c=f.card("core");
  const item={definition_id:"laser",name_tr:"Lazer",unlocked:true,level:2,rarity:"common",category:"saldırı",shards:3,unlock_trophies:0,
    next_upgrade_cost:{shards:4,circuit_credits:200,flux_shards:0},stats:{max_hp:106,base_damage:13.2,cooldown_ms:980,energy_per_second:1.2},next_stats:{max_hp:109,base_damage:13.86,cooldown_ms:970,energy_per_second:1.21}};
  const core={id:"core_resonance",name_tr:"Rezonans Çekirdeği",unlocked:true,selected:false,level:2,shards:1,legacy_shards:1,energy_per_second:5,energy_capacity:20,next_stats:{energy_per_second:5.2,energy_capacity:22},next_upgrade_cost:{shards:3,flux_shards:20},skills:[]};
  const icon=()=>f.make("span","ui-icon"),calls=[];
  const context={document:f.doc,window:{GridshardDetailPages:{mount:()=>{}}},GridshardDetailPages:api,item,core,calls,participantPlayerId:"preview",
    metaProgressionState:{unavailable:false,universal_module_shards:0,circuit_credits:500,flux_shards:100,cores:{types:[core]},module_collection:[item]},
    activeMetaModule:()=>item,activeMetaCore:()=>core,metaModuleDefinition:()=>({maxHp:100}),deckEditorSlots:[],selectedCollectionModuleId:"laser",selectedCollectionCoreId:core.id,
    clientDefinitionId:id=>id,uiLocale:()=>"tr-TR",localizedUiText:s=>s,moduleRarityLabel:()=>"Yaygın",setRarityBadge(){},
    setCostButtonLabel:(button,label)=>{button.textContent=label;},renderDetailStatRow(){},renderModuleDetailTab(){},renderCoreDetailTab(){},
    mountModuleEmblem(){},mountCoreEmblem(){},moduleEmblemMarkup:()=>"",createModulePuzzlePiece:()=>f.make("span"),applyCoreVisualIdentity(){},
    specialEntries:()=>[],moduleCycleEntry:()=>({label:"Aralık",value:"0,98 sn"}),createUiIcon:icon,createCostChip:()=>f.make("span"),
    statGainText:change=>"+"+change,serverCopy:(tr,en)=>tr||en,poolCategoryLabel:()=>"Saldırı",setDetailTabUpgradeArrow(){},
    talentDisplayName:t=>t.name_tr,talentDisplayDescription:t=>t.description_tr,
    metaProgressionMutation:async url=>{calls.push(url);},mutateSelectedCore:async url=>{calls.push(url);},
  };
  context.moduleTalentAvailable=()=>false;context.coreSkillAvailable=()=>false;
  vm.createContext(context);
  vm.runInContext(between("  function moduleUpgradeBlockReason(","  // Modülü açan aşama")+
    between("  function moduleTalentSelectable(","  // Göstergeler yalnız")+
    between("  function metaIndicatorsLive(","  function moduleTalentAvailable(")+
    between("  function createStatSignature(", "  // Çevrim karosu:")+
    between("  function openModuleDetail(","  function navigateModuleDetail(")+
    between("  function openCoreDetail(","  function navigateCoreDetail(")+
    between("  function createStatGain(","  // İstatistik sekmesinin")+
    between("  const TALENT_KIND_LABELS", "  function createModuleStatTiles(")+
    "\nthis.openModule=openModuleDetail;this.openCore=openCoreDetail;",context);
  return{...f,m,c,item,core,context,calls};
}
test("actual module dialog disables upgrades for every resource/lock/max/offline condition",()=>{
  const f=appFixture(),button=f.byId.get("module-detail-upgrade"),state=f.context.metaProgressionState;
  f.context.openModule();assert.equal(button.disabled,true);assert.equal(button.attrs["aria-disabled"],"true");
  f.item.shards=4;f.context.openModule();assert.equal(button.disabled,false);
  state.circuit_credits=199;f.context.openModule();assert.equal(button.disabled,true);
  state.circuit_credits=500;f.item.next_upgrade_cost.flux_shards=101;f.context.openModule();assert.equal(button.disabled,true);
  f.item.next_upgrade_cost.flux_shards=0;f.item.shards=3;state.universal_module_shards=1;f.context.openModule();assert.equal(button.disabled,false);
  f.item.unlocked=false;f.context.openModule();assert.equal(button.disabled,true);
  f.item.unlocked=true;state.unavailable=true;f.context.openModule();assert.equal(button.disabled,true);
  state.unavailable=false;f.item.next_upgrade_cost=null;f.context.openModule();assert.equal(button.disabled,true);
});
test("actual core dialog counts legacy shards and requires level resources and live data",()=>{
  const f=appFixture(),button=f.byId.get("core-detail-upgrade"),state=f.context.metaProgressionState;
  f.context.openCore();assert.equal(button.disabled,true);f.core.legacy_shards=2;f.context.openCore();assert.equal(button.disabled,false);
  state.flux_shards=19;f.context.openCore();assert.equal(button.disabled,true);
  state.flux_shards=100;f.core.unlocked=false;f.context.openCore();assert.equal(button.disabled,true);
  f.core.unlocked=true;state.unavailable=true;f.context.openCore();assert.equal(button.disabled,true);
  state.unavailable=false;f.core.next_upgrade_cost=null;f.context.openCore();assert.equal(button.disabled,true);
});
test("all numeric stat rows have a direct left icon and the same label/value columns as class/rarity",()=>{
  const f=appFixture();vm.runInContext(between("  function createModuleStatTiles(","  // Three distinct views:")+"\nthis.tiles=createModuleStatTiles;",f.context);
  const list=f.context.tiles(f.item);assert.ok(list.children.length>=4);
  for(const row of list.children){assert.equal(row.children[0].className,"ui-icon");assert.equal(row.children[1].tag,"dt");assert.equal(row.children[2].tag,"dd");}
  assert.match(css,/\.module-stat-chips small,.module-stat-tiles dt/);assert.match(css,/\.module-stat-chips strong,.module-stat-tiles dd/);
  assert.match(css,/grid-column:1; grid-row:1 \/ 3/);
});
test("core statistics use the same icon/label/value layout and real next-level gains",()=>{
  const f=appFixture();vm.runInContext(between("  function renderCoreDetailTab(","  function openCoreDetail(")+"\nthis.renderCore=renderCoreDetailTab;",f.context);
  f.context.renderCore("stats");const list=f.c.host.querySelector("dl");assert.equal(list.children.length,6);
  for(const row of list.children){assert.equal(row.children[0].className,"ui-icon");assert.equal(row.children[1].tag,"dt");assert.equal(row.children[2].tag,"dd");}
  assert.ok(list.children.find(row=>row.children[1].textContent==="Enerji üretimi").children[2].querySelector(".stat-next-gain"));
});
test("overview tiles stack icon, label and value without a written next-level row",()=>{
  const f=fixture(),host=f.make("div"),context={document:f.doc,localizedUiText:s=>s,createUiIcon:()=>f.make("span","ui-icon"),
    statGainText:n=>String(n),specialDisplayValue:s=>String(s.value)};vm.createContext(context);
  vm.runInContext(between("  function renderDetailStatRow(","  // Bir sonraki seviyenin farkı değerin")+"\nthis.render=renderDetailStatRow;",context);
  context.render(host,[{label:"CAN",value:106,current:106,next:109,icon:"hp"},{label:"HASAR",value:13.2,current:13.2,next:13.86,icon:"damage"}]);
  for(const box of host.children){
    assert.equal(box.children.length,3);assert.equal(box.children[0].className,"ui-icon");
    assert.equal(box.children[1].tag,"span");assert.equal(box.children[2].tag,"strong");
    assert.equal(box.querySelector(".detail-stat-next"),null);assert.ok(box.children[2].querySelector(".stat-next-gain"));
  }
  assert.equal(host.children[0].children[2].textContent,"106");
  const prefix='.module-detail-stats > div > ';
  const rule=selector=>css.slice(css.indexOf(selector)).match(/\{([^}]+)\}/)[1];
  assert.match(rule(prefix+'.ui-icon {'),/grid-row:1 !important/);
  assert.match(rule(prefix+'span:not(.ui-icon) {'),/grid-row:2 !important/);
  assert.match(rule(prefix+'strong {'),/grid-row:3 !important/);
  assert.doesNotMatch(rule(prefix+'span:not(.ui-icon) {'),/grid-column:2/);
});
test("upgrade handler rejects stale enabled state before making any mutation",async()=>{
  const f=appFixture(),button=f.byId.get("module-detail-upgrade");
  vm.runInContext(between("  async function upgradeCollectionModule(","  function setTeamActionStatus(")+"\nthis.upgrade=upgradeCollectionModule;",f.context);
  button.disabled=false;await f.context.upgrade();assert.equal(f.calls.length,0,"not enough shards even if the old button looked active");
  f.item.shards=4;button.disabled=true;await f.context.upgrade();assert.equal(f.calls.length,0,"busy/disabled guard");
  button.disabled=false;await f.context.upgrade();assert.equal(f.calls.length,1);assert.ok(f.calls[0].endsWith("/modules/laser/upgrade"));
});
test("talent cards retain all real choices, locked previews and authoritative selection endpoints",async()=>{
  const f=appFixture();f.item.talents=[5,8,11,14].map((level,i)=>({tier:i+1,level,kind:["basic","signature","tuning","mastery"][i],flux_cost:15,selected:null,
    choices:[{id:"a",name_tr:"Sol",description_tr:"Sol açıklama"},{id:"b",name_tr:"Sağ",description_tr:"Sağ açıklama"}]}));
  vm.runInContext(between("  function renderModuleDetailTab(","  function openModuleDetail(")+"\nthis.render=renderModuleDetailTab;",f.context);
  f.context.render("talents");let buttons=f.m.host.querySelector(".module-talent-path").querySelectorAll("button");assert.equal(buttons.length,8);
  for(const button of buttons){assert.equal(button.children[0].className,"ui-icon");assert.ok(button.className.includes("is-unavailable"));}
  await buttons[0].click();assert.equal(f.calls.length,0);assert.equal(f.m.host.children[0].textContent,"Sol açıklama");
  f.item.level=4;f.context.render("talents");buttons=f.m.host.querySelector(".module-talent-path").querySelectorAll("button");
  await buttons[0].click();assert.equal(f.calls.length,1,f.byId.get("module-detail-status").textContent);assert.ok(f.calls[0].endsWith("/modules/laser/talents/1/a"));
  assert.match(app,/mutateSelectedCore\(`skills\/\$\{skill\.id\}`\)/);assert.match(app,/talents\/reset/);
});
test("shared art mappings, next-level comparison and only three semantic tabs are retained",()=>{
  for(const icon of ["core","team","rarity","hp-red","damage","cycle","energy","talent","grid","guard"])assert.ok(css.includes(`detail-icons-v1/${icon}.webp`));
  assert.match(app,/rarity:"detail-rarity"/);assert.doesNotMatch(app,/detail-stat-next/);
  assert.equal((app.match(/GridshardDetailPages\?\.mount\(host,/g)||[]).length,2);
  assert.equal((html.match(/data-module-detail-tab=/g)||[]).length,3);assert.equal((html.match(/data-core-detail-tab=/g)||[]).length,3);
  assert.match(app,/button\?\.disabled \|\| !moduleUpgradeAvailable\(activeMetaModule\(\)\)/);
});
test("damage, DPS, energy and deployment current resolve to distinct semantic artwork",()=>{
  const context={};vm.createContext(context);
  vm.runInContext(between("  const UI_ART_ICONS = Object.freeze({","  function uiIconMarkup(")+"\nthis.art=UI_ART_ICONS;this.stats=STAT_ICONS;",context);
  assert.equal(context.art[context.stats.damage[0]],"battle","damage reuses the approved crossed swords");
  assert.equal(context.art[context.stats.dps[0]],"detail-damage","DPS receives the former damage artwork");
  assert.equal(context.art[context.stats.energy[0]],"detail-battery");
  assert.equal(context.art[context.stats.current[0]],"detail-energy");
  const mapped=["damage","dps","energy","current"].map(key=>context.art[context.stats[key][0]]);
  assert.equal(new Set(mapped).size,4);
});

test("signature mechanics appear in both Statistics views, including locked modules",()=>{
  const f=appFixture();f.item.signature_mechanic="Hedefe kesintisiz odaklanır.";f.item.unlocked=false;
  f.core.signature_mechanic="Devreye özel enerji desteği.";
  vm.runInContext(between("  function createModuleStatTiles(","  // Three distinct views:")+
    between("  function renderModuleDetailTab(","  function openModuleDetail(")+
    between("  function renderCoreDetailTab(","  function openCoreDetail(")+"\nthis.renderModule=renderModuleDetailTab;this.renderCore=renderCoreDetailTab;",f.context);
  f.context.renderModule("stats");f.context.renderCore("stats");
  for(const [card,text] of [[f.m,f.item.signature_mechanic],[f.c,f.core.signature_mechanic]]){
    const panel=card.host.querySelector(".module-stat-signature");assert.ok(panel);
    assert.equal(panel.children[0].children[0].className,"ui-icon");assert.equal(panel.children[1].textContent,text);
  }
});
test("old server DPS labels are clarified and the actual formula is explained, not doubled",()=>{
  const f=appFixture();
  vm.runInContext(between("  function specialLabel(","  // Authoritative identity")+"\nthis.label=specialLabel;",f.context);
  assert.equal(f.context.label({key:"dps",label_tr:"SANİYE HASARI"}),"TEORİK HASAR/SN");
  f.doc.documentElement.lang="en";assert.equal(f.context.label({key:"dps",label_en:"DAMAGE / SEC"}),"THEORETICAL DPS");
  f.doc.documentElement.lang="tr";f.item.stats.specials=[{key:"dps",value:13.45}];
  f.context.createModuleStatTiles=()=>f.make("dl");
  vm.runInContext(between("  function renderModuleDetailTab(","  function openModuleDetail(")+"\nthis.render=renderModuleDetailTab;",f.context);
  f.context.render("stats");assert.match(f.m.host.querySelector(".module-stat-note").textContent,/ek vuruş değildir/);
});
test("portrait talent rules keep every threshold without a scrolling description or pagination",()=>{
  const start=css.indexOf("/* Portrait talent view:");const rules=css.slice(start);
  assert.match(rules,/height:min\(680px,calc\(100dvh - 40px\)\)/);
  assert.match(rules,/max-height:none; overflow:visible/);
  assert.match(rules,/overflow:hidden !important/);
  assert.doesNotMatch(rules,/line-clamp|text-overflow|overflow:auto/);
  assert.match(rules,/@media \(max-height:520px\)/,"short-landscape accessibility fallback is explicit");
  assert.match(app,/level.title = localizedUiText\(TALENT_KIND_LABELS\[node.kind\]/);
  assert.match(app,/level.title = localizedUiText\(TALENT_KIND_LABELS\[tierKind\]/);
});

test("core talents preserve six choices, locked descriptions and real selection mutations",async()=>{
  const f=appFixture();f.core.level=1;
  f.core.skills=[5,8,11].flatMap((level,i)=>["a","b"].map(id=>({id:`tier${i}_${id}`,tier:i,level,flux_cost:10,
    name_tr:`Dal ${id}`,description_tr:`Açıklama ${i} ${id}`,learned:false,tier_selected:false})));
  vm.runInContext(between("  const CORE_SKILL_TIER_KINDS", "  function openCoreDetail(")+"\nthis.render=renderCoreDetailTab;",f.context);
  f.context.render("skills");let buttons=f.c.host.querySelector(".module-talent-path").querySelectorAll("button");
  assert.equal(buttons.length,6);assert.ok(buttons.every(b=>b.className.includes("is-unavailable")));
  await buttons[0].click();assert.equal(f.calls.length,0);assert.equal(f.c.host.children[0].textContent,"Açıklama 0 a");
  f.core.level=5;f.context.render("skills");buttons=f.c.host.querySelector(".module-talent-path").querySelectorAll("button");
  await buttons[0].click();assert.deepEqual(f.calls,["skills/tier0_a"]);
});
