"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { GridshardModuleMotion, headingFor } = require("../src/battle/module-motion.js");
const art = require("../src/module-device-art.js");
const moduleAt = (id, definition, x, y, other={}) => ({instance_id:id, definition_id:definition,
  x,y,hp:100,status:"active",is_powered:true,...other});
function setup(definition="laser") {
  let now=0, hidden=false, reduced=false, missing=false;
  const draws=[];
  const snapshot={session_id:"one",elapsed_ms:1000,status:"running",players:{
    own:{modules:[moduleAt("same",definition,0,2),moduleAt("friend","shield",2,1)]},
    rival:{modules:[moduleAt("same","laser",4,0)]},
  }};
  const motion=new GridshardModuleMotion({now:()=>now,hidden:()=>hidden,reduced:()=>reduced,
    pointFor:r=>missing ? null : ({x:r.module.x*100,y:r.module.y*100+(r.player==="own" ? 400 : 0)}),
    draw:(r,p)=>{draws.push({key:r.key,definition:r.definition,...p});return true;},
  });
  const receive=events=>motion.receive(events,snapshot,{ownPlayerId:"own",domId:(p,m)=>p+":"+m.instance_id});
  const event=(type,data,at=1000)=>({type,at_ms:at,data});
  const attack=()=>event("attack_performed",{attacker_player_id:"own",attacker_module_id:"same",target_player_id:"rival",target_module_id:"same"});
  return {motion,snapshot,draws,receive,event,attack,setTime:v=>{now=v;},setHidden:v=>{hidden=v;},setReduced:v=>{reduced=v;},setMissing:v=>{missing=v;}};
}
test("new support and reflector events retain the actual server target",()=>{
  for(const [definition,type,rival] of [["overclock_unit","module_overclocked",false],["phoenix_repair","phoenix_rebirth",false],["nano_medic","module_repaired",false],["reflector","damage_reflected",true]]){
    const s=setup(definition), target=rival?"same":"friend",player=rival?"rival":"own";
    s.receive([s.event(type,{player_id:"own",source_player_id:"own",source_module_id:"same",target_player_id:player,target_module_id:target})]);
    s.motion.tick();
    assert.equal(s.motion.actions.get('["own","same"]').target,JSON.stringify([player,target]),definition);
    s.setTime(600);s.motion.tick();
    assert.equal(s.motion.aimLocks.get('["own","same"]').target,JSON.stringify([player,target]),definition);
  }
});
test("extended attacker contribution does not replace the primary shot target",()=>{
  const s=setup("plasma_mortar");
  s.snapshot.players.rival.modules.push(moduleAt("splash","shield",2,0));
  s.receive([s.attack(),s.event("module_contribution",{source_player_id:"own",source_module_id:"same",target_player_id:"rival",target_module_id:"splash"})]);
  s.motion.tick();
  assert.equal(s.motion.actions.get('["own","same"]').target,'["rival","same"]');
});
test("four screen-space quadrants and axial ties",()=>{
  const from={x:100,y:100};
  assert.equal(headingFor(from,{x:200,y:0}),"ne");
  assert.equal(headingFor(from,{x:0,y:0}),"nw");
  assert.equal(headingFor(from,{x:200,y:200}),"se");
  assert.equal(headingFor(from,{x:0,y:200}),"sw");
  assert.equal(headingFor(from,{x:100,y:0},"nw"),"nw");
  assert.equal(headingFor(from,from,"se"),"se");
});

test("cooler visits each real target once per pulse and keeps the final lock",()=>{
  const s=setup("cooler");
  s.snapshot.players.own.modules.push({...s.snapshot.players.own.modules[1],instance_id:"friend2",x:2,y:0},
    {...s.snapshot.players.own.modules[1],instance_id:"friend3",x:0,y:2});
  const ids=["friend","friend2","friend3"];
  s.receive(ids.map(id=>s.event("module_cooled",{player_id:"own",source_module_id:"same",target_module_id:id,heat_before:20,heat_after:15})));
  for(const [i,id]of ids.entries()){
    s.setTime(i*240);s.motion.tick();assert.equal([...s.motion.actions.values()][0].target,JSON.stringify(["own",id]));
  }
  s.setTime(1000);s.motion.tick();assert.equal(s.motion.actions.size,0);
  assert.equal(s.motion.aimLocks.get('["own","same"]').target,'["own","friend3"]');
});
test("actual attack IDs, aim/work/recover/rest, no state mutation or redraw per frame",()=>{
  const s=setup(), before=JSON.stringify(s.snapshot);
  s.receive([s.attack()]); s.motion.tick();
  assert.equal(s.motion.actions.size,1);
  assert.equal(s.draws.find(x=>x.phase==="aim").heading,"ne");
  const count=s.draws.length; s.motion.tick(); assert.equal(s.draws.length,count);
  s.setTime(100);s.motion.tick(); assert.equal(s.draws.at(-1).phase,"work");
  s.setTime(280);s.motion.tick(); assert.equal(s.draws.at(-1).phase,"recover");
  s.setTime(500);s.motion.tick(); assert.equal(s.draws.at(-1).phase,"rest");
  assert.equal(s.motion.actions.size,0); assert.equal(JSON.stringify(s.snapshot),before);
});
test("same instance IDs across players remain distinct",()=>{
  const s=setup();s.receive([s.attack(),s.event("attack_performed",{attacker_player_id:"rival",attacker_module_id:"same",target_player_id:"own",target_module_id:"same"})]);
  s.motion.tick(); assert.equal(s.motion.actions.size,2);
  assert.equal(s.draws.find(x=>x.key==='["rival","same"]' && x.phase==="aim").heading,"sw");
});
test("repair and cooling use same-side target; support is coalesced without invented extra actions",()=>{
  for(const [definition,type] of [["repair","module_repaired"],["cooler","module_cooled"]]) {
    const s=setup(definition);
    s.receive([s.event(type,{player_id:"own",source_module_id:"same",target_module_id:"friend"}),
      s.event("module_cycle_pulse",{player_id:"own",module_id:"same"})]);
    s.motion.tick();assert.equal(s.motion.actions.size,1);
    assert.equal([...s.motion.actions.values()][0].target,'["own","friend"]');
    s.setTime(150);s.motion.tick();assert.equal(s.draws.at(-1).phase,"work");
  }
});
test("dampener self repair never aims at another cell",()=>{
  const s=setup("armor");
  s.receive([s.event("module_repaired",{player_id:"own",source_module_id:"same",target_module_id:"same"})]);
  s.motion.tick();const action=[...s.motion.actions.values()][0];
  assert.equal(action.target,null);assert.equal(action.heading,"ne");
});
test("windup does not fabricate a shot",()=>{
  const s=setup();s.receive([s.event("attack_windup_started",{player_id:"own",module_id:"same",target_module_id:"same",ready_at_ms:1300})]);
  s.motion.tick();s.setTime(310);s.motion.tick();s.setTime(500);s.motion.tick();
  assert.ok(s.draws.every(x=>x.phase!=="work"));
});
test("duplicate, old and out-of-order snapshot events are not replayed",()=>{
  const s=setup();s.receive([s.attack()]);s.motion.tick();
  const start=[...s.motion.actions.values()][0].start;
  s.setTime(200);s.receive([s.attack()]); assert.equal([...s.motion.actions.values()][0].start,start);
  s.snapshot.elapsed_ms=2000;s.receive([s.attack()]); assert.equal([...s.motion.actions.values()][0].start,start);
  s.snapshot.elapsed_ms=500;s.receive([s.event("module_cooled",{},500)]);assert.equal(s.motion.latest,2000);
});
test("destroyed target, overheat, power loss and finish cancel motion",()=>{
  for(const mutate of [s=>{s.snapshot.players.rival.modules[0].status="destroyed";},
    s=>{s.snapshot.players.own.modules[0].overheated=true;},
    s=>{Object.assign(s.snapshot.players.own.modules[0],{is_powered:false,energy_required:3});},
    s=>{s.snapshot.status="finished";}]) {
    const s=setup();s.receive([s.attack()]);s.motion.tick();mutate(s);s.snapshot.elapsed_ms=1100;s.receive([]);s.motion.tick();
    assert.equal(s.motion.actions.size,0);
  }
});
test("hidden and reduced paths, session reset and missing-geometry expiry",()=>{
  const s=setup();s.setReduced(true);s.receive([s.attack()]);s.motion.tick();s.setTime(150);s.motion.tick();
  assert.ok(s.draws.every(x=>x.phase==="rest"));
  s.setHidden(true);s.motion.tick();assert.equal(s.motion.actions.size,0);
  s.setHidden(false);s.snapshot.session_id="two";s.receive([s.attack()]);assert.equal(s.motion.actions.size,1);
  s.setMissing(true);s.setTime(1000);s.motion.tick();assert.equal(s.motion.actions.size,0);
});
test("stable ID artwork, legacy armor alias, other definitions and phase armor preserved",()=>{
  assert.equal(art.idFor({definitionId:"armor"}),"armor");
  assert.equal(art.idFor({nameTr:"Zırh"}),"armor");
  assert.equal(art.idFor({nameTr:"Sönümleyici"}),"armor");
  assert.equal(art.idFor({definitionId:"phase_armor",nameTr:"Zırh"}),"phase_armor");
  assert.match(art.markup({definitionId:"phase_armor"}),/modules-physical-v2\/phase_armor.webp/);
  assert.equal(art.markup({definitionId:"core"}),null);
  assert.match(art.markup({definitionId:"repair"}),/modules-physical-v1\/repair.webp/);
});
test("destruction events ahead of a snapshot cancel immediately, later rebirth can restore",()=>{
  const s=setup();s.receive([s.attack()]);s.motion.tick();
  s.receive([s.event("module_destroyed",{player_id:"rival",module_id:"same"},1100)]);
  s.motion.tick();assert.equal(s.motion.actions.size,0);
  s.receive([s.attack()]);assert.equal(s.motion.actions.size,0);
  s.snapshot.elapsed_ms=1200;
  s.receive([s.event("attack_performed",s.attack().data,1200)]);
  assert.equal(s.motion.actions.size,1);
});
test("cooler painted rotor advances only during work; hidden rest is idempotent",()=>{
  const s=setup("cooler");
  s.receive([s.event("module_cooled",{player_id:"own",source_module_id:"same",target_module_id:"friend"})]);
  s.motion.tick();s.setTime(100);s.motion.tick();assert.equal(s.draws.at(-1).frame,0);
  s.setTime(190);s.motion.tick();assert.equal(s.draws.at(-1).frame,1);
  s.setHidden(true);s.motion.tick();const count=s.draws.length;
  s.motion.tick();assert.equal(s.draws.length,count);
});
test("direction/action retain the same view atlas, shadow and host",()=>{
  let made=0;
  class Element {
    constructor(doc){made++;this.ownerDocument=doc;this.children=[];this.dataset={};this.attrs=new Map();this.classList={add:()=>{}};}
    set src(value){this.attrs.set("src",value);} get src(){return this.attrs.get("src");}
    setAttribute(k,v){this.attrs.set(k,v);}getAttribute(k){return this.attrs.get(k) ?? null;}
    appendChild(e){this.children.push(e);} replaceChildren(...els){this.children=els;}
  }
  const doc={createElement:()=>new Element(doc)},host=new Element(doc);
  assert.equal(art.mount(host,{definitionId:"repair"}),true);
  const rig=host.children[0],base=rig.children[0],window=rig.children[1].children[0],head=window.children[0],count=made,baseUrl=base.src;
  art.pose(host,{heading:"sw",phase:"work"});
  assert.equal(made,count);assert.equal(host.children[0],rig);assert.equal(rig.children[0],base);assert.equal(window.children[0],head);
  assert.equal(base.src,baseUrl);assert.match(head.src,/modules-views-v3\/repair.webp$/);
  art.pose(host,{heading:"sw",phase:"rest"});assert.match(head.src,/modules-views-v3\/repair.webp$/);
  assert.equal(made,count);
});
test("waiting for next energy charge does not suppress an already-completed server attack",()=>{
  const s=setup();s.snapshot.players.own.modules[0].energy_waiting=true;
  s.receive([s.attack()]);s.motion.tick();s.setTime(100);s.motion.tick();
  assert.equal(s.draws.at(-1).phase,"work");
  s.setTime(500);s.motion.tick();s.receive([]);assert.equal(s.motion.actions.size,0);
});
test("3D presentation receives the actual non-cardinal target angle",()=>{
  const s=setup();s.receive([s.attack()]);s.motion.tick();
  const aim=s.draws.find(x=>x.phase==="aim");
  assert.ok(Math.abs(aim.angle-Math.atan2(-600,400))<1e-10);
  assert.notEqual(aim.angle,-Math.PI/4,"Do not quantize the numeric angle to its raster quadrant");
});

test("laser stays on its real left target between shots, including the next windup",()=>{
  const s=setup();s.snapshot.players.own.modules[0].x=4;s.snapshot.players.rival.modules[0].x=0;
  s.receive([s.attack()]);s.motion.tick();s.setTime(100);s.motion.tick();s.setTime(500);s.motion.tick();
  assert.equal(s.draws.at(-1).heading,"nw");assert.equal(s.draws.at(-1).phase,"rest");
  assert.equal(s.motion.actions.size,0);assert.equal(s.motion.needsFrame,false);
  const before=s.draws.length;
  s.snapshot.elapsed_ms=1500;
  s.receive([s.event("attack_windup_started",{player_id:"own",module_id:"same",target_player_id:"rival",target_module_id:"same",ready_at_ms:1700},1500)]);
  s.motion.tick();s.setTime(800);s.motion.tick();s.setTime(1000);s.motion.tick();
  assert.ok(s.draws.slice(before).filter(d=>d.key==='["own","same"]').every(d=>d.heading==="nw"));
  s.snapshot.elapsed_ms=2000;
  s.receive([s.event("module_destroyed",{player_id:"rival",module_id:"same"},2000)]);s.motion.tick();
  assert.equal(s.motion.aimLocks.size,0);assert.equal(s.draws.at(-1).heading,"ne");
});
test("all converted moving modules retain session-scoped real target locks",()=>{
  const s=setup("pulse_cannon");s.snapshot.players.own.modules[0].x=4;s.snapshot.players.rival.modules[0].x=0;
  s.receive([s.attack()]);s.motion.tick();s.setTime(500);s.motion.tick();
  assert.equal(s.draws.at(-1).heading,"nw");assert.equal(s.motion.aimLocks.size,1);
  const laser=setup();laser.receive([laser.attack()]);laser.motion.tick();assert.equal(laser.motion.aimLocks.size,1);
  laser.motion.reset();assert.equal(laser.motion.aimLocks.size,0);
});

test("camera/layout change refreshes a stationary laser lock with one bounded wake",()=>{
  const s=setup();s.receive([s.attack()]);s.motion.tick();s.setTime(500);s.motion.tick();
  assert.equal(s.motion.needsFrame,false);
  const before=s.draws.at(-1).angle;
  s.snapshot.players.rival.modules[0].x=-3;
  s.motion.invalidateGeometry();assert.equal(s.motion.needsFrame,true);
  s.motion.tick();assert.equal(s.motion.needsFrame,false);
  assert.notEqual(s.draws.at(-1).angle,before);
  assert.equal(s.motion.aimLocks.size,1);
  s.setMissing(true);s.motion.invalidateGeometry();s.motion.tick();
  assert.equal(s.motion.needsFrame,false,"missing DOM must not cause an endless animation loop");
});
