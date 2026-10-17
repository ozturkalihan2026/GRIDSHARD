"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),vm=require("node:vm"),crypto=require("node:crypto");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE||"sharp");
const root=path.resolve(__dirname,".."),html=fs.readFileSync(path.join(root,"client/index.html"),"utf8");
const ids=["laser","shield","battery","amplifier","emp","repair","armor","cooler","pulse_cannon","missile_launcher"];
async function main(){
  const sandbox={};vm.runInNewContext(fs.readFileSync(path.join(root,"client/src/module-view-data.js"),"utf8"),sandbox);
  const registrations=sandbox.GridshardModuleViewData,files=[];
  for(const id of ids){
    const relative=`./assets/ui/modules-views-v3/${id}.webp`;
    assert.equal(html.split(relative).length-1,1,"Web/native allowlist entry");
    const bytes=fs.readFileSync(path.join(root,"client",relative)),meta=await sharp(bytes).metadata();
    assert.equal(meta.width,512);assert.equal(meta.height,256);assert.equal(meta.hasAlpha,true);
    const hashes=new Set();
    for(let i=0;i<8;i++){
      const frame=await sharp(bytes).extract({left:(i%4)*128,top:Math.floor(i/4)*128,width:128,height:128}).ensureAlpha().raw().toBuffer();
      let pixels=0,edgePixels=0;
      for(let y=0;y<128;y++)for(let x=0;x<128;x++)if(frame[(y*128+x)*4+3]>128){pixels++;if(x<3||y<3||x>124||y>124)edgePixels++;}
      assert.ok(pixels>800,id+": empty frame");assert.equal(edgePixels,0,id+": clipped frame");
      hashes.add(crypto.createHash("sha256").update(frame).digest("hex"));
      const p=registrations[id].emitters[i];assert.ok(p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1);
      if(registrations[id].pairs)for(const p of registrations[id].pairs[i])assert.ok(p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1,id+": coil/eye socket in frame");
    }
    assert.equal(hashes.size,8,id+": distinct views");files.push({id,bytes:bytes.length,frames:8,unclipped:true});
  }
  const total=files.reduce((n,f)=>n+f.bytes,0);assert.ok(total<600000);
  assert.ok(html.indexOf('src="./src/module-view-data.js"')<html.indexOf('src="./src/module-device-art.js"'));
  const css=fs.readFileSync(path.join(root,"client/src/modules-yaw-v12.css"),"utf8");
  assert.match(css,/--gs-camera-tilt:30deg/);assert.match(css,/--gs-camera-counter:-30deg/);
  assert.doesNotMatch(css,/rotateZ|module-device-side|\.board \{ transform:none/);
  const report={date:"2026-10-17",passed:true,renderer:"camera-facing upright eight-view impostors",boardCameraDegreesFromOverhead:30,centerScale:.98,cameraDistancePixels:1400,
    sharedBoardCameraAxis:true,continuousTargetMath:true,illustratedViewCount:8,illustratedViewStepDegrees:45,true3D:false,
    eightAnglesAreNotContinuousVolume:true,browserStarted:false,realGameplayVerified:false,fpsMeasured:false,files,totalBytes:total};
  fs.writeFileSync(path.join(root,"qa_reports/module-camera-v13-audit-20261017.json"),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
