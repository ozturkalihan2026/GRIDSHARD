const test=require("node:test"),assert=require("node:assert/strict");
require("../src/relay-client.js");
const loaderFor=requestJson=>new globalThis.RelayAccountDataLoader({playerId:"test-owner",profileState:{applyProfile(){}},statisticsState:{},settingsState:{},requestJson});
test("old server delivery rejection is actionable and never retries an instant-open fallback",async()=>{
  for(const kind of ["tiers","premium-tiers"]){
    const paths=[],loader=loaderFor(async path=>{paths.push(path);throw new Error("Bilinmeyen sandık teslim yöntemi.");});
    const result=await loader.claimEngagementReward(kind,5,"stable-id");
    assert.equal(result.ok,false);assert.equal(result.requiresServerRestart,true);
    assert.equal(result.code,"season_delivery_unsupported");assert.match(result.reason,/yeniden başlat/);
    assert.equal(paths.length,1);assert.match(paths[0],/chest_delivery=stock-v1$/);
  }
});
test("transient failure preserves same request ID and stock protocol on manual retry",async()=>{
  const requests=[];let fail=true,applied=0;
  const loader=loaderFor(async(path,options)=>{requests.push({path,body:options.body});if(fail)throw new Error("Bağlantı kesildi");return {season_reward_receipt:{circuit_credits:10}};});
  loader.profileState={applyProfile(){applied++;}};
  const first=await loader.claimEngagementReward("tiers",5,"stable-id");assert.equal(first.ok,false);assert.equal(first.requiresServerRestart,undefined);
  fail=false;const retry=await loader.claimEngagementReward("tiers",5,"stable-id");assert.equal(retry.ok,true);
  assert.deepEqual(requests[0],requests[1]);assert.equal(applied,1);
});
