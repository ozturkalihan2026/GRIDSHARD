const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function setup(){
 const source=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8'),start=source.indexOf('  const POST_MATCH_CORE_EXPLOSION_HOLD_MS'),end=source.indexOf('  function finishReasonLabel',start);
 const nodes=new Map(),timers=new Map();let next=0,renders=0;
 const arena={appendChild(node){nodes.set(node.id,node);}};
 const sandbox={document:{getElementById:id=>id==='duel-arena'?arena:nodes.get(id),createElement:()=>({setAttribute(name,value){this[name]=value;},remove(){nodes.delete(this.id);}})},
 window:{setTimeout(fn,ms){const id=++next;timers.set(id,{fn,ms});return id;},clearTimeout(id){timers.delete(id);}},localizedUiText:s=>s,renderPlayModeUi:()=>renders++};
 vm.runInNewContext(source.slice(start,end)+';this.schedule=schedulePostMatchReveal;this.reset=resetPostMatchReveal;',sandbox);
 return {sandbox,nodes,timers,get renders(){return renders;}};
}
test('core finale shows one accessible end label, holds 2.5s, then cleans up',()=>{
 const s=setup();s.sandbox.schedule('match',{waitForCoreExplosion:true});
 assert.equal(s.nodes.size,1);assert.equal(s.nodes.get('battle-ended-banner').textContent,'SAVAŞ SONA ERDİ');
 assert.equal(s.nodes.get('battle-ended-banner').role,'status');
 assert.equal(s.timers.size,1);assert.equal([...s.timers.values()][0].ms,2500);assert.equal(s.renders,0);
 s.sandbox.schedule('match',{waitForCoreExplosion:true});assert.equal(s.timers.size,1);
 [...s.timers.values()][0].fn();assert.equal(s.nodes.size,0);assert.equal(s.renders,1);
});
test('exit/reset and a non-core result cannot leak the finale label or timer',()=>{
 const s=setup();s.sandbox.schedule('a',{waitForCoreExplosion:true});s.sandbox.reset();
 assert.equal(s.nodes.size,0);assert.equal(s.timers.size,0);
 s.sandbox.schedule('b',{waitForCoreExplosion:true});s.sandbox.schedule('c');
 assert.equal(s.nodes.size,0);assert.equal(s.timers.size,0);assert.equal(s.renders,1);
});
