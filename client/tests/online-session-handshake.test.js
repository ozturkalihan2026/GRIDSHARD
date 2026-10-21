"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  RelayPvPClientState, RelayMatchmakingClientState,
  RelayWebSocketConnectionManager, RelayOnlinePlayCoordinator,
} = require("../src/relay-client.js");

const setup = {
  battlePoolIds:["laser", "shield", "cooler", "battery", "amplifier", "emp"],
  initialModules:[{instanceId:"core-1", definitionId:"core", x:2, y:1}],
};

function fixture({ queued = false, tutorial = false } = {}) {
  const sockets = [], timers = new Map(), requests = [];
  const state = new RelayPvPClientState({playerId:"player"});
  let serial = 0, match = 0, coordinator;
  const clock = {
    setTimer(run, ms) { timers.set(++serial, {run, ms}); return serial; },
    clearTimer(id) { timers.delete(id); },
  };
  const manager = new RelayWebSocketConnectionManager({
    ...clock, pvpState:state,
    createWebSocket(url) {
      const socket = {url, readyState:0, sent:[], close() { this.readyState = 3; },
        send(raw) { this.sent.push(JSON.parse(raw)); },
        open() { this.readyState = 1; this.onopen(); },
        receive(type, payload) { this.onmessage({data:JSON.stringify({version:1, type, payload})}); },
      };
      sockets.push(socket);
      return socket;
    },
    onMessageApplied() {
      if (state.phase === "battle") coordinator.markBattleStarted();
    },
  });
  const response = () => ({matched:true, session_id:`match-${match}`,
    players:["player", "opponent"], opponent_type:"ai",
    ...(tutorial ? {tutorial_deck:[...setup.battlePoolIds].reverse()} : {}),
  });
  coordinator = new RelayOnlinePlayCoordinator({
    ...clock, playerId:"player", pvpState:state,
    matchmakingState:new RelayMatchmakingClientState(), connectionManager:manager,
    webSocketUrlFactory:id => `ws://fixture/${id}`,
    requestJson:async (path, options = {}) => {
      requests.push({path, ...options});
      if (options.method === "DELETE") return {};
      if (path === "/matchmaking/join") { match++; if (queued) return {queued:true, matched:false}; }
      return response();
    },
  });
  return {state, manager, coordinator, sockets, timers, requests};
}

function assertHandshake(f, {tutorial = false} = {}) {
  const socket = f.sockets.at(-1);
  socket.open();
  assert.deepEqual(socket.sent.map(message => message.type), ["request_lobby", "submit_setup", "set_ready"]);
  assert.ok(socket.sent.every(message => message.session_id === f.state.sessionId));
  assert.deepEqual(socket.sent[1].payload.battle_pool_ids,
    tutorial ? [...setup.battlePoolIds].reverse() : setup.battlePoolIds);
  assert.deepEqual(socket.sent[1].payload.initial_modules,
    [{instance_id:"core-1", definition_id:"core", x:2, y:1}]);
  assert.deepEqual(socket.sent[2].payload, {ready:true});
  socket.receive("ready_state", {status:"running"});
  assert.equal(f.coordinator.status, "battle");
  assert.equal(f.coordinator.readyTimer, null);
  assert.equal(f.manager.outgoingQueue.length, 0);
}

test("real coordinator and connection manager deliver first match setup before readiness", async () => {
  const f = fixture();
  try {
    assert.equal((await f.coordinator.start(setup)).ok, true);
    assertHandshake(f);
  } finally { f.coordinator.reset(); }
});

test("a cancelled match cannot drop the next session's setup or carry old commands", async () => {
  const f = fixture();
  try {
    await f.coordinator.start(setup);
    const old = f.sockets[0], staleOpen = old.onopen;
    await f.coordinator.cancel();
    assert.equal(f.manager.sendEnvelope({type:"command"}).ok, false);
    await f.coordinator.start(setup);
    assert.equal(old.readyState, 3);
    staleOpen();
    assert.equal(old.sent.length, 0);
    assertHandshake(f);
    assert.equal(f.state.sessionId, "match-2");
  } finally { f.coordinator.reset(); }
});

test("polled tutorial match sends the server's deck through the real connection manager", async () => {
  const f = fixture({queued:true, tutorial:true});
  try {
    const result = await f.coordinator.start({...setup, tutorial:true});
    assert.equal(result.matched, false);
    await f.coordinator.pollNow();
    assertHandshake(f, {tutorial:true});
    assert.equal(JSON.parse(f.requests[0].body).tutorial, true);
  } finally { f.coordinator.reset(); }
});

test("private sessions use the same setup and ready handshake", () => {
  const f = fixture();
  try {
    const result = f.coordinator.connectSession({session_id:"private-match", players:["player", "friend"]}, setup);
    assert.equal(result.ok, true);
    assertHandshake(f);
  } finally { f.coordinator.reset(); }
});

test("disconnect before open preserves only the new match handshake for reconnect", async () => {
  const f = fixture();
  try {
    await f.coordinator.start(setup);
    f.sockets[0].onclose({code:1006});
    const timer = f.timers.get(f.manager.reconnectTimer);
    f.timers.delete(f.manager.reconnectTimer);
    timer.run();
    const socket = f.sockets.at(-1);
    socket.open();
    assert.deepEqual(socket.sent.map(message => message.type), ["reconnect", "submit_setup", "set_ready"]);
    socket.receive("ready_state", {status:"running"});
    assert.equal(f.coordinator.status, "battle");
    assert.equal(f.coordinator.readyTimer, null);
  } finally { f.coordinator.reset(); }
});
