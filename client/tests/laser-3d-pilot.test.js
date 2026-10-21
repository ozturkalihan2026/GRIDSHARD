"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {GridshardLaser3DPilot,laserMesh,yawForAngle,shortest,transformVertex,forwardYaw,projectPoint,MUZZLE,TILT,SPECS}=require("../src/battle/laser-3d-pilot.js");
test("all 36 modules have locally authored reference details loaded before the renderer",()=>{
  const details=require("../src/battle/device-reference-details.js");
  assert.deepEqual([...details.ids].sort(),Object.keys(SPECS).filter(id=>!id.startsWith("core_")).sort());
  const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
  const index=html.indexOf('src="./src/battle/device-reference-details.js"');
  assert.ok(index>=0 && index<html.indexOf('src="./src/battle/laser-3d-pilot.js"'));
  assert.equal(details.build("unknown",{}),false);
});
test("all approved artwork is packaged and the extended model script precedes its consumer",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
  assert.ok(html.indexOf('src="./src/battle/device-models-extended.js"')<html.indexOf('src="./src/battle/laser-3d-pilot.js"'));
  const ext=require("../src/battle/device-models-extended.js");
  assert.equal(Object.keys(ext.specs).length,33);
  for(const id of Object.keys(ext.specs)){
    const asset="assets/ui/"+(id.startsWith("core_")?"cores-physical-v1/":"modules-physical-v2/")+id+".webp";
    assert.ok(fs.statSync(path.join(__dirname,"..",asset)).size>0,id);
    assert.ok(html.includes(asset),id);
  }
});
function fixture({supported=true,reduced=false}={}){
  const counts={canvas:0,draws:0,contexts:0,programs:0,buffers:0},listeners={};
  const live={shaders:new Set(),programs:new Set(),buffers:new Set()};
  const allocate=kind=>{const item={};live[kind].add(item);return item;};
  const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ARRAY_BUFFER:5,STATIC_DRAW:6,FLOAT:7,
    DEPTH_TEST:8,CULL_FACE:9,SCISSOR_TEST:10,COLOR_BUFFER_BIT:1,DEPTH_BUFFER_BIT:2,TRIANGLES:11,NO_ERROR:0,
    createShader:()=>allocate("shaders"),getShaderParameter:()=>true,getShaderInfoLog:()=>"shader failed",
    deleteShader:item=>live.shaders.delete(item),deleteProgram:item=>live.programs.delete(item),deleteBuffer:item=>live.buffers.delete(item),
    createProgram:()=>{counts.programs++;return allocate("programs");},getProgramParameter:()=>true,
    createBuffer:()=>{counts.buffers++;return allocate("buffers");},getAttribLocation:()=>0,getUniformLocation:(_,n)=>n,getError:()=>0,
    drawArrays:()=>{counts.draws++;}};
  for(const name of["shaderSource","compileShader","attachShader","linkProgram","bindBuffer","bufferData","useProgram",
    "enableVertexAttribArray","vertexAttribPointer","enable","disable","clearColor","clear","viewport","scissor","uniform1f"])gl[name]=()=>{};
  const document={hidden:false,createElement:tag=>{assert.equal(tag,"canvas");counts.canvas++;
    return{hidden:true,width:0,height:0,setAttribute:()=>{},addEventListener:(name,fn)=>{listeners[name]=fn;},
      getContext:()=>{counts.contexts++;return supported?gl:null;}};}};
  const root={appendChild:()=>{},getBoundingClientRect:()=>({left:0,top:0,width:300,height:500})};
  let enabled=true;
  const pilot=new GridshardLaser3DPilot({document,root,rectFor:()=>({left:20,top:40,width:70,height:70}),enabled:()=>enabled,reduced:()=>reduced,dpr:()=>3});
  const host=()=>({isConnected:true,dataset:{}});
  return{pilot,document,counts,listeners,host,gl,live,setEnabled:value=>{enabled=value;}};
}

test("GPU setup and draw failures release allocated resources and stop retry churn",()=>{
  for(const failure of ["fragment","link","attribute","upload","draw","gpu-error"]){
    const f=fixture(),host=f.host();
    if(failure==="fragment") {let compiled=0;f.gl.getShaderParameter=()=>++compiled===1;}
    if(failure==="link") f.gl.getProgramParameter=()=>false;
    if(failure==="attribute") f.gl.getAttribLocation=()=>-1;
    if(failure==="upload") f.gl.bufferData=()=>{throw new Error("upload failed");};
    if(failure==="draw") f.gl.drawArrays=()=>{throw new Error("draw failed");};
    if(failure==="gpu-error") f.gl.getError=()=>1285;
    f.pilot.attach("a",host);
    assert.doesNotThrow(()=>f.pilot.render(0),failure);
    assert.equal(f.pilot.failed,true,failure);
    assert.equal(host.dataset.deviceRenderer,undefined,failure);
    assert.equal(f.pilot.canvas.hidden,true,failure);
    for(const [kind,items] of Object.entries(f.live)) assert.equal(items.size,0,`${failure}: ${kind}`);
    for(let frame=1;frame<=100;frame++) f.pilot.render(frame*16);
    assert.equal(f.counts.contexts,1,failure);
  }
});

test("lost GPU context waits for restoration without trying to rebuild every frame",()=>{
  const f=fixture(),host=f.host();f.pilot.attach("a",host);f.pilot.render(0);
  f.listeners.webglcontextlost({preventDefault(){}});
  // The browser releases GPU objects on context loss; drop only our handles.
  for(const resources of Object.values(f.live)) resources.clear();
  assert.equal(f.pilot.program,null);
  assert.equal(f.pilot.meshes.size,0);
  assert.equal(f.pilot.needsPresent,false);
  for(let frame=1;frame<=100;frame++) f.pilot.render(frame*16);
  assert.equal(f.counts.contexts,1);
  f.listeners.webglcontextrestored();
  assert.equal(f.pilot.render(2000),true);
  assert.equal(f.counts.contexts,2);
  assert.equal(host.dataset.deviceRenderer,"webgl");
});
test("one mesh has finite triangles, unit normals, colors and separate base/head groups",()=>{
  const mesh=laserMesh();assert.ok(mesh.length>1000);assert.equal(mesh.length%30,0);
  const groups=new Set();
  for(let i=0;i<mesh.length;i+=10){
    const v=Array.from(mesh.slice(i,i+10));assert.ok(v.every(Number.isFinite));
    assert.ok(Math.abs(Math.hypot(...v.slice(3,6))-1)<1e-5);
    assert.ok(v.slice(6,9).every(n=>n>=0&&n<=1));groups.add(v[9]);
  }
  assert.deepEqual([...groups].sort(),[0,1]);
});
test("continuous screen aim covers 360 degrees without quadrant quantization",()=>{
  const angles=[];
  for(let degree=0;degree<360;degree++){
    const angle=degree*Math.PI/180,yaw=yawForAngle(angle);
    const projected=Math.atan2(Math.sin(TILT)*Math.cos(yaw),Math.sin(yaw));
    assert.ok(Math.abs(shortest(angle,projected))<1e-7);angles.push(yaw.toFixed(6));
  }
  assert.equal(new Set(angles).size,360);
});
test("base stays fixed while upper group yaws and recoils",()=>{
  const p=[.2,.3,.6];
  assert.deepEqual(transformVertex(p,0,2.4,.09),p);
  assert.notDeepEqual(transformVertex(p,1,2.4,.09),p);
  assert.ok(Math.abs(shortest(Math.PI-.1,-Math.PI+.1)-.2)<1e-8);
});
test("two lasers share one canvas, program and mesh; fallback hides only after successful draw",()=>{
  const f=fixture(),a=f.host(),b=f.host();f.pilot.attach("a",a);f.pilot.attach("b",b,true);
  assert.equal(a.dataset.deviceRenderer,undefined);assert.equal(f.counts.canvas,0);
  f.pilot.render(0);
  assert.equal(f.counts.canvas,1);assert.equal(f.counts.programs,1);assert.equal(f.counts.buffers,1);assert.equal(f.counts.draws,2);
  assert.equal(a.dataset.deviceRenderer,"webgl");assert.equal(b.dataset.deviceRenderer,"webgl");
  assert.equal(f.pilot.canvas.width,450);assert.equal(f.pilot.canvas.height,750);
  f.pilot.render(16);assert.equal(f.counts.draws,2,"No idle redraw without invalidation");
});
test("unsupported GPU and disabled quality keep 2D visible without retry/context churn",()=>{
  const f=fixture({supported:false}),h=f.host();f.pilot.attach("a",h);f.pilot.render(0);f.pilot.render(16);
  assert.equal(h.dataset.deviceRenderer,undefined);assert.equal(f.counts.contexts,1);assert.equal(f.pilot.canvas.hidden,true);
  const low=fixture(),host=low.host();low.setEnabled(false);low.pilot.attach("a",host);low.pilot.render(0);
  assert.equal(low.counts.canvas,0);assert.equal(host.dataset.deviceRenderer,undefined);
});
test("context loss, hidden page and disabled quality restore fallback; disconnected nodes prune",()=>{
  const f=fixture(),h=f.host();f.pilot.attach("a",h);f.pilot.render(0);
  let prevented=false;f.listeners.webglcontextlost({preventDefault:()=>{prevented=true;}});
  assert.equal(prevented,true);assert.equal(h.dataset.deviceRenderer,undefined);
  f.listeners.webglcontextrestored();f.pilot.render(20);assert.equal(h.dataset.deviceRenderer,"webgl");assert.equal(f.counts.canvas,1);
  f.document.hidden=true;f.pilot.render(30);assert.equal(h.dataset.deviceRenderer,undefined);
  f.document.hidden=false;f.pilot.render(40);f.setEnabled(false);f.pilot.render(50);assert.equal(h.dataset.deviceRenderer,undefined);
  h.isConnected=false;f.pilot.render(60);assert.equal(f.pilot.entries.size,0);
});
test("aim interpolation settles and reduced motion snaps without continuous recoil",()=>{
  const f=fixture(),h=f.host();f.pilot.attach("a",h);f.pilot.render(0);
  f.pilot.aim("a",{angle:-.233,heading:"ne",phase:"aim"},0);
  f.pilot.render(16);assert.equal(f.pilot.animating,true);
  for(let time=32;time<1000;time+=16)f.pilot.render(time);
  assert.ok(Math.abs(shortest(f.pilot.entries.get("a").yaw,yawForAngle(-.233)))<.002);
  assert.equal(f.pilot.animating,false);
  const reduced=fixture({reduced:true});reduced.pilot.attach("a",reduced.host());reduced.pilot.aim("a",{angle:.233,phase:"work"},0);reduced.pilot.render(16);
  assert.equal(reduced.pilot.animating,false);
});
test("deployed artwork has explicit non-intrinsic host and rig dimensions",()=>{
  const css=fs.readFileSync(path.join(__dirname,"../src/module-device-v8.css"),"utf8");
  const host=css.match(/\.module-icon\.has-module-device\s*\{([^}]+)\}/)[1];
  assert.match(host,/inline-size:calc\(100% - 14px\) !important/);assert.match(host,/block-size:calc\(100% - 14px\) !important/);
  assert.match(host,/justify-self:stretch !important/);assert.match(host,/grid-area:auto !important/);
  const rig=css.match(/^\.module-device-rig\s*\{([^}]+)\}/m)[1];
  assert.match(rig,/width:100%/);assert.match(rig,/height:100%/);assert.doesNotMatch(rig,/width:auto/);
});
test("motion wakes the existing clock once; it does not create duplicate frame owners",()=>{
  const vm=require("node:vm"),source=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
  const body=source.match(/function requestBattleMotionFrame\(\) \{[\s\S]*?\n  \}/)[0];
  let requests=0,cancels=0;
  const context=vm.createContext({document:{hidden:false},moduleMotion:{needsFrame:true},laser3DPilot:{needsPresent:false},
    window:{clearTimeout:id=>{assert.equal(id,7);cancels++;}},requestAnimationFrame:()=>{requests++;return 42;},updateClock:()=>{}});
  vm.runInContext(`let battleClockTimer=7,battleClockFrame=null,battleClockUpdating=false;${body};requestBattleMotionFrame();requestBattleMotionFrame();`,context);
  assert.equal(requests,1);assert.equal(cancels,1);
  context.document.hidden=true;vm.runInContext("requestBattleMotionFrame()",context);assert.equal(requests,1);
  const hud=source.slice(source.indexOf("// HUD ve tahta denetimi her karede çalışmaz:"),source.indexOf("moduleMotion.tick(now)"));
  assert.doesNotMatch(hud,/!frameSampling/,"Short motion frames must not bypass the HUD throttle");
});

test("first ten 3D devices load with illustrated fallback and shared clock",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
  const source=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
  const css=fs.readFileSync(path.join(__dirname,"../src/module-device-v8.css"),"utf8");
  assert.match(html,/src="[^"]*laser-3d-pilot/);
  assert.match(source,/laser3DPilot\.render\(now\)/);
  assert.match(source,/GridshardDevice3DSpecs\?\.\[definition\]\)laser3DPilot.attach\(domId,icon,model.enemy,definition\)/);
  assert.match(css,/data-device-renderer="webgl"/);
  assert.match(source,/GridshardModuleDeviceArt\.mount\(icon, model\.module, model\.enemy\)/);
});

test("43 distinct finite volumetric meshes share a context and allocate buffers only once per type",()=>{
  const f=fixture(),fingerprints=new Set();
  for(const id of Object.keys(SPECS)){
    const mesh=laserMesh(id);assert.equal(mesh.length%30,0);assert.ok(mesh.length/30<6000);
    assert.ok([...mesh].every(Number.isFinite));
    fingerprints.add(require("node:crypto").createHash("sha256").update(Buffer.from(mesh.buffer)).digest("hex"));
    f.pilot.attach(id,f.host(),false,id);
  }
  assert.equal(fingerprints.size,43);f.pilot.render(0);
  assert.equal(f.counts.contexts,1);assert.equal(f.counts.buffers,43);assert.equal(f.counts.draws,43);
  f.pilot.invalidate();f.pilot.render(16);assert.equal(f.counts.buffers,43);
});

test("device heads obey their mechanical range; passive chassis stay fixed",()=>{
  const f=fixture({reduced:true});
  for(const id of Object.keys(SPECS).filter(id=>id!=="laser")){
    f.pilot.attach(id,f.host(),false,id);const seen=new Set();
    for(let d=0;d<360;d+=5){f.pilot.aim(id,{angle:d*Math.PI/180,phase:"rest"},d);f.pilot.render(d);const yaw=f.pilot.entries.get(id).yaw;seen.add(Math.atan2(Math.sin(yaw),Math.cos(yaw)).toFixed(3));}
    assert.equal(seen.size,SPECS[id].fixed?1:SPECS[id].limit?37:72,id);
  }
});

test("all 36 canon devices have explicit rotation policies and registered meshes",()=>{
  require("../src/canon-data.js");
  const {ROTATION_RULES}=require("../src/battle/laser-3d-pilot.js");
  assert.deepEqual(Object.keys(ROTATION_RULES).sort(),globalThis.GRIDSHARD_CANON_MODULES.map(m=>m.id).sort());
  assert.equal(Object.keys(ROTATION_RULES).length,36);
  for(const [id,rule] of Object.entries(ROTATION_RULES)){
    assert.ok(Object.isFrozen(rule));assert.equal(rule.idleScan,false);
    assert.equal(rule.degrees,rule.targetDomain==="enemy"?180:rule.targetDomain==="allies"?360:0,id);
    if(!SPECS[id])assert.throws(()=>laserMesh(id),/Unknown 3D device/);
  }
  assert.equal(Object.keys(SPECS).length,43,"36 modules and seven fixed cores are registered");
  for(const id of Object.keys(SPECS).filter(id=>id.startsWith("core_"))){
    assert.equal(SPECS[id].fixed,true);
    const mesh=laserMesh(id);
    for(let i=9;i<mesh.length;i+=10)assert.equal(mesh[i],0,id);
  }
});

test("cooler fan is bounded to work and repair nozzles follow the raised arms",()=>{
  const f=fixture();f.pilot.attach("c",f.host(),false,"cooler");f.pilot.aimAt("c",{x:300,y:100},0);
  assert.equal(f.pilot.animating,true);f.pilot.render(600);assert.equal(f.pilot.animating,false);
  f.pilot.aim("c",{phase:"rest"},650);f.pilot.render(650);assert.equal(f.pilot.animating,false);
  f.pilot.attach("r",f.host(),false,"repair");const a=f.pilot.aimAt("r",{x:300,y:100},700);
  assert.equal(a.pair.length,2);assert.ok(a.pair.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
  f.pilot.aim("r",{phase:"rest"},800);f.pilot.render(800);assert.ok(f.pilot.anchor("r").emitter.y>a.emitter.y);
});

test("180 degree aiming stays in the opponent half for both players",()=>{
  assert.equal(TILT,Math.PI/3);
  for(const enemy of [true,false])for(let d=-720;d<=720;d++){
    const yaw=forwardYaw(d*Math.PI/180,enemy),center=enemy?0:Math.PI;
    assert.ok(yaw>=center-Math.PI/2-1e-9 && yaw<=center+Math.PI/2+1e-9);
  }
});

test("shot starts at the real muzzle and points at the target, without recoil or rest reset",()=>{
  for(const enemy of [false,true])for(const x of [-100,55,250]){
    const f=fixture(),h=f.host();f.pilot.attach("a",h,enemy);
    const target={x,y:enemy?300:-200},a=f.pilot.aimAt("a",target,0);
    assert.ok(a);const e=f.pilot.entries.get("a"),yaw=e.yaw;
    assert.deepEqual(a.emitter,projectPoint(f.pilot.rectFor("a"),MUZZLE,yaw));
    const u={x:a.emitter.x-a.center.x,y:a.emitter.y-a.center.y},v={x:target.x-a.center.x,y:target.y-a.center.y};
    assert.ok(Math.abs(u.x*v.y-u.y*v.x)<1e-8);assert.ok(u.x*v.x+u.y*v.y>0);
    f.pilot.aim("a",{phase:"rest"},100);f.pilot.render(100);
    assert.equal(e.yaw,yaw);assert.deepEqual(f.pilot.anchor("a").emitter,a.emitter);
    assert.equal(f.pilot.needsPresent,false);
  }
});

test("detach restores fallback and repeated attachment does not reset the aim",()=>{
  const f=fixture(),h=f.host();f.pilot.attach("a",h);f.pilot.aimAt("a",{x:0,y:-100},0);
  const yaw=f.pilot.entries.get("a").yaw;f.pilot.attach("a",h);assert.equal(f.pilot.entries.get("a").yaw,yaw);
  f.pilot.detach("a");f.pilot.render(1);assert.equal(h.dataset.deviceRenderer,undefined);assert.equal(f.pilot.canvas.hidden,true);
});
