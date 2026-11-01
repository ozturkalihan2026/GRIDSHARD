"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {GridshardModuleVfx,ellipseHit,domeHit}=require("../src/battle/module-vfx.js");
const {GridshardBattleDeferredQueue}=require("../src/battle/battle-lifecycle.js");
require("../src/module-view-data.js");
function fixture(){
  let now=0,hidden=false,quality="yuksek",load=0;
  class Element{
    constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.classes=new Set();this.classList={contains:n=>this.classes.has(n),add:(...n)=>n.forEach(v=>this.classes.add(v)),remove:(...n)=>n.forEach(v=>this.classes.delete(v)),toggle:(n,on)=>on?this.classes.add(n):this.classes.delete(n)};this.style={setProperty:(k,v)=>this.style[k]=v};}
    setAttribute(k,v){this.attrs[k]=String(v);}appendChild(n){this.children.push(n);n.parentElement=this;return n;}
    addEventListener(name,fn){(this.listeners||={})[name]=fn;}
    remove(){if(this.parentElement){const p=this.parentElement;p.children=p.children.filter(n=>n!==this);this.parentElement=null;}}
    querySelector(s){return this.children.find(n=>s.startsWith(".")?n.classes.has(s.slice(1)):n.tag===s)||this.children.map(n=>n.querySelector(s)).find(Boolean)||null;}
  }
  const doc={createElement:n=>new Element(n),createElementNS:(_ns,n)=>new Element(n)},layer=new Element("div"),rigs=new Map(),sounds=[],anchorCalls=[];
  const queue=new GridshardBattleDeferredQueue({now:()=>now,onError:error=>{throw error;}});
  const module=(id,def,x=0,y=0)=>({instance_id:id,definition_id:def,x,y,hp:100,status:"active",operational:true});
  const own=[module("laser","laser"),module("repair","repair"),module("emp","emp"),module("amp","amplifier"),module("shield","shield"),module("armor","armor")];
  const snapshot={session_id:"vfx",elapsed_ms:1000,status:"running",players:{own:{modules:own},enemy:{modules:[module("target","laser",4,2)]}}};
  const domId=(p,m)=>p+":"+m.instance_id;
  for(const[p,state]of Object.entries(snapshot.players))for(const m of state.modules){const rig=new Element("span"),bb=new Element("span");rig.dataset={device:m.definition_id,view:"2"};bb.classList.add("module-device-billboard");rig.appendChild(bb);rigs.set(domId(p,m),rig);}
  const fx=new GridshardModuleVfx({doc,layer:()=>layer,now:()=>now,schedule:(d,fn)=>queue.schedule(d,fn),sound:n=>sounds.push(n),
    domId,rigFor:id=>rigs.get(id),boardRect:()=>({left:200,top:350,width:300,height:180}),quality:()=>quality,hidden:()=>hidden,load:()=>load,
    anchor:(id,aim)=>{anchorCalls.push([id,aim]);return {center:id.startsWith("enemy")?{x:350,y:100}:{x:350,y:450},emitter:{x:350,y:420},pair:[{x:340,y:410},{x:360,y:410}],definition:id.endsWith("shield")?"shield":id.endsWith("armor")?"armor":"laser"};}});
  const event=(type,data,at=1000)=>({type,at_ms:at,data});
  return{fx,layer,rigs,snapshot,event,sounds,anchorCalls,setTime:t=>now=t,advance:t=>{now=t;queue.flush(now);},setHidden:v=>hidden=v,setQuality:v=>quality=v,setLoad:v=>load=v,queue};
}

test("V7 delayed impacts do not relaunch a weapon and survive source death",()=>{
  const f=fixture();f.snapshot.players.own.modules[0].hp=0;
  const event=f.event('attack_performed',{attacker_player_id:'own',attacker_module_id:'laser',target_player_id:'enemy',target_module_id:'target',damage_kind:'dot',damage:3});
  f.fx.receive([event],f.snapshot);
  assert.equal(f.layer.children.filter(n=>n.dataset.signatureV7==='dot').length,1);
  assert.ok(![...f.fx.effects.keys()].some(k=>k.startsWith('weapon:')));
  f.fx.receive([event],f.snapshot);
  assert.equal(f.layer.children.filter(n=>n.dataset.signatureV7==='dot').length,1);
  f.advance(1000);assert.equal(f.layer.children.length,0);
});

test("V7 echo retains separate target impacts and resets with the battle",()=>{
  const f=fixture();f.snapshot.players.enemy.modules.push({...f.snapshot.players.enemy.modules[0],instance_id:'second'});
  const events=['target','second'].map(id=>f.event('attack_performed',{attacker_player_id:'own',attacker_module_id:'laser',target_player_id:'enemy',target_module_id:id,damage_kind:'echo',damage:4}));
  f.fx.receive(events,f.snapshot);
  const echo=f.layer.children.filter(n=>n.dataset.signatureV7==='echo');
  assert.equal(echo.length,1);assert.equal(echo[0].children.filter(n=>n.dataset.echoTarget).length,2);
  f.fx.reset();assert.equal(f.layer.children.length,0);
});

test("V7 full-board echo keeps thirteen target marks inside one low-quality root",()=>{
 const f=fixture();f.setQuality('dusuk');
 f.snapshot.players.enemy.modules=Array.from({length:13},(_,i)=>({...f.snapshot.players.enemy.modules[0],instance_id:'target-'+i}));
 const events=f.snapshot.players.enemy.modules.map(m=>f.event('attack_performed',{attacker_player_id:'own',attacker_module_id:'laser',target_player_id:'enemy',target_module_id:m.instance_id,damage_kind:'echo',damage:1}));
 f.fx.receive(events,f.snapshot);assert.equal(f.fx.effects.size,1);
 assert.equal(f.layer.children[0].children.filter(n=>n.dataset.echoTarget).length,13);
 f.setHidden(true);f.fx.receive([],f.snapshot);assert.equal(f.layer.children.length,0);
});

test("24 canon profiles use bounded quiet WAVs and are present in the web/native asset list",()=>{
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
  assert.equal(Object.keys(profiles).length,24);assert.equal(hashes.size,24);
});


test('core shots follow authoritative hits once, stay bounded and clear with battle lifecycle',()=>{
  const f=fixture();f.snapshot.players.own.modules.push({instance_id:'core',definition_id:'core',hp:450,status:'active',x:2,y:1});
  const e=f.event('attack_performed',{attacker_player_id:'own',attacker_module_id:'core',target_player_id:'enemy',target_module_id:'target',core_attack:true,power_id:'core_overdrive',damage:18});
  f.fx.receive([e],f.snapshot);f.fx.receive([e],f.snapshot);
  assert.deepEqual(f.sounds,['core_overdrive_shot']);
  assert.equal(f.fx.coreVfx.effects.size,1);
  assert.equal(f.fx.coreVfx.effects.get('hit:own:target').node.dataset.corePower,'core_overdrive');
  f.advance(1000);assert.equal(f.fx.coreVfx.effects.size,0);
  f.setHidden(true);f.fx.receive([f.event(e.type,e.data,1500)],f.snapshot);
  assert.equal(f.sounds.length,1);assert.equal(f.fx.effects.size,0);
  f.setHidden(false);f.snapshot.status='finished';f.fx.receive([f.event(e.type,e.data,1600)],f.snapshot);
  assert.equal(f.fx.effects.size,0);
});

test('every direct core shot cue is a packaged quiet WAV',()=>{
  require('../src/gridshard-audio.js');
  for(const id of ['resonance','guardian','overdrive','disruptor','capacitor','phoenix','quantum']){
    const cue=globalThis.GRIDSHARD_SFX_CUES[`core_${id}_shot`];assert.ok(cue.gain<=.4);
    assert.equal(fs.readFileSync(path.join(__dirname,'..',cue.asset)).toString('ascii',0,4),'RIFF');
  }
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
    assert.ok([...f.fx.effects.keys()].some(key=>key.startsWith("weapon:own:laser")),p.id);
    assert.equal(f.sounds.length,0,p.id);
    f.advance(1600);assert.equal(f.fx.effects.size,0,p.id);
  }
});
test("passive module events are bounded, replay-safe and keep music priority",()=>{
  const f=fixture();
  f.snapshot.players.own.modules.push({instance_id:"chrono",definition_id:"speed_relay",x:1,y:1,hp:100,status:"active"});
  const e=f.event("amplifier_pulse",{player_id:"own",source_module_id:"chrono",charged_module_ids:["laser"]});
  f.fx.receive([e],f.snapshot);
  assert.deepEqual(f.sounds,["module_speed_relay"]);
  const node=f.fx.effects.get("signature:own:chrono:own:laser").node;
  f.fx.receive([e],f.snapshot);assert.equal(f.fx.effects.get("signature:own:chrono:own:laser").node,node);
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
  for(const type of["repair","emp","boost"])assert.ok([...f.fx.effects.keys()].some(k=>k.startsWith("support:"+type)));
  assert.deepEqual(f.sounds,["repair_beam","emp","amplifier_charge"]);
  const nodes=f.layer.children.slice();f.fx.receive(events,f.snapshot);assert.deepEqual(f.layer.children,nodes);assert.equal(f.sounds.length,3);
  assert.equal(JSON.stringify(f.snapshot),before);
});




test("zero work and windup do not fabricate VFX; completed last-energy events still show",()=>{
  const f=fixture();f.snapshot.players.own.modules.find(m=>m.instance_id==="repair").operational=false;
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
  f.snapshot.players.own.modules.find(m=>m.instance_id==="amp").operational=false;f.fx.receive([],f.snapshot);assert.equal(f.fx.ambient.size,1);
  f.setHidden(true);f.fx.receive([],f.snapshot);assert.equal(f.fx.ambient.size,0);assert.equal(f.layer.children.length,0);
});
test("a destruction ahead of the snapshot cannot resurrect ambient; later active rebirth may restore it",()=>{
  const f=fixture();f.fx.receive([],f.snapshot);assert.ok(f.fx.ambient.has("own:amp"));
  f.fx.receive([f.event("module_destroyed",{player_id:"own",module_id:"amp"},1100)],f.snapshot);
  f.fx.receive([],f.snapshot);assert.equal(f.fx.ambient.has("own:amp"),false);
  f.snapshot.elapsed_ms=1200;f.fx.receive([],f.snapshot);assert.ok(f.fx.ambient.has("own:amp"));
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
  f.fx.reset();f.setQuality("dusuk");f.fx.receive([],f.snapshot);assert.equal(f.fx.ambient.size,1);
  assert.equal(f.fx.ambient.get("own:shield").dataset.kind,"shield");
  f.setLoad(2);f.fx.attack("own:laser","enemy:target","laser");assert.equal(f.layer.children.length,0);
});

test("a powered shield keeps one stable shell even at low quality and releases it on disable/death",()=>{
  const f=fixture();f.setQuality("dusuk");f.fx.receive([],f.snapshot);
  const svg=f.fx.ambient.get("own:shield"),shape=svg.querySelector("path").attrs.d;
  for(let i=0;i<1000;i++)f.fx.receive([],f.snapshot);
  assert.equal(f.fx.ambient.get("own:shield"),svg);
  GridshardModuleVfx.syncArt(f.rigs.get("own:shield"));
  assert.equal(svg.querySelector("path").attrs.d,shape,"electricity updates cannot replace shield geometry");
  const shield=f.snapshot.players.own.modules.find(m=>m.instance_id==="shield");
  shield.operational=false;f.fx.receive([],f.snapshot);assert.equal(f.fx.ambient.size,0);
  shield.operational=true;f.fx.receive([],f.snapshot);assert.equal(f.fx.ambient.size,1);
  shield.hp=0;f.fx.receive([],f.snapshot);assert.equal(f.fx.ambient.size,0);
  f.fx.reset();assert.equal(f.queue.entries.length,0);
});

test("shield shell follows the raised painting stage, survives repeated snapshots and rig replacement",()=>{
  const f=fixture(),rig=f.rigs.get("own:shield"),billboard=rig.children[0];
  const stage=f.fx.doc.createElement("span");stage.classList.add("module-layer-stage");billboard.appendChild(stage);
  f.fx.receive([],f.snapshot);
  const shell=f.fx.ambient.get("own:shield");assert.equal(shell.parentElement,stage);
  for(let i=0;i<1000;i++)f.fx.receive([],f.snapshot);
  assert.equal(f.fx.ambient.get("own:shield"),shell);
  assert.equal(stage.children.length,1);assert.equal(f.queue.entries.length,0,"static shell needs no animation timers");
  stage.remove();f.fx.receive([],f.snapshot);
  assert.equal(shell.parentElement,null,"old painted stage cannot retain a ghost dome");
  assert.equal(f.fx.ambient.get("own:shield").parentElement,billboard,"legacy atlas fallback still works");
  f.setHidden(true);f.fx.receive([],f.snapshot);assert.equal(f.fx.ambient.size,0);
  f.setHidden(false);f.fx.receive([],f.snapshot);assert.equal(f.fx.ambient.size,2);
  f.fx.reset();assert.equal(f.fx.ambient.size,0);
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

test("overlapping hit feedback never forces layout or restarts the per-device class",()=>{
  const f=fixture(),rig=f.rigs.get("own:laser");let adds=0;
  Object.defineProperty(rig,"offsetWidth",{get(){throw new Error("hit must not force layout");}});
  const add=rig.classList.add;rig.classList.add=(...values)=>{adds++;add(...values);};
  for(let i=0;i<20;i++){f.fx.strike("own:laser");f.advance(i*5);}
  assert.equal(adds,1);assert.equal(rig.classes.has("is-struck"),true);
  f.advance(400);assert.equal(rig.classes.has("is-struck"),false);
});

test("new support modules react to actual main-engine events and expire",()=>{
  for(const [id,type,data]of[
    ['buffer_shield','core_effect_applied',{value:35}],
    ['cleanser','module_debuff_removed',{}],
    ['speed_relay','amplifier_pulse',{charged_module_ids:['laser']}],
  ]){
    const f=fixture();f.snapshot.players.own.modules.push({instance_id:'new',definition_id:id,x:1,y:1,hp:100,status:'active'});
    f.fx.receive([f.event(type,{player_id:'own',source_module_id:'new',module_id:'new',target_module_id:'laser',...data})],f.snapshot);
    assert.ok(f.fx.effects.size>0,id);assert.ok(f.sounds.includes('module_'+id),id);
    f.advance(4000);assert.equal(f.fx.effects.size,0,id);
  }
});

test("last bastion still protects visibly after its source was destroyed",()=>{
  const f=fixture();f.snapshot.players.own.modules.push({instance_id:'dead',definition_id:'last_bastion',x:null,y:null,hp:0,status:'destroyed'});
  f.fx.receive([f.event('core_effect_applied',{player_id:'own',source_module_id:'dead',target_module_id:'laser',value:75})],f.snapshot);
  assert.ok(f.fx.effects.size>0);assert.deepEqual(f.sounds,['module_last_bastion']);
  f.advance(4000);assert.equal(f.fx.effects.size,0);
});

test("core waves use bounded real beneficiaries, ignore replay and clear on finish",()=>{
  const f=fixture();f.snapshot.players.own.modules.push({instance_id:'core',definition_id:'core',x:2,y:1,hp:450,status:'active'});
  const e=f.event('core_power_used',{player_id:'own',power_id:'core_guardian',affected_targets:[{player_id:'own',module_id:'laser'}]});
  f.fx.receive([e,e],f.snapshot);assert.equal(f.fx.coreVfx.effects.size,1);
  assert.ok(f.fx.coreVfx.effects.get('activation:own'));
  f.snapshot.status='finished';f.fx.receive([],f.snapshot);assert.equal(f.fx.coreVfx.effects.size,0);
});

test("area and chain weapons keep their separate real target effects",()=>{
  for(const id of ['arc_cannon','plasma_mortar','drone_bay']){
    const f=fixture();f.fx.attack('own:laser','enemy:target',id);f.fx.attack('own:laser','own:shield',id);
    assert.equal(f.fx.effects.size,2,id);f.advance(2000);assert.equal(f.fx.effects.size,0,id);
  }
});

test("legendary phase follows the real badge and clears on suspension",()=>{
  const f=fixture(),m=f.snapshot.players.own.modules[0];m.definition_id='phase_armor';m.signature_badges=[{kind:'phase'}];
  f.fx.receive([],f.snapshot);assert.ok(f.rigs.get('own:laser').classes.has('is-phase-active'));
  f.fx.clearEffects();assert.equal(f.rigs.get('own:laser').classes.has('is-phase-active'),false);
});
