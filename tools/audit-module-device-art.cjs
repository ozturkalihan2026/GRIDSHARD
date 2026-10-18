"use strict";
// Read-only source/asset checks plus a generated JSON report. Never starts a
// browser, server, build, game session, account operation or native release.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const {readBuildBlock}=require("./build-client.js"),esbuild=require("esbuild");
const {execFileSync}=require("node:child_process");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE || "sharp");
const root=path.resolve(__dirname,".."),client=path.join(root,"client"),assetRoot=path.join(client,"assets/ui/modules-physical-v1");
const hash=b=>crypto.createHash("sha256").update(b).digest("hex");
const ids=["laser","shield","cooler","battery","amplifier","emp","repair","armor","pulse_cannon","missile_launcher"];
const moving=["laser","pulse_cannon","missile_launcher","repair","cooler"],dirs=["ne","nw","se","sw"];
async function main(){
  const html=fs.readFileSync(path.join(client,"index.html"),"utf8");
  const expected=[...ids,"turret-base","cooler-base","repair-base",...moving.flatMap(id=>dirs.map(d=>`${id}-${d}`)),
    ...dirs.map(d=>`repair-${d}-work`),"cooler-se-work","cooler-sw-work"].sort();
  const files=fs.readdirSync(assetRoot).filter(f=>f.endsWith(".webp")).sort();
  assert.deepEqual(files,expected.map(n=>n+".webp").sort());
  const template=html.match(/<template id="module-device-assets">([\s\S]*?)<\/template>/)?.[1];
  assert.ok(template,"Missing runtime/native allowlist");
  const listed=[...template.matchAll(/src="\.\/assets\/ui\/modules-physical-v1\/([^"/]+)"/g)].map(m=>m[1]).sort();
  assert.deepEqual(listed,files,"Runtime files must all be included by build-client's HTML asset scanner");
  const assets=[];
  for(const file of files){
    const bytes=fs.readFileSync(path.join(assetRoot,file)),meta=await sharp(bytes).metadata();
    assert.equal(meta.format,"webp");assert.equal(meta.hasAlpha,true);
    const stats=await sharp(bytes).ensureAlpha().stats();
    assert.equal(stats.channels[3].min,0);assert.equal(stats.channels[3].max,255);
    assert.equal(meta.width,ids.includes(file.slice(0,-5))?384:256);assert.equal(meta.height,meta.width);
    assets.push({file,bytes:bytes.length,width:meta.width,height:meta.height,alpha:true,sha256:hash(bytes)});
  }
  for(const id of moving) assert.equal(new Set(dirs.map(d=>assets.find(a=>a.file===`${id}-${d}.webp`).sha256)).size,4);
  for(const d of dirs) assert.notEqual(assets.find(a=>a.file===`repair-${d}.webp`).sha256,assets.find(a=>a.file===`repair-${d}-work.webp`).sha256);
  const scripts=readBuildBlock(html,"scripts"),styles=readBuildBlock(html,"styles");
  assert.ok(scripts.inputs.indexOf("./src/module-device-art.js")<scripts.inputs.indexOf("./src/battle/module-card-view.js"));
  assert.ok(scripts.inputs.indexOf("./src/battle/module-motion.js")<scripts.inputs.indexOf("./src/app.js"));
  assert.ok(scripts.inputs.includes("./src/battle/laser-3d-pilot.js"),"Authorized real 3D trial must load before app startup");
  assert.match(fs.readFileSync(path.join(client,"src/app.js"),"utf8"),/laser3DPilot\.attach/);
  assert.ok(scripts.inputs.indexOf("./src/battle/device-models-extended.js")<scripts.inputs.indexOf("./src/battle/laser-3d-pilot.js"));
  assert.equal(styles.inputs.at(-1),"./src/module-vfx-v14.css");
  assert.ok(scripts.inputs.indexOf("./src/battle/laser-aim.js")<scripts.inputs.indexOf("./src/module-device-art.js"));
  assert.ok(scripts.inputs.indexOf("./src/detail-card-layout.js")<scripts.inputs.indexOf("./src/app.js"));
  const transform=(inputs,loader)=>esbuild.transformSync(inputs.map(f=>fs.readFileSync(path.join(client,f),"utf8")).join("\n"),{loader,target:["chrome109","safari15"],logLevel:"silent"});
  const js=transform(scripts.inputs,"js"),css=transform(styles.inputs,"css");
  const warnings=js.warnings.map(w=>({id:w.id,text:w.text}));
  assert.ok(warnings.every(w=>w.id==="duplicate-object-key"));assert.equal(warnings.length,20,"Unexpected new build warning");
  assert.equal(css.warnings.length,0);
  const pythonSources={};
  for(const name of ["catalog.py","combat.py","catalog_view.py"]){
    const file="server/app/game/"+name;
    pythonSources[name]={before:execFileSync("git",["show","HEAD:"+file],{cwd:root,encoding:"utf8"}),after:fs.readFileSync(path.join(root,file),"utf8")};
  }
  const mechanics=JSON.parse(execFileSync(process.env.GRIDSHARD_PYTHON || "python",["-c",`
import ast, json, sys
sys.stdin.reconfigure(encoding='utf-8')
sources=json.load(sys.stdin)
def mechanical_calls(source):
    tree=ast.parse(source)
    calls=[]
    for n in ast.walk(tree):
        if isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id=='ModuleDefinition':
            n.keywords=[k for k in n.keywords if k.arg not in ('name_tr','description_tr')]
            calls.append(ast.dump(n,include_attributes=False))
    return calls
assert mechanical_calls(sources['catalog.py']['before'])==mechanical_calls(sources['catalog.py']['after'])
class NormalizeDisplay(ast.NodeTransformer):
    def visit_Constant(self,n):
        if n.value=='Sönümleyici': n.value='Zırh'
        return n
old=ast.dump(NormalizeDisplay().visit(ast.parse(sources['combat.py']['before'])),include_attributes=False)
new=ast.dump(NormalizeDisplay().visit(ast.parse(sources['combat.py']['after'])),include_attributes=False)
assert old==new
for entry in sources.values(): ast.parse(entry['after'])
print(json.dumps({'catalogMechanicsUnchanged':True,'combatOnlyDisplayRename':True,'pythonSyntax':True}))
`],{input:JSON.stringify(pythonSources),encoding:"utf8"}));
  const report={date:"2026-10-16",package:"8A physical modules runtime",passed:true,gameBound:true,
    modules:ids,legacyMovingModules:moving,legacyDirectionalViews:4,continuousTargetMathModules:ids,illustratedViewCount:8,baseLayers:0,
    camera:{mode:"shared board camera / upright billboard impostors",degreesFromOverhead:30,defaultEnabled:true,reducedQualityFallback:true},
    laserYaw:{continuousTargetMath:true,illustratedViewStepDegrees:45,renderer:"camera-facing eight-view illustration",fourViewLegacyLaserLoaded:false,muzzleRegistered:true},
    assets:assets.length,assetBytes:assets.reduce((n,a)=>n+a.bytes,0),scripts:scripts.inputs.length,styles:styles.inputs.length,
    browserStarted:false,serverStarted:false,productionBuildRun:false,visualGameTestRun:false,newVfx:false,
    checks:["all runtime paths allowlisted for web/native","real alpha and decoded dimensions","four distinct yaw views for five devices", "four repair working poses", "fan frame assets present", "script/style order", "JS/CSS target syntax"],
    existingBuildWarnings:warnings,files:assets};
  report.serverChecks=mechanics;
  report.threeDPilot={modules:36,cores:7,gameBound:true,loadedByClient:true,
    status:"approved artwork converted to volumetric prototypes; fine art matching and gameplay acceptance pending",gpuVisualTestRun:false,realDevicePerformanceMeasured:false};
  const appSource=fs.readFileSync(path.join(client,"src/app.js"),"utf8");
  const deviceCss=fs.readFileSync(path.join(client,"src/module-device-v8.css"),"utf8");
  assert.doesNotMatch(appSource,/function createCircuitCableFlow|function ensureBoardFlowLayer/);
  assert.match(appSource,/function circuitCableRoutes\(modules\)/);
  assert.match(deviceCss,/container-type:size/);
  assert.match(deviceCss,/stroke-dasharray:none !important; stroke-dashoffset:0 !important/);
  report.circuitDeck={columns:5,rows:3,maxCellPixels:84,minCellPixels:28,
    actualArenaContainerSizing:true,viewportFallback:true,heatEdge:"inside-top",hpEdge:"inside-bottom",
    stationaryCables:true,animatedFlowNodes:false,persistentCableNodes:true,
    routing:"one orthogonal visual bus per powered destination; combat rules unchanged",
    browserLayoutVerified:false,realDevicePerformanceMeasured:false};
  const destination=path.join(root,"qa_reports/visual-refresh-pack08a-runtime-20261016.json");
  fs.writeFileSync(destination,JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify({passed:true,assets:report.assets,assetBytes:report.assetBytes,scripts:report.scripts,styles:report.styles,existingWarnings:warnings.length,report:destination}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
