"use strict";
// Prepared isolated regression contracts. Not executed by the visual work turn.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const sandbox={};vm.runInNewContext(read('src/competition-chest-art.js'),sandbox);
const art=sandbox.GRIDSHARD_REWARD_CHEST_ART,html=read('index.html'),app=read('src/app.js');
test('18 approved identities have distinct pairs and explicit native/web assets',()=>{
  assert.equal(Object.keys(art.entries).length,18);
  assert.equal(new Set(Object.values(art.entries).map(x=>x.closed)).size,18);
  for(const [id,a] of Object.entries(art.entries)){
    for(const asset of [a.closed,a.open]){assert.ok(fs.existsSync(path.join(root,asset)));assert.ok(html.includes('src="'+asset+'"'));}
    const markup=art.markup(id,{reveal:true});assert.ok(markup.includes(a.closed)&&markup.includes(a.open));
    assert.ok(markup.includes('--casual-glow:'+a.rgb));
  }
  assert.ok(html.indexOf('./src/competition-chest-art.js')<html.indexOf('./src/app.js'));
});
test('unknown/prototype/injected identities never become markup or URLs',()=>{
  for(const id of ['__proto__','constructor','<img src=x>','rank_crown" onload="bad()','league_bad']){assert.equal(art.has(id),false);assert.equal(art.markup(id),'');}
  for(const id of Object.keys(art.aliases))assert.ok(art.markup(id,{reveal:true}));
});
test('reveal identity propagates without changing server grant ordering',()=>{
  assert.ok(app.includes('rewards.chest_visual_id'));
  assert.ok(app.includes('visualIds.length === 1 ? visualIds[0] : ""'));
  const road=app.slice(app.indexOf('const claimLeagueNode = async'),app.indexOf('for (const node of stage.nodes || []) {',app.indexOf('const claimLeagueNode = async')));
  assert.ok(road.indexOf('await metaProgressionMutation(')<road.indexOf('showLeagueChestReveal(node.rewards || {})'));
});
test('social ownership and safe chat remain intact; avatars use physical art',()=>{
  assert.ok(app.includes('artwork.src = PROFILE_AVATAR_ART[avatar.id]'));
  assert.ok(app.includes('button.disabled = !unlocked.has(avatar.id)'));
  assert.ok(app.includes('option.disabled = locked'));
  assert.ok(app.includes('const messageText = presetMessageText(message)'));
  assert.ok(app.includes('inboxDismissBusy || inboxClaimBusy || !removable'));
  assert.ok(!app.includes('glyph.textContent = avatar.glyph'));
});

test('ranking chests are unframed and fit a complete 44px track at narrow widths',()=>{
  const css=read('src/reward-chest-art-v5.css'),competition=read('src/competition-v4.css');
  assert.match(css,/:root body\[data-app-screen\] \.reward-chest-button \{[^}]*width:44px !important; height:44px !important/);
  assert.ok(css.includes('background:transparent !important; box-shadow:none !important;'));
  assert.ok(css.includes('margin:0 !important;'));
  assert.ok(competition.includes('grid-template-columns:22px minmax(0,1fr) auto 44px'));
  assert.ok(app.includes('button.addEventListener("mouseenter"'));
  assert.ok(app.includes('button.addEventListener("focus"'));
  assert.ok(app.includes('rewardPreviewState.pinned = true'));
});
