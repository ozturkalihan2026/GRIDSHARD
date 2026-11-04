const test = require('node:test');
const assert = require('node:assert/strict');
const {RelayAccountDataLoader, RelayProfileClientState, RelayStatisticsClientState, RelaySettingsClientState} = require('../src/relay-client.js');

const profile = engagement => ({player_id:'missions-player', display_name:'Operator', level:1, experience:0,
  rating:0, preferred_battle_pool_ids:[], engagement});

test('old six and extra daily rows merge while seasonal rows keep their own period', () => {
  const state = new RelayProfileClientState();
  state.applyProfile(profile({daily_missions:[{id:'old'}], extra_daily_missions:[{id:'daily_battles_4'}],
    seasonal_missions:[{id:'season_battles_20', season_id:'s1'}]}));
  assert.deepEqual(state.viewModel().engagement.dailyMissions.map(m => m.id), ['old','daily_battles_4']);
  assert.equal(state.viewModel().engagement.seasonal_missions[0].season_id, 's1');
});

test('new mission requests carry the rendered season and day; old operation bodies stay compatible', async () => {
  const calls = [], state = new RelayProfileClientState();
  const loader = new RelayAccountDataLoader({playerId:'missions-player', profileState:state,
    statisticsState:new RelayStatisticsClientState(), settingsState:new RelaySettingsClientState(),
    requestJson:async (url, options) => {calls.push({url, body:JSON.parse(options.body)}); return profile({});}});
  const context = {season_id:'gridshard_2026_11_02', day_key:'2026-11-04'};
  assert.equal((await loader.claimEngagementReward('season-missions','daily_battles_4','stable',context)).ok, true);
  assert.deepEqual(calls[0], {url:'/profile/missions-player/engagement/season-missions/daily_battles_4/claim',
    body:{request_id:'stable', ...context}});
  await loader.claimEngagementReward('season-missions','season_battles_20','seasonal',{season_id:context.season_id, day_key:''});
  assert.equal(calls[1].body.day_key, '');
  await loader.claimEngagementReward('missions','complete_battles','legacy');
  assert.deepEqual(calls[2].body, {request_id:'legacy'});
});

test('a rejected stale mission response does not overwrite the local profile', async () => {
  const state = new RelayProfileClientState();
  state.applyProfile(profile({season_xp:100}));
  const loader = new RelayAccountDataLoader({playerId:'missions-player', profileState:state,
    statisticsState:new RelayStatisticsClientState(), settingsState:new RelaySettingsClientState(),
    requestJson:async () => {throw new Error('Emir dönemi değişti; ekranı yenile.');}});
  const result = await loader.claimEngagementReward('season-missions','daily_battles_4','retry',{season_id:'old',day_key:'2026-11-03'});
  assert.equal(result.ok, false);
  assert.equal(state.viewModel().engagement.season_xp, 100);
});
