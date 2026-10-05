"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../support-retention/Code.gs"), "utf8");
const DAY = 86400000;

function harness({ live = false, confirmed = true, email = "gridshardgame@gmail.com", age = 91,
  currentIds = ["aa", "bb"], savedIds = ["aa", "bb"], closedLabel = true, invalid = false, pending = false } = {}) {
  const now = Date.now();
  const removed = [], triggerCreates = [], changes = [], labels = new Map();
  for (const name of ["GRIDSHARD_SUPPORT_CLOSE", "GRIDSHARD_SUPPORT_CLOSED", "GRIDSHARD_SUPPORT_OPEN"])
    labels.set(name, { getName: () => name, getThreads: () => name === "GRIDSHARD_SUPPORT_CLOSE" && pending ? [thread] : [] });
  const thread = { getId: () => "cc", getMessages: () => currentIds.map(id => ({ getId: () => id })),
    getLabels: () => closedLabel ? [labels.get("GRIDSHARD_SUPPORT_CLOSED")] : [],
    addLabel(label) { changes.push(["add", label.getName()]); return this; },
    removeLabel(label) { changes.push(["remove", label.getName()]); return this; }, refresh() { return this; } };
  const properties = pending ? {} : { gridshard_support_closed_cc: invalid ? "{" : JSON.stringify({ closedAt: now - age * DAY, messageIds: savedIds }) };
  const context = vm.createContext({ console: { log() {} }, Date,
    Session: { getEffectiveUser: () => ({ getEmail: () => email }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    PropertiesService: { getScriptProperties: () => ({ getProperties: () => ({ ...properties }),
      getProperty: key => properties[key] || null, setProperty: (key, value) => { properties[key] = value; },
      deleteProperty: key => { delete properties[key]; } }) },
    GmailApp: { getUserLabelByName: name => labels.get(name), getThreadById: () => thread },
    Gmail: { Users: { Messages: { remove: (owner, id) => {
      removed.push([owner, id]); currentIds = currentIds.filter(value => value !== id);
    } } } },
    ScriptApp: { getProjectTriggers: () => [], newTrigger: handler => ({ timeBased() { return this; },
      everyDays() { return this; }, atHour() { return this; }, create() { triggerCreates.push(handler); } }) },
  });
  let script = source;
  if (live) script = script.replace("dryRun: true", "dryRun: false")
    .replace("confirmation: ''", `confirmation: '${confirmed ? "DELETE_CLOSED_GRIDSHARD_SUPPORT_AFTER_90_DAYS" : ""}'`);
  vm.runInContext(script, context);
  return { context, removed, triggerCreates, properties, changes, thread };
}

test("default dry-run reports expiry without modifying messages, labels, records or triggers", () => {
  const h = harness();
  const before = JSON.stringify(h.properties);
  assert.equal(h.context.runSupportRetention().expired, 1);
  assert.equal(JSON.stringify(h.properties), before);
  assert.deepEqual(h.removed, []);
  assert.deepEqual(h.changes, []);
  assert.throws(() => h.context.installSupportRetentionTrigger(), /approve permanent deletion/);
  assert.deepEqual(h.triggerCreates, []);
});
test("wrong mailbox or missing activation confirmation prevents every mutation", () => {
  for (const options of [{ live: true, email: "other@example.com" }, { live: true, confirmed: false }]) {
    const h = harness(options);
    assert.throws(() => h.context.runSupportRetention(), /mailbox|confirmation/);
    assert.deepEqual(h.removed, []);
    assert.deepEqual(h.changes, []);
  }
});
test("fresh closed requests remain intact", () => {
  const h = harness({ live: true, age: 89.999 });
  assert.equal(h.context.runSupportRetention().kept, 1);
  assert.deepEqual(h.removed, []);
});
test("only the saved message IDs of an expired explicitly closed support request are deleted", () => {
  const h = harness({ live: true });
  assert.equal(h.context.runSupportRetention().deletedMessages, 2);
  assert.deepEqual(h.removed, [["me", "aa"], ["me", "bb"]]);
  assert.deepEqual(h.properties, {});
});
test("new replies reopen the request and prevent deletion even with an older date", () => {
  const h = harness({ live: true, currentIds: ["aa", "bb", "dd"] });
  assert.equal(h.context.runSupportRetention().reopened, 1);
  assert.deepEqual(h.removed, []);
  assert.deepEqual(h.properties, {});
  assert.ok(h.changes.some(change => change[0] === "add" && change[1] === "GRIDSHARD_SUPPORT_OPEN"));
});
test("a reply arriving during the final refresh is not deleted", () => {
  const h = harness({ live: true });
  h.thread.refresh = () => { h.thread.getMessages = () => ["aa", "bb", "dd"].map(id => ({ getId: () => id })); };
  assert.equal(h.context.runSupportRetention().deletedMessages, 0);
  assert.deepEqual(h.removed, []);
});
test("invalid, future or unlabeled records fail closed", () => {
  for (const options of [{ invalid: true }, { age: -1 }, { closedLabel: false }, { savedIds: ["aa", "aa"] }]) {
    const h = harness({ live: true, ...options });
    assert.throws(() => h.context.runSupportRetention(), /operator attention/);
    assert.deepEqual(h.removed, []);
  }
});
test("request closure is timestamped automatically, while dry-run leaves it pending", () => {
  const dry = harness({ pending: true });
  assert.equal(dry.context.runSupportRetention().closureRequests, 1);
  assert.deepEqual(dry.properties, {});
  const live = harness({ pending: true, live: true });
  assert.equal(live.context.runSupportRetention().closureRequests, 1);
  assert.ok(JSON.parse(live.properties.gridshard_support_closed_cc).closedAt > Date.now() - 5000);
  assert.deepEqual(live.removed, []);
});
test("message budget stops large deletions and reports attention instead of clearing unrelated mail", () => {
  const ids = Array.from({ length: 101 }, (_, i) => (i + 1).toString(16));
  const h = harness({ live: true, currentIds: ids, savedIds: ids });
  assert.throws(() => h.context.runSupportRetention(), /operator attention/);
  assert.deepEqual(h.removed, []);
});
test("trigger installation requires the correct support mailbox and explicit live activation", () => {
  const h = harness({ live: true });
  assert.equal(h.context.installSupportRetentionTrigger().triggerInstalled, true);
  assert.deepEqual(h.triggerCreates, ["runSupportRetention"]);
});
test("partial API failure preserves remaining IDs and the original expiry date for a safe retry", () => {
  const h = harness({ live: true });
  const originalDate = JSON.parse(h.properties.gridshard_support_closed_cc).closedAt;
  const remove = h.context.Gmail.Users.Messages.remove;
  h.context.Gmail.Users.Messages.remove = (owner, id) => {
    if (id === "bb") throw new Error("Simulated API failure");
    remove(owner, id);
  };
  assert.throws(() => h.context.runSupportRetention(), /Simulated API failure/);
  assert.deepEqual(JSON.parse(h.properties.gridshard_support_closed_cc), { closedAt: originalDate, messageIds: ["bb"] });
  h.context.Gmail.Users.Messages.remove = remove;
  assert.equal(h.context.runSupportRetention().deletedMessages, 1);
  assert.deepEqual(h.removed, [["me", "aa"], ["me", "bb"]]);
});
