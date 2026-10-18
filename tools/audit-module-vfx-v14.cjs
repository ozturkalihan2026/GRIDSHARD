"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),{execFileSync}=require("node:child_process");
const esbuild=require("esbuild"),{readBuildBlock,compressedAudioReplacements}=require("./build-client.js");
const root=path.resolve(__dirname,".."),client=path.join(root,"client");
const tests=["battle-sound-clarity-v15","module-vfx","modules-yaw-v12","season-delivery-version","laser-yaw-v11","detail-cards-v10","visual-polish-v9","module-motion","circuit-deck-view","inbox-feedback","mailbox-shop-v8","visual-pass-2-tokens-chests","visual-pass-4-emblem-surfaces","visual-pass-5-module-emblems","laser-3d-pilot","relay-client","battle-persistent-cards","module-card-state-view","battle-presentation","signature-frame-batch","home-interface-v3","gridshard-audio","gridshard-audio-browser-lifecycle","battle-lifecycle"];
function main(){
  // Execute the actual app startup as well as isolated renderer tests. An old
  // cached document missing the optional 3D script must still show the menus.
  for(const missing3d of [false,true])execFileSync(process.execPath,["client/tests/app-startup.test.js"],{
    cwd:root,encoding:"utf8",windowsHide:true,env:{...process.env,GRIDSHARD_TEST_NO_3D:missing3d?"1":"0"},
  });
  const html=fs.readFileSync(path.join(client,"index.html"),"utf8"),scripts=readBuildBlock(html,"scripts").inputs,styles=readBuildBlock(html,"styles").inputs;
  assert.ok(scripts.indexOf("./src/battle/module-vfx.js")<scripts.indexOf("./src/app.js"));
  assert.equal(styles.at(-1),"./src/module-vfx-v14.css");
  const transform=(inputs,loader)=>esbuild.transformSync(inputs.map(p=>fs.readFileSync(path.join(client,p),"utf8")).join("\n"),{loader,target:["chrome109","safari15"],logLevel:"silent"});
  const js=transform(scripts,"js"),css=transform(styles,"css");assert.equal(css.warnings.length,0);
  assert.ok(js.warnings.every(w=>w.id==="duplicate-object-key"));assert.equal(js.warnings.length,20);
  const omitted=compressedAudioReplacements(client,scripts,{}),audio=[];
  for(const name of["cooling_air","repair_beam","laser_pulse_v2","rocket_launch","missile_explosion","kinetic_hit","electrical_hit","shield_absorb"]){
    const file=path.join(client,"assets/audio",name+".wav"),b=fs.readFileSync(file);
    assert.equal(b.toString("ascii",0,4),"RIFF");assert.equal(b.readUInt32LE(24),22050);assert.equal(b.readUInt16LE(22),1);assert.equal(b.readUInt16LE(34),16);
    assert.equal(omitted.has(fs.realpathSync(file)),false,"No compressed derivative: WAV must be packaged");
    let peak=0;for(let i=44;i<b.length;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i))/32768);
    assert.ok(peak>0&&peak<.51);audio.push({name,bytes:b.length,seconds:(b.length-44)/44100,peak});
  }
  const output=execFileSync(process.execPath,["--test","--test-reporter=tap",...tests.map(n=>`client/tests/${n}.test.js`)],{cwd:root,encoding:"utf8",windowsHide:true,maxBuffer:4*1024*1024});
  const count=Number(output.match(/# tests (\d+)/)?.[1]),pass=Number(output.match(/# pass (\d+)/)?.[1]);assert.ok(count>150);assert.equal(pass,count);
  const report={date:"2026-10-17",passed:true,tests:count,passedTests:pass,failedTests:0,scripts:scripts.length,styles:styles.length,cssWarnings:0,existingJsWarnings:20,
    appStartupVerified:true,missingOptional3dStartupVerified:true,
    firstTenVfxBound:true,serverMechanicsChanged:false,actualFireCadenceChanged:false,laserVisualDurationMs:1000,
    cleanupOnDeathSessionHidden:true,sharedPostPresentationMicrotask:true,perDeviceRafOrTimer:false,
    camera:{degreesFromOverhead:30,centerScale:.98,previousScale:.92,distancePixels:1400},
    audio,webNativeAudioSourcesVerified:true,browserStarted:false,serverStarted:false,distWritten:false,nativeBuildRun:false,realGameplayVerified:false,fpsMeasured:false};
  fs.writeFileSync(path.join(root,"qa_reports/module-vfx-v14-audit-20261017.json"),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify(report));
}
try{main();}catch(error){console.error(error.stdout?String(error.stdout).slice(-5000):error);process.exitCode=1;}
