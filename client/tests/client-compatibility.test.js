const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {RelayServerBootGate,RelayServerHealthState}=require('../src/relay-client');
const healthy=()=>({status:'ok',version:'2.1.0-beta.72',release_version:'2.2.1',server_release_version:'2.3.0',runtime_release_version:'2.4.0',pvp_protocol_version:2,
 client_compatibility:{schema_version:1,api_contract_version:1,minimum_client_version:'2.2.1',supported_client_versions:['2.2.1','2.3.0','2.4.0'],capabilities:['game.v1','profile.v1']}});
const gate=body=>new RelayServerBootGate({healthState:new RelayServerHealthState(),expectedVersion:'2.4.0',compatibleServerVersions:['2.2.1','2.3.0'],requestJson:async()=>body});

test('2.4 reads actual runtime identity while the two installed original executables accept their wire aliases',async()=>{
 const directory=path.join(__dirname,'fixtures/installed');
 const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
 for(const row of manifest.clients){
  const bytes=fs.readFileSync(path.join(directory,row.fixture));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),row.sha256);
  const context=vm.createContext({});vm.runInContext(bytes.toString('utf8'),context);
  const make=body=>new context.RelayServerBootGate({healthState:new context.RelayServerHealthState(),expectedVersion:row.version,compatibleServerVersions:row.version==='2.3.0'?['2.2.1']:[],requestJson:async()=>body});
  assert.equal((await make(healthy()).check()).ok,true,row.version);
  assert.equal((await make({...healthy(),pvp_protocol_version:3}).check()).ok,false);
  assert.equal((await make({...healthy(),status:'degraded'}).check()).ok,false);
 }
 const current=gate(healthy());assert.equal((await current.check()).ok,true);assert.equal(current.healthState.version,'2.4.0');
});

test('reviewed old API release is accepted without inventing a modern capability contract',async()=>{
 for(const version of ['2.2.1','2.3.0']){
  const old={status:'ok',version:'2.1.0-beta.72',release_version:version,pvp_protocol_version:2};
  assert.equal((await gate(old).check()).ok,true);
 }
 assert.equal((await gate({status:'ok',release_version:'2.1.0',pvp_protocol_version:2}).check()).ok,false);
});

test('new contract cannot bypass minimum version, capability, protocol or ready state',async()=>{
 const cases=[
  body=>{body.client_compatibility.minimum_client_version='2.4.1';},
  body=>{body.client_compatibility.api_contract_version=2;},
  body=>{body.client_compatibility.capabilities=['game.v1'];},
  body=>{body.client_compatibility.supported_client_versions=['2.3.0'];},
  body=>{body.pvp_protocol_version=3;},body=>{body.status='degraded';},
  body=>{delete body.client_compatibility;},body=>{delete body.runtime_release_version;},
  body=>{body.client_compatibility.supported_client_versions='2.4.0';},
 ];
 for(const change of cases){const body=healthy();change(body);assert.equal((await gate(body).check()).ok,false);}
 const body=healthy();body.client_compatibility.minimum_client_version='2.4.1';
 const result=await gate(body).check();assert.equal(result.updateRequired,true);assert.match(result.reason,/Google Play/);
 assert.equal((await gate({...healthy(),status:'degraded'}).check()).updateRequired,false);
});

test('reviewed minor release lines retain patch clients without allowing an unreviewed minor',async()=>{
 const body=healthy();body.client_compatibility.supported_client_release_lines=['2.2','2.3','2.4'];
 const make=version=>new RelayServerBootGate({healthState:new RelayServerHealthState(),expectedVersion:version,requestJson:async()=>body});
 assert.equal((await make('2.4.1').check()).ok,true);
 assert.equal((await make('2.3.2').check()).ok,true);
 assert.equal((await make('2.5.0').check()).ok,false);
 assert.equal((await make('2.2.0').check()).updateRequired,true);
});
