const test = require("node:test");
const assert = require("node:assert/strict");

const {
  RelayPvPClientState,
  RelayMatchmakingClientState,
  RelayOnlinePlayCoordinator,
} = require("../src/relay-client.js");


test("eşleştirme iptali arayüzü anında açar ve yeniden başlatmayı güvenle sıralar", async () => {
  let releaseDelete;
  const calls = [];
  const coordinator = new RelayOnlinePlayCoordinator({
    playerId: "cancel-retry-player",
    pvpState: new RelayPvPClientState({ playerId: "cancel-retry-player" }),
    matchmakingState: new RelayMatchmakingClientState(),
    connectionManager: {
      disconnect() {},
      clearOutgoingQueue() {},
      sendSetup() {},
      sendReady() {},
      connect() {},
    },
    requestJson: async (requestPath, options = {}) => {
      calls.push({ requestPath, method: options.method || "GET" });
      if (options.method === "DELETE") {
        return new Promise((resolve) => { releaseDelete = resolve; });
      }
      return { matched: false, queue: { queued: true, matched: false } };
    },
    setTimer() { return 1; },
    clearTimer() {},
  });

  const cancelled = await coordinator.cancel();
  assert.equal(cancelled.ok, true);
  assert.equal(coordinator.status, "cancelled");

  let restarted = false;
  const restart = coordinator.start({
    battlePoolIds: Array.from({ length: 6 }, (_, index) => `m${index}`),
    initialModules: [{ instanceId: "core", definitionId: "core", x: 2, y: 1 }],
  }).then((result) => {
    restarted = true;
    return result;
  });

  await Promise.resolve();
  assert.equal(restarted, false);
  assert.equal(calls.filter((call) => call.requestPath === "/matchmaking/join").length, 0);

  releaseDelete({ ok: true });
  const result = await restart;
  assert.equal(result.ok, true);
  assert.equal(calls.filter((call) => call.requestPath === "/matchmaking/join").length, 1);
});
