const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"../src/module-device-v8.css"),"utf8");
const code=source.slice(source.indexOf("  const CIRCUIT_CABLE_DIRECTIONS = ["),source.indexOf("  function playerCircuitCableModules()"));
const cells=Array.from({length:15},(_,i)=>[i%5,Math.floor(i/5)]);
const moduleAt=(x,y,extra={})=>({definitionId:"laser",position:{x,y},status:"active",hp:100,isPowered:true,...extra});
const core=()=>moduleAt(2,1,{definitionId:"core"});

function fixture(){
  const counts={created:0,writes:0,reads:0},doc={createElementNS:()=>{counts.created++;return new Element();}};
  class Element {
    constructor(){this.children=[];this.attrs=new Map();this.dataset={};this.parentNode=null;this.classes=new Set();
      this.classList={add:(...names)=>names.forEach(n=>this.classes.add(n)),toggle:(n,on)=>{if(this.classes.has(n)!==on){counts.writes++;on?this.classes.add(n):this.classes.delete(n);}}};}
    get childElementCount(){return this.children.length;}
    setAttribute(k,v){if(this.attrs.get(k)!==v)counts.writes++;this.attrs.set(k,v);}
    appendChild(child){child.parentNode=this;this.children.push(child);return child;}
    prepend(child){child.parentNode=this;this.children.unshift(child);}
    after(child){child.parentNode=this.parentNode;this.parentNode.children.splice(this.parentNode.children.indexOf(this)+1,0,child);}
    replaceChildren(){this.children.forEach(c=>c.parentNode=null);this.children=[];}
    remove(){if(this.parentNode)this.parentNode.children.splice(this.parentNode.children.indexOf(this),1);this.parentNode=null;}
    querySelector(selector){const name=selector.split(".").at(-1);return this.children.find(c=>c.classes.has(name))||null;}
    querySelectorAll(selector){return this.children.filter(c=>c.classes.has(selector.slice(1)));}
  }
  const board=new Element();let size=64;
  Object.defineProperties(board,{clientWidth:{get(){counts.reads++;return size*5+32;}},clientHeight:{get(){counts.reads++;return size*3+16;}}});
  for(const [x,y]of cells){const cell=new Element();cell.classList.add("board-cell");cell.dataset={x:String(x),y:String(y)};
    for(const [key,get]of Object.entries({offsetLeft:()=>x*(size+8),offsetTop:()=>y*(size+8),offsetWidth:()=>size,offsetHeight:()=>size})){
      Object.defineProperty(cell,key,{get(){counts.reads++;return get();}});
    }board.appendChild(cell);
  }
  const context=vm.createContext({BOARD_CELLS:cells,document:doc,board,enemyBoard:null,battleLayoutEpoch:1,
    battleCableUnused:null,boardCableStates:new WeakMap(),battleLayoutObserver:null,
    ResizeObserver:class{observe(){}},renderCorePowerControl(){}});
  vm.runInContext(code+"\nthis.routes=circuitCableRoutes;this.render=renderBoardCables;",context);
  return{context,board,counts,setSize:n=>{size=n;context.battleLayoutEpoch++;}};
}

test("one orthogonal bus reaches a powered destination without filling its rectangle",()=>{
  const f=fixture(),modules=[core(),moduleAt(4,0)],before=JSON.stringify(modules),result=f.context.routes(modules);
  assert.deepEqual([...result.energizedEdges],["2,1>3,1","3,1>4,1","4,1>4,0"]);
  assert.deepEqual([...result.fedCells],["2,1","4,0"]);
  assert.equal(JSON.stringify(modules),before,"Presentation must not change combat data");
});
test("unpowered, destroyed, invalid and absent destinations never light cables",()=>{
  const f=fixture(),result=f.context.routes([core(),moduleAt(4,0,{isPowered:false}),moduleAt(0,0,{hp:0}),
    moduleAt(0,2,{status:"destroyed"}),moduleAt(99,1),moduleAt(1.5,1),moduleAt(0,1,{position:null})]);
  assert.equal(result.energizedEdges.size,0);assert.deepEqual([...result.fedCells],["2,1"]);
  for(const modules of [[],[moduleAt(4,0)],[core(),moduleAt(4,0)].map(m=>({...m,hp:0}))]){
    const empty=f.context.routes(modules);assert.equal(empty.energizedEdges.size,0);assert.equal(empty.fedCells.size,0);
  }
});
test("routing uses the actual core position and works in every quadrant",()=>{
  const f=fixture();for(const [x,y]of cells){
    const route=f.context.routes([core(),moduleAt(x,y)]);
    assert.equal(route.energizedEdges.size,Math.abs(x-2)+Math.abs(y-1));
  }
  const route=f.context.routes([moduleAt(3,0,{definitionId:"core"}),moduleAt(1,2)]);
  assert.deepEqual([...route.energizedEdges],["3,0>2,0","2,0>1,0","1,0>1,1","1,1>1,2"]);
});
test("same cable snapshot has zero allocations, geometry reads and cable writes",()=>{
  const f=fixture(),modules=[core(),moduleAt(4,0)];f.context.render(f.board,modules);
  const base=f.board.querySelector(":scope > .board-cable-layer"),live=f.board.querySelector(":scope > .board-cable-current-layer");
  assert.equal(base.children.length,22*4);assert.equal(live.children.length,22*2);
  assert.equal(live.children.filter(n=>n.attrs.get("visibility")==="visible").length,6);
  assert.equal(f.board.querySelector(":scope > .board-cable-flow-layer"),null);
  const before={...f.counts};f.context.render(f.board,modules);assert.deepEqual(f.counts,before);
});
test("power and destruction only toggle persistent cable nodes; layout resize remeasures",()=>{
  const f=fixture(),device=moduleAt(4,0);f.context.render(f.board,[core(),device]);
  const live=f.board.querySelector(":scope > .board-cable-current-layer"),nodes=[...live.children],before={...f.counts};
  f.context.render(f.board,[core(),{...device,isPowered:false}]);
  assert.equal(f.counts.created,before.created);assert.equal(f.counts.reads,before.reads);
  assert.deepEqual(live.children,nodes);assert.ok(nodes.every(n=>n.attrs.get("visibility")==="hidden"));
  f.context.render(f.board,[core(),device]);assert.deepEqual(live.children,nodes);
  f.context.render(f.board,[{...core(),hp:0},device]);assert.ok(nodes.every(n=>n.attrs.get("visibility")==="hidden"));
  f.setSize(76);f.context.render(f.board,[core(),device]);
  assert.equal(live.attrs.get("viewBox"),"0 0 412 244");assert.ok(f.counts.reads>before.reads);
});

test("powered floor cue uses existing cells and never lights empty transit sockets or rebuilds devices",()=>{
  const f=fixture(),device=moduleAt(4,0),sockets=f.board.querySelectorAll(".board-cell");
  const cellAt=(x,y)=>sockets.find(c=>c.dataset.x===String(x)&&c.dataset.y===String(y));
  const art={persistent:true};cellAt(4,0).appendChild(art);
  f.context.render(f.board,[core(),device]);const before={...f.counts};
  assert.equal(cellAt(4,0).classes.has("energy-fed-cell"),true);
  assert.equal(cellAt(2,1).classes.has("energy-fed-cell"),true);
  for(const [x,y]of [[3,1],[4,1]])assert.equal(cellAt(x,y).classes.has("energy-fed-cell"),false);
  for(let i=0;i<1000;i++)f.context.render(f.board,[core(),device]);
  assert.deepEqual(f.counts,before,"unchanged energy cue has zero DOM allocation, measurement or write");
  for(const off of [{...device,isPowered:false},{...device,hp:0},{...device,status:"destroyed"}]){
    f.context.render(f.board,[core(),off]);assert.equal(cellAt(4,0).classes.has("energy-fed-cell"),false);
    f.context.render(f.board,[core(),device]);assert.equal(cellAt(4,0).classes.has("energy-fed-cell"),true);
  }
  f.context.render(f.board,[{...core(),hp:0},device]);
  assert.ok(sockets.every(c=>!c.classes.has("energy-fed-cell")));
  assert.deepEqual(f.board.querySelectorAll(".board-cell"),sockets);
  assert.equal(cellAt(4,0).children[0],art);assert.equal(f.counts.created,before.created);assert.equal(f.counts.reads,before.reads);
});

test("cell energy cue is a stationary floor and rim, without pulse, filter or compositor promotion",()=>{
  const rule=css.match(/\.board-cell\.energy-fed-cell\s*\{([^}]+)\}/)[1];
  assert.match(css,/radial-gradient\(ellipse at 50% 75%,var\(--cell-energy-halo,transparent\)/);
  assert.match(rule,/--cell-energy-halo:var\(--circuit-cell-glow\)/);
  assert.match(rule,/border-color:var\(--circuit-light\)/);
  for(const property of ["animation:none","transition:none","filter:none","will-change:auto"])assert.ok(rule.includes(property));
  assert.match(css,/\.duel-enemy-side\s*\{[^}]*--circuit-cell-glow:#ff9b452b/);
});
test("responsive sockets use actual arena space, retain 5x3 topology and keep bars inside",()=>{
  assert.match(css,/container-type:size/);assert.match(css,/100cqw/);assert.match(css,/100cqh - 180px/);
  assert.match(css,/grid-template-columns:repeat\(5,var\(--gs-battle-card-size\)\)/);
  assert.match(css,/grid-template-rows:repeat\(3,var\(--gs-battle-card-size\)\)/);
  assert.match(css,/\.module-card\.battle-module-card::after\s*\{[^}]*bottom:0 !important/);
  assert.match(css,/\.module-card > \.module-heat-bar\s*\{\s*top:0 !important; left:0 !important; right:0 !important/);
  // Formula bounds only, not a replacement for real browser layout checks.
  for(const [width,height]of [[280,420],[320,480],[370,650],[560,720]]){
    const size=Math.max(28,Math.min(84,(width-24-32)/5,(height-180-32)/6));
    assert.ok(size*5+32<=width-24+.001);assert.ok(size*6+32+180<=height+.001);
  }
});
test("all quality tiers use continuous stationary cable ink, never animated strips",()=>{
  assert.doesNotMatch(source,/function createCircuitCableFlow|function ensureBoardFlowLayer/);
  assert.match(css,/\.circuit-cable-current\s*\{\s*display:inline !important/);
  assert.match(css,/stroke-dasharray:none !important; stroke-dashoffset:0 !important;\s*animation:none !important/);
  assert.match(css,/\.board-cable-current-layer\s*\{\s*animation:none !important; opacity:1 !important; will-change:auto !important/);
});
