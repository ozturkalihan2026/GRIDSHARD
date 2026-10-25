const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const source=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");
const css=fs.readFileSync(path.join(__dirname,"../src/module-device-v8.css"),"utf8");
const terrain=fs.readFileSync(path.join(__dirname,"../src/battle-platform-v17.css"),"utf8");
const code=source.slice(source.indexOf("  function cablePositionKey(position)"),source.indexOf("  function playerCircuitCableModules()"));
const cells=Array.from({length:15},(_,i)=>[i%5,Math.floor(i/5)]);
const moduleAt=(x,y,extra={})=>({definitionId:"laser",position:{x,y},status:"active",hp:100,isPowered:true,...extra});
const core=()=>moduleAt(2,1,{definitionId:"core"});

function fixture(painted=false){
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
  const board=new Element();let size=64,gap=14;
  Object.defineProperties(board,{clientWidth:{get(){counts.reads++;return size*5+4*gap;}},clientHeight:{get(){counts.reads++;return size*3+2*gap;}}});
  for(const [x,y]of cells){const cell=new Element();cell.classList.add("board-cell");cell.dataset={x:String(x),y:String(y)};
    const xs=[0,.234,.406,.594,.766,1],ys=[0,.345,.710,1];
    for(const [key,get]of Object.entries({
      offsetLeft:()=>painted?xs[x]*board.clientWidth:x*(size+gap),
      offsetTop:()=>painted?ys[y]*board.clientHeight:y*(size+gap),
      offsetWidth:()=>painted?(xs[x+1]-xs[x])*board.clientWidth:size,
      offsetHeight:()=>painted?(ys[y+1]-ys[y])*board.clientHeight:size})){
      Object.defineProperty(cell,key,{get(){counts.reads++;return get();}});
    }board.appendChild(cell);
  }
  const context=vm.createContext({BOARD_CELLS:cells,document:doc,board,enemyBoard:null,battleLayoutEpoch:1,
    battleCableUnused:null,boardCableStates:new WeakMap(),battleLayoutObserver:null,
    ResizeObserver:class{observe(){}},renderCorePowerControl(){}});
  vm.runInContext(code+"\nthis.routes=circuitCableRoutes;this.render=renderBoardCables;this.graph=circuitGutterGraph;this.shortest=shortestCircuitPaths;this.measure=measureBoardCableGeometry;",context);
  return{context,board,counts,setSize:n=>{size=n;context.battleLayoutEpoch++;},setGap:n=>{gap=n;context.battleLayoutEpoch++;}};
}

test("one orthogonal bus reaches a powered destination without filling its rectangle",()=>{
  const f=fixture(),modules=[core(),moduleAt(4,0)],before=JSON.stringify(modules),result=f.context.routes(modules);
  assert.deepEqual([...result.energizedEdges],["4,0"]);
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
    assert.equal(route.energizedEdges.size,1);
  }
  const route=f.context.routes([moduleAt(3,0,{definitionId:"core"}),moduleAt(1,2)]);
  assert.deepEqual([...route.energizedEdges],["1,2"]);
});
test("same cable snapshot has zero allocations, geometry reads and cable writes",()=>{
  const f=fixture(),modules=[core(),moduleAt(4,0)];f.context.render(f.board,modules);
  const base=f.board.querySelector(":scope > .board-cable-layer"),live=f.board.querySelector(":scope > .board-cable-current-layer");
  assert.equal(base.children.length,15*2);assert.equal(live.children.length,15*2);
  assert.equal(base.children.filter(n=>n.attrs.get('visibility')==='visible').length,2);
  assert.equal(live.children.filter(n=>n.attrs.get("visibility")==="visible").length,2);
  assert.equal(f.board.querySelector(":scope > .board-cable-flow-layer"),null);
  const before={...f.counts};f.context.render(f.board,modules);assert.deepEqual(f.counts,before);
});

test("initial empty board waits for actual sockets before building gutter paths",()=>{
  const f=fixture(),sockets=[...f.board.children];f.board.children=[];
  assert.doesNotThrow(()=>f.context.render(f.board,[]));
  const base=f.board.querySelector(':scope > .board-cable-layer');assert.ok(base.children.every(n=>n.attrs.get("visibility")==="hidden"));
  for(const cell of sockets)f.board.appendChild(cell);
  f.context.render(f.board,[core(),moduleAt(4,0)]);
  assert.equal(base.children.length,15*2);
});
test("power and destruction only toggle persistent cable nodes; layout resize remeasures",()=>{
  const f=fixture(),device=moduleAt(4,0);f.context.render(f.board,[core(),device]);
  const live=f.board.querySelector(":scope > .board-cable-current-layer"),nodes=[...live.children],before={...f.counts};
  f.context.render(f.board,[core(),{...device,isPowered:false}]);
  assert.equal(f.counts.created,before.created);assert.equal(f.counts.reads,before.reads);
  assert.deepEqual(live.children,nodes);assert.ok(nodes.every(n=>n.attrs.get("visibility")==="hidden"));
  assert.ok(f.board.querySelector(':scope > .board-cable-layer').children.every(n=>n.attrs.get('visibility')==='hidden'));
  f.context.render(f.board,[core(),device]);assert.deepEqual(live.children,nodes);
  f.context.render(f.board,[{...core(),hp:0},device]);assert.ok(nodes.every(n=>n.attrs.get("visibility")==="hidden"));
  f.setSize(76);f.context.render(f.board,[core(),device]);
  assert.equal(live.attrs.get("viewBox"),"0 0 436 256");assert.ok(f.counts.reads>before.reads);
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

test("painted socket energy cue is stationary and uses only the existing power state",()=>{
  const rule=terrain.match(/\.board-cell\.energy-fed-cell\s*\{([^}]+)\}/)[1];
  assert.match(rule,/radial-gradient\(ellipse at 50% 52%,var\(--circuit-cell-glow\)/);
  assert.doesNotMatch(rule,/url\(|circuit-socket-art/,'The platform, not each cell, owns the artwork');
  for(const property of ["animation:none","transition:none","filter:none","will-change:auto"])assert.ok(rule.includes(property));
  assert.match(terrain,/\.duel-enemy-side\s*\{[^}]*--circuit-light:#ff583d/);
});

test("all source/destination pairs follow the shortest gutter route without crossing equipment",()=>{
  for(const painted of [false,true]){
  const f=fixture(painted);
  for(const size of [28,64,84])for(const gap of [12,14,16]){
    f.setSize(size);f.setGap(gap);
    const geometry=f.context.measure(f.board),graph=f.context.graph(geometry);
    for(const [sx,sy]of cells){
      const routes=f.context.shortest(graph,`${sx},${sy}`);
      assert.equal(routes.size,14);
      for(const [key,route]of routes){
        const [tx,ty]=key.split(",").map(Number);
        const source=graph.ports.get(`${sx},${sy}`),target=graph.ports.get(key);
        const expected=Math.min(...source.taps.flatMap(start=>target.taps.map(end=>{
          const a=graph.nodes[start.node],b=graph.nodes[end.node];
          const stem=Math.abs(a.y-start.point.y)+Math.abs(b.y-end.point.y);
          const horizontal=a.y===b.y ? Math.abs(a.x-b.x) : Math.min(...geometry.channelX.map(x=>
            Math.abs(a.x-x*geometry.width)+Math.abs(b.x-x*geometry.width)));
          return stem+Math.abs(a.y-b.y)+horizontal;
        })));
        assert.ok(Math.abs(route.length-expected)<.001,`${sx},${sy}->${key} not shortest`);
        assert.equal((route.d.match(/M /g)||[]).length,1);
        for(let i=1;i<route.points.length;i++){
          const a=route.points[i-1],b=route.points[i];
          assert.ok(a.x===b.x || a.y===b.y);
          // First/last segments are the equipment's own port taps. All other
          // segments must stay outside the PAINTED socket interiors.
          if(i===1 || i===route.points.length-1)continue;
          const painted=cells.map(([x,y])=>({left:geometry.channelX[x]*geometry.width+2,
            top:geometry.channelY[y]*geometry.height+2,
            width:(geometry.channelX[x+1]-geometry.channelX[x])*geometry.width-4,
            height:(geometry.channelY[y+1]-geometry.channelY[y])*geometry.height-4}));
          for(const c of painted){
            const crosses=a.y===b.y
              ? a.y>c.top&&a.y<c.top+c.height&&Math.max(a.x,b.x)>c.left&&Math.min(a.x,b.x)<c.left+c.width
              : a.x>c.left&&a.x<c.left+c.width&&Math.max(a.y,b.y)>c.top&&Math.min(a.y,b.y)<c.top+c.height;
            assert.equal(crosses,false,`${sx},${sy}->${key} crosses a socket`);
          }
        }
      }
    }
  }
  }
});

test("upper and lower rows branch directly from the facing central core channel",()=>{
  const f=fixture(),geometry=f.context.measure(f.board),graph=f.context.graph(geometry);
  const routes=f.context.shortest(graph,"2,1");
  for(const y of [0,2])for(let x=0;x<5;x++){
    const route=routes.get(`${x},${y}`),upper=y===0;
    assert.equal(route.startSide,upper ? "top" : "bottom");
    assert.equal(route.endSide,upper ? "bottom" : "top");
    const channel=geometry.channelY[upper ? 1 : 2]*geometry.height;
    assert.ok(route.points.slice(1,-1).every(p=>Math.abs(p.y-channel)<.001),"row route detours around another row");
  }
});

test("empty transit sockets receive no lit port spur, including after resize",()=>{
  const f=fixture();f.context.render(f.board,[core(),moduleAt(4,0)]);
  const live=f.board.querySelector(':scope > .board-cable-current-layer');
  const routes=live.children.filter(n=>n.classes.has('circuit-cable-current')&&n.attrs.get('visibility')==='visible');
  assert.equal(routes.length,1);
  assert.deepEqual(routes.map(n=>(n.attrs.get('d').match(/M /g)||[]).length).sort(),[1]);
  const before={...f.counts};f.context.render(f.board,[core(),moduleAt(4,0)]);assert.deepEqual(f.counts,before);
  f.setGap(16);f.context.render(f.board,[core(),moduleAt(4,0)]);
  assert.equal(live.attrs.get('viewBox'),'0 0 384 224');
});
test("responsive sockets use actual arena space, retain 5x3 topology and keep bars inside",()=>{
  assert.match(css,/container-type:size/);assert.match(css,/100cqw/);assert.match(css,/100cqh - 128px/);
  assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css,/grid-template-rows:repeat\(3,minmax\(0,1fr\)\)/);
  assert.doesNotMatch(source,/channelX:\[0,\.234/,'Retired unequal bitmap seams must not drive the live grid');
  assert.match(css,/\.module-card\.battle-module-card::after\s*\{[^}]*bottom:0 !important/);
  assert.match(css,/\.module-card > \.module-heat-bar\s*\{\s*top:0 !important; left:0 !important; right:0 !important/);
  // Formula bounds only, not a replacement for real browser layout checks.
  for(const [width,height,gap]of [[300,420,12],[320,480,12],[370,650,12],[560,720,16]]){
    const size=Math.max(28,Math.min(84,(Math.min(width-80,width*.78)-4*gap)/5,(height-128-6.1*gap)/9.15));
    assert.ok(size*5+4*gap<=width-80+.001);
    // Two boards + gap (.7 board) + foreground identity (.35 board).
    const minimumLayout=3.05*(28*3+2*gap)+128;
    // The 28px touch floor wins on short displays; projected browser bounds
    // are checked separately at 320x568, rather than assuming unrotated fit.
    assert.ok(3.05*(size*3+2*gap)+128<=Math.max(height,minimumLayout)+.001);
  }
});
test("all quality tiers use continuous stationary cable ink, never animated strips",()=>{
  assert.doesNotMatch(source,/function createCircuitCableFlow|function ensureBoardFlowLayer/);
  assert.match(css,/\.circuit-cable-current\s*\{\s*display:inline !important/);
  assert.match(css,/stroke-dasharray:none !important; stroke-dashoffset:0 !important;\s*animation:none !important/);
  assert.match(css,/\.board-cable-current-layer\s*\{\s*animation:none !important; opacity:1 !important; will-change:auto !important/);
});
