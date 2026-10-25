"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const math=require("../src/battle/laser-aim.js"),art=require("../src/module-device-art.js");
const source=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
const near=(a,b,epsilon=1e-7)=>assert.ok(Math.abs(a-b)<epsilon,`${a} != ${b}`);
test("continuous aim reaches all 360 directions and muzzle lies on the exact shot ray",()=>{
  const matrix=math.plane(null,{left:250,top:400,width:72,height:72});
  let previous=0;
  for(let degrees=-180;degrees<=540;degrees+=1){
    const angle=degrees*Math.PI/180,pivot=math.project(matrix,math.PIVOT);
    const target={x:pivot.x+500*Math.cos(angle),y:pivot.y+500*Math.sin(angle)};
    const aimed=math.aim(matrix,target,previous);previous=aimed.angle;
    near(Math.sin(aimed.angle),Math.sin(angle));near(Math.cos(aimed.angle),Math.cos(angle));
    const dx=target.x-pivot.x,dy=target.y-pivot.y,mx=aimed.muzzle.x-pivot.x,my=aimed.muzzle.y-pivot.y;
    near(dx*my-dy*mx,0,1e-6);assert.ok(dx*mx+dy*my>0);
    near(Math.hypot(mx,my),72*.4);
  }
});
test("four measured camera-plane corners produce precise projected muzzle at every yaw",()=>{
  for(const m of [[80,0,200,0,70,300,0,0,1],[90,12,350,4,72,110,.025,.06,1],[80,-7,200,1,65,450,-.02,-.04,1]]){
    const corners=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}].map(p=>math.project(m,p));
    const matrix=math.plane(corners);
    for(let degrees=0;degrees<360;degrees+=5){
      const angle=degrees*Math.PI/180;
      const target=math.project(m,{x:.5+3*Math.cos(angle),y:.5+3*Math.sin(angle)});
      const aimed=math.aim(matrix,target);
      const expected=math.project(m,{x:.5+.4*Math.cos(angle),y:.5+.4*Math.sin(angle)});
      near(aimed.muzzle.x,expected.x);near(aimed.muzzle.y,expected.y);
    }
  }
});
test("wrap uses shortest turn; invalid/zero distance geometry cannot emit NaNs",()=>{
  near(math.nearestAngle(179*Math.PI/180,-179*Math.PI/180),181*Math.PI/180);
  near(math.nearestAngle(-179*Math.PI/180,179*Math.PI/180),-181*Math.PI/180);
  assert.equal(math.plane(null,{left:0,top:0,width:0,height:10}),null);
  assert.equal(math.inverse(Array(9).fill(0)),null);
  assert.equal(math.aim(null,{x:1,y:2}),null);
  const m=math.plane(null,{left:0,top:0,width:80,height:80});
  assert.equal(math.aim(m,{x:40,y:40}),null);
});
test("laser shows one of its 16 painted ground headings; no allocation, no screen rotation; nodes and deck artwork survive",()=>{
  let allocations=0;
  class Element{
    constructor(doc){allocations++;this.ownerDocument=doc;this.children=[];this.dataset={};this.attrs={};this.style={setProperty:(k,v)=>{this.attrs[k]=v;}};this.classList={add(){}};}
    appendChild(n){this.children.push(n);}replaceChildren(...n){this.children=n;}
    setAttribute(k,v){this.attrs[k]=v;}getAttribute(k){return this.attrs[k]||null;}
  }
  const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
  const doc={createElement:()=>new Element(doc)},host=new Element(doc);
  art.mount(host,{definitionId:"laser"});
  const rig=host.children[0],shadow=rig.children[0],stage=rig.children[1].children[0].children[0];
  const head=stage.children.at(-1),count=allocations,seen=new Set();
  const m=math.plane(null,{left:0,top:0,width:80,height:80});
  for(let degree=0;degree<360;degree+=5){
    const a=degree*Math.PI/180,target={x:40+200*Math.cos(a),y:40+200*Math.sin(a)};
    const aimed=art.aimLaser(host,m,target);assert.ok(aimed&&aimed.muzzle);near(Math.cos(aimed.angle),Math.cos(a));
    assert.equal(head,stage.children.at(-1));assert.equal(allocations,count);
    const m16=head.src.match(/modules-physical-v1\/laser-y(\d\d)\.webp$/);assert.ok(m16,head.src);seen.add(m16[1]);
    // the shown painting is within half a step (11.25°) + hysteresis of the target's ground heading
    assert.ok(Math.abs(wrap(aimed.angle-Number(m16[1])*Math.PI/8))<=Math.PI/16+4*Math.PI/180+1e-9,`${degree}° -> y${m16[1]}`);
    assert.ok(!head.style.transform);
  }
  assert.equal(seen.size,16);
  assert.equal(rig.dataset.renderer,"layers");assert.equal(shadow.className,"module-device-ground-shadow");
  assert.match(art.markup({definitionId:"laser"}),/modules-physical-v1\/laser.webp/);
  assert.equal(rig.children.filter(n=>n.className==="laser-plane-point").length,4);
});
test("server laser effect starts at the registered muzzle, not the cell center",()=>{
  const lineNodes=[],rect={left:200,top:300,width:80,height:80},targetRect={left:500,top:40,width:80,height:80};
  const plane=math.plane(null,rect),layerRect={left:100,top:20,width:700,height:700};
  class Element{constructor(){this.dataset={};this.style={setProperty(k,v){this[k]=v;}};this.children=[];}appendChild(n){this.children.push(n);}remove(){}}
  const card={getBoundingClientRect:()=>rect},target={getBoundingClientRect:()=>targetRect};
  const layer={getBoundingClientRect:()=>layerRect,appendChild:n=>lineNodes.push(n)};
  const root={querySelector:s=>s.includes('enemy-target')?target:card};
  const sandbox={document:{createElement:()=>new Element(),getElementById:id=>id==="battle-effect-layer"?layer:root},
    battleVisualGeneration:1,performance:{now:()=>0},window:{setTimeout(){}},battleEffectLayerRect:()=>layerRect,
    resolveModuleAnchor:id=>id==="source"?rect:targetRect,
    battleAnchorRects:()=>({lasers:new Map([["source",{plane,host:{}}]])}),
    GridshardModuleDeviceArt:{aimLaser:(_host,m,p)=>math.aim(m,p)},GridshardLaserAim:math,
    weaponPresentation:()=>({fx:"laser",travelMs:260}),battleEffectLoad:()=>0,
    playBattleFxClass(){},scheduleBattleSweep(){}};
  const start=source.indexOf("  function emitDuelAttackEffect("),end=source.indexOf("  function emitModuleExplosion(",start);
  vm.runInNewContext(source.slice(start,end)+"\nthis.emit=emitDuelAttackEffect;",sandbox);
  sandbox.emit("source","enemy-target","attack","laser");
  const line=lineNodes[0],aim=math.aim(plane,{x:540,y:80});
  near(parseFloat(line.style.left),aim.muzzle.x-layerRect.left);
  near(parseFloat(line.style.top),aim.muzzle.y-layerRect.top);
  assert.equal(line.dataset.emitter,"laser");
  const direction=parseFloat(line.style["--fx-angle"]),distance=parseFloat(line.style.width);
  near(parseFloat(line.style.left)+distance*Math.cos(direction),540-layerRect.left);
  near(parseFloat(line.style.top)+distance*Math.sin(direction),80-layerRect.top);
});
test("XP has one raster source in victory markup and all generated reward uses",()=>{
  const html=fs.readFileSync(path.join(__dirname,"../index.html"),"utf8"),css=fs.readFileSync(path.join(__dirname,"../src/laser-yaw-v11.css"),"utf8");
  const card=html.slice(html.indexOf('<article id="post-match-experience-card">'),html.indexOf('id="post-match-experience-reward"'));
  assert.match(card,/experience-art/);assert.doesNotMatch(card,/<svg/);
  assert.match(source,/if \(token === "experience"\) return '<span class="experience-art"/);
  assert.match(css,/experience-v1\/experience.webp/);
  assert.match(css,/data-emitter="laser"\] \{ --shot-color:#ff273d !important/);
  for(const name of ["head","base"]) {
    assert.ok(!html.includes(`src="./assets/ui/laser-yaw-v1/${name}.webp"`),"Retired rotor art is not shipped; source artwork stays archived");
    const bytes=fs.readFileSync(path.join(__dirname,`../assets/ui/laser-yaw-v1/${name}.webp`));
    assert.equal(bytes.subarray(8,12).toString(),"WEBP");assert.ok(bytes.length<30000);
  }
  assert.ok(html.indexOf('src="./src/battle/laser-aim.js"')<html.indexOf('src="./src/module-device-art.js"'));
});
