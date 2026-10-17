"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const app=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
require("../src/gridshard-audio.js");
const {GridshardBattleDeferredQueue}=require("../src/battle/battle-lifecycle.js");
function fixture(){
  let now=0;const sounds=[],context={performance:{now:()=>now},battleVisualGeneration:1,BATTLE_FX_LATE_LIMIT_MS:300,
    document:{hidden:false},triggerGridshardCue:name=>sounds.push(name)};
  const queue=new GridshardBattleDeferredQueue({now:()=>now,onError:e=>{throw e;}});
  context.scheduleBattleSweep=(delay,fn)=>queue.schedule(delay,fn);
  const start=app.indexOf("  const WEAPON_PRESENTATION = Object.freeze({"),end=app.indexOf("  function selectedBattlePoolDefinitionIds()",start);
  vm.runInNewContext(app.slice(start,end)+"\nthis.impact=attackImpactCue;this.schedule=scheduleAttackImpactCue;this.weapon=weaponCue;",context);
  return{context,sounds,queue,advance:t=>{now=t;queue.flush();}};
}
test("each weapon contact uses its own acoustic family, never energy-transfer pings",()=>{
  const {context:c}=fixture();
  for(const [sourceDefinitionId,expected]of Object.entries({laser:null,quantum_repeater:null,
    pulse_cannon:"kinetic_hit",railgun:"kinetic_hit",drone_bay:"kinetic_hit",swarm_fabricator:"kinetic_hit",quantum_cannon:"kinetic_hit",
    missile_launcher:"missile_explosion",plasma_mortar:"missile_explosion",arc_cannon:"electrical_hit",ion_spear:"electrical_hit"})){
    for(const targetDefinitionId of ["core","laser","shield"])assert.equal(c.impact({sourceDefinitionId,targetDefinitionId}),expected);
    assert.equal(c.impact({sourceDefinitionId,defended:true}),"shield_absorb");
  }
  assert.equal(c.impact({sourceDefinitionId:"missile-launcher"}),"missile_explosion");
  assert.equal(c.impact({sourceDefinitionId:"future_weapon"}),"module_hit");
  assert.notEqual(global.GRIDSHARD_SFX_CUES.module_hit.asset,global.GRIDSHARD_SFX_CUES.energy_transfer.asset);
  assert.ok(app.includes('sourceDefinitionId:sourceModule?.definition_id'));
});
test("laser pulse is a single firing sound; ordinary contact schedules no second metallic hit",()=>{
  const f=fixture();assert.equal(f.context.weapon("laser"),"laser_fire");
  assert.equal(global.GRIDSHARD_SFX_CUES.laser_fire.asset,"./assets/audio/laser_pulse_v2.wav");
  f.context.schedule({sourceDefinitionId:"laser",travelMs:0});assert.equal(f.queue.entries.length,0);assert.deepEqual(f.sounds,[]);
});

test("replacement laser is a quiet 240ms tonal impulse, not the old sustained high-frequency hiss",()=>{
  const b=fs.readFileSync(path.join(__dirname,"../assets/audio/laser_pulse_v2.wav"));
  assert.equal((b.length-44)/44100,.24);assert.equal(global.GRIDSHARD_SFX_CUES.laser_fire.gain,.65);
  const samples=[];for(let i=44;i<b.length;i+=2)samples.push(b.readInt16LE(i)/32768);
  assert.ok(Math.max(...samples.map(Math.abs))<=.261);
  assert.ok(Math.abs(samples[0])<.001&&Math.abs(samples.at(-1))<.001,"soft start and release, no discontinuity");
  // Energy in the first derivative is small for a warm sub-1kHz pulse; the
  // former broadband sizzle produces much greater sample-to-sample change.
  const power=samples.reduce((n,x)=>n+x*x,0);
  const difference=samples.slice(1).reduce((n,x,i)=>n+(x-samples[i])**2,0);
  assert.ok(difference/power<.06);
});
test("missile explosion waits for travel; shared sweep rejects hidden, stale or old-session sound",()=>{
  const f=fixture();f.context.schedule({sourceDefinitionId:"missile_launcher",travelMs:500});
  f.advance(499);assert.deepEqual(f.sounds,[]);f.advance(500);assert.deepEqual(f.sounds,["missile_explosion"]);
  for(const stop of [f=>f.context.battleVisualGeneration++,f=>f.context.document.hidden=true,f=>f.queue.reset()]){
    const g=fixture();g.context.schedule({sourceDefinitionId:"missile_launcher",travelMs:500});stop(g);g.advance(600);assert.deepEqual(g.sounds,[]);
  }
  const late=fixture();late.context.schedule({sourceDefinitionId:"missile_launcher",travelMs:500});late.advance(801);assert.deepEqual(late.sounds,[]);
  const scheduleCode=app.slice(app.indexOf("  function scheduleAttackImpactCue("),app.indexOf("  function selectedBattlePoolDefinitionIds()"));
  assert.doesNotMatch(scheduleCode,/setTimeout|setInterval|requestAnimationFrame/);
});
test("new original sounds are short mono PCM, bounded in size/peak and not stale mobile derivatives",()=>{
  const {readBuildBlock,compressedAudioReplacements}=require("../../tools/build-client.js");
  const client=path.resolve(__dirname,".."),html=fs.readFileSync(path.join(client,"index.html"),"utf8");
  const omitted=compressedAudioReplacements(client,readBuildBlock(html,"scripts").inputs,{});
  let total=0;
  for(const name of ["laser_pulse_v2","rocket_launch","missile_explosion","kinetic_hit","electrical_hit","shield_absorb","cooling_air"]){
    const file=path.join(client,"assets/audio",name+".wav"),b=fs.readFileSync(file);
    assert.equal(b.toString("ascii",0,4),"RIFF");assert.equal(b.readUInt32LE(24),22050);assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt16LE(34),16);
    assert.ok(b.length<33000);total+=b.length;
    let peak=0;for(let i=44;i<b.length;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i))/32768);
    assert.ok(peak>.15&&peak<=.51);assert.equal(omitted.has(fs.realpathSync(file)),false);
  }
  assert.ok(total<150000);
  for(const cue of ["laser_fire","missile_fire","missile_explosion","kinetic_hit","electrical_hit","shield_absorb","cooling_air"]){
    const asset=global.GRIDSHARD_SFX_CUES[cue].asset;assert.ok(fs.existsSync(path.join(client,asset)));
  }
});
test("clarity reduces broad color wash, keeping sharp energy rims and a translucent honeycomb",()=>{
  const css=fs.readFileSync(path.join(__dirname,"../src/module-device-v8.css"),"utf8");
  assert.match(css,/inset 0 0 5px var\(--circuit-cell-glow\)/);
  assert.match(css,/border-color:var\(--circuit-light\) !important/);
  assert.match(css,/--circuit-cell-glow:#35e6b92b/);
  const vfx=fs.readFileSync(path.join(__dirname,"../src/battle/module-vfx.js"),"utf8");
  assert.match(vfx,/offset:\.55,"stop-color":"#28bcff","stop-opacity":\.025/);
  const mesh=fs.readFileSync(path.join(__dirname,"../src/module-vfx-v14.css"),"utf8");
  assert.match(mesh,/\.vfx-hex\s*\{[^}]*stroke-opacity:\.28/);
  assert.doesNotMatch(css,/backdrop-filter:blur|filter:blur/);
});
