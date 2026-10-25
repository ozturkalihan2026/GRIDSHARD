const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
test('charge updates do not rewrite inherited board identity or repaint every descendant',()=>{
 const from=app.indexOf('  const CORE_VISUALS = Object.freeze({'),to=app.indexOf('  // One current physical painting',from);
 const c=vm.createContext({});vm.runInContext(app.slice(from,to)+';this.apply=applyCoreVisualIdentity;',c);
 let attrs=0,styles=0;const props=new Map();
 const node={dataset:new Proxy({},{set(t,k,v){attrs++;t[k]=v;return true;}}),
  style:{getPropertyValue:k=>props.get(k)||'',setProperty(k,v){styles++;props.set(k,v);}}};
 for(let i=0;i<1000;i++)assert.equal(c.apply(node,'core_resonance').accent,'#56f1df');
 assert.equal(attrs,1);assert.equal(styles,1);
 c.apply(node,'core_guardian');assert.equal(attrs,2);assert.equal(styles,2);assert.equal(props.get('--core-accent'),'#79b6ff');
 c.apply(node,'removed-core');assert.equal(node.dataset.coreType,'core_resonance');assert.equal(styles,3);
});
