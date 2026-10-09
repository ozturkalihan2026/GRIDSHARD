"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { GridshardBattlePresentationQueue } = require("../src/battle/battle-presentation.js");
const { GridshardBattleCountdown } = require("../src/battle/battle-countdown.js");
const { RelayPvPClientState } = require("../src/relay-client.js");
const snapshot = (tick = 10) => ({ session_id:"match", status:"running", tick, elapsed_ms:tick * 100, players:{a:{modules:[]}, b:{modules:[]}} });

test("default countdown timers retain the browser Window receiver", () => {
  let timerCalls=0, clears=0;
  const browser={
    setTimeout(run,ms) { assert.equal(this,browser); assert.ok(ms>0); timerCalls++; return 7; },
    clearTimeout(id) { assert.equal(this,browser); assert.equal(id,7); clears++; },
  };
  const code=fs.readFileSync(path.join(__dirname,"../src/battle/battle-countdown.js"),"utf8");
  vm.runInNewContext(code,{window:browser,performance:{now:() => 0}});
  const countdown=new browser.GridshardBattleCountdown({element:null});
  countdown.sync({session_id:"m",status:"running",countdown_remaining_ms:3000});
  assert.equal(timerCalls,1);
  countdown.cancel();
  assert.equal(clears,1);
});

test("a reconnect/live overlap is consumed once, with bounded history and no stale rollback", () => {
  const state = new RelayPvPClientState({playerId:"a", sessionId:"match"});
  const events = Array.from({length:5000}, (_, i) => ({type:"module_damaged", cursor:i + 1, at_ms:i * 100, data:{}}));
  const reconnect = {version:1, type:"reconnect_state", payload:{snapshot:snapshot(5000), event_cursor:5000, events}};
  assert.equal(state.applyServerEnvelope(reconnect).events.length, 5000);
  assert.equal(state.events.length, 256);
  assert.equal(state.applyServerEnvelope(reconnect).events.length, 0);
  assert.equal(state.applyServerEnvelope({version:1,type:"events",payload:{cursor:5000,events}}).events.length, 0);
  const overlapping = state.applyServerEnvelope({version:1,type:"events",payload:{cursor:5002,events:[events[4999],{cursor:5001},{cursor:5002}]}});
  assert.deepEqual(overlapping.events.map(e => e.cursor), [5001, 5002]);
  assert.equal(state.applyServerEnvelope({version:1,type:"snapshot",payload:snapshot(4999)}).ignored, true);
  assert.equal(state.snapshot.tick, 5000);
  assert.equal(state.buildHeartbeat(123).payload.event_cursor, 5002);
});

test("a burst has one render, latest snapshot, bounded fresh FX and preserved important events", () => {
  let scheduled = 0;
  const frames = new Map();
  const renders = [], remembered = [];
  const queue = new GridshardBattlePresentationQueue({
    requestFrame:run => { frames.set(++scheduled, run); return scheduled; },
    cancelFrame:id => frames.delete(id), present:batch => renders.push(batch),
    rememberEvents:events => remembered.push(...events), maxEffects:20,
  });
  for (let i = 0; i < 100; i++) queue.push({type:"heartbeat_ack"});
  assert.equal(scheduled, 0);
  queue.push({type:"snapshot",payload:snapshot(100)});
  queue.push({type:"snapshot",payload:snapshot(200)});
  const oldWarning = {type:"inactivity_warning",at_ms:0};
  const effects = Array.from({length:500}, (_, i) => ({type:"attack_performed",at_ms:i * 40}));
  queue.push({type:"events"}, {events:[oldWarning,...effects]});
  assert.equal(scheduled, 1);
  assert.equal(queue.effects.length, 20);
  queue.flush();
  assert.equal(renders.length, 1);
  assert.equal(renders[0].snapshot.tick, 200);
  assert.equal(renders[0].events[0], oldWarning);
  assert.ok(renders[0].events.length <= 21);
  assert.equal(remembered.length, 501);
  assert.ok(queue.droppedEffects >= 480);
  assert.equal(frames.size, 0);
  assert.equal(queue.push({type:"events"}, {events:[]}), false);
  queue.flush();
  assert.equal(renders.length, 1);
  queue.push({type:"reconnect_state",payload:{snapshot:{...snapshot(10),session_id:"new"}}}, {events:[]});
  assert.equal(queue.sessionId, "new");
  assert.equal(queue.effects.length, 0);
});

test("countdown shows 3, 2, 1, unlocks once, cancels and never restarts mid-battle", () => {
  let now = 0, timer;
  const number = {textContent:""};
  const element = {hidden:true,querySelector:() => number};
  const changes = [];
  const countdown = new GridshardBattleCountdown({element, now:() => now,
    setTimer:run => {timer = run; return 1;}, clearTimer:() => {timer = null;}, onChange:active => changes.push(active)});
  countdown.sync({...snapshot(0),countdown_remaining_ms:3000});
  assert.equal(number.textContent, "3");
  assert.equal(element.hidden, false);
  now = 1000; timer(); assert.equal(number.textContent, "2");
  now = 2000; timer(); assert.equal(number.textContent, "1");
  now = 3000; timer(); assert.equal(element.hidden, true);
  assert.deepEqual(changes, [true, false]);
  countdown.sync({...snapshot(100),countdown_remaining_ms:0});
  assert.equal(countdown.active, false);
  countdown.sync({...snapshot(0),session_id:"new",countdown_remaining_ms:3000});
  countdown.cancel();
  assert.equal(element.hidden, true);
  assert.equal(timer, null);
});

test("a stale reconnect snapshot cannot discard fresh destruction events", () => {
  const renders = [], remembered = [];
  const queue = new GridshardBattlePresentationQueue({requestFrame:() => 1, cancelFrame:() => {},
    present:batch => renders.push(batch), rememberEvents:events => remembered.push(...events)});
  queue.push({type:"snapshot",payload:snapshot(200)});
  queue.flush();
  const destruction = {type:"module_destroyed",cursor:20,at_ms:20000,data:{player_id:"a",module_id:"laser"}};
  queue.push({type:"reconnect_state",payload:{snapshot:snapshot(100)}}, {ignored:true,events:[destruction]});
  queue.flush();
  assert.equal(renders[1].snapshot.tick, 200);
  assert.equal(renders[1].snapshotChanged, false);
  assert.deepEqual(renders[1].events, [destruction]);
  assert.deepEqual(remembered, [destruction]);
});
