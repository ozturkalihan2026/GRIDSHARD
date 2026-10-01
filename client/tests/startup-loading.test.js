const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

test("startup progress advances only on real completed stages and failures stay visible", () => {
  const elements = new Map();
  const document = {getElementById(id) { if (!elements.has(id)) elements.set(id, {}); return elements.get(id); }};
  const context = {};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync("src/startup-loading.js", "utf8"), context);
  const loading = new context.GridshardStartupLoading(document);
  loading.begin();
  assert.equal(loading.progress.value,0);
  loading.complete("server");
  loading.complete("server");
  assert.equal(loading.progress.value,1);
  loading.fail();
  assert.equal(loading.root.hidden,false);
  assert.equal(loading.retry.hidden,false);
  assert.throws(()=>loading.finish(), /not ready/);
  loading.begin();
  assert.equal(loading.progress.value,0);
  for (const step of ["server","profile","collection","account"]) loading.complete(step);
  loading.finish();
  assert.equal(loading.root.hidden,true);
});
