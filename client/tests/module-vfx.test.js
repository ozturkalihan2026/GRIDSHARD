"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {GridshardModuleVfx,ellipseHit,domeHit}=require("../src/battle/module-vfx.js");
const {GridshardBattleDeferredQueue}=require("../src/battle/battle-lifecycle.js");
require("../src/module-view-data.js");
function fixture(){
  let now=0,hidden=false,quality="yuksek",load=0;
  class Element{
    constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.classes=new Set();this.classList={add:(...n)=>n.forEach(v=>this.classes.add(v))};this.style={setProperty:(k,v)=>this.style[k]=v};}
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
test("laser is one red 1s beam per source, replaced on new target with no invented cadence",()=>{
  const f=fixture();f.fx.attack("own:laser","enemy:target","laser");
  const first=f.fx.effects.get("weapon:own:laser").node;assert.equal(first.style["--module-vfx-ms"],"1000ms");
  f.advance(200);f.fx.attack("own:laser","own:shield","laser");assert.equal(first.parentElement,null);
  f.advance(1000);assert.ok(f.fx.effects.has("weapon:own:laser"),"old expiry cannot remove replacement");
  f.advance(1200);assert.equal(f.fx.effects.has("weapon:own:laser"),false);
  assert.equal(f.sounds.length,0,"weapon cues remain owned by the existing attack handler");
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
test("shield ray meets its board dome; damper field is only on the actual defense event",()=>{
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
