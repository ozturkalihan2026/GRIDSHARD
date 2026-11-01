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

test('current amplifier pulses have a single VFX owner',()=>{
 const vfx=fs.readFileSync(path.join(client,'src/battle/module-vfx.js'),'utf8');
 assert.doesNotMatch(source,/presentSignatureEvent|CYCLE_PULSE_PRESENTATION/);
 assert.match(vfx,/e.type==="amplifier_pulse"/);
 assert.ok(source.includes('moduleVfx.receive(batch.events,batch.snapshot)'));
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
