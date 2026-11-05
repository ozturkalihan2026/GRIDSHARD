const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const root = path.join(__dirname, '..');
const profiles = require('../src/battle/module-presentation-profiles.js');
require('../src/gridshard-audio-formats.js');
class Audio {
  canPlayType() { return 'probably'; }
  play() { return Promise.resolve(); }
  pause() {}
  addEventListener() {}
  removeEventListener() {}
}
global.Audio = Audio;
require('../src/gridshard-audio.js');
const source = fs.readFileSync(path.join(root, 'src/app.js'), 'utf8');
const sandbox = vm.createContext({GridshardModulePresentation:profiles});
vm.runInContext(source.slice(source.indexOf('  const WEAPON_PRESENTATION = Object.freeze({'),
  source.indexOf('  function selectedBattlePoolDefinitionIds()')), sandbox);
const attacks = ['laser','pulse_cannon','railgun','missile_launcher','drone_bay','arc_cannon','plasma_mortar','quantum_repeater','burst_cannon','shield_breaker'];
const coreIds = Object.keys(require('../src/battle/core-vfx-v6.js').THEMES);
const cueNames = [...attacks.map(id=>sandbox.weaponCue(id)), ...coreIds.flatMap(id=>[`${id}_activate`,`${id}_shot`])];

test('all ten actual attack bindings and fourteen core cues resolve to current, packaged mobile sources', async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/audio/mobile/manifest.json')));
  for (const name of cueNames) {
    const cue = global.GRIDSHARD_SFX_CUES[name]; assert.ok(cue, name);
    const identity = cue.asset.replace('./assets/audio/','').replace('.wav','');
    const entry = manifest.sources[identity]; assert.ok(entry, name);
    const hash = file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    assert.equal(entry.sha256, hash(path.join(root,cue.asset)));
    for(const ext of ['ogg','m4a']) assert.equal(entry[`${ext}_sha256`], hash(path.join(root,'assets/audio/mobile',`${identity}.${ext}`)));
    assert.equal(global.gridshardResolveAudioAsset(cue.asset), `./assets/audio/mobile/${identity}.ogg`);
    const director = new global.GridshardAudioDirector();
    const result = director.triggerCue(name);
    assert.equal(result.played, true, name);
    assert.equal(await result.playback, true, name);
    director.setAppActive(false);
  }
});

test('retuned masters have soft zero boundaries, bounded peaks and no abrupt core-note discontinuity', () => {
  for (const name of cueNames.filter(n=>n.startsWith('core_') || n.startsWith('module_') || n==='pulse_cannon_fire')) {
    const bytes = fs.readFileSync(path.join(root,global.GRIDSHARD_SFX_CUES[name].asset));
    const x=[];for(let i=44;i<bytes.length;i+=2)x.push(bytes.readInt16LE(i)/32768);
    assert.equal(x[0],0,name);assert.equal(x.at(-1),0,name);
    assert.ok(Math.max(...x.map(Math.abs))<=.381,name);
    const rms=Math.sqrt(x.reduce((s,v)=>s+v*v,0)/x.length);
    assert.ok(rms>=.075 && rms<=.14,`${name}: ${rms}`);
    assert.ok(Math.abs(x.reduce((s,v)=>s+v,0)/x.length)<.001,name);
    assert.ok(x.slice(1).every((v,i)=>Math.abs(v-x[i])<.09),name);
  }
});

test('every shipped AAC container has an explicit MP4 brand for WebKit decoding', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/audio/mobile/manifest.json')));
  for (const identity of Object.keys(manifest.sources)) {
    const bytes = fs.readFileSync(path.join(root, 'assets/audio/mobile', `${identity}.m4a`));
    assert.equal(bytes.toString('ascii', 4, 8), 'ftyp', identity);
    const end = bytes.readUInt32BE(0), brands = [bytes.toString('ascii', 8, 12)];
    for (let offset = 16; offset < end; offset += 4) brands.push(bytes.toString('ascii', offset, offset + 4));
    assert.ok(brands.some(brand => brand.startsWith('mp4')), `${identity}: ${brands}`);
  }
});

test('the existing three-routine-voice budget, priority activation and user controls remain distinct', async () => {
  const director = new global.GridshardAudioDirector();director.state='battle';
  for(const name of attacks.slice(0,3).map(id=>sandbox.weaponCue(id))) assert.equal(director.triggerCue(name).played,true);
  assert.equal(director.triggerCue(sandbox.weaponCue('missile_launcher')).suppression,'voice_limit');
  const core=director.triggerCue('core_resonance_activate');assert.equal(core.played,true);await core.playback;
  director.setPreferences({soundVolume:1,soundMuted:false});const full=director._sfxTargetVolume();
  director.setPreferences({soundVolume:.1});assert.ok(director._sfxTargetVolume()<=full*.11);
  director.setPreferences({soundMuted:true});assert.equal(director.triggerCue('core_guardian_activate').suppression,'preferences_or_inactive');
  director.setAppActive(false);assert.equal(director.triggerCue('core_phoenix_activate').played,false);
});
