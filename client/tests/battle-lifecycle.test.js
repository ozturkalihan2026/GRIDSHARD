"use strict";
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { GridshardBattleRequestScope, GridshardBattleDeferredQueue } = require("../src/battle/battle-lifecycle.js");
const { RelayBattleClient, RelayPvPClientState, RelayWebSocketConnectionManager } = require("../src/relay-client.js");

test("polling is single-flight; an old completion cannot apply or release the new flight", async () => {
  const scope = new GridshardBattleRequestScope();
  const applied = [];
  let completeOld, completeNew, requests = 0;
  const old = scope.run(() => { requests++; return new Promise(resolve => { completeOld = resolve; }); }, value => applied.push(value));
  assert.equal(await scope.run(() => { requests++; }, () => {}), false);
  assert.equal(requests, 1);
  scope.reset();
  const current = scope.run(() => new Promise(resolve => { completeNew = resolve; }), value => applied.push(value));
  completeOld("old");
  assert.equal(await old, false);
  assert.equal(await scope.run(() => { throw new Error("overlap"); }, () => {}), false);
  completeNew("new");
  await current;
  assert.deepEqual(applied, ["new"]);
  await assert.rejects(scope.run(() => { throw new Error("network"); }, () => {}), /network/);
  assert.equal(scope.inFlight, null);
});

test("deferred FX cannot leak across battles, including delayed RAF scheduling and reset during flush", () => {
  let now = 0, live = 1;
  const queue = new GridshardBattleDeferredQueue({ now:() => now });
  const generation = queue.generation;
  queue.schedule(170, () => { live--; });
  queue.reset();
  live = 5;
  queue.schedule(0, () => { live--; }, generation); // Old RAF fires after reset.
  now = 1000;
  queue.flush();
  assert.equal(live, 5);
  const cancelled = queue.schedule(0, () => { live--; });
  cancelled.cancelled = true;
  queue.schedule(0, () => { queue.reset(); queue.schedule(0, () => { live++; }); });
  queue.schedule(0, () => { live--; });
  queue.flush();
  assert.equal(live, 5);
  queue.flush();
  assert.equal(live, 6);
  assert.equal(queue.entries.length, 0);
});

test("HTTP snapshots and cursors are monotonic; delayed older payload cannot restore damaged modules", () => {
  const state = new RelayPvPClientState({ playerId:"a", sessionId:"m" });
  const snapshot = (tick, hp) => ({session_id:"m", tick, elapsed_ms:tick * 100, status:"running", players:{a:{modules:[{hp}]}}});
  state.applySnapshot(snapshot(10, 20));
  state.applyEventsPage({cursor:8, events:[{cursor:8}]});
  assert.equal(state.applySnapshot(snapshot(9, 100)), false);
  assert.deepEqual(state.applyEventsPage({cursor:7, events:[{cursor:7}]}), []);
  assert.equal(state.snapshot.players.a.modules[0].hp, 20);
  assert.equal(state.eventCursor, 8);
});

test("failed or throwing delivery does not create a phantom pending placement", () => {
  const client = new RelayBattleClient({modules:[], circuitCredits:6, emitCommand:() => ({ok:false, reason:"offline"})});
  assert.deepEqual(client.deployDefinition("laser", 1), {ok:false, reason:"offline"});
  assert.equal(client.pendingPlacementCount(), 0);
  client.emitCommand = () => { throw new Error("closed socket"); };
  assert.throws(() => client.deployDefinition("laser", 1), /closed socket/);
  assert.equal(client.pendingPlacementCount(), 0);
  client.emitCommand = () => ({ok:true});
  assert.equal(client.deployDefinition("laser", 1).ok, true);
  assert.equal(client.pendingPlacementCount(), 1);
});

test("heartbeat RTT uses the same client clock and ignores stale/unmatched echoes", () => {
  let now = 100, timer;
  const socket = {readyState:1, send() {}, close() {}};
  const manager = new RelayWebSocketConnectionManager({pvpState:new RelayPvPClientState({playerId:"a",sessionId:"m"}),
    createWebSocket:() => socket, now:() => now, setTimer:run => { timer = run; return 1; }, clearTimer() {}});
  manager.connect("ws://test");
  socket.onopen();
  timer();
  now = 225;
  socket.onmessage({data:JSON.stringify({version:1, type:"heartbeat_ack", payload:{sent_at_ms:100}})});
  assert.equal(manager.lastHeartbeatRoundTripMs, 125);
  socket.onmessage({data:JSON.stringify({version:1, type:"heartbeat_ack", payload:{sent_at_ms:1791400000000}})});
  assert.equal(manager.lastHeartbeatRoundTripMs, 125);
  manager.disconnect();
});

test("a finished snapshot can present combat but only a published terminal authorizes reward sync", () => {
  const state = new RelayPvPClientState({playerId:"a",sessionId:"m"});
  const snapshot = {session_id:"m", status:"finished", tick:10, result_delivery_pending:true};
  state.applyServerEnvelope({version:1,type:"snapshot",payload:snapshot});
  assert.equal(state.phase, "finished");
  assert.equal(state.resultDeliveryReady, false);
  state.applyServerEnvelope({version:1,type:"reconnect_state",payload:{snapshot,final_result:null}});
  assert.equal(state.resultDeliveryReady, false);
  state.applyServerEnvelope({version:1,type:"match_finished",payload:{session_id:"m"}});
  assert.equal(state.resultDeliveryReady, true);
  state.bindSession("new");
  assert.equal(state.resultDeliveryReady, false);
  state.applyServerEnvelope({version:1,type:"reconnect_state",payload:{snapshot:{...snapshot,session_id:"new",result_delivery_pending:false},final_result:{session_id:"new"}}});
  assert.equal(state.resultDeliveryReady, true);
  state.reset();
  assert.equal(state.resultDeliveryReady, false);
});

test("a socket lost during result persistence reconnects until the published result arrives", () => {
  const state = new RelayPvPClientState({playerId:"a",sessionId:"m"});
  const sockets = [], timers = new Map();
  let timerId = 0;
  const manager = new RelayWebSocketConnectionManager({pvpState:state,
    createWebSocket:() => { const socket = {readyState:1,send() {},close() {}}; sockets.push(socket); return socket; },
    setTimer:run => { timers.set(++timerId, run); return timerId; }, clearTimer:id => timers.delete(id)});
  const receive = (socket, type, payload) => socket.onmessage({data:JSON.stringify({version:1,type,payload})});
  manager.connect("ws://test");
  sockets[0].onopen();
  receive(sockets[0], "snapshot", {session_id:"m",status:"finished",tick:10,result_delivery_pending:true});
  sockets[0].onclose({code:1013});
  assert.equal(state.resultDeliveryReady, false);
  assert.equal(manager.status, "reconnecting");
  timers.get(manager.reconnectTimer)();
  assert.equal(sockets.length, 2);
  sockets[1].onopen();
  receive(sockets[1], "reconnect_state", {snapshot:{session_id:"m",status:"finished",tick:10,result_delivery_pending:false},final_result:{session_id:"m"}});
  assert.equal(state.resultDeliveryReady, true);
  sockets[1].onclose({code:1000});
  assert.equal(manager.status, "closed");
  assert.equal(manager.reconnectTimer, null);
  manager.disconnect();
});
