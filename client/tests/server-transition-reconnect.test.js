"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const {RelayPvPClientState, RelayWebSocketConnectionManager} = require("../src/relay-client.js");
for (const code of [4401, 4403, 4404]) {
  test(`terminal socket close ${code} cannot reconnect or resend commands`, () => {
    const timers = [];
    const socket = {readyState:0};
    const state = new RelayPvPClientState({playerId:"a", sessionId:"match"});
    const manager = new RelayWebSocketConnectionManager({pvpState:state, createWebSocket:()=>socket,
      setTimer:(fn, ms)=>timers.push({fn,ms}), clearTimer:()=>{}});
    manager.connect("ws://test");
    manager.outgoingQueue.push("pending");
    socket.onclose({code});
    assert.equal(manager.status,"error");
    assert.equal(state.phase,"error");
    assert.equal(timers.length,0);
    assert.equal(manager.outgoingQueue.length,0);
    assert.equal(manager.socket,null);
  });
}
