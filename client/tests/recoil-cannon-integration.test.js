const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),os=require('node:os');
const root=path.resolve(__dirname,'../..'),client=path.join(root,'client');
const {runtimeAssets,compressedAudioReplacements}=require('../../tools/build-client');
const math=require('../src/battle/laser-aim');
const atlas=require('../assets/ui/module-candidates-v1/recoil_cannon-directions.json');
const read=name=>fs.readFileSync(path.join(client,name),'utf8');
function context(admitted){
  const sandbox=vm.createContext({GridshardLaserAim:math,console});
  vm.runInContext(read('src/canon-data.js'),sandbox);
  if(admitted)vm.runInContext('GRIDSHARD_CANON_MODULES=Object.freeze([...GRIDSHARD_CANON_MODULES,{id:"recoil_cannon"}]);',sandbox);
  for(const file of ['src/module-layer-data.js','src/battle/recoil-cannon-art-data.js','src/module-device-art.js',
    'src/battle/module-presentation-profiles.js','src/gridshard-audio-formats.js','src/gridshard-audio.js'])vm.runInContext(read(file),sandbox);
  return sandbox;
}

test('prepared art and audio remain unregistered in the real 24-card compiled roster',()=>{
  const ctx=context(false);
  assert.equal(ctx.GridshardModuleLayerData.recoil_cannon,undefined);
  assert.equal(ctx.GridshardModulePresentation.recoil_cannon,undefined);
  assert.equal(ctx.GRIDSHARD_SFX_CUES.module_recoil_cannon,undefined);
  assert.equal(ctx.GRIDSHARD_SFX_CUES.recoil_cannon_hit,undefined);
  assert.equal(ctx.GridshardModuleDeviceArt.markup({definitionId:'recoil_cannon'}),null);
});

test('actual renderer keeps eight ground headings aligned and projects their own muzzle without reallocating DOM',()=>{
  const ctx=context(true);let made=0;
  const doc={createElement:()=>{made++;return {ownerDocument:doc,children:[],dataset:{},classList:{add(){}},
    style:{setProperty(k,v){this[k]=v;}},setAttribute(){},appendChild(n){this.children.push(n);},replaceChildren(...n){this.children=n;}};}};
  const host=doc.createElement();assert.equal(ctx.GridshardModuleDeviceArt.mount(host,{definitionId:'recoil_cannon'}),true);
  const rig=host.children[0],stage=rig.children[1].children[0].children[0],head=stage.children[0],foot=stage.children[1];
  const total=made,seen=new Set(),plane=math.plane([{x:20,y:30},{x:120,y:30},{x:120,y:110},{x:20,y:110}]);plane.sprite=plane;
  for(const f of atlas.frames){
    const r=f.angle_deg*Math.PI/180,target=math.project(plane,{x:.5+4*Math.cos(r),y:.5+4*Math.sin(r)});
    const aimed=ctx.GridshardModuleDeviceArt.aimDevice(host,plane,target),layer=ctx.GridshardModuleLayerData.recoil_cannon.heads[f.id];
    assert.equal(rig.dataset.heading,f.id);seen.add(head.src);
    assert.equal(head.src,foot.src);
    assert.equal(head.style.left,foot.style.left);assert.equal(head.style.top,foot.style.top);
    assert.ok(Math.abs(parseFloat(foot.style.left)/100+f.ground_pivot.x*parseFloat(foot.style.width)/100-.5)<.0002);
    const fit=ctx.GridshardModuleLayerData.recoil_cannon.socketFit;
    const expected=math.project(plane,{x:fit.left+layer.emitter.x*fit.size,y:fit.top+layer.emitter.y*fit.size});
    assert.ok(Math.hypot(aimed.muzzle.x-expected.x,aimed.muzzle.y-expected.y)<1e-8);
    assert.ok(!Object.values(head.style).some(v=>String(v).includes('rotate')));
  }
  assert.equal(seen.size,8);assert.equal(made,total);
  const registered=ctx.GridshardModuleLayerData.recoil_cannon;
  assert.ok(Math.abs(Math.max(registered.socketBounds.width,registered.socketBounds.height)*registered.socketFit.size-.85)<1e-8);
  assert.ok(Math.abs(registered.socketFit.top+registered.socketBounds.bottom*registered.socketFit.size-1)<1e-8);
  assert.equal(ctx.GRIDSHARD_SFX_CUES.module_recoil_cannon.gain,.58);
  assert.equal(ctx.GRIDSHARD_SFX_CUES.recoil_cannon_hit.gain,.32);
  assert.match(ctx.gridshardResolveAudioAsset(ctx.GRIDSHARD_SFX_CUES.module_recoil_cannon.asset),/recoil_cannon-shot\.(ogg|m4a|wav)$/);
});

test('web/native asset collector gates the eight paintings and both codec families together',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'gridshard-recoil-package-'));
  const write=(relative,value)=>{const p=path.join(folder,relative);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,value);};
  try{
    const scripts=['./src/canon-data.js','./src/module-layer-data.js','./src/battle/recoil-cannon-art-data.js','./src/battle/module-presentation-profiles.js','./src/gridshard-audio.js','./src/gridshard-audio-formats.js'];
    write('src/module-layer-data.js','globalThis.GridshardModuleLayerData={};');
    for(const file of ['src/battle/recoil-cannon-art-data.js','src/battle/module-presentation-profiles.js','src/gridshard-audio-formats.js'])write(file,read(file));
    write('src/gridshard-audio.js',`const hit="./assets/audio/candidates-v1/recoil_cannon-hit.wav";`);
    write('manifest.webmanifest',JSON.stringify({icons:[]}));
    const html='<audio src="./assets/audio/candidates-v1/recoil_cannon-shot.wav"></audio>';
    for(const f of atlas.frames)write('assets/ui/module-candidates-v1/'+f.file,fs.readFileSync(path.join(client,'assets/ui/module-candidates-v1',f.file)));
    for(const kind of ['shot','hit'])for(const ext of ['wav','ogg','m4a']){
      const relative=`assets/audio/${ext==='wav'?'':'mobile/'}candidates-v1/recoil_cannon-${kind}.${ext}`;
      write(relative,fs.readFileSync(path.join(client,relative)));
    }
    write('src/canon-data.js','globalThis.GRIDSHARD_CANON_MODULES=[{id:"laser"}];');
    assert.deepEqual(runtimeAssets(folder,html,scripts,new Set()),[]);
    write('src/canon-data.js','globalThis.GRIDSHARD_CANON_MODULES=[{id:"laser"},{id:"recoil_cannon"}];');
    const assets=runtimeAssets(folder,html,scripts,new Set());
    assert.equal(assets.filter(a=>a.endsWith('.webp')).length,8);
    assert.equal(assets.filter(a=>/\.(ogg|m4a)$/.test(a)).length,4);
    assert.equal(assets.filter(a=>a.endsWith('.wav')).length,2);
    assert.ok(!assets.some(a=>/master|atlas|\.png/.test(a)));
    const full=JSON.parse(fs.readFileSync(path.join(client,'assets/audio/mobile/manifest.json')));
    const sources=Object.fromEntries(Object.entries(full.sources).filter(([name])=>name.startsWith('candidates-v1/')));
    write('assets/audio/mobile/manifest.json',JSON.stringify({...full,sources}));
    write('src/gridshard-audio-formats.js',`globalThis.GRIDSHARD_AUDIO_ENCODINGS={version:1,formats:${JSON.stringify(Object.fromEntries(['ogg','m4a'].map(ext=>[ext,Object.keys(sources)])))}};`);
    assert.equal(compressedAudioReplacements(folder,scripts,{}).size,2);
  }finally{
    if(!path.resolve(folder).startsWith(path.resolve(os.tmpdir())+path.sep+'gridshard-recoil-package-'))throw Error('Unexpected cleanup target');
    fs.rmSync(folder,{recursive:true,force:true});
  }
});
