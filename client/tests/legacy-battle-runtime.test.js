const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const client=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(client,'src/app.js'),'utf8');

test('occluded legacy root grid no longer pays a full-viewport gradient/mask paint',()=>{
  const styles=fs.readFileSync(path.join(client,'src/styles.css'),'utf8');
  assert.doesNotMatch(styles,/^body::before\s*\{/m);
  assert.ok(styles.includes('linear-gradient(180deg,var(--gs-reactor-blue),var(--gs-void-navy) 72%)'),
    'the current background itself remains intact');
});

test('only the approved painted renderer loads; retired WebGL code cannot start or ship',()=>{
  const html=fs.readFileSync(path.join(client,'index.html'),'utf8');
  assert.doesNotMatch(html,/src="[^\"]*(?:laser-3d-pilot|device-models-extended|device-reference-details)/);
  assert.doesNotMatch(source,/laser3DPilot|GridshardDevice3DSpecs|DEVICE_3D_ENABLED/);
  for(const file of ['laser-3d-pilot.js','device-models-extended.js','device-reference-details.js'])
    assert.equal(fs.existsSync(path.join(client,'src/battle',file)),false,file);
  assert.ok(html.includes('src="./src/module-layer-data.js"'));
  assert.ok(html.includes('src="./src/module-device-art.js"'));
  assert.ok(source.includes('GridshardModuleDeviceArt.mountCore'));
  assert.ok(source.includes('GridshardModuleDeviceArt.mount(icon, model.module, model.enemy)'));
});

test('battery and amplifier pulses have one VFX owner; other signature events remain available',()=>{
  const start=source.indexOf('  function presentSignatureEvent('),end=source.indexOf('  function processLocalServerEvents(',start);
  const emissions=[];
  const sandbox={SIGNATURE_EVENT_TYPES:new Set(['amplifier_pulse','module_cycle_pulse']),
    findSnapshotModule:(snapshot,player,id)=>snapshot.players[player].modules.find(m=>m.instance_id===id),
    snapshotOpponentId:()=>null,snapshotModuleDomId:(_s,p,id)=>`${p}:${id}`,
    emitSignatureBattleEffect:(...args)=>emissions.push(args),CYCLE_PULSE_PRESENTATION:{},localizedUiText:s=>s};
  vm.runInNewContext(source.slice(start,end)+';this.present=presentSignatureEvent;',sandbox);
  const snapshot={players:{own:{modules:[{instance_id:'a',definition_id:'amplifier'},
    {instance_id:'b',definition_id:'battery'},{instance_id:'c',definition_id:'barrier'}]}}};
  for(const [type,id]of [['amplifier_pulse','a'],['module_cycle_pulse','b']])
    assert.equal(sandbox.present({type,data:{player_id:'own',module_id:id}},snapshot),true);
  assert.equal(emissions.length,0,'new module VFX already drew these events');
  sandbox.present({type:'module_cycle_pulse',data:{player_id:'own',module_id:'c'}},snapshot);
  assert.equal(emissions.length,1);assert.equal(emissions[0][0],'cycle_pulse');
});

test('painted devices do not inherit old card glow clocks or duplicate their canvas idle effect',()=>{
  const css=fs.readFileSync(path.join(client,'src/presentation-refinements-v16.css'),'utf8');
  const layers=fs.readFileSync(path.join(client,'src/module-layers-v15.css'),'utf8');
  const vfx=fs.readFileSync(path.join(client,'src/module-vfx-v14.css'),'utf8');
  assert.match(layers,/\.module-core-pulse\s*\{[^}]*animation:none/);
  assert.doesNotMatch(layers,/gs-layer-idle|gs-layer-struck|gs-core-pulse/);
  assert.match(vfx,/\.vfx-ambient-electric\s*\{[^}]*animation:none/);
  assert.match(css,/\.module-card\.physical-module-card,[\s\S]*?animation:none !important/);
  assert.ok(source.includes('moduleFx.coreIdle('),'working crystal retains its existing shared-frame motes');
});

test('audio keeps on-demand playback, not uncalled preload helpers and an empty voice pool',()=>{
  const audio=fs.readFileSync(path.join(client,'src/gridshard-audio.js'),'utf8');
  assert.doesNotMatch(audio,/_preloadAudioBuffers|_preloadAudioAssets|_preloadedAudio|_createPreloadedAudio/);
  assert.match(audio,/_createPlaybackAudio\(asset\)\s*\{[\s\S]*?audio.preload="none"/);
  assert.ok(audio.includes('gridshardCachedAudioBuffer(context,this._musicBufferCache,asset)'));
});
