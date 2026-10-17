"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE||"sharp");
const root=path.resolve(__dirname,".."),manifestPath=path.join(root,"docs/MODUL_YAW_V12_PROMPTLARI_20261017.json");
async function main(){
  const spec=JSON.parse(fs.readFileSync(manifestPath,"utf8")),dir=path.join(root,"client/assets/ui/modules-yaw-v2");fs.mkdirSync(dir,{recursive:true});
  const records=[];
  for(const asset of spec.assets){
    const meta=await sharp(asset.source).metadata();assert.ok(meta.hasAlpha);
    const pivot=asset.registration?.pivot || [128,128];
    const square=await sharp(asset.source).resize(256,256).ensureAlpha().raw().toBuffer();
    let radius=1;
    for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(square[(y*256+x)*4+3]>32)radius=Math.max(radius,Math.hypot(x-pivot[0],y-pivot[1]));
    const desired=asset.id==="base"?.38:.43;
    const muzzle=asset.registration?.muzzle;
    const scale=muzzle ? .4*256/(muzzle[0]-pivot[0]) : Math.min(1,desired*256/radius);
    assert.ok(scale>0 && radius*scale<127,`${asset.id}: rotation must remain inside cell`);
    const size=Math.round(256*scale),scaled=await sharp(asset.source).resize(size,size).png().toBuffer();
    const left=256-Math.round(pivot[0]*size/256),top=256-Math.round(pivot[1]*size/256);
    // libvips applies extraction before compositing within one pipeline.
    // Materialize the registration canvas first; otherwise the art is clipped.
    const registered=await sharp({create:{width:512,height:512,channels:4,background:"#00000000"}}).composite([{input:scaled,left,top}]).png().toBuffer();
    const output=await sharp(registered).extract({left:128,top:128,width:256,height:256}).webp({quality:92,alphaQuality:100,effort:6}).toBuffer();
    const file=path.join(dir,asset.id+".webp");fs.writeFileSync(file,output);
    const stats=await sharp(output).stats();assert.equal(stats.channels[3].min,0);assert.equal(stats.channels[3].max,255);
    const decoded=await sharp(output).ensureAlpha().raw().toBuffer(),quadrants=[0,0,0,0];
    for(let y=0;y<256;y++)for(let x=0;x<256;x++)if(decoded[(y*256+x)*4+3]>32)quadrants[(y>=128?2:0)+(x>=128?1:0)]++;
    assert.ok(quadrants.every(n=>n>=64),`${asset.id}: registration/cropping must preserve every quadrant`);
    records.push({id:asset.id,path:path.relative(root,file).replaceAll('\\','/'),bytes:output.length,width:256,height:256,alpha:true,registration:{pivot,sourceMuzzle:muzzle||null,scale:size/256,rotatedRadiusPixels:radius*size/256}});
  }
  const previewDir=path.join(root,"artifacts/modules-yaw-v12-20261017");fs.mkdirSync(previewDir,{recursive:true});
  const ids=["laser","shield","battery","amplifier","emp","repair","armor","cooler","pulse_cannon","missile_launcher"];
  const names=["Lazer","Kalkan","Batarya","Güçlendirici","EMP","Onarım","Sönümleyici","Soğutucu","Darbe Topu","Füze Fırlatıcı"];
  const layers=[],tilt=Math.PI/6;
  const projectTexture=async(file,angle,shade=1)=>{
    const b=await sharp(file).resize(116,116).rotate(angle,{background:"#00000000"}).modulate({brightness:shade}).png().toBuffer({resolveWithObject:true});
    const h=Math.round(b.info.height*Math.cos(tilt));
    return sharp(b.data).resize(b.info.width,h).png().toBuffer({resolveWithObject:true});
  };
  for(let i=0;i<ids.length;i++){
    const id=ids[i],cx=84+(i%5)*168,cy=120+Math.floor(i/5)*190;
    const base=path.join(root,"client/assets/ui",id==="laser"?"laser-yaw-v1/base.webp":"modules-yaw-v2/base.webp");
    const head=path.join(root,"client/assets/ui",id==="laser"?"laser-yaw-v1/head.webp":`modules-yaw-v2/${id}.webp`);
    const b=await projectTexture(base,0);layers.push({input:b.data,left:Math.round(cx-b.info.width/2),top:Math.round(cy-b.info.height/2)});
    for(const depth of [0,3,6,9]){
      const h=await projectTexture(head,-35,depth===9?1:.72);
      layers.push({input:h.data,left:Math.round(cx-h.info.width/2),top:Math.round(cy-h.info.height/2-depth*Math.sin(tilt))});
    }
    layers.push({input:Buffer.from(`<svg width="168" height="32"><text x="84" y="22" text-anchor="middle" fill="#e2f4fa" font-family="Arial" font-size="15">${names[i]}</text></svg>`),left:(i%5)*168,top:cy+65});
  }
  layers.push({input:Buffer.from('<svg width="840" height="60"><text x="420" y="26" text-anchor="middle" fill="#79e9d7" font-family="Arial" font-size="20">İLK 10 MODÜL · KATMANLI 2.5D / 30°</text><text x="420" y="49" text-anchor="middle" fill="#99bacb" font-family="Arial" font-size="12">Varlık/kamera önizlemesi · gerçek oyun ekran görüntüsü değildir</text></svg>'),left:0,top:0});
  const preview=path.join(previewDir,"modules-30deg-preview.webp");
  await sharp({create:{width:840,height:420,channels:4,background:"#091c2c"}}).composite(layers).webp({quality:93}).toFile(preview);
  const report={date:"2026-10-17",mode:spec.mode,files:records,totalBytes:records.reduce((n,r)=>n+r.bytes,0),reusedLaser:true,preview,cameraDegrees:30,true3D:false,browserVerified:false};
  fs.writeFileSync(path.join(root,"qa_reports/modules-yaw-v12-assets-20261017.json"),JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
