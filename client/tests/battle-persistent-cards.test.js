const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

class Node {
  constructor(tag = "div") {
    this.tagName = tag; this.dataset = {}; this.children = []; this.attributes = {};
    this.textContent = ""; this.className = ""; this.classes = new Set();
    this.classList = {
      contains: n => this.classes.has(n),
      add: (...ns) => ns.forEach(n => this.classes.add(n)),
      remove: (...ns) => ns.forEach(n => this.classes.delete(n)),
      toggle: (n, on) => on ? this.classes.add(n) : this.classes.delete(n),
    };
  }
  set innerHTML(_) { this.children.forEach(n => { n.parentElement = null; }); this.children = []; }
  get firstElementChild() { return this.children[0]; }
  appendChild(n) { n.parentElement = this; this.children.push(n); return n; }
  append(...nodes) { nodes.forEach(n => this.appendChild(n)); }
  remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(n => n !== this); this.parentElement = null; }
  setAttribute(k, v) { this.attributes[k] = v; }
  getAttribute(k) { return this.attributes[k] ?? null; }
}

function fixture() {
  const cell = new Node(); cell.dataset = { x:"0", y:"0" };
  const board = { querySelectorAll: () => [cell] };
  const sandbox = { document:{ createElement: tag => new Node(tag) } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../src/battle/board-view.js"), "utf8"), sandbox);
  const view = new sandbox.GridshardBattleBoardView(board);
  let created = 0, updated = 0;
  const options = {
    moduleSignature: m => `${m.instanceId}|${m.hp}|${m.heat}`,
    createModuleCard: m => { created++; const card = new Node(); card.hp = m.hp; card.append(new Node("svg")); return card; },
    updateModuleCard: (card, m) => { updated++; card.hp = m.hp; card.heat = m.heat; },
  };
  return { cell, view, options, counts: () => ({created, updated}) };
}
const moduleAt = (hp = 100, instanceId = "laser-a") => ({ instanceId, status:"active", position:{x:0,y:0}, hp, heat:0 });

test("CAN/heat patch preserves card, SVG and transient classes", () => {
  const f = fixture(); f.view.render([moduleAt()], f.options);
  const card = f.cell.firstElementChild, svg = card.firstElementChild;
  card.classList.add("fx-hit");
  f.view.render([{...moduleAt(70), heat:80}], f.options);
  assert.equal(f.cell.firstElementChild, card);
  assert.equal(card.firstElementChild, svg);
  assert.equal(card.hp, 70); assert.equal(card.heat, 80);
  assert.ok(card.classList.contains("fx-hit")); assert.equal(f.counts().created, 1);
});

test("unchanged snapshot performs no card creation or update", () => {
  const f = fixture(); f.view.render([moduleAt()], f.options);
  const counts = f.counts(); f.view.render([moduleAt()], f.options);
  assert.deepEqual(f.counts(), counts);
});

test("force refresh preserves identity while updating state", () => {
  const f = fixture(); f.view.render([moduleAt()], f.options);
  const card = f.cell.firstElementChild;
  f.view.render([moduleAt()], {...f.options, force:true});
  assert.equal(f.cell.firstElementChild, card); assert.equal(f.counts().created, 1);
});

test("placement notification runs once after mounting; HP, heat and force refresh do not replay it",()=>{
  const f=fixture(),placed=[];
  const options={...f.options,onCardCreated:(module,cell,card)=>{
    assert.equal(card.parentElement,cell);assert.equal(card.hp,module.hp);placed.push(module.instanceId);
  }};
  f.view.render([moduleAt()],options);
  f.view.render([{...moduleAt(60),heat:80}],options);
  f.view.render([moduleAt(60)],{...options,force:true});
  assert.deepEqual(placed,['laser-a']);
  f.view.render([moduleAt(90,'laser-b')],options);assert.deepEqual(placed,['laser-a','laser-b']);
});

test("different instance and destruction replace only the required structure", () => {
  const f = fixture(); f.view.render([moduleAt()], f.options);
  const card = f.cell.firstElementChild;
  f.view.render([moduleAt(90, "laser-b")], f.options);
  assert.notEqual(f.cell.firstElementChild, card); assert.equal(f.counts().created, 2);
  f.view.render([], f.options);
  assert.equal(f.cell.children.length, 0); assert.equal(f.cell.dataset.occupied, "false");
});

test("debris countdown and language update in place, then expire", () => {
  const f = fixture(); const options = {...f.options, cellDebris:[{x:0,y:0,remaining_ms:2900}]};
  f.view.render([], options); const marker = f.cell.firstElementChild;
  f.view.render([], {...options, debrisLabel:"Debris", secondsLabel:"s", cellDebris:[{x:0,y:0,remaining_ms:1800}]});
  assert.equal(f.cell.firstElementChild, marker);
  assert.equal(marker.children[1].textContent, "2 s");
  assert.equal(marker.attributes["aria-label"], "Debris: 2");
  f.view.render([], f.options); assert.equal(f.cell.children.length, 0);
});

test("separate boards and new cells cannot reuse another session's card", () => {
  const a = fixture(), b = fixture(); a.view.render([moduleAt()], a.options); b.view.render([moduleAt()], b.options);
  assert.notEqual(a.cell.firstElementChild, b.cell.firstElementChild);
});
