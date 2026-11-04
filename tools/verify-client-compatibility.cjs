// Runs actual, unmodified installed executables against an owned loopback API.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const crypto=require('node:crypto'),assert=require('node:assert/strict');
const spec=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const base=new URL(spec.base_url);
assert.equal(base.protocol,'http:');assert.equal(base.hostname,'127.0.0.1');

(async()=>{
 const results=[];
 for(const native of [false,true]){
  const playerId='wt-compat-'+crypto.randomUUID().replaceAll('-','');
  const values=new Map([['project-relay.web-test.participant-id',playerId]]),secure=new Map(),calls=[];
  const store={getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,String(value)),removeItem:key=>values.delete(key)};
  const plugin={internalGetItem:async({prefixedKey})=>({data:secure.get(prefixedKey)??null}),internalSetItem:async({prefixedKey,data})=>{secure.set(prefixedKey,data);},internalRemoveItem:async({prefixedKey})=>{secure.delete(prefixedKey);}};
  const context=vm.createContext({URL,Request,Response,Headers,AbortController,TextEncoder,TextDecoder,
   crypto:crypto.webcrypto,setTimeout,clearTimeout,localStorage:store,
   navigator:{userAgent:'COMPAT-01 isolated test',platform:'Win32'},
   location:{href:native?'https://localhost/':base.href,origin:native?'https://localhost':base.origin},
   ...(native?{GRIDSHARD_API_BASE_URL:base.origin,Capacitor:{getPlatform:()=> 'android',isNativePlatform:()=>true,Plugins:{SecureStorage:plugin}}}:{}),
   fetch:async(input,init={})=>{
    const url=new URL(typeof input==='string'?input:input.url,native?'https://localhost/':base.href);
    assert.equal(url.origin,base.origin,'Unexpected non-loopback API request');
    const response=await fetch(url,init);
    calls.push({path:url.pathname,method:init.method||'GET',status:response.status,authorized:Boolean(new Headers(init.headers).get('authorization'))});
    return response;
   }});
  for(const file of ['native-secure-storage.js','auth-session.js','relay-client.js'])vm.runInContext(fs.readFileSync(path.join(spec.client_dir,file),'utf8'),context,{filename:file});
  const requestJson=async(url,options={})=>{
   const response=await context.fetch(url,{...options,headers:{'content-type':'application/json',...(options.headers||{})}});
   const body=await response.json();if(!response.ok)throw new Error(typeof body.detail==='string'?body.detail:'HTTP '+response.status);return body;
  };
  const boot=new context.RelayServerBootGate({healthState:new context.RelayServerHealthState(),expectedVersion:spec.client_version,
   compatibleServerVersions:spec.current_client?['2.2.1','2.3.0']:spec.client_version==='2.3.0'?['2.2.1']:[],requestJson});
  const readiness=await boot.check();assert.equal(readiness.ok,true,spec.client_version+' boot failed: '+readiness.reason);
  const profile=new context.RelayProfileClientState(),stats=new context.RelayStatisticsClientState(),settings=new context.RelaySettingsClientState();
  const bootstrap=new context.RelayParticipantBootstrap({playerId,profileState:profile,statisticsState:stats,settingsState:settings,requestJson});
  const loaded=await bootstrap.load();assert.equal(loaded.ok,true,loaded.reason);assert.equal(profile.profile.player_id,playerId);
  const session=context.GridshardAuth.session;assert.equal(session.playerId,playerId);assert.ok(session.accessToken);
  assert.ok(calls.some(c=>c.path==='/auth/session'&&c.status===200));
  assert.ok(calls.some(c=>c.path===`/participants/${playerId}/bootstrap`&&c.authorized&&c.status===200));
  const reloaded=await bootstrap.load();assert.equal(reloaded.ok,true);assert.equal(profile.profile.player_id,playerId);
  const team=await requestJson('/team-profiles/ai-team-anka');assert.ok(team.team_id||team.name);
  assert.ok(calls.find(c=>c.path==='/team-profiles/ai-team-anka'&&c.authorized&&c.status===200));
  const real=await requestJson('/health');
  for(const changed of [{...real,pvp_protocol_version:99},{...real,status:'degraded'}]){
   const invalid=new context.RelayServerBootGate({healthState:new context.RelayServerHealthState(),expectedVersion:spec.client_version,
    compatibleServerVersions:spec.current_client?['2.2.1','2.3.0']:[],requestJson:async()=>changed});
   assert.equal((await invalid.check()).ok,false);
  }
  if(native){assert.ok(secure.size>0);assert.equal(store.getItem('gridshard.auth.device-secret'),null);}
  results.push({transport:native?'native-origin-emulation':'web',boot_ready:true,normal_guest_authentication:true,profile_bootstrap:true,
   stable_account_on_reload:true,public_team_authenticated:true,protocol_and_degraded_rejected:true,
   secure_storage_emulated:native,api_requests: calls.length});
 }
 let browserProof=null;
 if(spec.browser_proof){
  const {chromium,expect}=require('@playwright/test');
  const {waitForParticipantReady}=require('../e2e/ui-helpers');
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage({viewport:{width:393,height:852},locale:'tr-TR',serviceWorkers:'block'});
  const errors=[],missing=[],unexpectedOrigins=[];
  // Even an accidentally changed runtime-config must not contact production.
  await page.context().route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(['data:','blob:'].includes(url.protocol)||url.origin===base.origin)return route.continue();
   unexpectedOrigins.push(url.origin);return route.abort('blockedbyclient');
  });
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&/\.(js|css|webp|png|woff2?)(\?|$)/.test(r.url()))missing.push(new URL(r.url()).pathname);});
  try{
   await page.goto(base.href,{waitUntil:'domcontentloaded'});await waitForParticipantReady(page,60000);
   await expect(page.locator('#participant-bootstrap-status')).toHaveAttribute('data-status','ready');
   assert.equal(unexpectedOrigins.length,0,JSON.stringify(unexpectedOrigins));
   assert.equal(errors.length,0,JSON.stringify(errors));assert.equal(missing.length,0,JSON.stringify(missing));
   await page.screenshot({path:spec.screenshot});
   browserProof={passed:true,actual_guest_ui_bootstrap:true,browser_errors:0,missing_assets:0,
    network_confined_to_loopback:true,current_build_label:await page.locator('#boot-version').getAttribute('data-version'),physical_device:false};
  }finally{await browser.close();}
 }
 console.log(JSON.stringify({client_version:spec.client_version,api_version:spec.api_version,passed:true,results,browser:browserProof}));
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
