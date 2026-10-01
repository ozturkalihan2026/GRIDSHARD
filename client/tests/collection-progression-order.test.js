"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const app = fs.readFileSync("./src/app.js", "utf8");
const context = vm.createContext({});
vm.runInContext(fs.readFileSync("./src/canon-data.js", "utf8"), context);
const sorter = app.slice(app.indexOf("  function sortModuleCollection("), app.indexOf("  function renderModuleCollection("));
vm.runInContext(sorter, context);
const canon = context.GRIDSHARD_CANON_MODULES;
const collection = [...canon].reverse().map((item) => ({ ...item, definition_id:item.id }));
const original = collection.map((item) => item.definition_id);
const sorted = context.sortModuleCollection(collection);
assert.deepEqual(collection.map((item) => item.definition_id), original, "Do not mutate server state");
const rarity = { common:0, rare:1, epic:2, legendary:3 };
for (let index = 1; index < sorted.length; index += 1) {
  const before = sorted[index - 1], after = sorted[index];
  assert.ok(before.unlock_arena <= after.unlock_arena);
  if (before.unlock_arena === after.unlock_arena) {
    assert.ok(rarity[before.rarity] <= rarity[after.rarity]);
    if (before.rarity === after.rarity) {
      assert.ok(canon.findIndex((item) => item.id === before.id) < canon.findIndex((item) => item.id === after.id));
    }
  }
}
assert.equal(sorted[0].definition_id, "laser");
// Translations, selected deck and ownership cannot reshuffle the collection.
const translated = collection.map((item, index) => ({ ...item, name_tr:`Translation ${index}`, unlocked:index % 2 === 0 }));
assert.equal(JSON.stringify(context.sortModuleCollection(translated).map((item) => item.definition_id)),
  JSON.stringify(sorted.map((item) => item.definition_id)));
assert.equal(JSON.stringify(context.sortModuleCollection(collection.map((item) => ({ definition_id:item.definition_id }))).map((item) => item.definition_id)),
  JSON.stringify(sorted.map((item) => item.definition_id)));
assert.match(app, /const sortedModules = sortModuleCollection\(state\.module_collection \|\| \[\]\)/);
console.log("Collection arena/rarity/canon order is stable across languages and filters");
