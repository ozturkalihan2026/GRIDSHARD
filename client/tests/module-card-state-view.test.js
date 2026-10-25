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

test("both core meters retain real HP, survive updates and hide only for a wreck",()=>{
  for(const enemy of [false,true]){
    const f=dom(),initial=model({core:true,enemy,hp:300,maxHp:300});
    const card=f.view.create(initial),meter=card.children.find(n=>n.className==='core-health-bar');
    assert.ok(meter);assert.equal(meter.getAttribute('role'),'meter');
    const before={...f.metrics};f.view.update(card,initial);assert.deepEqual(f.metrics,before);
    f.view.update(card,{...initial,hp:120});
    assert.equal(meter.getAttribute('aria-valuenow'),'120');
    assert.equal(meter.getAttribute('aria-valuemax'),'300');
    assert.equal(card.style.getPropertyValue('--hp-percent'),'40%');
    assert.equal(f.metrics.nodes,before.nodes);
    f.view.update(card,{...initial,hp:0,coreDestroyed:true});assert.equal(meter.hidden,true);
    f.view.update(card,initial);assert.equal(meter.hidden,false);
    assert.equal(card.children.filter(n=>n.className==='core-health-bar').length,1);
  }
});

test("core death/rebirth remounts only once per boundary and retains its socket/card/listeners",()=>{
  const f=dom(),living=model({core:true,artwork:'core:a',coreReady:false});
  const card=f.view.create(living),icon=card.children[0],overlay=card.children[2],listeners=f.metrics.listeners;
  const dead=model({core:true,coreDestroyed:true,hp:0,artwork:'core:a:wreck',coreReady:false});
  f.view.update(card,dead);
  assert.equal(card.getAttribute('data-core-wreck'),'true');assert.equal(f.metrics.mounts,2);
  const unchanged={...f.metrics};
  for(let i=0;i<1000;i++)f.view.update(card,dead);
  assert.deepEqual(f.metrics,unchanged,'no death timer/DOM/remount work on repeated snapshots');
  f.view.update(card,living);
  assert.equal(card.getAttribute('data-core-wreck'),null);assert.equal(f.metrics.mounts,3);
  assert.equal(card.children[0],icon);assert.equal(card.children[2],overlay);assert.equal(f.metrics.listeners,listeners);
});

test("physical modules have persistent foreground HP AND heat tracks, including zero heat",()=>{
  for(const enemy of[false,true]){
    const f=dom(),initial=model({physical:true,enemy,heat:0,liveBadges:[],signatureBadges:[]});
    const card=f.view.create(initial),hp=card.children.find(n=>n.className==='module-health-bar');
    const heat=card.children.find(n=>n.className==='module-heat-bar');
    assert.ok(hp&&!hp.hidden&&heat&&!heat.hidden);
    const same={...f.metrics};for(let i=0;i<100;i++)f.view.update(card,initial);
    assert.deepEqual(f.metrics,same);
    f.view.update(card,{...initial,hp:40,heat:70,heatLabel:'70%'});
    assert.equal(hp.getAttribute('aria-valuenow'),'40');
    assert.equal(heat.style.getPropertyValue('--heat-percent'),'70%');
    assert.equal(f.metrics.nodes,same.nodes);
  }
});
