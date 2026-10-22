const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const math=require("../src/battle/laser-aim.js"),art=require("../src/module-device-art.js");
require("../src/module-view-data.js");
const vm=require("node:vm");
const {GridshardModuleMotion}=require("../src/battle/module-motion.js");
const ids=["laser","shield","battery","amplifier","emp","repair","armor","cooler","pulse_cannon","missile_launcher"];
test("all registered painted devices keep continuous aim without allocating new elements",()=>{
  let made=0;
  class Element{
    constructor(){made++;this.children=[];this.dataset={};this.attrs={};this.ownerDocument=doc;this.classList={add(){}};this.style={setProperty:(k,v)=>this.attrs[k]=v};}
    appendChild(n){this.children.push(n);}replaceChildren(...n){this.children=n;}setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k];}
  }
  const layers=require("../src/module-layer-data.js");
  const doc={createElement:()=>new Element()},matrix=math.plane([{x:0,y:0},{x:80,y:0},{x:78,y:69},{x:2,y:69}]);
  const testedIds=[...new Set([...ids,...Object.entries(layers).filter(([,v])=>v.heads?.y00).map(([id])=>id)])];
  for(const id of testedIds){
    const host=new Element();art.mount(host,{definitionId:id});
    const rig=host.children[0],shadow=rig.children[0],stage=rig.children[1].children[0].children[0],count=made;
    const layered=layers[id].kind==="layered",art0=stage.children[0].src,headIndex=stage.children.length-1;
    const turns=new Set(),heads=new Set();
    for(let deg=0;deg<720;deg++){
      const r=deg*Math.PI/180,target=math.project(matrix,{x:.5+4*Math.cos(r),y:.5+4*Math.sin(r)}),aim=art.aimDevice(host,matrix,target);
      assert.ok(Math.abs(Math.cos(aim.angle)-Math.cos(r))<1e-8);turns.add(rig.dataset.view);
      if(!layered||layers[id].base)assert.equal(stage.children[0].src,art0,"base / single painting never swaps");
      if(layered)heads.add(stage.children[headIndex].src);
    }
    assert.equal(turns.size,8,id);assert.equal(made,count);assert.equal(rig.children[0],shadow);
    assert.equal(rig.dataset.renderer,"layers");assert.equal(rig.dataset.yaw,"continuous");
    if(layered){const n=Object.keys(layers[id].heads).filter(k=>!k.endsWith("-work")).length;assert.equal(heads.size,n,id);
      for(const src of heads)assert.match(src,new RegExp(`modules-physical-v1/${id}-(ne|nw|se|sw|y\\d\\d)(-work)?\\.webp$`));}
    else assert.match(art0,new RegExp(`modules-physical-v1/${id}\\.webp$`));
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

test("devices turn only about their vertical axis: nearest painted GROUND heading, never rotated on screen",()=>{
  const layers=require("../src/module-layer-data.js");
  const doc={createElement:()=>({ownerDocument:doc,children:[],dataset:{},classList:{add(){}},style:{setProperty(){}},setAttribute(){},appendChild(n){this.children.push(n);},replaceChildren(...n){this.children=n;}})};
  const S=art.stage,Y=art.groundYaw,wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  for(const [id,layer]of Object.entries(layers).filter(([,v])=>v.heads?.y00)){
    const host=doc.createElement();art.mount(host,{definitionId:id});const rig=host.children[0],head=rig.children[1].children[0].children[0].children.at(-1);
    const m=math.plane(null,{left:200,top:300,width:60,height:60});
    m.sprite=math.plane([{x:200,y:300},{x:260,y:300},{x:260,y:360},{x:200,y:360}]);
    const painted=Object.keys(layers[id].heads);
    for(let degree=0;degree<360;degree+=3){
      const r=degree*Math.PI/180,target=math.project(m,{x:.5+5*Math.cos(r),y:.5+5*Math.sin(r)});
      const aimed=art.aimDevice(host,m,target),h=rig.dataset.heading;
      // within hysteresis of the nearest painted ground heading
      const nearest=Math.min(...painted.map(k=>Math.abs(wrap(aimed.angle-Y[k]))));
      assert.ok(Math.abs(wrap(aimed.angle-Y[h]))<=nearest+6*Math.PI/180+1e-9,`${id} ${degree}° ${h}`);
      assert.ok(!head.style.transform,"no screen-plane rotation of the painting");
      const e=layers[id].heads[h].emitter,expected=math.project(m.sprite,{x:S.left+e.x*S.size,y:S.top+e.y*S.size});
      assert.ok(Math.abs(expected.x-aimed.muzzle.x)<1e-8&&Math.abs(expected.y-aimed.muzzle.y)<1e-8);
    }
  }
});

test("view wrap is stable at zero and both directions cover front, sides and rear",()=>{
  assert.equal(art.frameFor(0),0);assert.equal(art.frameFor(Math.PI/2),2);
  assert.equal(art.frameFor(Math.PI),4);assert.equal(art.frameFor(-Math.PI/2),6);
  assert.equal(art.frameFor(Math.PI*2-1e-7),0);assert.equal(art.frameFor(-1e-7),0);
});

test("painted aim frames do not allocate per-device timers or rewrite unchanged state attributes",()=>{
  let stateWrites=0;
  const sandbox={GridshardModuleLayerData:require("../src/module-layer-data.js"),
    setTimeout(){throw new Error("no per-device turn timer");}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"../src/module-device-art.js"),"utf8"),sandbox);
  const doc={createElement:()=>({ownerDocument:doc,children:[],dataset:new Proxy({}, {set(target,key,value){
    if(["phase","frame","disabled"].includes(key))stateWrites++;target[key]=value;return true;
  }}),classList:{add(){}},style:{setProperty(){}},setAttribute(){},appendChild(n){this.children.push(n);},replaceChildren(...n){this.children=n;}})};
  const host=doc.createElement();sandbox.GridshardModuleDeviceArt.mount(host,{definitionId:"laser"});stateWrites=0;
  for(let i=0;i<100;i++)sandbox.GridshardModuleDeviceArt.pose(host,{angle:i*.02,phase:"aim",frame:0,disabled:false});
  assert.equal(stateWrites,1,"only rest→aim changes; frame/disabled stay stable");
});

test("all seven reactor registrations remain prominent, bottom anchored and bounded",()=>{
  const layers=require("../src/module-layer-data.js");
  const doc={createElement:()=>({ownerDocument:doc,children:[],dataset:{},classList:{add(){}},style:{setProperty(){}},setAttribute(){},appendChild(n){this.children.push(n);},replaceChildren(...n){this.children=n;}})};
  for(const[id,layer]of Object.entries(layers).filter(([,data])=>data.core)){
    const host=doc.createElement();art.mountCore(host,id);
    const stage=host.children[0].children[1].children[0].children[0],size=parseFloat(stage.style.width)/100;
    assert.ok(size>=1.1,id);assert.ok(layer.bounds.width*size<=1.341,id);assert.ok(layer.bounds.height*size<=1.501,id);
    assert.ok(Math.abs(parseFloat(stage.style.top)/100+size-1.08)<.001,id);
  }
});

test("aim drawing reuses its projection until layout changes or the rig is replaced",()=>{
  const source=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8").replace(/\r\n/g,"\n");
  const start=source.indexOf("    draw:(record, pose) => {",source.indexOf("const moduleMotion ="));
  const end=source.indexOf("\n    },\n  });",start);
  let rig={},reads=0;const plane={id:"stable"};
  const icon={querySelector:()=>rig},card={dataset:{moduleId:"one"},querySelector:()=>icon};
  const sandbox={motionPlaneCache:new WeakMap(),moduleAnchorCells:new Map([["one",{querySelector:()=>card}]]),battleLayoutEpoch:0,
    battleAnchorRects:()=>{reads++;return {devices:new Map([["one",{plane}]])};},laser3DPilot:{aim(){}},performance:{now:()=>0},
    GridshardModuleDeviceArt:{pose:(_icon,pose)=>{assert.equal(pose.plane,plane);return true;}}};
  vm.runInNewContext("this.draw="+source.slice(start+9,end+6),sandbox);
  for(let i=0;i<100;i++)sandbox.draw({domId:"one"},{phase:"aim"});assert.equal(reads,1);
  sandbox.battleLayoutEpoch++;sandbox.draw({domId:"one"},{});assert.equal(reads,2);
  rig={};sandbox.draw({domId:"one"},{});assert.equal(reads,3);
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
