"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE||"sharp"),{readBuildBlock}=require("./build-client.js");
const root=path.resolve(__dirname,".."),dir=path.join(root,"client/assets/ui/modules-yaw-v2");
const ids=["shield","battery","amplifier","emp","repair","armor","cooler","pulse_cannon","missile_launcher","base"];
async function main(){
  const html=fs.readFileSync(path.join(root,"client/index.html"),"utf8"),styles=readBuildBlock(html,"styles").inputs;
  assert.ok(styles.includes("./src/modules-yaw-v12.css"));
  assert.deepEqual(fs.readdirSync(dir).sort(),ids.map(id=>id+".webp").sort());
  const hashes=new Set(),records=[];
  for(const id of ids){
    assert.equal(html.split(`./assets/ui/modules-yaw-v2/${id}.webp`).length-1,0,"Archived shallow rotor art must not ship in current packages");
    const b=fs.readFileSync(path.join(dir,id+".webp")),meta=await sharp(b).metadata(),rgba=await sharp(b).ensureAlpha().raw().toBuffer();
    assert.equal(meta.width,256);assert.equal(meta.height,256);assert.equal(meta.hasAlpha,true);
    const quadrants=[0,0,0,0];let radius=0,minAlpha=255,maxAlpha=0;
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){
      const a=rgba[(y*256+x)*4+3];minAlpha=Math.min(minAlpha,a);maxAlpha=Math.max(maxAlpha,a);
      if(a>32){quadrants[(y>=128?2:0)+(x>=128?1:0)]++;radius=Math.max(radius,Math.hypot(x-128,y-128));}
    }
    assert.equal(minAlpha,0);assert.equal(maxAlpha,255);assert.ok(radius<127);
    assert.ok(quadrants.every(n=>n>=64),`${id}: cropped registration`);
    hashes.add(crypto.createHash("sha256").update(b).digest("hex"));
    records.push({id,bytes:b.length,alpha:true,radius,quadrants});
  }
  assert.equal(hashes.size,10);
  const report={passed:true,date:"2026-10-17",legacyAssetLibraryOnly:true,runtime:false,supersededBy:"module-camera-v13-audit-20261017.json",cameraDegreesFromOverhead:30,renderer:"superseded shallow layers",true3D:false,
    yawSupportedDevices:10,newFiles:10,newBytes:records.reduce((n,r)=>n+r.bytes,0),registeredAndUnclipped:true,webNativeAllowlist:false,
    browserStarted:false,serverRestarted:false,realGameplayVerified:false,fpsMeasured:false,files:records};
  fs.writeFileSync(path.join(root,"qa_reports/modules-yaw-v12-audit-20261017.json"),JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
