"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm");
const source = fs.readFileSync(path.join(__dirname, "../src/module-device-art.js"), "utf8");
function fixture(layers) {
  const images = [], timers = new Map(); let nextTimer = 0;
  class Image {
    constructor() { this.naturalWidth = this.naturalHeight = 384; images.push(this); }
    decode() { return Promise.resolve(); }
    removeAttribute(name) { if (name === "src") this.src = null; }
  }
  const context = vm.createContext({Image, GridshardModuleLayerData: layers,
    setTimeout(fn) { const id = ++nextTimer; timers.set(id, fn); return id; },
    clearTimeout(id) { timers.delete(id); }});
  vm.runInContext(source, context);
  return {art:context.GridshardModuleDeviceArt, images, timers};
}
const painted = src => ({kind:"painted", art:{src}});
const flush = () => new Promise(resolve => setImmediate(resolve));

test("only selected battle art is decoded, with two in flight and no repeated requests", async () => {
  const f = fixture({laser:{heads:{a:{src:"laser-a"}, b:{src:"laser-b"}, c:{src:"laser-c"}}},
    core:painted("core"), unselected:painted("unused")});
  f.art.prepareBattleArt(["laser", "laser"], "core");
  assert.deepEqual(f.images.map(i => i.src), ["./laser-a", "./laser-b"]);
  f.images[0].onload(); await flush();
  assert.equal(f.images[2].src, "./laser-c");
  f.images[1].onload(); await flush();
  assert.equal(f.images[3].src, "./core");
  f.images[2].onload(); f.images[3].onload(); await flush();
  f.art.prepareBattleArt(["laser"], "core");
  assert.equal(f.images.length, 4);
  assert.equal(f.timers.size, 0);
});

test("leaving the menu pauses requests; changing decks releases the old decoded cache", async () => {
  const f = fixture({a:painted("a"), b:painted("b"), c:painted("c")});
  let visible = true;
  f.art.prepareBattleArt(["a", "b", "c"], null, () => visible);
  visible = false;
  for (const img of [...f.images]) img.onload();
  await flush();
  assert.equal(f.images.length, 2, "no third request starts in battle or while hidden");
  visible = true;
  f.art.prepareBattleArt(["c"], null, () => visible);
  f.images[2].onload(); await flush();
  f.art.prepareBattleArt(["a"], null, () => visible);
  assert.equal(f.images[3].src, "./a", "deselected images are no longer retained");
  f.images[3].onload(); await flush();
  assert.equal(f.timers.size, 0);
});

test("a hung or failed image releases its timer and cannot stall the preparation queue", async () => {
  const f = fixture({a:painted("a"), b:painted("b"), c:painted("c")});
  f.art.prepareBattleArt(["a", "b", "c"]);
  const timeout = [...f.timers.values()][0]; timeout();
  assert.equal(f.images[0].src, null);
  assert.equal(f.images[2].src, "./c");
  f.images[1].onerror(); f.images[2].onload(); await flush();
  assert.equal(f.timers.size, 0);
});

test("decoded retention has a byte budget, even for unusually large artwork", async () => {
  const f = fixture({a:painted("a"), b:painted("b")});
  f.art.prepareBattleArt(["a", "b"]);
  for (const img of f.images) { img.naturalWidth = img.naturalHeight = 2500; img.onload(); }
  await flush();
  f.art.prepareBattleArt(["a", "b"]);
  assert.equal(f.images.length, 3, "only one 25 MB painting fits the 32 MiB retained budget");
  assert.equal(f.images[2].src, "./b");
  f.images[2].onerror();
  assert.equal(f.timers.size, 0);
});
