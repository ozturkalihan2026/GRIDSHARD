const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const math=require("../src/battle/laser-aim.js"),art=require("../src/module-device-art.js");
require("../src/module-view-data.js");
const vm=require("node:vm");
const {GridshardModuleMotion}=require("../src/battle/module-motion.js");
const ids=["laser","shield","battery","amplifier","emp","repair","armor","cooler","pulse_cannon","missile_launcher"];
test("all ten devices retain continuous aim with upright eight-view art, no allocations or texture swaps",()=>{
  let made=0;
  class Element{
    constructor(){made++;this.children=[];this.dataset={};this.attrs={};this.ownerDocument=doc;this.classList={add(){}};this.style={setProperty:(k,v)=>this.attrs[k]=v};}
    appendChild(n){this.children.push(n);}replaceChildren(...n){this.children=n;}setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}
  }
  const doc={createElement:()=>new Element()},matrix=math.plane([{x:0,y:0},{x:80,y:0},{x:78,y:69},{x:2,y:69}]);
  for(const id of ids){
    const host=new Element();art.mount(host,{definitionId:id});
    const rig=host.children[0],shadow=rig.children[0],window=rig.children[1].children[0],atlas=window.children[0],src=atlas.src,count=made;
    const turns=new Set();
    for(let deg=0;deg<720;deg++){
      const r=deg*Math.PI/180,target=math.project(matrix,{x:.5+4*Math.cos(r),y:.5+4*Math.sin(r)}),aim=art.aimDevice(host,matrix,target);
      assert.ok(Math.abs(Math.cos(aim.angle)-Math.cos(r))<1e-8);turns.add(rig.dataset.view);
      assert.equal(atlas.src,src);
    }
    assert.equal(turns.size,8,id);assert.equal(made,count);assert.equal(rig.children[0],shadow);
    assert.match(src,new RegExp(`modules-views-v3/${id}\\.webp`));
    assert.equal(rig.dataset.renderer,"views8");
    assert.equal(rig.dataset.yaw,"continuous");
  }
});
test("EMP uses the real sabotage target and passives do not invent a new aim on self-contribution",()=>{
  let now=0;const draws=[];
  const module=(instance,definition,x,y)=>({instance_id:instance,definition_id:definition,x,y,status:"active",hp:100,is_powered:true});
  const snapshot={session_id:"v12",elapsed_ms:1000,status:"running",players:{own:{modules:[module("emp","emp",0,0),module("battery","battery",1,1)]},enemy:{modules:[module("target","laser",2,2)]}}};
  const motion=new GridshardModuleMotion({now:()=>now,pointFor:r=>({x:r.module.x,y:r.module.y}),draw:(r,p)=>{draws.push({id:r.module.instance_id,...p});return true;}});
  motion.receive([{type:"sabotage_applied",at_ms:1000,data:{attacker_player_id:"own",attacker_module_id:"emp",target_player_id:"enemy",target_module_id:"target"}}],snapshot,{ownPlayerId:"own",domId:(p,m)=>p+m.instance_id});
  motion.tick();now=500;motion.tick();assert.equal(motion.aimLocks.get('["own","emp"]').target,'["enemy","target"]');
  snapshot.elapsed_ms=1500;
  motion.receive([{type:"module_contribution",at_ms:1500,data:{player_id:"own",source_module_id:"battery",target_player_id:"own",target_module_id:"battery"}}],snapshot,{ownPlayerId:"own",domId:(p,m)=>p+m.instance_id});
  motion.tick();assert.equal(draws.at(-1).angle,undefined,"self energy is not a directional target");
});
test("the board owns the shared 30 degree camera; upright art counter-tilts only once",()=>{
  const css=fs.readFileSync(path.join(__dirname,"../src/modules-yaw-v12.css"),"utf8");
  assert.match(css,/--gs-camera-tilt:30deg/);assert.match(css,/--gs-camera-counter:-30deg/);
  assert.match(css,/--gs-camera-axis-gap:26px/);assert.match(css,/transform-style:preserve-3d/);
  assert.match(css,/\.board \{\s*transform:perspective\(var\(--gs-camera-distance\)\) rotateX\(var\(--gs-camera-tilt\)\)/);
  assert.match(css,/\.module-device-billboard \{[^}]*transform:rotateX\(var\(--gs-camera-counter/s);
  assert.doesNotMatch(css,/rotateZ|module-device-side|\.board \{ transform:none/);
  assert.match(css,/laser-plane-point \{ transform:translateZ\(var\(--device-height/);
  assert.match(css,/body\[data-graphics="dusuk"\]/);
  assert.doesNotMatch(css,/\.module-heat-bar|--battle-hp-color|\.deck-module-card/);
  for(const id of ids)assert.match(art.markup({definitionId:id}),new RegExp(`modules-physical-v1/${id}\\.webp`));
});

test("a painted per-view muzzle is projected on the billboard, not a flat rotor radius",()=>{
  const doc={createElement:()=>({ownerDocument:doc,children:[],dataset:{},classList:{add(){}},style:{setProperty(){}},setAttribute(){},appendChild(n){this.children.push(n);},replaceChildren(...n){this.children=n;}})};
  const host=doc.createElement();art.mount(host,{definitionId:"laser"});
  const m=math.plane(null,{left:200,top:300,width:60,height:50});
  m.sprite=math.plane([{x:200,y:290},{x:260,y:290},{x:260,y:350},{x:200,y:350}]);
  for(let degree=0;degree<360;degree+=3){
    const r=degree*Math.PI/180,target=math.project(m,{x:.5+5*Math.cos(r),y:.5+5*Math.sin(r)});
    const aimed=art.aimLaser(host,m,target),frame=art.frameFor(aimed.angle);
    const expected=math.project(m.sprite,globalThis.GridshardModuleViewData.laser.emitters[frame]);
    assert.ok(Math.abs(expected.x-aimed.muzzle.x)<1e-8);assert.ok(Math.abs(expected.y-aimed.muzzle.y)<1e-8);
  }
});

test("view wrap is stable at zero and both directions cover front, sides and rear",()=>{
  assert.equal(art.frameFor(0),0);assert.equal(art.frameFor(Math.PI/2),2);
  assert.equal(art.frameFor(Math.PI),4);assert.equal(art.frameFor(-Math.PI/2),6);
  assert.equal(art.frameFor(Math.PI*2-1e-7),0);assert.equal(art.frameFor(-1e-7),0);
});

test("enemy and own board rotations share the VS axis; ground compresses but billboard stays upright",()=>{
  const theta=Math.PI/6,scale=.98,distance=1400;
  const enemyTop=100,height=232,gap=52,ownTop=enemyTop+height+gap;
  const enemyAxis=enemyTop+height+gap/2,ownAxis=ownTop-gap/2;
  assert.equal(enemyAxis,ownAxis);
  // CSS: ground transform rotates +30°, billboard rotates -30° locally.
  // Ground Y changes projection; billboard local Y has no residual Z slope.
  const rotate=(y,z,a)=>({y:y*Math.cos(a)-z*Math.sin(a),z:y*Math.sin(a)+z*Math.cos(a)});
  for(const y of [-80,0,80]){
    const local=rotate(y,0,-theta),camera=rotate(local.y,local.z,theta);
    assert.ok(Math.abs(camera.y-y)<1e-8);assert.ok(Math.abs(camera.z)<1e-8);
  }
  const project=y=>{const d=(y-enemyAxis)*scale;return enemyAxis+d*Math.cos(theta)/(1-d*Math.sin(theta)/distance);};
  assert.ok(project(enemyTop+height)-project(enemyTop)<height);
  assert.ok(project(ownTop+height)-project(ownTop)<height*1.1);
});

test("closer camera keeps near-board corners inside mobile/desktop arena widths",()=>{
  const css=fs.readFileSync(path.join(__dirname,"../src/modules-yaw-v12.css"),"utf8");
  assert.match(css,/--gs-camera-distance:1400px/);assert.match(css,/--gs-camera-fit-inset:32px/);assert.match(css,/scale\(\.98\)/);
  for(const width of[280,300,340,360,394,430,500,580])for(const height of[400,500,650,850,1100]){
    const s=Math.max(28,Math.min(84,(width-32-4*8)/5,(height-180-4*8)/6));
    const w=5*s+4*8,h=3*s+2*8,nearWidth=w*.98/(1-(h+26)*.98*.5/1400);
    assert.ok(nearWidth<=width,`${width}x${height}: ${nearWidth}`);
  }
});
test("tilted device corners are cached by layout epoch; card translations do not reread them",()=>{
  const source=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
  const start=source.indexOf("  let battleAnchorBatch = null;"),end=source.indexOf("  function battleEffectLayerRect(",start);
  let x=10,cornerReads=0,cardReads=0;const releases=[];
  const corners=[{x:0,y:0},{x:80,y:0},{x:78,y:68},{x:2,y:68}];
  const rig={dataset:{device:"laser",renderer:"views8"},parentElement:{},querySelectorAll:()=>corners.map(p=>({getBoundingClientRect:()=>{cornerReads++;return {left:x+p.x,top:100+p.y};}}))};
  const card={dataset:{moduleId:"one"},querySelector:()=>rig,getBoundingClientRect:()=>{cardReads++;return {left:x,top:100,width:80,height:80};}};
  const sandbox={WeakMap,Map,GridshardLaserAim:math,battleLayoutEpoch:0,queueMicrotask:fn=>releases.push(fn),
    board:{querySelectorAll:()=>[card]},enemyBoard:null,document:{getElementById:()=>null}};
  vm.runInNewContext(source.slice(start,end)+"\nthis.measure=battleAnchorRects;",sandbox);
  const first=sandbox.measure();const point=math.project(first.devices.get("one").plane,{x:.5,y:.5});
  assert.ok(first.devices.get("one").plane.sprite);
  sandbox.measure();assert.equal(cornerReads,8);assert.equal(cardReads,1);
  releases.shift()();x+=120;
  const second=sandbox.measure(),moved=math.project(second.devices.get("one").plane,{x:.5,y:.5});
  assert.equal(cornerReads,8);assert.equal(cardReads,2);assert.ok(Math.abs(moved.x-point.x-120)<1e-8);
  releases.shift()();sandbox.battleLayoutEpoch++;sandbox.measure();assert.equal(cornerReads,16);
});
