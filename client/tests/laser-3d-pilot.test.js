"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {GridshardLaser3DPilot,laserMesh,yawForAngle,shortest,transformVertex,TILT}=require("../src/battle/laser-3d-pilot.js");
function fixture({supported=true,reduced=false}={}){
  const counts={canvas:0,draws:0,contexts:0,programs:0,buffers:0},listeners={};
  const gl={VERTEX_SHADER:1,FRAGMENT_SHADER:2,COMPILE_STATUS:3,LINK_STATUS:4,ARRAY_BUFFER:5,STATIC_DRAW:6,FLOAT:7,
    DEPTH_TEST:8,CULL_FACE:9,SCISSOR_TEST:10,COLOR_BUFFER_BIT:1,DEPTH_BUFFER_BIT:2,TRIANGLES:11,NO_ERROR:0,
    createShader:()=>({}),getShaderParameter:()=>true,createProgram:()=>{counts.programs++;return{};},getProgramParameter:()=>true,
    createBuffer:()=>{counts.buffers++;return{};},getAttribLocation:()=>0,getUniformLocation:(_,n)=>n,getError:()=>0,
    drawArrays:()=>{counts.draws++;}};
  for(const name of["shaderSource","compileShader","deleteShader","attachShader","linkProgram","bindBuffer","bufferData","useProgram",
    "enableVertexAttribArray","vertexAttribPointer","enable","disable","clearColor","clear","viewport","scissor","uniform1f"])gl[name]=()=>{};
  const document={hidden:false,createElement:tag=>{assert.equal(tag,"canvas");counts.canvas++;
    return{hidden:true,width:0,height:0,setAttribute:()=>{},addEventListener:(name,fn)=>{listeners[name]=fn;},
      getContext:()=>{counts.contexts++;return supported?gl:null;}};}};
  const root={appendChild:()=>{},getBoundingClientRect:()=>({left:0,top:0,width:300,height:500})};
  let enabled=true;
  const pilot=new GridshardLaser3DPilot({document,root,rectFor:()=>({left:20,top:40,width:70,height:70}),enabled:()=>enabled,reduced:()=>reduced,dpr:()=>3});
  const host=()=>({isConnected:true,dataset:{}});
  return{pilot,document,counts,listeners,host,gl,setEnabled:value=>{enabled=value;}};
}
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
  f.pilot.aim("a",{angle:.233,heading:"se",phase:"work"},0);
  f.pilot.render(16);assert.equal(f.pilot.animating,true);
  for(let time=32;time<1000;time+=16)f.pilot.render(time);
  assert.ok(Math.abs(shortest(f.pilot.entries.get("a").yaw,yawForAngle(.233)))<.002);
  assert.equal(f.pilot.animating,false);
  const reduced=fixture({reduced:true});reduced.pilot.attach("a",reduced.host());reduced.pilot.aim("a",{angle:.233,phase:"work"},0);reduced.pilot.render(16);
  assert.equal(reduced.pilot.animating,false);
});
test("deployed artwork has explicit non-intrinsic host and rig dimensions",()=>{
  const css=fs.readFileSync(path.join(__dirname,"../src/module-device-v8.css"),"utf8");
  const host=css.match(/\.module-icon\.has-module-device\s*\{([^}]+)\}/)[1];
  assert.match(host,/inline-size:calc\(100% - 14px\) !important/);assert.match(host,/block-size:calc\(100% - 14px\) !important/);
  assert.match(host,/justify-self:stretch !important/);assert.match(host,/grid-area:auto !important/);
  const rig=css.match(/\.module-device-rig\s*\{([^}]+)\}/)[1];
  assert.match(rig,/width:100%/);assert.match(rig,/height:100%/);assert.doesNotMatch(rig,/width:auto/);
});
test("motion wakes the existing clock once; it does not create duplicate frame owners",()=>{
  const vm=require("node:vm"),source=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
  const body=source.match(/function requestBattleMotionFrame\(\) \{[\s\S]*?\n  \}/)[0];
  let requests=0,cancels=0;
  const context=vm.createContext({document:{hidden:false},moduleMotion:{needsFrame:true},
    window:{clearTimeout:id=>{assert.equal(id,7);cancels++;}},requestAnimationFrame:()=>{requests++;return 42;},updateClock:()=>{}});
  vm.runInContext(`let battleClockTimer=7,battleClockFrame=null;${body};requestBattleMotionFrame();requestBattleMotionFrame();`,context);
  assert.equal(requests,1);assert.equal(cancels,1);
  context.document.hidden=true;vm.runInContext("requestBattleMotionFrame()",context);assert.equal(requests,1);
  const hud=source.slice(source.indexOf("// HUD ve tahta denetimi her karede çalışmaz:"),source.indexOf("moduleMotion.tick(now)"));
  assert.doesNotMatch(hud,/!frameSampling/,"Short motion frames must not bypass the HUD throttle");
});

test("rejected 3D pilot is disconnected; illustrated devices remain the only battlefield renderer",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8");
  const source=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
  const css=fs.readFileSync(path.join(__dirname,"../src/module-device-v8.css"),"utf8");
  assert.doesNotMatch(html,/src="[^"]*laser-3d-pilot/);
  assert.doesNotMatch(source,/laser3DPilot|GridshardLaser3DPilot/);
  assert.doesNotMatch(css,/data-device-renderer="webgl"|module-device-3d-layer/);
  assert.match(source,/GridshardModuleDeviceArt\.mount\(icon, model\.module, model\.enemy\)/);
});
