const {test,expect}=require('@playwright/test');
const {waitForParticipantReady}=require('./ui-helpers');

test('all attack/core mobile sounds decode, reach the real mixer and retain AAC fallback and voice limits',async({page,browserName},info)=>{
 test.setTimeout(120000);
 const wavRequests=[],failures=[];
 page.on('request',r=>{if(/\/assets\/audio\/.*\.wav$/.test(r.url()))wavRequests.push(r.url());});
 page.on('pageerror',e=>failures.push(e.message));
 // Production removes these masters; the fallback must use the other shipped codec.
 await page.route(/\/assets\/audio\/(?!mobile\/).*\.wav$/,r=>r.fulfill({status:404,body:''}));
 await page.route('**/assets/audio/mobile/modules/arc_cannon.ogg',r=>r.fulfill({status:404,body:''}));
 await page.goto('/?e2e=1');await waitForParticipantReady(page,60000);
 const hasWebAudio=await page.evaluate(()=>typeof (window.AudioContext||window.webkitAudioContext)==='function');
 test.skip(!hasWebAudio&&process.platform==='win32'&&browserName==='webkit','This local Windows WebKit binary exposes no AudioContext; the macOS CI WebKit gate remains required.');
 expect(hasWebAudio).toBe(true);
 await page.locator('#lobby-menu-button').click();
 const result=await page.evaluate(async()=>{
  const d=new GridshardAudioDirector();d.setPreferences({soundVolume:1,musicVolume:0,soundMuted:false,musicMuted:true});
  d.state='battle';await d.unlock();
  if(!d._ensureAudioContext())throw new Error('AudioContext initialization: '+JSON.stringify(d._lastPlaybackError));
  const names=['laser_fire','pulse_cannon_fire','missile_fire',...['railgun','drone_bay','arc_cannon','plasma_mortar','quantum_repeater','burst_cannon','shield_breaker'].map(id=>'module_'+id),
    ...['resonance','guardian','overdrive','disruptor','capacitor','phoenix','quantum'].flatMap(id=>['core_'+id+'_activate','core_'+id+'_shot']),
    ...['shield','armor','barrier','reflector','guardian_dome','phase_armor','buffer_shield','last_bastion','virus','cleanser','speed_relay'].map(id=>'module_'+id),
    'repair_beam','amplifier_charge','emp'];
  const rows=[];
  for(const name of names){
   d._sfxLastTriggeredAt.clear();d._routineSfxStarts=[];d._lastSupportSfxAt=-Infinity;
   const cue=d.triggerCue(name),started=await cue.playback;
   const b=await d._loadAudioBuffer(cue.asset),data=b.getChannelData(0);
   let peak=0,power=0;for(const v of data){peak=Math.max(peak,Math.abs(v));power+=v*v;}
   rows.push({name,started,seconds:b.duration,peak,rms:Math.sqrt(power/data.length),source:cue.asset});
   d._stopActiveSfx();
  }
  d._sfxLastTriggeredAt.clear();d._routineSfxStarts=[];
  const density=['laser_fire','pulse_cannon_fire','module_railgun','missile_fire'].map(n=>d.triggerCue(n));
  await Promise.all(density.map(r=>r.playback));
  const budget=density.map(r=>({played:r.played,suppression:r.suppression}));
  // Render the existing buses/compressor with full music, three routine
  // starts per window and two genuine firing-core families. This is a
  // numerical local mix check, not a physical speaker listening claim.
  const offline=new OfflineAudioContext(2,44100*4,44100);
  const limiter=d._createMusicLimiter(offline);
  for(const layer of GRIDSHARD_BATTLE_LAYERS){
   const source=offline.createBufferSource(),gain=offline.createGain();
   source.buffer=await d._loadAudioBuffer(layer.asset);
   gain.gain.value=GRIDSHARD_AUDIO_MIX.musicBaseGain*GRIDSHARD_AUDIO_MIX.battleMusicGain*(layer.baseGain+layer.pressureGain);
   source.connect(gain);gain.connect(limiter);source.start(0);
  }
  const trim=offline.createGain();trim.connect(offline.destination);
  const compressor=d._createSfxCompressor(offline,trim);trim.gain.value=1/d._sfxMakeupGain;
  const bus=offline.createGain();bus.gain.value=GRIDSHARD_AUDIO_MIX.sfxBaseGain*GRIDSHARD_AUDIO_MIX.battleSfxGain;bus.connect(compressor);
  async function place(name,at){
   const source=offline.createBufferSource(),gain=offline.createGain();
   source.buffer=await d._loadAudioBuffer(GRIDSHARD_SFX_CUES[name].asset);gain.gain.value=d._cueGain(name);
   source.connect(gain);gain.connect(bus);source.start(at);
  }
  const routine=names.slice(0,10);
  for(let tick=0;tick<8;tick++) for(let voice=0;voice<3;voice++)await place(routine[(tick*3+voice)%routine.length],.2+tick*.42);
  for(const id of ['core_guardian','core_overdrive']){
   await place(id+'_activate',.1);
   for(let tick=0;tick<10;tick++)await place(id+'_shot',.4+tick*.3);
  }
  const rendered=await offline.startRendering();let mixPeak=0,clipped=0;
  for(let channel=0;channel<rendered.numberOfChannels;channel++)for(const v of rendered.getChannelData(channel)){
   mixPeak=Math.max(mixPeak,Math.abs(v));if(Math.abs(v)>=1)clipped++;
  }
  d.setPreferences({soundMuted:true});const muted=d.triggerCue('core_resonance_activate');
  d.setAppActive(false);const hidden=d.triggerCue('core_guardian_activate');
  return {rows,budget,mixPeak,clipped,muted:muted.played,hidden:hidden.played};
 });
 await info.attach('decoded-mobile-cue-matrix',{body:JSON.stringify(result,null,2),contentType:'application/json'});
 expect(result.rows).toHaveLength(38);expect(result.rows.every(r=>r.started)).toBe(true);
 expect(result.rows.every(r=>r.peak>0.05&&r.peak<0.55)).toBe(true);
 expect(result.budget.map(r=>r.played)).toEqual([true,true,true,false]);
 expect(result.budget[3].suppression).toBe('voice_limit');expect(result.muted).toBe(false);expect(result.hidden).toBe(false);
 expect(result.mixPeak).toBeLessThan(1);expect(result.clipped).toBe(0);
 expect(wavRequests).toHaveLength(0);expect(failures).toEqual([]);
});
