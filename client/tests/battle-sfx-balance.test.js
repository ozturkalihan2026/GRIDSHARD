"use strict";
const test=require('node:test'),assert=require('node:assert/strict');
const {audit}=require('../../tools/battle-sfx-audit.cjs');

test('actual support PCM levels and cue duration stay below the unchanged laser foreground',()=>{
  const levels=audit(),laser=levels.laser_fire;
  assert.equal(laser.gain,.65,'do not hide imbalance by raising every attack');
  for(const cue of ['battery_charge','amplifier_charge','repair_beam','cooling_air','omega_link','chrono_shift','target_lock','nano_pulse']){
    const level=levels[cue];
    assert.ok(level.rms<=laser.rms*.5,`${cue}: at least 6dB lower integrated RMS`);
    assert.ok(level.windowRms<=laser.windowRms*.5,`${cue}: no dominant 50ms window`);
    assert.ok(level.energy<=laser.energy*.5,`${cue}: sustained tail remains bounded`);
  }
  assert.equal(levels.energy_transfer.gain,1,'UI/core-ready alias is not globally muted');
  assert.ok(levels.battery_charge.rms>laser.rms*.2,'support remains audible');
});

test('one support pulse reserves routine capacity for shots while priority events remain exempt',()=>{
  const original=Date.now;let time=1000;Date.now=()=>time;
  try{
    const director=new globalThis.GridshardAudioDirector();director.state='battle';
    assert.equal(director._admitSfxVoice('battery_charge'),true);
    assert.equal(director._admitSfxVoice('amplifier_charge'),false);
    assert.equal(director._admitSfxVoice('repair_beam'),false);
    assert.equal(director._admitSfxVoice('nano_pulse'),false);
    assert.equal(director._admitSfxVoice('omega_link'),false);
    assert.equal(director._admitSfxVoice('laser_fire'),true);
    assert.equal(director._admitSfxVoice('pulse_cannon_fire'),true);
    assert.equal(director._admitSfxVoice('railgun_fire'),false,'original total routine ceiling retained');
    assert.equal(director._admitSfxVoice('core_hit'),true);
    time=1419;assert.equal(director._admitSfxVoice('cooling_air'),false);
    time=1420;assert.equal(director._admitSfxVoice('cooling_air'),true);
    assert.ok(director._routineSfxStarts.length<=3);
  }finally{Date.now=original;}
});

test('ordinary module loss no longer borrows a full-scale UI pulse louder than core destruction',()=>{
  const levels=audit(),director=new globalThis.GridshardAudioDirector();director.state='battle';
  assert.ok(director._cueGain('module_lost')<director._cueGain('core_hit'));
  assert.ok(levels.module_lost.rms<levels.core_hit.rms);
  assert.equal(globalThis.GRIDSHARD_SFX_CUES.energy_transfer.gain??1,1);
});

test('both EMP paths remain at routine device levels including battle priority gain',()=>{
  const levels=audit(),director=new globalThis.GridshardAudioDirector();director.state='battle';
  const {measure}=require('../../tools/battle-sfx-audit.cjs');
  const legacy=measure(globalThis.GRIDSHARD_SFX_CUES.emp.asset,director._cueGain('emp'));
  assert.ok(legacy.windowRms<=levels.laser_fire.windowRms*.5);
  assert.ok(legacy.rms<=levels.laser_fire.rms*.5);
  assert.ok(legacy.energy<=levels.laser_fire.energy*.5);
  assert.ok(levels.module_emp.rms<=levels.module_laser.rms*1.05);
  assert.ok(levels.module_emp.windowRms<=levels.module_laser.windowRms*1.15);
  assert.ok(legacy.rms>levels.module_laser.rms*.75,'EMP remains audible');
});
