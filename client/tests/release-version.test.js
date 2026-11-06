const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {RelayServerBootGate,RelayServerHealthState}=require('../src/relay-client');
test('2.2.1 boot gate uses actual release while v8 health alias remains compatible',async()=>{
  const health={status:'ok',version:'2.1.0-beta.72',release_version:'2.2.1',pvp_protocol_version:2};
  // This is the literal comparison shipped in the installed v8 client.
  assert.equal(health.version,'2.1.0-beta.72');
  const make=overrides=>new RelayServerBootGate({healthState:new RelayServerHealthState(),expectedVersion:'2.2.1',requestJson:async()=>({...health,...overrides})});
  assert.equal((await make({}).check()).ok,true);
  assert.equal((await make({release_version:'2.1.0'}).check()).ok,false);
  assert.equal((await make({pvp_protocol_version:1}).check()).ok,false);
  assert.equal((await make({status:'degraded'}).check()).ok,false);
});
test('active 2.4 client labels agree with the canonical package version; deployed release remains separate',()=>{
  const root=path.resolve(__dirname,'../..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
  const {clientVersion,assertClientVersion}=require('../../tools/client-version');
  assert.deepEqual(clientVersion(root),{versionName:'2.4.0',versionCode:15});
  assertClientVersion(read('client/index.html'),clientVersion(root));
  const native=JSON.parse(read('config/android-production.json'));
  assert.equal(native.versionName,'2.3.0');assert.equal(native.versionCode,14);
  assert.match(read('android/app/build.gradle'),/versionCode 14\s+versionName "2\.3\.0"/);
  assert.match(read('server/app/version.py'),/^VERSION = "2\.3\.0"/);
});
test('2.3 client accepts only the reviewed 2.2.1 bridge and never a wrong protocol',async()=>{
  const current={status:'ok',version:'2.1.0-beta.72',release_version:'2.2.1',server_release_version:'2.3.0',pvp_protocol_version:2};
  const gate=body=>new RelayServerBootGate({healthState:new RelayServerHealthState(),expectedVersion:'2.3.0',compatibleServerVersions:['2.2.1'],requestJson:async()=>body});
  assert.equal((await gate(current).check()).ok,true);
  assert.equal(current.release_version,'2.2.1'); // literal check in installed 2.2.1 clients
  assert.equal(current.version,'2.1.0-beta.72'); // literal check in v8 clients
  const older={...current};delete older.server_release_version;
  assert.equal((await gate(older).check()).ok,true);
  assert.equal((await gate({...older,release_version:'2.2.0'}).check()).ok,false);
  assert.equal((await gate({...current,server_release_version:'2.4.0'}).check()).ok,false);
  assert.equal((await gate({...current,pvp_protocol_version:3}).check()).ok,false);
  assert.equal((await gate({...current,status:'degraded'}).check()).ok,false);
});
