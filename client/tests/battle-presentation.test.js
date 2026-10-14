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

function presentationHarness(options = {}) {
  const renders = [];
  const queue = new GridshardBattlePresentationQueue({requestFrame:() => 1, cancelFrame:() => {},
    present:batch => renders.push(batch), ...options});
  return {queue, renders};
}

test("a late batch shows only the newest routine effects, measured from the newest event", () => {
  const {queue, renders} = presentationHarness();
  // The snapshot is a second older than the newest events (one per second vs. every tick).
  queue.push({type:"snapshot",payload:snapshot(100)});
  const stalled = Array.from({length:30}, (_, i) => ({type:"attack_performed",cursor:i + 1,at_ms:8000 + i * 100}));
  queue.push({type:"events"}, {events:stalled});
  queue.flush();
  const shown = renders[0].events.map(event => event.at_ms);
  assert.deepEqual(shown, [10400, 10500, 10600, 10700, 10800, 10900]);
  assert.equal(queue.droppedEffects, 24);
});

test("on-time ticks are never trimmed", () => {
  const {queue, renders} = presentationHarness();
  queue.push({type:"snapshot",payload:snapshot(100)});
  for (let tick = 0; tick < 5; tick += 1) {
    const events = Array.from({length:12}, (_, i) => ({type:i % 2 ? "module_damaged" : "attack_performed",at_ms:10000 + tick * 100}));
    queue.push({type:"events"}, {events});
    queue.flush();
    assert.equal(renders.at(-1).events.length, 12);
  }
  assert.equal(queue.droppedEffects, 0);
});

test("decisive events outlive routine ones in a late batch", () => {
  const {queue, renders} = presentationHarness();
  queue.push({type:"snapshot",payload:snapshot(100)});
  const destroyed = {type:"module_destroyed",at_ms:9100,data:{player_id:"a",module_id:"laser"}};
  const power = {type:"core_power_used",at_ms:9050,data:{player_id:"b"}};
  const expired = {type:"module_destroyed",at_ms:8700,data:{player_id:"a",module_id:"shield"}};
  const hits = Array.from({length:10}, (_, i) => ({type:"module_damaged",at_ms:9000 + i * 100}));
  queue.push({type:"events"}, {events:[expired, power, destroyed, ...hits]});
  queue.flush();
  const shown = renders[0].events;
  assert.ok(shown.includes(destroyed) && shown.includes(power));
  assert.ok(!shown.includes(expired));
  assert.deepEqual(shown.filter(event => event.type === "module_damaged").map(event => event.at_ms), [9500, 9600, 9700, 9800, 9900]);
});

test("one frame never presents more routine effects than its budget", () => {
  const {queue, renders} = presentationHarness({maxRoutinePerFrame:8});
  queue.push({type:"snapshot",payload:snapshot(100)});
  const destroyed = {type:"module_destroyed",at_ms:10000,data:{player_id:"a",module_id:"laser"}};
  const volley = Array.from({length:30}, (_, i) => ({type:"attack_performed",cursor:i + 1,at_ms:10000}));
  queue.push({type:"events"}, {events:[destroyed, ...volley]});
  queue.flush();
  const shown = renders[0].events;
  assert.ok(shown.includes(destroyed));
  assert.deepEqual(shown.filter(event => event.type === "attack_performed").map(event => event.cursor), [23, 24, 25, 26, 27, 28, 29, 30]);
});

test("discarding queued effects keeps the newest state and important notices", () => {
  const {queue, renders} = presentationHarness();
  queue.push({type:"snapshot",payload:snapshot(300)});
  const warning = {type:"inactivity_warning",at_ms:29000,data:{player_id:"a"}};
  queue.push({type:"events"}, {events:[warning, {type:"attack_performed",at_ms:29900}, {type:"module_destroyed",at_ms:29950,data:{}}]});
  queue.discardEffects();
  queue.flush();
  assert.equal(renders[0].snapshot.tick, 300);
  assert.equal(renders[0].snapshotChanged, true);
  assert.deepEqual(renders[0].events, [warning]);
  assert.equal(queue.droppedEffects, 2);
});

test("event types without a presentation do not consume the effect budgets", () => {
  const {queue, renders} = presentationHarness({maxEffects:6, maxRoutinePerFrame:4, ignoredTypes:["module_heat_changed"]});
  queue.push({type:"snapshot",payload:snapshot(100)});
  const remembered = [];
  queue.rememberEvents = events => remembered.push(...events);
  const noise = Array.from({length:40}, () => ({type:"module_heat_changed",at_ms:10000}));
  const hits = Array.from({length:4}, (_, i) => ({type:"module_damaged",cursor:i + 1,at_ms:10000}));
  queue.push({type:"events"}, {events:[...hits, ...noise]});
  assert.equal(remembered.length, 44);
  assert.equal(queue.effects.length, 4);
  queue.flush();
  assert.deepEqual(renders[0].events.map(event => event.cursor), [1, 2, 3, 4]);
  assert.equal(queue.droppedEffects, 0);
});
