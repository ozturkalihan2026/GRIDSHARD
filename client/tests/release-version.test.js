const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {RelayServerBootGate,RelayServerHealthState}=require('../src/relay-client');
test('2.1.1 boot gate uses actual release while v8 health alias remains compatible',async()=>{
  const health={status:'ok',version:'2.1.0-beta.72',release_version:'2.1.1',pvp_protocol_version:1};
  // This is the literal comparison shipped in the installed v8 client.
  assert.equal(health.version,'2.1.0-beta.72');
  const make=overrides=>new RelayServerBootGate({healthState:new RelayServerHealthState(),expectedVersion:'2.1.1',requestJson:async()=>({...health,...overrides})});
  assert.equal((await make({}).check()).ok,true);
  assert.equal((await make({release_version:'2.1.0'}).check()).ok,false);
  assert.equal((await make({pvp_protocol_version:2}).check()).ok,false);
  assert.equal((await make({status:'degraded'}).check()).ok,false);
});
test('active web/native/package versions agree on 2.1.1 and Android code 10',()=>{
  const root=path.resolve(__dirname,'../..');const read=p=>fs.readFileSync(path.join(root,p),'utf8');
  assert.equal(JSON.parse(read('package.json')).version,'2.1.1');
  const native=JSON.parse(read('config/android-production.json'));
  assert.equal(native.versionName,'2.1.1');assert.equal(native.versionCode,10);
  assert.match(read('android/app/build.gradle'),/versionCode 10\s+versionName "2\.1\.1"/);
  assert.match(read('client/index.html'),/id="boot-version"[^>]+data-version="2\.1\.1"/);
  assert.match(read('client/index.html'),/id="ui-build-version">2\.1\.1</);
  assert.match(read('server/app/version.py'),/^VERSION = "2\.1\.1"/);
});
