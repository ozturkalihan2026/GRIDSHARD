"use strict";
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const art=require('../src/module-device-art.js'),layers=require('../src/module-layer-data.js');
const coreIds=Object.keys(layers).filter(id=>layers[id].core);
function docStub(){const doc={createElement:()=>({ownerDocument:doc,children:[],dataset:{},classList:{add(){}},style:{setProperty(){}},
  setAttribute(){},appendChild(n){this.children.push(n);},replaceChildren(...ns){this.children=ns;}})};return doc;}
const nodes=n=>[n,...n.children.flatMap(nodes)];

test('all seven dead cores use a transparent, registered wreck and restore intact art on rebirth',()=>{
  assert.equal(coreIds.length,7);
  for(const id of coreIds){
    const doc=docStub(),host=doc.createElement();art.mountCore(host,id);
    const stage=nodes(host).find(n=>n.className==='module-layer-stage'),bounds={...stage.style};
    assert.ok(nodes(host).some(n=>n.className==='module-core-pulse'));
    art.mountCore(host,id,{destroyed:true});
    const wreck=nodes(host).find(n=>n.className==='module-layer-art');
    assert.equal(wreck.src,`./assets/ui/cores-wrecked-v1/${id}.webp`);
    assert.equal(host.children[0].dataset.destroyed,'true');
    assert.equal(nodes(host).some(n=>n.className==='module-core-pulse'),false);
    assert.equal(art.emitter(host),null,'no live outlet/light on a wreck');
    const deadStage=nodes(host).find(n=>n.className==='module-layer-stage');
    for(const key of ['left','top','width','height'])assert.equal(deadStage.style[key],bounds[key],id);
    art.mountCore(host,id);assert.equal(host.children[0].dataset.destroyed,undefined);
    assert.equal(nodes(host).find(n=>n.className==='module-layer-art').src,'./'+layers[id].art.src);
    assert.ok(nodes(host).some(n=>n.className==='module-core-pulse'));
  }
});

test('wreck assets are small alpha WebPs in the production/native allowlist',()=>{
  const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  for(const id of coreIds){
    const asset=`assets/ui/cores-wrecked-v1/${id}.webp`,bytes=fs.readFileSync(path.join(__dirname,'..',asset));
    assert.ok(html.includes(`src="./${asset}"`));assert.ok(bytes.length<45000,id);
    assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.equal(bytes.toString('ascii',12,16),'VP8X');assert.ok(bytes[20]&0x10,'alpha must not become a black square');
    assert.equal(bytes.readUIntLE(24,3)+1,384);assert.equal(bytes.readUIntLE(27,3)+1,384);
  }
});
