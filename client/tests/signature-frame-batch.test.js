const test=require("node:test");const assert=require("node:assert/strict");const fs=require("node:fs");const vm=require("node:vm");const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
function fixture(){
  const frames=[],cleanups=[],counts={reads:0,writes:0,builds:0};let now=0;
  const sandbox={performance:{now:()=>now},window:{requestAnimationFrame:fn=>{frames.push(fn);return frames.length;}},
    battleVisualGeneration:1,battleAnchorBatch:null,battleAnchorRects:()=>{counts.reads++;},
    buildSignatureEffectNodes:(_kind,_anchor,options)=>{assert.equal(options.append,false);counts.builds++;return[{remove(){}}];},
    signatureParticleCount:n=>n,scheduleBattleSweep:(_duration,fn)=>cleanups.push(fn),
    document:{getElementById:()=>({append:()=>{counts.writes++;}})}};
  const start=source.indexOf("  const pendingSignatureEffects = [];");const end=source.indexOf("  // Efekt yükü",start);
  vm.runInNewContext("let signatureEffectsLive=3;\n"+source.slice(start,end)+"\nthis.queue=queueSignatureEffect;this.live=()=>signatureEffectsLive;",sandbox);
  return {frames,cleanups,counts,sandbox,setNow:n=>{now=n;}};
}
const effect=()=>({kind:"repeat",anchorId:"laser",links:[],label:"YANKI",lifetime:800,particles:4,createdAt:0,generation:1});
test("three signature effects share one rAF, geometry read and DOM write",()=>{
  const f=fixture();for(let i=0;i<3;i++)f.sandbox.queue(effect());
  assert.equal(f.frames.length,1);f.frames[0]();
  assert.deepEqual(f.counts,{reads:1,writes:1,builds:3});assert.equal(f.cleanups.length,3);
  f.cleanups.forEach(fn=>fn());assert.equal(f.sandbox.live(),0);
});
test("stale queued effects expire without reading geometry or drawing",()=>{
  const f=fixture();f.sandbox.queue(effect());f.setNow(700);f.frames[0]();
  assert.deepEqual(f.counts,{reads:0,writes:0,builds:0});assert.equal(f.sandbox.live(),2);
});
test("previous visual generation cannot draw after a battle reset",()=>{
  const f=fixture();f.sandbox.queue(effect());f.sandbox.battleVisualGeneration=2;f.frames[0]();
  assert.deepEqual(f.counts,{reads:0,writes:0,builds:0});
});
