"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {GridshardModuleVfx,ellipseHit,domeHit}=require("../src/battle/module-vfx.js");
const {GridshardBattleDeferredQueue}=require("../src/battle/battle-lifecycle.js");
require("../src/module-view-data.js");
function fixture(){
  let now=0,hidden=false,quality="yuksek",load=0;
  class Element{
    constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.classes=new Set();this.classList={add:(...n)=>n.forEach(v=>this.classes.add(v)),remove:(...n)=>n.forEach(v=>this.classes.delete(v))};this.style={setProperty:(k,v)=>this.style[k]=v};}
    setAttribute(k,v){this.attrs[k]=String(v);}appendChild(n){this.children.push(n);n.parentElement=this;return n;}
    addEventListener(name,fn){(this.listeners||={})[name]=fn;}
    remove(){if(this.parentElement){const p=this.parentElement;p.children=p.children.filter(n=>n!==this);this.parentElement=null;}}
    querySelector(s){return this.children.find(n=>s.startsWith(".")?n.classes.has(s.slice(1)):n.tag===s)||this.children.map(n=>n.querySelector(s)).find(Boolean)||null;}
  }
  const doc={createElement:n=>new Element(n),createElementNS:(_ns,n)=>new Element(n)},layer=new Element("div"),rigs=new Map(),sounds=[],anchorCalls=[];
  const queue=new GridshardBattleDeferredQueue({now:()=>now,onError:error=>{throw error;}});
  const module=(id,def,x=0,y=0)=>({instance_id:id,definition_id:def,x,y,hp:100,status:"active",is_powered:true});
  const own=[module("laser","laser"),module("cooler","cooler"),module("repair","repair"),module("emp","emp"),module("amp","amplifier"),module("battery","battery"),module("shield","shield"),module("armor","armor")];
  const snapshot={session_id:"vfx",elapsed_ms:1000,status:"running",players:{own:{modules:own},enemy:{modules:[module("target","laser",4,2)]}}};
  const domId=(p,m)=>p+":"+m.instance_id;
  for(const[p,state]of Object.entries(snapshot.players))for(const m of state.modules){const rig=new Element("span"),bb=new Element("span");rig.dataset={device:m.definition_id,view:"2"};bb.classList.add("module-device-billboard");rig.appendChild(bb);rigs.set(domId(p,m),rig);}
  const fx=new GridshardModuleVfx({doc,layer:()=>layer,now:()=>now,schedule:(d,fn)=>queue.schedule(d,fn),sound:n=>sounds.push(n),
    domId,rigFor:id=>rigs.get(id),boardRect:()=>({left:200,top:350,width:300,height:180}),quality:()=>quality,hidden:()=>hidden,load:()=>load,
    anchor:(id,aim)=>{anchorCalls.push([id,aim]);return {center:id.startsWith("enemy")?{x:350,y:100}:{x:350,y:450},emitter:{x:350,y:420},pair:[{x:340,y:410},{x:360,y:410}],definition:id.endsWith("shield")?"shield":id.endsWith("armor")?"armor":"laser"};}});
  const event=(type,data,at=1000)=>({type,at_ms:at,data});
  return{fx,layer,rigs,snapshot,event,sounds,anchorCalls,setTime:t=>now=t,advance:t=>{now=t;queue.flush(now);},setHidden:v=>hidden=v,setQuality:v=>quality=v,setLoad:v=>load=v,queue};
}

test("36 canon profiles own unique quiet WAVs and are present in the web/native asset list",()=>{
  const profiles=require("../src/battle/module-presentation-profiles.js"),crypto=require("node:crypto");
  require("../src/canon-data.js");
  assert.deepEqual(Object.keys(profiles).sort(),globalThis.GRIDSHARD_CANON_MODULES.map(m=>m.id).sort());
  const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8"),hashes=new Set();
  require("../src/gridshard-audio.js");
  for(const p of Object.values(profiles)){
    assert.ok(html.includes(p.asset),p.id);
    assert.equal(globalThis.GRIDSHARD_SFX_CUES[p.cue].asset,p.asset);
    assert.ok(globalThis.GRIDSHARD_SFX_CUES[p.cue].gain<=.5);
    const bytes=fs.readFileSync(path.join(__dirname,"..",p.asset));
    assert.equal(bytes.toString("ascii",0,4),"RIFF");assert.equal(bytes.readUInt32LE(24),22050);
    assert.ok(bytes.length<23000);assert.equal(bytes.readInt16LE(44),0);
    let peak=0;for(let i=44;i<bytes.length;i+=2)peak=Math.max(peak,Math.abs(bytes.readInt16LE(i))/32768);
    assert.ok(peak>0&&peak<.23,p.id);
    hashes.add(crypto.createHash("sha256").update(bytes).digest("hex"));
  }
  assert.equal(hashes.size,36);
});
test("shield remains inside a device-sized footprint even on a wide board",()=>{
  const f=fixture();f.fx.boardRect=()=>{throw Error("shield must not measure the board");};
  const dome=f.fx.dome("own:shield",400);
  assert.ok(dome.rx<32&&dome.ry<45);
  assert.equal(dome.x,350);
  f.advance(500);assert.equal(f.fx.effects.size,0);
});
test("every added weapon has bounded signature geometry and cleanup without a second sound owner",()=>{
  const profiles=require("../src/battle/module-presentation-profiles.js");
  for(const p of Object.values(profiles).filter(p=>p.travel!==null)){
    const f=fixture();assert.equal(f.fx.attack("own:laser","enemy:target",p.id),p.travel);
    assert.ok(f.fx.effects.has("weapon:own:laser"),p.id);
    assert.equal(f.sounds.length,0,p.id);
    f.advance(1600);assert.equal(f.fx.effects.size,0,p.id);
  }
});
test("passive module events are bounded, replay-safe and keep music priority",()=>{
  const f=fixture();
  f.snapshot.players.own.modules.push({instance_id:"chrono",definition_id:"chrono_relay",x:1,y:1,hp:100,status:"active"});
  const e=f.event("module_cycle_pulse",{player_id:"own",module_id:"chrono",kind:"speed"});
  f.fx.receive([e],f.snapshot);
  assert.deepEqual(f.sounds,["module_chrono_relay"]);
  const node=f.fx.effects.get("signature:own:chrono:own:chrono").node;
  f.fx.receive([e],f.snapshot);assert.equal(f.fx.effects.get("signature:own:chrono:own:chrono").node,node);
  f.setHidden(true);f.fx.receive([],f.snapshot);assert.equal(f.fx.effects.size,0);
});
test("laser is one red 1s beam per source, replaced on new target with no invented cadence",()=>{
  const f=fixture();f.fx.attack("own:laser","enemy:target","laser");
  const first=f.fx.effects.get("weapon:own:laser").node;assert.equal(first.style["--module-vfx-ms"],"1000ms");
  f.advance(200);f.fx.attack("own:laser","own:shield","laser");assert.equal(first.parentElement,null);
  f.advance(1000);assert.ok(f.fx.effects.has("weapon:own:laser"),"old expiry cannot remove replacement");
  f.advance(1200);assert.equal(f.fx.effects.has("weapon:own:laser"),false);
  assert.equal(f.sounds.length,0,"weapon cues remain owned by the existing attack handler");
});

test("cooling distributes real targets at 240ms intervals with one sound and no late target snap",()=>{
  const f=fixture(),ids=["laser","repair","emp"];
  const events=ids.map(id=>f.event("module_cooled",{player_id:"own",source_module_id:"cooler",target_module_id:id,heat_before:20,heat_after:15}));
  f.fx.receive(events,f.snapshot);
  const count=()=>[...f.fx.effects.keys()].filter(k=>k.startsWith("support:cool")).length;
  assert.equal(count(),1);f.advance(240);assert.equal(count(),2);f.advance(480);assert.equal(count(),3);
  assert.deepEqual(f.sounds,["cooling_air"]);
  const g=fixture();g.fx.receive(events,g.snapshot);g.fx.clearEffects();g.advance(480);assert.equal(g.fx.effects.size,0);
  const h=fixture();h.fx.receive(events,h.snapshot);h.advance(1000);assert.equal(h.fx.effects.size,0,"Late queue does not replay obsolete turns");
});
test("cannon and missile hit after travel even when the shared queue drains 200ms late",()=>{
  for(const[weapon,travel]of[["pulse_cannon",340],["missile_launcher",500]]){
    const f=fixture();assert.equal(f.fx.attack("own:laser","enemy:target",weapon),travel);
    assert.ok(f.layer.children.some(n=>n.dataset.weapon===weapon));
    f.advance(travel+200);assert.ok([...f.fx.effects.values()].some(e=>e.node.classes.has("module-vfx-explosion")));
  }
});
test("native projectile completion and shared sweep fallback create only one impact",()=>{
  const f=fixture();f.fx.attack("own:laser","enemy:target","missile_launcher");
  const projectile=f.fx.effects.get("weapon:own:laser").node.children[0];
  // Exact browser animation completion; queue fallback must not repeat it.
  f.setTime(500);projectile.listeners.animationend();const impact=f.fx.effects.get("impact:own:laser:enemy:target");
  assert.ok(impact);f.advance(500);assert.equal(f.fx.effects.get("impact:own:laser:enemy:target"),impact,"queue fallback must not recreate the native collision");
});
test("late arrivals, death and new sessions cannot produce ghost explosions",()=>{
  for(const stop of [f=>f.fx.forget("enemy:target"),f=>f.fx.reset(),f=>f.setHidden(true)]){
    const f=fixture();f.fx.attack("own:laser","enemy:target","missile_launcher");stop(f);f.advance(600);
    assert.equal([...f.fx.effects.values()].some(e=>e.node.classes.has("module-vfx-explosion")),false);
  }
  const f=fixture();f.fx.attack("own:laser","enemy:target","missile_launcher");f.advance(850);
  assert.equal([...f.fx.effects.values()].some(e=>e.node.classes.has("module-vfx-explosion")),false);
});
test("a terminal snapshot rejects the attack descriptors queued in that same presentation batch",()=>{
  const f=fixture();f.fx.receive([],f.snapshot);f.snapshot.status="finished";f.fx.receive([],f.snapshot);
  f.fx.attack("own:laser","enemy:target","laser");assert.equal(f.fx.effects.size,0);assert.equal(f.fx.ambient.size,0);
});
test("only actual repair/cooling/EMP/charge events emit targeted support effects and dedupe replay",()=>{
  const f=fixture(),events=[f.event("module_repaired",{player_id:"own",source_module_id:"repair",target_module_id:"laser",repair:5}),
    f.event("module_cooled",{player_id:"own",source_module_id:"cooler",target_module_id:"laser",heat_before:20,heat_after:5}),
    f.event("sabotage_applied",{attacker_player_id:"own",attacker_module_id:"emp",target_player_id:"enemy",target_module_id:"target",duration_ms:500}),
    f.event("amplifier_pulse",{player_id:"own",module_id:"amp",charged_module_ids:["laser","repair"]})];
  const before=JSON.stringify(f.snapshot);f.fx.receive(events,f.snapshot);
  for(const type of["repair","cool","emp","boost"])assert.ok([...f.fx.effects.keys()].some(k=>k.startsWith("support:"+type)));
  assert.deepEqual(f.sounds,["repair_beam","cooling_air","emp","energy_transfer"]);
  const nodes=f.layer.children.slice();f.fx.receive(events,f.snapshot);assert.deepEqual(f.layer.children,nodes);assert.equal(f.sounds.length,4);
  assert.equal(JSON.stringify(f.snapshot),before);
});
test("cooling is an outlet-oriented soft cloud fan, with bounded nodes and shared replacement cleanup",()=>{
  const f=fixture(),count=n=>1+n.children.reduce((sum,c)=>sum+count(c),0);
  const key="support:cool:own:cooler:own:laser",rig=f.rigs.get("own:cooler"),billboard=rig.children[0];
  f.fx.support("cool","own:cooler","own:laser");const first=f.fx.effects.get(key).node;
  const fan=first.children.find(n=>n.tag==="g"),clouds=fan.children.filter(n=>n.attrs.class==="vfx-cold-cloud");
  assert.equal(clouds.length,5);assert.ok(count(first)<=20);
  assert.equal(fan.attrs.transform,"translate(350 420) rotate(90)");
  assert.equal(first.style["--module-vfx-ms"],"980ms");
  assert.ok(fan.children.some(n=>n.attrs.class==="vfx-cold-plume"));
  assert.equal(first.querySelector("filter"),null);assert.equal(first.querySelector("radialGradient").children.at(-1).attrs["stop-opacity"],"0");
  assert.ok(clouds.every(n=>parseFloat(n.style["--mist-dx"])>0));
  assert.equal(f.queue.entries.length,1,"one shared expiry per root, no per-cloud timers");
  f.advance(100);f.fx.support("cool","own:cooler","own:laser");assert.equal(first.parentElement,null);
  f.advance(980);assert.ok(f.fx.effects.has(key),"old expiry cannot erase the replacement");
  f.advance(1080);assert.equal(f.fx.effects.has(key),false);assert.equal(f.layer.children.length,0);
  assert.equal(rig.children[0],billboard,"mist never rebuilds board/module art");
  const code=fs.readFileSync(path.join(__dirname,"../src/battle/module-vfx.js"),"utf8");
  assert.doesNotMatch(code,/vfx-cold-wisp|vfx-cold-cone|requestAnimationFrame|setTimeout|setInterval|replaceChildren/);
});
test("cooling cloud quality, hidden/load gates, death, session reset and reduced motion remain bounded",()=>{
  const descendants=n=>[n,...n.children.flatMap(descendants)];
  for(const[quality,expected]of[["yuksek",5],["orta",4],["dusuk",2]]){
    const f=fixture();f.setQuality(quality);f.fx.support("cool","own:cooler","own:laser");
    assert.equal(descendants(f.layer).filter(n=>n.attrs.class==="vfx-cold-cloud").length,expected);
  }
  const r=fixture();r.fx.reduced=()=>true;r.fx.support("cool","own:cooler","own:laser");
  assert.equal(descendants(r.layer).filter(n=>n.attrs.class==="vfx-cold-cloud").length,1);
  r.advance(200);assert.equal(r.layer.children.length,0);
  for(const stop of [f=>f.fx.forget("own:laser"),f=>f.fx.reset(),f=>{f.setHidden(true);f.fx.receive([],f.snapshot);}]){
    const f=fixture();f.fx.support("cool","own:cooler","own:laser");stop(f);assert.equal(f.layer.children.length,0);f.advance(2000);assert.equal(f.layer.children.length,0);
  }
  for(const gate of [f=>f.setHidden(true),f=>f.setLoad(2)]){
    const f=fixture();gate(f);f.fx.support("cool","own:cooler","own:laser");assert.equal(f.layer.children.length,0);assert.equal(f.queue.entries.length,0);assert.equal(f.anchorCalls.length,0);
  }
  const f=fixture();f.setQuality("dusuk");for(let i=0;i<100;i++)f.fx.support("cool","cooler"+i,"own:laser");
  assert.equal(f.fx.effects.size,8);assert.equal(f.layer.children.length,8);assert.equal(f.queue.entries.length,8);
  const css=fs.readFileSync(path.join(__dirname,"../src/module-vfx-v14.css"),"utf8");
  assert.match(css,/@keyframes gs-cool-cloud/);assert.doesNotMatch(css,/vfx-cold-wisp|filter:blur|feTurbulence/);
  assert.match(css,/\.vfx-cold-cloud \{ animation:none; opacity:\.45; \}/);
});
test("zero work and windup do not fabricate VFX; completed last-energy events still show",()=>{
  const f=fixture();f.snapshot.players.own.modules.find(m=>m.instance_id==="repair").is_powered=false;
  f.fx.receive([f.event("attack_windup_started",{player_id:"own",module_id:"laser"}),
    f.event("module_cooled",{player_id:"own",source_module_id:"cooler",target_module_id:"laser",heat_before:0,heat_after:0}),
    f.event("module_repaired",{player_id:"own",source_module_id:"repair",target_module_id:"laser",repair:3})],f.snapshot);
  assert.deepEqual(f.sounds,["repair_beam"]);assert.equal([...f.fx.effects.keys()].filter(k=>k.startsWith("support")).length,1);
});
test("battery/amplifier ambient is persistent, updates registered coil pairs, and stops on unpowered/hidden",()=>{
  const f=fixture();f.fx.receive([],f.snapshot);assert.equal(f.fx.ambient.size,2);
  const svg=f.fx.ambient.get("own:amp"),first=svg.querySelector("path").attrs.d;
  f.rigs.get("own:amp").dataset.view="3";GridshardModuleVfx.syncArt(f.rigs.get("own:amp"));assert.notEqual(svg.querySelector("path").attrs.d,first);
  f.fx.receive([],f.snapshot);assert.equal(f.fx.ambient.get("own:amp"),svg);
  f.snapshot.players.own.modules.find(m=>m.instance_id==="battery").is_powered=false;f.fx.receive([],f.snapshot);assert.equal(f.fx.ambient.size,1);
  f.setHidden(true);f.fx.receive([],f.snapshot);assert.equal(f.fx.ambient.size,0);assert.equal(f.layer.children.length,0);
});
test("a destruction ahead of the snapshot cannot resurrect ambient; later active rebirth may restore it",()=>{
  const f=fixture();f.fx.receive([],f.snapshot);assert.ok(f.fx.ambient.has("own:battery"));
  f.fx.receive([f.event("module_destroyed",{player_id:"own",module_id:"battery"},1100)],f.snapshot);
  f.fx.receive([],f.snapshot);assert.equal(f.fx.ambient.has("own:battery"),false);
  f.snapshot.elapsed_ms=1200;f.fx.receive([],f.snapshot);assert.ok(f.fx.ambient.has("own:battery"));
});
test("shield ray meets its local device shield; damper field is only on the actual defense event",()=>{
  const p=ellipseHit({x:0,y:0},{x:100,y:0},{x:100,y:0,rx:20,ry:10});assert.equal(p.x,80);assert.equal(p.y,0);
  const f=fixture();f.fx.attack("enemy:target","own:shield","laser",true);assert.ok(f.fx.effects.has("shield:own:shield"));
  f.fx.receive([f.event("module_contribution",{player_id:"own",source_module_id:"armor",contribution_kind:"damage_prevented",value:4})],f.snapshot);
  assert.ok([...f.fx.effects.values()].some(e=>e.node.classes.has("module-vfx-dampen")));
});

test("raised shield collision matches its tall cap and shallow front footprint in every direction",()=>{
  const dome={x:100,y:100,rx:60,ry:80,baseRy:20};
  assert.deepEqual(domeHit({x:100,y:0},{x:100,y:100},dome),{x:100,y:20});
  assert.deepEqual(domeHit({x:100,y:200},{x:100,y:100},dome),{x:100,y:120});
  assert.deepEqual(domeHit({x:0,y:100},{x:100,y:100},dome),{x:40,y:100});
  assert.deepEqual(domeHit({x:200,y:100},{x:100,y:100},dome),{x:160,y:100});
  for(let i=0;i<360;i+=5){
    const a=i*Math.PI/180,from={x:100+200*Math.cos(a),y:100+200*Math.sin(a)};
    const hit=domeHit(from,{x:100,y:80},dome),ry=hit.y<100?80:20;
    assert.ok(Math.abs((hit.x-100)**2/60**2+(hit.y-100)**2/ry**2-1)<1e-8);
  }
  const to={x:100,y:80};assert.equal(domeHit({x:100,y:90},to,dome),to,"a source inside the dome does not invent an exit collision");
});

test("shield is a raised cap with visible honeycomb, bounded SVG nodes and independent cleanup",()=>{
  const f=fixture(),rig=f.rigs.get("own:shield"),billboard=rig.children[0],art=billboard.children.slice();
  const count=n=>1+n.children.reduce((sum,c)=>sum+count(c),0);
  const dome=f.fx.dome("own:shield",500),first=f.fx.effects.get("shield:own:shield").node;
  assert.ok(dome.ry>dome.baseRy*4,"cap rises above the ground footprint");
  const mesh=first.children.find(n=>n.attrs.class==="vfx-shield-dome");
  assert.equal(mesh.tag,"path");assert.ok(mesh.attrs.d.endsWith("Z"));assert.ok(mesh.attrs.fill.startsWith("url(#vfx-hex-"));
  assert.ok(first.children.some(n=>n.attrs.class==="vfx-dome-front"));
  assert.ok(first.children.some(n=>n.attrs.class==="vfx-dome-ribs"));
  assert.ok(count(first)<=16,"one pattern path, never a node per hex or per cell");
  f.advance(100);for(let i=0;i<20;i++)f.fx.dome("own:shield",500);
  assert.equal(first.parentElement,null);assert.equal(f.layer.children.length,1);
  assert.equal(rig.children[0],billboard);assert.deepEqual(billboard.children,art,"shield effect does not recreate module art");
  f.advance(500);assert.equal(f.layer.children.length,1,"old cleanup cannot erase the replacement");
  f.advance(600);assert.equal(f.layer.children.length,0);
  const css=fs.readFileSync(path.join(__dirname,"../src/module-vfx-v14.css"),"utf8");
  assert.match(css,/\.vfx-hex\s*\{[^}]*stroke-opacity:\.28/);
  assert.match(css,/\.vfx-shield-dome\s*\{[^}]*fill-opacity:\.42/);
  const engine=fs.readFileSync(path.join(__dirname,"../src/battle/module-vfx.js"),"utf8");
  assert.doesNotMatch(engine,/replaceChildren|innerHTML|renderBoard|setInterval|requestAnimationFrame/);
});
test("effects stay bounded under a burst and low quality/hidden paths do not spin ambient work",()=>{
  const f=fixture();for(let i=0;i<100;i++)f.fx.attack("source"+i,"enemy:target","laser");assert.ok(f.fx.effects.size<=24);assert.ok(f.layer.children.length<=24);
  f.fx.reset();f.setQuality("dusuk");f.fx.receive([],f.snapshot);assert.equal(f.fx.ambient.size,0);
  f.setLoad(2);f.fx.attack("own:laser","enemy:target","laser");assert.equal(f.layer.children.length,0);
});
test("client integration has a single first-ten VFX owner and preserves native audio asset resolution",()=>{
  const app=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8"),html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
  assert.match(app,/queueModuleVfx\(events, snapshot\)/);assert.match(app,/moduleVfx\.receive\(batch.events,batch.snapshot\)/);assert.match(app,/moduleVfx\.clearEffects\(\)/);assert.match(app,/moduleVfx\.reset\(\)/);
  assert.match(app,/moduleVfx\.attack\(sourceModuleId,targetModuleId,definitionId,kind === "shield"\)/);
  assert.ok(html.indexOf('src="./src/battle/module-vfx.js"')<html.indexOf('src="./src/app.js"'));
  for(const cue of["cooling_air","repair_beam"]){const bytes=fs.readFileSync(path.join(__dirname,`../assets/audio/${cue}.wav`));assert.equal(bytes.toString("ascii",0,4),"RIFF");assert.ok(bytes.length<24000);}
});

test("one post-presentation microtask coalesces VFX and cannot draw through reset/hidden",()=>{
  const vm=require("node:vm"),app=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8"),microtasks=[],calls=[];
  const start=app.indexOf("  let pendingModuleVfx = null;"),end=app.indexOf("  const onlineBattlePresentation",start);
  const context={queueMicrotask:fn=>microtasks.push(fn),battleVisualGeneration:1,battleAnchorBatch:{stale:true},document:{hidden:false},moduleVfx:{receive:(...a)=>calls.push(a),attack:(...a)=>calls.push(a)}};
  vm.runInNewContext(app.slice(start,end)+"\nthis.enqueue=queueModuleVfx;this.shot=()=>pendingModuleVfx.attacks.push(['a','b','laser',false]);",context);
  context.enqueue([{type:"first"}],{elapsed_ms:1});context.shot();context.enqueue([{type:"second"}],{elapsed_ms:2});assert.equal(microtasks.length,1);assert.equal(calls.length,0);
  microtasks.shift()();assert.equal(context.battleAnchorBatch,null);assert.equal(calls[0][0].length,2);assert.equal(calls[0][1].elapsed_ms,2);assert.equal(calls.length,2);
  context.enqueue([],{elapsed_ms:3});context.battleVisualGeneration++;microtasks.shift()();assert.equal(calls.length,2);
  context.enqueue([],{elapsed_ms:4});context.document.hidden=true;microtasks.shift()();assert.equal(calls.length,2);
});

test("delayed strikes cannot replay after reset, hide/resume, destruction or a long stall",()=>{
  for(const cancel of [f=>f.fx.reset(),f=>f.fx.clearEffects(),f=>f.fx.forget("own:laser"),()=>{}]){
    const f=fixture(),rig=f.rigs.get("own:laser");
    f.fx.strike("own:laser",100);cancel(f);f.advance(1000);
    assert.equal(rig.classes.has("is-struck"),false);
  }
  const f=fixture(),rig=f.rigs.get("own:laser");
  f.fx.strike("own:laser",100);f.fx.clearEffects();f.advance(100);
  assert.equal(rig.classes.has("is-struck"),false);
});

test("old strike cleanup cannot remove a newer hit; clearing effects releases the class",()=>{
  const f=fixture(),rig=f.rigs.get("own:laser");
  f.fx.strike("own:laser");
  f.advance(100);f.fx.strike("own:laser");
  f.advance(230);assert.equal(rig.classes.has("is-struck"),true);
  f.advance(330);assert.equal(rig.classes.has("is-struck"),false);
  f.fx.strike("own:laser");f.fx.clearEffects();
  assert.equal(rig.classes.has("is-struck"),false);
  assert.equal(f.fx.strikes.size,0);
});
