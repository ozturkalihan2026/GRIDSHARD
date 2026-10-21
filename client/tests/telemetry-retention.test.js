"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { RelayTelemetryHttpTransport } = require("../src/relay-client.js");
const settle = () => new Promise(resolve => setImmediate(resolve));

function fixture(requestJson, extra={}) {
  let serial = 0;
  const timers = new Map();
  const options = {
    requestJson, setTimer(run, ms) { timers.set(++serial, { run, ms }); return serial; },
    clearTimer(id) { timers.delete(id); }, ...extra,
  };
  const transport = new RelayTelemetryHttpTransport(options);
  return { transport, timers, options, fire() {
    assert.equal(timers.size, 1);
    const [id, task] = timers.entries().next().value;
    timers.delete(id); task.run();
  } };
}

test("offline telemetry stays bounded and new events cannot bypass retry backoff", async () => {
  let attempts = 0;
  const f = fixture(async () => { attempts++; throw new Error("offline"); }, { maxPending:16 });
  f.transport.enqueue({ event_id:"first" });
  await settle();
  for (let event = 0; event < 1000; event++) {
    f.transport.enqueue({ event_id:String(event), metadata:{ sample:event } });
    await settle();
  }
  assert.equal(f.transport.pending.size, 16);
  assert.equal(attempts, 1);
  assert.equal(f.transport.droppedEvents, 985);
  assert.equal(f.timers.size, 1);
  assert.equal([...f.timers.values()][0].ms, 1000);
  f.fire(); await settle();
  assert.equal(attempts, 2);
  assert.equal([...f.timers.values()][0].ms, 2000);
});

test("events arriving during a send are drained in a later bounded batch", async () => {
  const sent = [];
  let release;
  const f = fixture(event => {
    sent.push(event.event_id);
    return event.event_id === "first" ? new Promise(resolve => { release = resolve; }) : Promise.resolve({});
  });
  f.transport.enqueue({ event_id:"first" });
  for (let i = 0; i < 8; i++) f.transport.enqueue({ event_id:String(i) });
  release({}); await settle();
  assert.equal(f.transport.pending.size, 8);
  assert.equal(f.timers.size, 1, "tail cannot wait forever for another user action");
  f.fire(); await settle();
  assert.equal(f.transport.pending.size, 0);
  assert.deepEqual(sent, ["first", ...Array.from({length:8}, (_, i) => String(i))]);
  assert.equal(f.timers.size, 0);
});

test("duplicate and permanently rejected events do not occupy the queue twice", async () => {
  const sent = [];
  const f = fixture(async event => {
    sent.push(event.event_id);
    if (event.event_id === "bad") throw Object.assign(new Error("invalid"), { permanent:true });
  }, { maxPending:2 });
  f.transport.enqueue({ event_id:"bad" });
  f.transport.enqueue({ event_id:"bad" });
  f.transport.enqueue({ event_id:"good" });
  assert.equal(f.transport.pending.size, 2);
  assert.equal(f.transport.droppedEvents, 0);
  await settle();
  f.fire(); await settle();
  assert.deepEqual(sent, ["bad", "good"]);
  assert.equal(f.transport.pending.size, 0);
  assert.equal(f.transport.retryAttempts, 0);
});

test("default HTTP delivery times out and releases its timer before scheduling retry", async () => {
  const f = fixture(null);
  let signal;
  const sandbox = {
    AbortController,
    fetch:(_url, options) => {
      signal = options.signal;
      return new Promise((_, reject) => signal?.addEventListener("abort", () => reject(new Error("aborted"))));
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../src/relay-client.js"), "utf8"), sandbox);
  const transport = new sandbox.RelayTelemetryHttpTransport(f.options);
  transport.enqueue({ event_id:"timeout" });
  assert.equal(f.timers.size, 1);
  assert.ok(signal);
  f.fire(); await settle();
  assert.equal(signal.aborted, true);
  assert.equal(transport.inFlight, false);
  assert.equal(transport.pending.size, 1);
  assert.equal(f.timers.size, 1, "only the retry timer remains");
});

test("default HTTP cleanup covers success, permanent rejection and response-body failure", async () => {
  for (const outcome of ["success", "invalid", "body-error"]) {
    const f = fixture(null);
    const sandbox = {
      AbortController,
      fetch:async () => ({ ok:outcome !== "invalid", status:400, json:async () => {
        if (outcome === "body-error") throw new Error("body interrupted");
        return {};
      } }),
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../src/relay-client.js"), "utf8"), sandbox);
    const transport = new sandbox.RelayTelemetryHttpTransport(f.options);
    transport.enqueue({ event_id:outcome });
    await settle();
    const retrying = outcome === "body-error";
    assert.equal(transport.inFlight, false);
    assert.equal(transport.pending.size, retrying ? 1 : 0);
    assert.equal(f.timers.size, retrying ? 1 : 0, `${outcome}: deadline must be released`);
    if (retrying) assert.equal([...f.timers.values()][0].ms, 1000);
  }
});
