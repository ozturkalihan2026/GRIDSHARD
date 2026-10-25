const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../src/app.js'),'utf8');
function fixture(){
  let now=100,reduced=false;
  const flights=[],animations=[];
  const animate=()=>{
    const a={onfinish:null,oncancel:null,cancelled:false,cancel(){this.cancelled=true;this.oncancel?.();}};
    animations.push(a);return a;
  };
  const image={src:'laser.webp',animate,getBoundingClientRect:()=>({left:10,top:400,width:45,height:45})};
  const host={animate,getBoundingClientRect:()=>({left:150,top:230,width:60,height:60})};
  const card={querySelector:()=>host};
  const document={hidden:false,body:{dataset:{appScreen:'play'},appendChild:n=>{n.isConnected=true;flights.push(n);}},
    createElement:()=>({style:{},animate,setAttribute(){},remove(){this.isConnected=false;}})};
  const context=vm.createContext({document,performance:{now:()=>now},localBattleFinished:false,
    shelf:{querySelectorAll:()=>[{dataset:{moduleId:'laser-1'},querySelector:()=>image}]},
    matchMedia:()=>({matches:reduced}),clientDefinitionId:id=>id,
    pendingBattleDeployments:[],liveBattleDeployments:new Set()});
  const begin=source.indexOf('  function battleDeploymentMotionAllowed()');
  vm.runInContext(source.slice(begin,source.indexOf('  function deployDeckModule(',begin))+
    ';this.remember=rememberBattleDeployment;this.present=presentBattleDeployment;this.clear=clearBattleDeployments;',context);
  return {context,flights,animations,card,cell:{isConnected:true},module:{instanceId:'laser-1',definitionId:'laser'},
    advance:ms=>now+=ms,reduce:()=>reduced=true};
}

test('placement waits for server confirmation and consumes a shelf click once',()=>{
  const f=fixture();
  f.context.present(f.module,f.cell,f.card);assert.equal(f.flights.length,0,'initial snapshot has no click');
  f.context.remember(f.module);assert.equal(f.flights.length,0,'request alone cannot choose a cell');
  f.context.present(f.module,f.cell,f.card);assert.equal(f.flights.length,1);
  f.context.present(f.module,f.cell,f.card);assert.equal(f.flights.length,1,'snapshot patch cannot replay a flight');
  f.animations[0].onfinish();
  assert.equal(f.flights[0].isConnected,false);assert.equal(f.context.liveBattleDeployments.size,0);
  assert.ok(f.animations.every(a=>a.cancelled),'animation effects released after arrival');
});

test('exit/background cleanup, reduced motion and late confirmations leave no flight',()=>{
  const f=fixture();f.context.remember(f.module);f.context.present(f.module,f.cell,f.card);
  f.context.clear();assert.equal(f.context.liveBattleDeployments.size,0);assert.ok(f.animations.every(a=>a.cancelled));
  assert.ok(f.flights.every(n=>!n.isConnected));
  f.context.remember(f.module);f.advance(5100);f.context.present(f.module,f.cell,f.card);
  assert.equal(f.flights.length,1,'stale request discarded');
  f.reduce();f.context.remember(f.module);assert.equal(f.context.pendingBattleDeployments.length,0);
  f.context.document.hidden=true;f.context.remember(f.module);assert.equal(f.context.pendingBattleDeployments.length,0);
});

test('pending placement requests remain bounded without timers',()=>{
  const f=fixture();for(let i=0;i<100;i++)f.context.remember(f.module);
  assert.equal(f.context.pendingBattleDeployments.length,15);
  f.context.clear();assert.equal(f.context.pendingBattleDeployments.length,0);
});

test('fractional current balance does not rewrite a CSS-rounded transform each HUD tick',()=>{
  let transforms=0,aria=0,paint='';
  const values=new Map([['aria-valuenow','6']]);
  const fill={style:{get transform(){return paint;},set transform(value){transforms++;paint=value.replace(/0\.08333333333333333/,'0.083333');}}};
  const meter={getAttribute:key=>values.get(key),setAttribute(key,value){aria++;values.set(key,value);}};
  const context=vm.createContext({client:{circuitCredits:1},shelfCreditIndicatorEl:null,metaProgressionState:null,
    setHudText(){},document:{getElementById:id=>id==='battle-current-fill'?fill:id==='battle-current-bar'?meter:null}});
  const begin=source.indexOf('  function renderCredits()');
  vm.runInContext(source.slice(begin,source.indexOf('  function flashInsufficientCredits()',begin))+';this.render=renderCredits;',context);
  context.render();assert.equal(transforms,1);assert.equal(aria,1);
  for(let i=0;i<100;i++)context.render();assert.equal(transforms,1);assert.equal(aria,1);
  context.client.circuitCredits=2;context.render();assert.equal(transforms,2);assert.equal(aria,2);
});
