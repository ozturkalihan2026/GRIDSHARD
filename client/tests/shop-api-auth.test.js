const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

test('native shop list, detail and purchase use the remote API and account Bearer token',async()=>{
  const requests=[];
  const sandbox={URL,Headers,Date,JSON,location:{origin:'https://localhost'},
    GRIDSHARD_API_BASE_URL:'https://api.gridshard.test',
    GridshardDeviceSecretStore:class {},
    localStorage:{getItem:()=>null},
    fetch:async(url,options)=>{requests.push({url:String(url),options});return {status:200,ok:true};}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/auth-session.js'),'utf8'),sandbox);
  const session=sandbox.GridshardAuth.session;
  session.playerId='shop-owner';session.accessToken='synthetic-shop-bearer';session.expiresAt=Math.floor(Date.now()/1000)+3600;
  const base='/profile/shop-owner/shop-offers';
  for(const route of [base,base+'/weekly.module-parts?revision=1',base+'/weekly.module-parts/purchase']){
    const purchase=route.endsWith('/purchase');
    assert.ok(session.isProtected(session._apiInput(route)));
    await sandbox.fetch(route,{method:purchase?'POST':'GET',...(purchase?{body:JSON.stringify({request_id:'one',revision:1,preview_hash:'a'.repeat(64)})}:{})});
  }
  assert.equal(requests.length,3);
  for(const request of requests){
    assert.ok(request.url.startsWith('https://api.gridshard.test/profile/shop-owner/shop-offers'));
    assert.equal(new Headers(request.options.headers).get('authorization'),'Bearer synthetic-shop-bearer');
  }
  assert.equal(requests[2].options.method,'POST');
  assert.equal(JSON.parse(requests[2].options.body).revision,1);
});
