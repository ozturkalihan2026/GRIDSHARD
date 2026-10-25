const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=name=>fs.readFileSync(path.join(root,name),'utf8');
const terrain=read('src/battle-platform-v17.css');
const vm=require('node:vm');
const declarations=terrain.replace(/\/\*[\s\S]*?\*\//g,'');

test('painted islands are local WebP assets within the terrain budget',()=>{
  let total=0;
  const names=['battle-native-v6/island-player','battle-native-v6/island-enemy'];
  for(const name of names){
    const bytes=fs.readFileSync(path.join(root,`assets/ui/${name}.webp`));
    assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
    assert.ok(bytes.length<210000);total+=bytes.length;
  }
  assert.ok(total<360000);
  assert.equal((terrain.match(/url\(/g)||[]).length,3);
  assert.ok(read('assets/ui/battle-approved-v5/circuit-walls.svg').length<5000);
  assert.doesNotMatch(terrain,/battle-platform-v2|battle-pedestal-v3|socket-block/);
});

test('whole terrain sits below live boards without slicing, cell images or extra animation',()=>{
  assert.match(declarations,/border-image:none !important/);
  assert.doesNotMatch(declarations,/@keyframes|animation:(?!none)|filter:(?!none)|will-change:(?!auto)|grid-template/);
  assert.match(terrain,/box-sizing:border-box; border:0 !important/);
  const cell=terrain.match(/\.board-cell\s*\{([^}]+)\}/)[1];
  assert.doesNotMatch(cell,/clip-path|overflow:hidden|transform:|url\(/);
  for(const selector of ['board','board-cell'])assert.match(terrain,new RegExp('\\.'+selector+'::before\\s*\\{\\s*content:none !important; display:none'),'Native painted floor must be the only floor');
  assert.match(terrain,/\.board-cell::after\s*\{\s*content:none !important; display:none/);
  assert.match(terrain,/\.circuit-terrain\s*\{[^}]*z-index:0; pointer-events:none/);
  assert.match(terrain,/\.board\s*\{[^}]*z-index:2/);
  assert.match(terrain,/background:var\(--circuit-platform-art\) center \/ 100% 100% no-repeat/);
  assert.equal((read('index.html').match(/class="circuit-terrain" aria-hidden="true"/g)||[]).length,2);
});

test('native floor has equal plate dimensions in all three rows on both sides',()=>{
  const g=JSON.parse(read('assets/ui/battle-native-v6/registration.json'));
  assert.equal(g.width,g.columns*g.cellWidth+(g.columns-1)*g.gap);
  assert.equal(g.height,g.rows*g.cellHeight+(g.rows-1)*g.gap);
  assert.deepEqual([g.columns,g.rows,g.cellWidth,g.cellHeight],[5,3,140,130]);
  const css=read('src/module-device-v8.css');
  assert.match(css,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(css,/grid-template-rows:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/column-gap:calc\(var\(--gs-vertical-board-size\) \* 7 \/ 728\)/);
  assert.match(css,/row-gap:calc\(var\(--gs-board-height\) \* 7 \/ 404\)/);
  // Source registration maps the actual native opening onto the live board.
  const block=terrain.match(/\.circuit-terrain::before\s*\{([^}]+)\}/)[1];
  const percent=name=>parseFloat(block.match(new RegExp('(?:^|[;\\s])'+name+':(-?[\\d.]+)%'))[1])/100;
  assert.ok(Math.abs(percent('left')+percent('width')*g.left/g.canvas)<1e-7);
  assert.ok(Math.abs(percent('top')+percent('height')*g.top/g.canvas)<1e-7);
  assert.ok(Math.abs(percent('width')*g.width/g.canvas-1)<1e-7);
  assert.ok(Math.abs(percent('height')*g.height/g.canvas-1)<1e-7);
});

test('scene fitting reserves BOTH metal rims and the player name above the shelf',()=>{
  const source=read('src/app.js'),start=source.indexOf('  function circuitSceneLayout(');
  const code=source.slice(start,source.indexOf('  function fitCircuitScene()',start));
  const sandbox={};vm.runInNewContext(code+';this.layout=circuitSceneLayout;',sandbox);
  for(const width of[280,320,393,548,590])for(const height of[440,540,677,740,1000])for(const tilt of[0,30]){
    const l=sandbox.layout({width,height,headerHeight:58,footerHeight:18,tilt});
    assert.ok(l.size>12);
    assert.ok((5*l.size+4*l.gap)*1.08<=width+.01);
    assert.ok(l.rimBottom<=height-18-4+.01,`${width}x${height} rim must finish above the identity`);
    assert.ok(l.playerTop>l.enemyTop+l.boardHeight);
    // Both the complete deck and name finish above the main metal rim.
    const floorTop=l.enemyTop+(l.boardHeight-l.projectedHeight)/2;
    assert.ok(floorTop-.32*l.projectedHeight>=58+3.9);
    assert.ok(l.growth<=1.10&&l.growth>1);
    if(height<=740)assert.equal(l.growth,1.10,'Requested zoom on normal game viewports');
    const baseSize=l.size/l.growth;
    assert.ok(Math.abs(l.equipmentSize/(baseSize*.92*1.15*1.10)-1.10)<1e-9);
  }
});

test('one material owner preserves side colors, touch and debris states, and cable occlusion',()=>{
  const html=read('index.html');
  assert.ok(html.indexOf('src/battle-platform-v17.css')>html.indexOf('src/presentation-refinements-v16.css'));
  assert.equal((html.match(/href="\.\/src\/battle-platform-v17.css"/g)||[]).length,1);
  assert.match(terrain,/--circuit-light:#73fff0/);assert.match(terrain,/--circuit-light:#ff583d/);
  assert.match(terrain,/\.board-cell:is\(\.tap-drop-target,:focus-visible\)/);
  assert.match(terrain,/\.board-cell\.debris-cell/);
  assert.match(terrain,/:is\(\.board-cable-layer,\.board-cable-current-layer\)\s*\{[^}]*z-index:0 !important/);
  assert.match(read('src/module-device-v8.css'),/--gs-board-gap:clamp\(12px,3vw,16px\)/);
});

test('VS follows the actual projected facing rims on layout changes, not a fixed offset',()=>{
  const source=read('src/app.js'),start=source.indexOf('  function positionCircuitVs()');
  const code=source.slice(start,source.indexOf('  function observeBattleLayout(',start));
  let upper=300,lower=400,offset=0,writes=0,visible=true;
  const vs={style:{getPropertyValue:()=>String(offset),setProperty:(_key,value)=>{offset=parseFloat(value);writes++;}},
    getBoundingClientRect:()=>({top:320+offset,height:30})};
  const arena={querySelector:selector=>selector==='.duel-vs'?vs:{getBoundingClientRect:()=>({top:selector.includes('bottom')?upper:lower})}};
  const board={get clientWidth(){return visible?320:0;},closest:()=>arena};
  const sandbox={board,enemyBoard:{clientWidth:320}};
  vm.runInNewContext(code+';this.place=positionCircuitVs;',sandbox);
  sandbox.place();assert.equal(335+offset,350);assert.equal(writes,1);
  sandbox.place();assert.equal(writes,1,'Same layout must not write repeatedly');
  upper=350;lower=480;sandbox.place();assert.equal(335+offset,415);assert.equal(writes,2);
  visible=false;sandbox.place();assert.equal(writes,2,'Hidden menu boards must not move VS');
  const refresh=source.slice(source.indexOf('  function invalidateBattleLayout()'),start);
  assert.match(refresh,/positionCircuitVs\(\)/);
  assert.doesNotMatch(code,/requestAnimationFrame|setInterval|setTimeout|addEventListener/);
});
