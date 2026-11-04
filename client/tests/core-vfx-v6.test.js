const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {GridshardCoreVfx,THEMES}=require('../src/battle/core-vfx-v6');
function fixture(){
  let now=0,hidden=false;
  class E{
    constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.classes=new Set();this.classList={add:(...v)=>v.forEach(v=>this.classes.add(v))};this.style={setProperty:(k,v)=>this.style[k]=v};}
    setAttribute(k,v){this.attrs[k]=String(v);}appendChild(n){this.children.push(n);n.parentElement=this;}
    remove(){if(this.parentElement)this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.parentElement=null;}
  }
  const doc={createElementNS:(_ns,t)=>new E(t)},layer=new E('div');layer.clientWidth=375;
  const sounds=[],queue=[],anchors=new Map([['a:core',{center:{x:190,y:570}}],['b:one',{center:{x:95,y:160}}],['b:two',{center:{x:190,y:160}}],['b:three',{center:{x:285,y:160}}]]);
  const fx=new GridshardCoreVfx({doc,layer:()=>layer,anchor:id=>anchors.get(id),cellAnchor:(_p,pos)=>pos?{center:{x:pos.x*70,y:pos.y*60}}:null,
    domId:(p,m)=>p+':'+m.instance_id,now:()=>now,schedule:(ms,f)=>queue.push([now+ms,f]),sound:s=>sounds.push(s),hidden:()=>hidden});
  const snapshot={session_id:'v6',elapsed_ms:1000,status:'running',players:{a:{core_type:'core_overdrive',modules:[{instance_id:'core',definition_id:'core',hp:450,status:'active',x:2,y:1}]},b:{modules:['one','two','three'].map(id=>({instance_id:id,definition_id:'laser',hp:200,status:'active',x:0,y:0}))}}};
  const event=(type,data)=>({type,at_ms:1000,data}),activate=(power,extra={})=>event('core_power_used',{player_id:'a',power_id:power,...extra});
  const shot=(power,id='one',extra={})=>event('attack_performed',{core_attack:true,power_id:power,attacker_player_id:'a',attacker_module_id:'core',target_player_id:'b',target_module_id:id,damage:90,...extra});
  return{fx,layer,sounds,snapshot,event,activate,shot,anchors,setHidden:v=>hidden=v,advance:t=>{now=t;for(const[due,f]of queue)if(due<=now)f();}};
}

test('seven cores have distinct real geometry and original activation cues',()=>{
  const geometry=new Set();
  for(const power of Object.keys(THEMES)){
    const f=fixture();f.fx.receive([f.activate(power)],f.snapshot);
    const n=f.fx.effects.get('activation:a').node;
    assert.equal(n.dataset.corePower,power);assert.ok(n.children.length>=2);
    geometry.add(JSON.stringify(n.children.map(n=>[n.tag,n.attrs])));
    assert.deepEqual(f.sounds,[power+'_activate']);
    f.fx.receive([f.activate(power)],f.snapshot);assert.equal(f.sounds.length,1);
    f.advance(1500);assert.equal(f.fx.effects.size,0);
  }
  assert.equal(geometry.size,7);
});
test('all three resonance targets remain visible together and one volley has one sound',()=>{
  const f=fixture(),events=['one','two','three'].map(id=>f.shot('core_resonance',id));
  f.fx.receive(events,f.snapshot);
  assert.equal(f.fx.effects.size,3);assert.deepEqual(f.sounds,['core_resonance_shot']);
  for(const id of ['one','two','three'])assert.equal(f.fx.effects.get('hit:a:'+id).node.dataset.coreTarget,id);
  f.fx.receive(events,f.snapshot);assert.equal(f.fx.effects.size,3);assert.equal(f.sounds.length,1);
});
test('a destroyed target still receives its actual impact at the server cell',()=>{
  const f=fixture();f.anchors.delete('b:one');f.snapshot.players.b.modules[0]={instance_id:'one',hp:0,status:'destroyed'};
  f.fx.receive([f.shot('core_disruptor','one',{target_position:{x:3,y:2}})],f.snapshot);
  const n=f.fx.effects.get('hit:a:one').node;
  assert.ok(n.children.some(n=>String(n.attrs.d).includes('210')));assert.equal(n.dataset.coreTarget,'one');
});
test('execution warning disappears on cleanse without inventing an execution',()=>{
  const f=fixture();f.snapshot.players.b.modules[0].signature_badges=[{kind:'execution',value:2}];
  f.fx.receive([],f.snapshot);assert.ok(f.fx.effects.has('mark:b:one'));
  f.snapshot.players.b.modules[0].signature_badges=[];f.snapshot.elapsed_ms=1100;f.fx.receive([],f.snapshot);
  assert.equal(f.fx.effects.size,0);assert.equal(f.sounds.length,0);
});
test('a channel is visible without fake hits and ends when the source dies',()=>{
  const f=fixture();f.snapshot.players.a.modules[0].signature_badges=[{kind:'core_firing',value:6}];
  f.fx.receive([],f.snapshot);assert.equal(f.fx.effects.get('channel:a').node.dataset.coreEvent,'channel');assert.equal(f.sounds.length,0);
  f.snapshot.players.a.modules[0].hp=0;f.fx.receive([],f.snapshot);assert.equal(f.fx.effects.size,0);
});

test('real core events remain audible while visual geometry is unavailable, without replaying snapshots',()=>{
  const f=fixture();f.anchors.clear();f.fx.cellAnchor=()=>null;
  const events=[f.activate('core_resonance'),f.shot('core_resonance')];
  f.fx.receive(events,f.snapshot);
  assert.deepEqual(f.sounds,['core_resonance_activate','core_resonance_shot']);
  assert.equal(f.layer.children.length,0);
  f.fx.receive(events,f.snapshot);assert.equal(f.sounds.length,2);
});
test('summon shows the real created module; drain return requires actual healing',()=>{
  const f=fixture();f.fx.receive([f.activate('core_capacitor',{role:'reinforcement',affected_targets:[{player_id:'b',module_id:'one'}]})],f.snapshot);
  assert.ok(f.fx.effects.has('summon:a:one'));
  f.fx.receive([f.activate('core_phoenix',{role:'drain',affected_targets:[{player_id:'b',module_id:'one'}],effects:[]})],f.snapshot);
  assert.ok(!f.fx.effects.has('drain:a'));
  f.fx.receive([f.activate('core_phoenix',{role:'drain',affected_targets:[{player_id:'b',module_id:'one'}],effects:[{kind:'repair',value:20}]})],f.snapshot);
  assert.ok(f.fx.effects.has('drain:a'));
});
test('effect roots and replay cache stay bounded; hidden/finished clears everything',()=>{
  const f=fixture();for(let i=0;i<400;i++){
    const e=f.shot('core_overdrive','unit-'+i,{target_position:{x:1,y:1}});e.data.request=i;f.fx.receive([e],f.snapshot);
  }
  assert.ok(f.fx.effects.size<=12);assert.ok(f.fx.seen.size<=256);assert.ok(f.layer.children.length<=12);
  f.setHidden(true);f.fx.receive([],f.snapshot);assert.equal(f.layer.children.length,0);
  f.setHidden(false);f.snapshot.status='finished';f.fx.receive([f.activate('core_guardian')],f.snapshot);assert.equal(f.layer.children.length,0);
});
test('14 core masters are unique, separate from every module, short and unclipped',()=>{
  require('../src/battle/module-presentation-profiles');require('../src/gridshard-audio');
  const seen=new Set(),moduleHashes=new Set(Object.values(globalThis.GridshardModulePresentation).map(p=>crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',p.asset))).digest('hex')));
  for(const id of Object.keys(THEMES))for(const kind of ['activate','shot']){
    const cue=globalThis.GRIDSHARD_SFX_CUES[id+'_'+kind],bytes=fs.readFileSync(path.join(__dirname,'..',cue.asset));
    assert.equal(path.basename(cue.asset),id+'_'+kind+'.wav');assert.equal(bytes.readUInt32LE(24),22050);
    assert.ok(bytes.length<60000);let peak=0;for(let i=44;i<bytes.length;i+=2)peak=Math.max(peak,Math.abs(bytes.readInt16LE(i))/32768);
    assert.ok(peak>.05&&peak<=.53);
    const hash=crypto.createHash('sha256').update(bytes).digest('hex');assert.ok(!moduleHashes.has(hash));seen.add(hash);
  }
  assert.equal(seen.size,14);
});
