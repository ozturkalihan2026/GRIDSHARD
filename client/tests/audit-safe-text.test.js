const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const source=fs.readFileSync(path.join(__dirname,"../src/app.js"),"utf8");

test("chest failure uses text nodes even for a malicious network/native error",()=>{
  const nodes=new Map();
  const element=()=>({dataset:{},children:[],appendChild(child){this.children.push(child);},replaceChildren(...children){this.children=children;},
    set innerHTML(_){throw Error("error text must never enter HTML parsing");}});
  for(const id of ["chest-reveal-card","chest-reveal-rewards","chest-reveal-kicker","chest-reveal-close"])nodes.set(id,element());
  const sandbox={Error,localizedUiText:text=>text,document:{getElementById:id=>nodes.get(id),createElement:element}};
  const start=source.indexOf("  function showChestFailure(error)");
  const end=source.indexOf("  // Başarısız işlemden",start);
  vm.runInNewContext(source.slice(start,end)+"\nthis.showFailure=showChestFailure;",sandbox);
  const payload='<img src=x onerror="globalThis.compromised=true"><script>bad()</script>';
  sandbox.showFailure(new Error(payload));
  assert.equal(nodes.get("chest-reveal-rewards").children[0].children[0].textContent,payload);
  assert.equal(nodes.get("chest-reveal-card").dataset.state,"error");
  assert.equal(nodes.get("chest-reveal-close").disabled,false);
});

test("catalog and cosmetic names are text; only fixed allowlisted artwork uses HTML",()=>{
  assert.ok(source.includes("chestName.textContent = item.name_tr;"));
  assert.ok(source.includes("name.textContent = avatar.nameTr;"));
  assert.ok(source.includes("name.textContent = frame.nameTr;"));
  assert.ok(source.includes("name.textContent = background.nameTr;"));
  assert.ok(!source.includes("<strong>${item.name_tr}</strong>"));
});

test("UI icon markup rejects raw attribute injection and prototype keys",()=>{
  const start=source.indexOf("  function uiIconMarkup(");
  const end=source.indexOf("  function createUiIcon(",start);
  const sandbox={UI_ART_ICONS:{gear:"settings"},UI_ICON_PATHS:{star:'<path id="star"/>',hp:'<path id="hp"/>'}};
  vm.runInNewContext(source.slice(start,end)+"\nthis.markup=uiIconMarkup;",sandbox);
  const payload='hp\" onclick=\"bad()';
  const result=sandbox.markup(payload,'blue\" onclick=\"bad()');
  assert.ok(result.includes('data-icon="star"'));
  assert.ok(!result.includes("onclick") && !result.includes("bad()"));
  assert.ok(sandbox.markup("__proto__").includes('data-icon="star"'));
  assert.ok(sandbox.markup("hp","blue").includes('data-icon="hp" data-tone="blue"'));
  assert.ok(sandbox.markup("gear",'blue" onclick="bad()').includes('data-ui-art="settings"'));
  assert.ok(!sandbox.markup("gear",'blue" onclick="bad()').includes("onclick"));
});

test("battle render signature includes structural definition changes",()=>{
  const start=source.indexOf("  function battleModuleRenderSignature(");
  const end=source.indexOf("  const enemyBattleBoardView",start);
  const sandbox={};
  vm.runInNewContext(source.slice(start,end)+"\nthis.signature=battleModuleRenderSignature;",sandbox);
  const state={instanceId:"same-instance",definitionId:"laser",nameTr:"same name",hp:100,maxHp:100};
  assert.notEqual(sandbox.signature(state),sandbox.signature({...state,definitionId:"plasma"}));
  assert.equal(sandbox.signature(state),sandbox.signature({...state}));
});

test("outer board cache does not hide definition/name/category/core artwork changes",()=>{
  const start=source.indexOf("  function renderBoard(");
  const end=source.indexOf("  function moduleEmblemMarkup(",start);
  assert.ok(start>0&&end>start);
  const signatureStart=source.indexOf("  function battleModuleRenderSignature(");
  const signatureEnd=source.indexOf("  const enemyBattleBoardView",signatureStart);
  const state={instanceId:"same",definitionId:"core",nameTr:"Çekirdek",category:"sistem",hp:100,maxHp:100};
  const signatures=[];
  const sandbox={client:{modules:new Map([["same",state]])},localBattleFinished:false,corePowerTargeting:false,
    document:{documentElement:{lang:"tr"}},metaProgressionState:{cores:{selected_core_type:"core_resonance"}},
    playerCellDebris:[],board:{},localizedUiText:text=>text,
    createModuleCard(){},updateBattleModuleCard(){},presentBattleDeployment(){},moduleAnchorCells:new Map(),
    playerCircuitCableModules:()=>[],renderBoardCables(){},
    battleBoardView:{render(modules,options){signatures.push(options.moduleSignature([...modules][0]));}}};
  vm.runInNewContext("let renderedBoardSignature=null;\n"+source.slice(signatureStart,signatureEnd)+source.slice(start,end)+"\nthis.render=renderBoard;",sandbox);
  sandbox.render();sandbox.render();assert.equal(signatures.length,1);
  sandbox.metaProgressionState.cores.selected_core_type="core_guardian";
  sandbox.render();assert.equal(signatures.length,2);assert.notEqual(signatures[0],signatures[1]);
  for (const [field,value] of [["definitionId","laser"],["nameTr","Lazer"],["category","saldırı"]]) {
    const before=signatures.length;state[field]=value;sandbox.render();assert.equal(signatures.length,before+1);
  }
});

test("client category aliases share server-style utility/copy limits",()=>{
  const start=source.indexOf("  const LIVE_UTILITY_CATEGORIES");const end=source.indexOf("  function deployDeckModule",start);
  const modules=new Map([['a',{instanceId:'a',definitionId:'battery',category:'enerji',status:'active',hp:100}],
    ['b',{instanceId:'b',definitionId:'capacitor',category:'sistem',status:'active',hp:100}],
    ['c',{instanceId:'c',definitionId:'other-system',category:'sistem',status:'active',hp:100}]]);
  const sandbox={client:{modules},clientDefinitionId:id=>id,poolCategoryLabel:()=>"Sistem"};
  vm.runInNewContext(source.slice(start,end)+"\nthis.reject=deploymentCompositionRejection;",sandbox);
  const candidate={definitionId:'current_balancer',category:'sistem',nameTr:'Akım Dengeleyici'};
  assert.equal(sandbox.reject(candidate),"Sistem sınırı dolu: 3/3.");
});
