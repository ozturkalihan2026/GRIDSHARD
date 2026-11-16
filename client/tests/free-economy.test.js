const test=require('node:test');
const assert=require('node:assert/strict');
const {RelayProgressionClientState}=require('../src/relay-client.js');

test('installed legacy results have no invented direct Flux reward',()=>{
  const state=new RelayProgressionClientState();
  state.applyResult({player_id:'fixture',circuit_credits_awarded:35,xp_awarded:40});
  assert.equal(state.viewModel().fluxShardsAwarded,0);
  assert.equal(state.viewModel().economyReward,null);
});

test('a repeated result replaces award facts and never accumulates the currency display',()=>{
  const state=new RelayProgressionClientState();
  const receipt={player_id:'fixture',circuit_credits_awarded:52,xp_awarded:40,flux_shards_awarded:2,
    economy_reward:{flux_battle_cap:6,flux_battles_today:1}};
  state.applyResult(receipt);state.applyResult(receipt);
  assert.equal(state.viewModel().circuitCreditsAwarded,52);
  assert.equal(state.viewModel().fluxShardsAwarded,2);
  state.applyResult({...receipt,flux_shards_awarded:0,economy_reward:{flux_battle_cap:6,flux_battles_today:6}});
  assert.equal(state.viewModel().fluxShardsAwarded,0);
  assert.equal(state.viewModel().economyReward.flux_battles_today,6);
});
