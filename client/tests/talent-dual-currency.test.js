const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
function setup(){
  const start=app.indexOf('  function moduleTalentSelectable('),end=app.indexOf('  // Göstergeler yalnız',start);
  const c={metaProgressionState:{circuit_credits:1000,flux_shards:100},document:{documentElement:{lang:'tr'}},uiLocale:()=> 'tr-TR',createCostChip:(kind,amount)=>({kind,amount})};
  vm.createContext(c);vm.runInContext(app.slice(start,end),c);return c;
}
test('both module and core talents require both real wallets, but zero Flux costs remain free of Flux',()=>{
  const c=setup(),node={level:5,circuit_credits_cost:1000,flux_cost:100},module={unlocked:true,level:4},core={unlocked:true,level:5};
  for(const [credits,flux,expected] of [[1000,100,true],[999,100,false],[1000,99,false],[0,0,false]]){
    c.metaProgressionState={circuit_credits:credits,flux_shards:flux};
    assert.equal(c.moduleTalentSelectable(module,node),expected);assert.equal(c.coreSkillLearnable(core,node),expected);
  }
  c.metaProgressionState={circuit_credits:1000,flux_shards:0};
  assert.equal(c.moduleTalentSelectable(module,{...node,flux_cost:0}),true);
  assert.equal(c.coreSkillLearnable(core,{...node,flux_cost:0}),true);
  assert.equal(c.moduleTalentSelectable({...module,unlocked:false},node),false);
  assert.equal(c.coreSkillLearnable(core,{...node,learned:true}),false);
});
test('cost badges show charged DK and Flux with shared renderer; shortage says the missing currency',()=>{
  const c=setup(),items=[],host={append:x=>items.push(x)};
  c.appendTalentCosts(host,{circuit_credits_cost:16000,flux_cost:400});
  assert.deepEqual(items,[{kind:'credit',amount:16000},{kind:'flux',amount:400}]);
  items.length=0;c.appendTalentCosts(host,{circuit_credits_cost:1000,flux_cost:0});
  assert.deepEqual(items,[{kind:'credit',amount:1000}]);
  assert.equal(c.talentCostShortfall({circuit_credits_cost:2000,flux_cost:0}),'2.000 DK GEREKLİ');
  c.metaProgressionState.circuit_credits=16000;
  assert.equal(c.talentCostShortfall({circuit_credits_cost:16000,flux_cost:400}),'400 AKI GEREKLİ');
  c.document.documentElement.lang='en';c.uiLocale=()=> 'en-US';
  assert.equal(c.talentCostShortfall({circuit_credits_cost:16000,flux_cost:4000}),'4,000 FLUX REQUIRED');
  c.metaProgressionState.circuit_credits=0;
  assert.equal(c.talentCostShortfall({circuit_credits_cost:16000,flux_cost:400}),'16,000 CREDITS REQUIRED');
  assert.match(app,/appendTalentCosts\(level, node\)/);assert.match(app,/appendTalentCosts\(level, threshold\)/);
});
