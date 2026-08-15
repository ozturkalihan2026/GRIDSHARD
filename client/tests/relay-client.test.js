const assert = require("assert");
const {
  RelayBattleClient,
  MODULE_STATUS,
} = require("../src/relay-client.js");

function createClient() {
  const emitted = [];
  const client = new RelayBattleClient({
    modules: [
      {
        instanceId: "laser-1",
        nameTr: "Lazer",
        hp: 43,
        maxHp: 100,
        status: MODULE_STATUS.RESERVE,
        position: null,
      },
      {
        instanceId: "shield-1",
        nameTr: "Kalkan",
        hp: 140,
        maxHp: 140,
        status: MODULE_STATUS.ACTIVE,
        position: { x: 2, y: 2 },
      },
    ],
    unlockAtMs: 15000,
    emitCommand(command) {
      emitted.push(command);
    },
  });
  return { client, emitted };
}

{
  const { client, emitted } = createClient();
  client.updateElapsedMs(14999);
  const start = client.beginDrag("laser-1");
  assert.strictEqual(start.ok, false);
  assert.strictEqual(emitted.length, 0);
}

{
  const { client, emitted } = createClient();
  client.updateElapsedMs(15000);
  assert.strictEqual(client.beginDrag("laser-1").ok, true);
  const result = client.dropOnCell(3, 4);
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(emitted[0], {
    kind: "place_module",
    payload: { module_id: "laser-1", x: 3, y: 4 },
  });
}

{
  const { client, emitted } = createClient();
  client.updateElapsedMs(20000);
  assert.strictEqual(client.beginDrag("shield-1").ok, true);
  const result = client.dropOnShelf();
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(emitted[0], {
    kind: "remove_module",
    payload: { module_id: "shield-1" },
  });
}

{
  const { client, emitted } = createClient();
  client.updateElapsedMs(20000);
  assert.strictEqual(client.beginDrag("shield-1").ok, true);
  const result = client.dropOnCell(4, 4);
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(emitted[0], {
    kind: "move_module",
    payload: { module_id: "shield-1", x: 4, y: 4 },
  });
}

{
  const { client, emitted } = createClient();
  client.updateElapsedMs(20000);
  assert.strictEqual(client.beginDrag("laser-1").ok, true);
  const result = client.dropOnCell(2, 2, "shield-1");
  assert.strictEqual(result.ok, true);
  assert.deepStrictEqual(emitted[0], {
    kind: "replace_module",
    payload: {
      outgoing_module_id: "shield-1",
      incoming_module_id: "laser-1",
    },
  });
}

{
  const { client } = createClient();
  client.updateElapsedMs(20000);
  assert.strictEqual(client.beginDrag("shield-1").ok, true);

  // Sürüklemek aktif modülü savaş dışına çıkarmaz.
  assert.strictEqual(
    client.requireModule("shield-1").status,
    MODULE_STATUS.ACTIVE
  );
}

console.log("6 client tests passed");
