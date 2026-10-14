const test = require("node:test");
const assert = require("node:assert/strict");
const { GridshardBattleCardStateView } = require("../src/battle/module-card-state-view.js");

function dom() {
  const metrics = { nodes:0, writes:0, listeners:0, mounts:0 };
  class Element {
    constructor(tag) {
      metrics.nodes++; this.tagName=tag; this.children=[]; this.attrs=new Map(); this.dataset={}; this.classes=new Set();
      this._text=""; this._hidden=false; this._className="";
      const properties=new Map();
      this.style={ getPropertyValue:k => properties.get(k)||"", setProperty:(k,v) => { metrics.writes++; properties.set(k,String(v)); } };
      this.classList={ contains:k => this.classes.has(k), toggle:(k,on) => { metrics.writes++; on ? this.classes.add(k) : this.classes.delete(k); }, add:k => this.classes.add(k) };
    }
    get className() { return this._className; }
    set className(v) { metrics.writes++; this._className=v; this.classes=new Set(v.split(" ")); }
    get textContent() { return this._text; }
    set textContent(v) { metrics.writes++; this._text=v; }
    get hidden() { return this._hidden; }
    set hidden(v) { metrics.writes++; this._hidden=v; }
    getAttribute(k) { return this.attrs.get(k) ?? null; }
    hasAttribute(k) { return this.attrs.has(k); }
    setAttribute(k,v) { metrics.writes++; this.attrs.set(k,String(v)); }
    removeAttribute(k) { metrics.writes++; this.attrs.delete(k); }
    appendChild(n) { metrics.writes++; n.parentElement=this; this.children.push(n); }
    append(...ns) { ns.forEach(n => this.appendChild(n)); }
    insertBefore(n,before) { n.remove(); metrics.writes++; const index=this.children.indexOf(before); this.children.splice(index<0?this.children.length:index,0,n); n.parentElement=this; }
    remove() { if(this.parentElement){ metrics.writes++; this.parentElement.children=this.parentElement.children.filter(n=>n!==this); this.parentElement=null; } }
    addEventListener() { metrics.listeners++; }
  }
  const document={ createElement:tag => new Element(tag) };
  const view=new GridshardBattleCardStateView({document, mountIcon:icon => {metrics.mounts++;icon.appendChild(document.createElement("svg"));}});
  return {metrics, document, view};
}

const model = (patch={}) => ({ id:"laser-a", category:"saldırı", name:"Lazer", shortName:"Lazer", artwork:"laser", title:"Lazer",
  hp:100,maxHp:100,heat:80,overheated:false,heatState:"high",heatLabel:"Isı %80",powerState:"flowing",powerMessage:"",
  core:false,enemy:false,targeting:false,liveBadges:[{key:"heat",className:"module-live-status heat-high",label:"♨",title:"Isı %80"}],
  signatureBadges:[{key:"repeat:0",kind:"repeat",className:"module-signature-badge",label:"↻1/4",title:"Tekrar"}],...patch });

test("same model creates zero nodes, writes zero fields and binds zero listeners", () => {
  const f=dom();const card=f.view.create(model());const before={...f.metrics};
  f.view.update(card,model());assert.deepEqual(f.metrics,before);
});

test("CAN/heat/energy/badge changes retain icon, SVG, overlay and surviving badges", () => {
  const f=dom(), card=f.view.create(model()), children=[...card.children], icon=children[0], svg=icon.children[0];
  card.classList.add("fx-hit");
  const signature=card.children.find(n=>n.className==="module-signature-row").children[0];
  f.view.update(card,model({hp:30,heat:100,overheated:true,heatState:"overheated",heatLabel:"Aşırı ısındı",powerState:"disconnected",powerMessage:"Enerji bekliyor",
    signatureBadges:[{key:"repeat:0",kind:"repeat",className:"module-signature-badge",label:"↻2/4",title:"Tekrar"}]}));
  assert.equal(card.children[0],icon);assert.equal(icon.children[0],svg);assert.equal(card.children[2],children[2]);
  assert.equal(card.children.find(n=>n.className==="module-signature-row").children[0],signature);
  assert.equal(signature.textContent,"↻2/4");assert.equal(card.style.getPropertyValue("--hp-percent"),"30%");
  assert.ok(card.classList.contains("fx-hit"));assert.ok(card.classList.contains("energy-disconnected"));assert.equal(f.metrics.mounts,1);
});

test("heat and tooltip hide/show reuse their nodes and listeners", () => {
  const f=dom(),card=f.view.create(model({powerMessage:"EMP"}));
  const tooltip=card.children.find(n=>n.className==="power-state-tooltip"), heat=card.children.find(n=>n.className==="module-heat-bar");
  const listeners=f.metrics.listeners;
  f.view.update(card,model({heat:0,powerMessage:"",liveBadges:[]}));
  assert.ok(heat.hidden && tooltip.hidden);
  f.view.update(card,model({powerMessage:"Kesici"}));
  assert.ok(!heat.hidden && !tooltip.hidden);assert.equal(tooltip.textContent,"Kesici");assert.equal(f.metrics.listeners,listeners);
});

test("core type remounts only artwork; targeting and charge patch existing card", () => {
  const f=dom(), card=f.view.create(model({core:true,artwork:"core:a",coreCharge:20,coreLabel:"Çekirdek gücü · %20"}));
  const icon=card.children[0], overlay=card.children[2];
  f.view.update(card,model({core:true,artwork:"core:a",coreCharge:100,coreReady:true,targeting:true,coreLabel:"Çekirdek gücü · Hazır"}));
  assert.equal(f.metrics.mounts,1);assert.equal(card.children[2],overlay);assert.equal(card.getAttribute("role"),"button");
  assert.equal(card.style.getPropertyValue("--core-charge"),"100%");assert.ok(card.classList.contains("core-power-ready"));
  f.view.update(card,model({core:true,artwork:"core:b",coreCharge:0,coreLabel:"Core"}));
  assert.equal(card.children[0],icon);assert.equal(f.metrics.mounts,2);assert.equal(card.getAttribute("role"),null);
});

test("localized labels and titles update without replacing artwork", () => {
  const f=dom(),card=f.view.create(model());const icon=card.children[0];
  f.view.update(card,model({name:"Laser",shortName:"Laser",title:"Laser",heatLabel:"Heat 80%"}));
  assert.equal(card.children[0],icon);assert.equal(icon.getAttribute("aria-label"),"Laser");assert.equal(card.getAttribute("title"),"Laser");assert.equal(f.metrics.mounts,1);
});
