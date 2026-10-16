"use strict";
// User runs game/regression tests; this file is prepared, not executed by Codex.
const assert=require("node:assert/strict");
const test=require("node:test");
const fs=require("node:fs");
const path=require("node:path");
const {roadProgress,createReadStore}=require("../src/home-interface-view.js");
const read=file=>fs.readFileSync(path.join(__dirname,"..",file),"utf8");
const html=read("index.html"),css=read("src/home-interface-v3.css"),app=read("src/app.js");
const nodes=values=>values.map(trophies=>({trophies,rewards:{circuit_credits:10}}));

test("road indicators follow unique actual thresholds and fill each interval",()=>{
  const road=roadProgress(nodes([300,50,100,100,150,200,250,0,500]),0,300,125);
  assert.deepEqual(road.stops.map(item=>item.trophies),[50,100,150,200,250,300]);
  assert.deepEqual(road.stops.map(item=>item.fill),[100,100,50,0,0,0]);
  assert.equal(road.completed,2);
  assert.equal(roadProgress([],0,300,125).stops.length,0);
  assert.equal(roadProgress([{trophies:"bad",rewards:{x:1}},{trophies:100,rewards:{}}],0,300,125).stops.length,0);
  assert.equal(roadProgress(nodes([10000]),8600,8900,9000,true).ceiling,10000);
  assert.equal(roadProgress(nodes([10000]),8600,8900,9000,true).stops.length,1);
});

test("read markers survive reload, are player-scoped, and tolerate bad storage",()=>{
  const storage=new Map();let player="alpha";
  const options={read:key=>storage.get(key),write:(key,value)=>storage.set(key,value),playerId:()=>player};
  const state=createReadStore(options);
  state.mark("reward:one");assert.equal(state.has("reward:one"),true);
  player="beta";assert.equal(state.has("reward:one"),false);
  player="alpha";assert.equal(createReadStore(options).has("reward:one"),true);
  const bad=createReadStore({...options,read:()=>"not-json"});
  assert.equal(bad.has("reward:one"),false);
});

test("source integration preserves startup IDs, core motion, cosmetics and shared asset inputs",()=>{
  assert.match(html,/home-interface-v3\.css/);
  assert.ok(html.indexOf('src/home-interface-view.js')<html.indexOf('src/app.js'));
  for(const id of ["boot-bar-fill","boot-retry","home-core-hero","home-active-deck","home-arena-card"]) assert.ok(html.includes(`id="${id}"`));
  assert.match(css,/\.mobile-home-hub::before \{\s*content:none !important/);
  assert.match(css,/grid-template-columns:28px minmax\(0,1fr\) 30px/);
  assert.match(css,/grid-column:3; grid-row:1/);
  assert.match(css,/hue-rotate\(-28deg\)/);
  assert.match(css,/width:min\(202px,64%\) !important; min-height:48px/);
  assert.match(css,/font:700 19\.333px/);
  assert.match(css,/width:31\.333px; height:31\.333px/);
  assert.match(css,/padding:12px 12px 10px !important/);
  assert.match(css,/padding-top:8px !important/);
  assert.match(css,/\[data-frame="none"\]/);
  assert.ok(!/core-emblem-orbits|core-emblem-spark|home-core-hero::|home-loadout-card\s*\{[^}]*background|--gs-pattern-circuit:/.test(css));
  for(const file of ["assets/ui/home-v3/route.webp","assets/ui/home-v3/message.webp","assets/ui/home-v3/message-open.webp","assets/branding/gridshard-emblem-v2.webp"]) assert.ok(fs.statSync(path.join(__dirname,"..",file)).size>0);
});

test("reading is distinct from collection, dismissal, and accepting invitations",()=>{
  const handler=app.slice(app.indexOf("  function createInboxReadButton("),app.indexOf("  function renderInboxDismissControls("));
  assert.match(handler,/inboxReadStore\.mark\(key\)/);
  assert.match(handler,/markInboxNoticesSeen\(\[item.notice_id\]\)/);
  assert.match(handler,/playerId !== participantPlayerId/);
  assert.ok(!/claim|dismissInboxMessages|acceptInboxInvitation|launchSocialBattle/.test(handler));
  const sync=app.slice(app.indexOf("  async function markInboxNoticesSeen("),app.indexOf("  let socialPollTimer"));
  assert.match(sync,/wanted\.has\(notice.notice_id\)/);
  assert.match(sync,/inboxReadStore\.has/);
  assert.ok(app.includes('filter((item) => item.status === "unclaimed")'));
});
