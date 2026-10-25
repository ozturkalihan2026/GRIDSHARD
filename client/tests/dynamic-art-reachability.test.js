"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const root=path.resolve(__dirname,"../.."),client=path.join(root,"client");
const read=name=>fs.readFileSync(path.join(client,name),"utf8");
const layers=require("../src/module-layer-data.js");
const profiles=require("../src/battle/module-presentation-profiles.js");
const canon=JSON.parse(fs.readFileSync(path.join(root,"server/data/arena_progression_v1.json"),"utf8")).modules;
function documentStub(){
  const doc={createElement:()=>({ownerDocument:doc,children:[],dataset:{},classList:{add(){}},style:{setProperty(){}},
    setAttribute(){},appendChild(n){this.children.push(n);},replaceChildren(...nodes){this.children=nodes;}})};
  return doc;
}
function nodes(host){return [host,...host.children.flatMap(nodes)];}

test("server canon → client canon → presentation profiles → mounted paintings covers all 36 current modules",()=>{
  const sandbox={GridshardModuleLayerData:layers};
  vm.runInNewContext(read("src/canon-data.js"),sandbox);
  vm.runInNewContext(read("src/module-device-art.js"),sandbox);
  vm.runInNewContext(read("src/battle/module-card-view.js"),sandbox);
  const ids=canon.map(m=>m.id).sort();
  assert.equal(ids.length,36);
  assert.deepEqual(Array.from(sandbox.GRIDSHARD_CANON_MODULES,m=>m.id).sort(),ids);
  assert.deepEqual(Object.keys(profiles).sort(),ids);
  assert.deepEqual(Object.keys(layers).filter(id=>!layers[id].core).sort(),ids);
  const doc=documentStub();
  for(const module of canon){
    assert.match(sandbox.GridshardModuleCardView.emblemFor({definition_id:module.id,nameTr:module.name_tr}),/class="module-emblem module-device-icon"/);
  }
  for(const id of ids)for(const enemy of [false,true]){
    const host=doc.createElement();
    assert.equal(sandbox.GridshardModuleDeviceArt.mount(host,{definition_id:id},enemy),true,id);
    assert.equal(host.children[0].dataset.renderer,"layers",id);
    const tree=nodes(host);
    assert.ok(tree.some(n=>n.className==="module-layer-stage"),id);
    assert.ok(tree.filter(n=>n.src).every(n=>!n.src.includes("modules-views-v3")&&!n.src.includes("modules-yaw-v2")),id);
    assert.ok(tree.some(n=>n.src&&n.src.includes(id)),id);
  }
  const unknown=doc.createElement();
  assert.equal(sandbox.GridshardModuleDeviceArt.mount(unknown,{definition_id:"retired_unknown",nameTr:"Lazer"}),false);
  assert.equal(unknown.children.length,0,"unknown explicit ID must not inherit another device");
});

test("unsupported explicit IDs cannot inherit a named legacy module drawing",()=>{
  const sandbox={GridshardModuleLayerData:layers};
  vm.runInNewContext(read("src/module-device-art.js"),sandbox);
  vm.runInNewContext(read("src/battle/module-card-view.js"),sandbox);
  const view=sandbox.GridshardModuleCardView;
  const unknown=view.emblemFor({definition_id:"retired_unknown",nameTr:"Lazer",category:"saldırı"});
  assert.equal(unknown,view.emblemFor({definition_id:"other_unknown",nameTr:"Bilinmeyen",category:"saldırı"}));
  assert.doesNotMatch(unknown,/<img/);
  assert.match(unknown,/data-cat="saldırı"/);
  assert.doesNotMatch(read("src/battle/module-card-view.js"),/const EMBLEMS|const solid|const snowArms/);
});

test("all seven current core IDs mount registered paintings; registry has no orphan core entries",()=>{
  const app=read("src/app.js"),start=app.indexOf("  const CORE_VISUALS = Object.freeze({"),end=app.indexOf("  function applyCoreVisualIdentity(",start);
  const sandbox={GridshardModuleLayerData:layers};
  vm.runInNewContext(app.slice(start,end)+"\nthis.coreIds=Object.keys(CORE_VISUALS);",sandbox);
  vm.runInNewContext(read("src/module-device-art.js"),sandbox);
  assert.equal(sandbox.coreIds.length,7);
  assert.deepEqual(Object.keys(layers).filter(id=>layers[id].core).sort(),Array.from(sandbox.coreIds).sort());
  const doc=documentStub();
  for(const id of sandbox.coreIds){
    const host=doc.createElement();
    assert.equal(sandbox.GridshardModuleDeviceArt.mountCore(host,id),true,id);
    assert.equal(host.children[0].dataset.core,"true");
    assert.ok(nodes(host).some(n=>n.src?.includes(id)),id);
  }
});

test("missing registry uses the bounded atlas/static fallback rather than mounting both old and new art",()=>{
  const sandbox={};
  vm.runInNewContext(read("src/module-device-art.js"),sandbox);
  const doc=documentStub();
  for(const [id,renderer]of [["laser","views8"],["virus","static"]]){
    const host=doc.createElement();
    assert.equal(sandbox.GridshardModuleDeviceArt.mount(host,{definition_id:id}),true);
    assert.equal(host.children[0].dataset.renderer,renderer);
    assert.equal(nodes(host).filter(n=>n.src).length,1,"only one fallback painting, not a second hidden UI");
    assert.equal(nodes(host).filter(n=>n.className==="module-layer-stage").length,0);
  }
});

test("every dynamically selected layer asset exists and is a real WebP, including working heads",()=>{
  let assets=0;
  function visit(value){
    for(const [key,child]of Object.entries(value)){
      if(key==="src"){
        assert.match(child,/^assets\/ui\/[a-z0-9_/-]+\.webp$/);
        const bytes=fs.readFileSync(path.join(client,child));
        assert.equal(bytes.toString("ascii",0,4),"RIFF",child);
        assert.equal(bytes.toString("ascii",8,12),"WEBP",child);assets++;
      }else if(child&&typeof child==="object")visit(child);
    }
  }
  visit(layers);assert.ok(assets>200);
});

test("pose ticks reuse a compiled heading plan shared by instances, not Object.entries per frame",()=>{
  let enumerations=0;
  const tracked=Object.create(Object);
  tracked.entries=value=>{enumerations++;return Object.entries(value);};
  const sandbox={GridshardModuleLayerData:layers,Object:tracked};
  vm.runInNewContext(read("src/module-device-art.js"),sandbox);
  const doc=documentStub(),first=doc.createElement();
  sandbox.GridshardModuleDeviceArt.mount(first,{definition_id:"laser"});
  const once=enumerations;
  assert.ok(once>0);
  for(let i=0;i<1000;i++)sandbox.GridshardModuleDeviceArt.pose(first,{phase:i%2?"work":"rest"});
  for(let i=0;i<20;i++)sandbox.GridshardModuleDeviceArt.mount(doc.createElement(),{definition_id:"laser"});
  assert.equal(enumerations,once,"no enumeration or candidate-list allocation on repeated poses/new instances");
});

test("retired rotor CSS and twelve allowlist entries are absent without deleting the archived source art",()=>{
  const html=read("index.html");
  for(const name of ["module-device-v8.css","laser-yaw-v11.css"]){
    assert.doesNotMatch(read("src/"+name),/module-device-(?:head|base)\b|laser-yaw-rotor|gs-device-recoil/);
  }
  assert.doesNotMatch(html,/\.\/assets\/ui\/(?:laser-yaw-v1|modules-yaw-v2)\//);
  assert.ok(fs.existsSync(path.join(client,"assets/ui/laser-yaw-v1/head.webp")));
  assert.ok(fs.existsSync(path.join(client,"assets/ui/modules-yaw-v2/base.webp")));
  // Atlas draw/geometry fallback is intentionally retained, not misclassified as dead.
  assert.match(read("src/module-device-art.js"),/module-view-atlas/);
  assert.match(html,/src="\.\/src\/module-view-data.js"/);
});
