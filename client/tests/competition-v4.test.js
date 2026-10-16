"use strict";
// Prepared regression contracts; visual/game execution remains with the user.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
const app=read('src/app.js'),html=read('index.html'),css=read('src/competition-v4.css');
test('approved league images are explicit dynamic build assets',()=>{
  for(const key of ['spark','volt','reactor','quantum','nexus','legendary','gridshard']){
    const asset='./assets/ui/leagues-v1/'+key+'.webp';
    assert.ok(app.includes('"'+asset+'"'));
    assert.ok(html.includes('src="'+asset+'"'));
    assert.ok(fs.existsSync(path.join(__dirname,'..',asset)));
  }
  assert.ok(app.includes('champions:COMPETITION_TROPHY_ASSET'));
  assert.ok(app.includes('stage.league === "gridshard" ? 1 : 5'));
});
test('honor ownership and leaderboard profile/reward handlers remain server-backed',()=>{
  assert.ok(app.includes('group.definitions.filter(item => earned.has(item.id))'));
  const source=app.slice(app.indexOf('  function renderLeaderboard() {'),app.indexOf('  async function loadLeaderboard() {'));
  assert.ok(source.includes('createPublicPlayerName(row.player_id, name)'));
  assert.ok(source.includes('createTeamProfileLink(row.team_id, name)'));
  assert.ok(source.includes('leaderboardPayload?.top_ten_rewards'));
  assert.ok(!source.includes('🥇'));
  assert.ok(css.includes('.leaderboard-row.is-current-player'));
});
