"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const app = fs.readFileSync(path.join(__dirname, "../src/app.js"), "utf8");

function fixture() {
  const calls = [], pending = [], intervals = [];
  const load = kind => () => {
    calls.push(kind);
    return new Promise((resolve, reject) => pending.push({ resolve, reject }));
  };
  const context = vm.createContext({
    document:{ hidden:false, body:{ dataset:{ appScreen:"friends" } } },
    activeDirectMessagePeerId:"friend", activeFriendsTab:"messages",
    recentBattleInviteTargets:new Set(["friend"]),
    loadDirectMessageThread:load("chat"), loadRewardInbox:load("inbox"), loadSocialView:load("social"),
    window:{ setInterval(run) { intervals.push(run); return intervals.length; } },
  });
  const start = app.indexOf("  let socialPollTimer = null;");
  const end = app.indexOf("  async function loadRewardInbox(", start);
  assert.ok(start > 0 && end > start);
  vm.runInContext(app.slice(start, end), context);
  return { context, calls, pending, intervals };
}

test("slow social requests have one outstanding poll batch and recover after a failure", async () => {
  const f = fixture();
  const first = f.context.refreshSocialPolling();
  for (let tick = 0; tick < 100; tick++) await f.context.refreshSocialPolling();
  assert.deepEqual(f.calls, ["chat", "inbox", "social"]);
  f.pending.shift().resolve();
  f.pending.shift().reject(new Error("offline"));
  await f.context.refreshSocialPolling();
  assert.equal(f.calls.length, 3, "wait for the complete batch, not just one endpoint");
  f.pending.shift().resolve();
  await first;
  const next = f.context.refreshSocialPolling();
  assert.equal(f.calls.length, 6);
  for (const request of f.pending.splice(0)) request.resolve();
  await next;
});

test("hidden and battle screens skip polling; regular inbox cadence and one timer are preserved", async () => {
  const f = fixture();
  f.context.startSocialPolling(); f.context.startSocialPolling();
  assert.equal(f.intervals.length, 1);
  f.context.document.hidden = true;
  await f.context.refreshSocialPolling();
  f.context.document.hidden = false;
  f.context.document.body.dataset.appScreen = "play";
  await f.context.refreshSocialPolling();
  assert.equal(f.calls.length, 0);
  f.context.document.body.dataset.appScreen = "menu";
  f.context.recentBattleInviteTargets.clear();
  for (let tick = 0; tick < 3; tick++) await f.context.refreshSocialPolling();
  assert.equal(f.calls.length, 0);
  const fourth = f.context.refreshSocialPolling();
  assert.deepEqual(f.calls, ["inbox", "social"]);
  for (const request of f.pending.splice(0)) request.resolve();
  await fourth;
});
