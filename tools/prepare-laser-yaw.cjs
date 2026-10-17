"use strict";
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE||"sharp");
const root=path.resolve(__dirname,".."),spec=JSON.parse(fs.readFileSync(path.join(root,"docs/LAZER_360_DENEYIM_PROMPTLARI_20261016.json"),"utf8"));
async function main(){
  const outputs=[];
  for(const asset of spec.assets){
    const dir=path.join(root,"client/assets/ui",asset.id==="experience"?"experience-v1":"laser-yaw-v1");fs.mkdirSync(dir,{recursive:true});
    const id=asset.id.replace("laser-",""),dest=path.join(dir,id+".webp");
    const meta=await sharp(asset.source).metadata();assert.ok(meta.hasAlpha);assert.equal(meta.width,meta.height);
    let image=sharp(asset.source);
    if(asset.id==="experience")image=image.trim({threshold:4}).resize(176,176,{fit:"contain",background:"#00000000"}).extend({left:8,right:8,top:8,bottom:8,background:"#00000000"});
    else {
      // Registration, not repainting: uniform resize and transparent padding.
      // The measured rotation bearing is aligned to the canonical 50/50 pivot.
      const r=spec.registration[id];
      image=image.resize(r.resize,r.resize).extend({left:r.left,top:r.top,right:r.size-r.resize-r.left,bottom:r.size-r.resize-r.top,background:"#00000000"});
    }
    const buffer=await image.webp({quality:92,alphaQuality:100,effort:6}).toBuffer();fs.writeFileSync(dest,buffer);
    const m=await sharp(buffer).metadata(),s=await sharp(buffer).stats();assert.equal(s.channels[3].min,0);assert.equal(s.channels[3].max,255);
    outputs.push({id,path:path.relative(root,dest).replaceAll('\\','/'),bytes:buffer.length,width:m.width,height:m.height,alpha:true});
  }
  const folder=path.join(root,"artifacts/laser-yaw-v11-20261016");fs.mkdirSync(folder,{recursive:true});
  const layers=[],head=path.join(root,"client/assets/ui/laser-yaw-v1/head.webp"),base=path.join(root,"client/assets/ui/laser-yaw-v1/base.webp");
  const angles=[-90,-45,0,45,90,135,180,225];
  for(let i=0;i<angles.length;i++){
    const angle=angles[i],x=20+(i%4)*170,y=70+Math.floor(i/4)*185,cx=x+80,cy=y+70,rad=angle*Math.PI/180;
    layers.push({input:await sharp(base).resize(116,116).png().toBuffer(),left:cx-58,top:cy-58});
    const rotated=await sharp(head).resize(116,116).rotate(angle,{background:"#00000000"}).png().toBuffer({resolveWithObject:true});
    layers.push({input:rotated.data,left:Math.round(cx-rotated.info.width/2),top:Math.round(cy-rotated.info.height/2)});
    const tip={x:cx+46.4*Math.cos(rad),y:cy+46.4*Math.sin(rad)},end={x:cx+72*Math.cos(rad),y:cy+72*Math.sin(rad)};
    layers.push({input:Buffer.from(`<svg width="720" height="450"><path d="M${tip.x} ${tip.y} L${end.x} ${end.y}" stroke="#ff273d" stroke-width="3"/><text x="${cx}" y="${y+160}" text-anchor="middle" fill="#d8eff6" font-family="Arial" font-size="14">${angle}°</text></svg>`),left:0,top:0});
  }
  layers.push({input:Buffer.from('<svg width="720" height="55"><text x="360" y="26" text-anchor="middle" fill="#82eddb" font-family="Arial" font-size="19">LAZER · SABİT TABAN / 360° BAŞLIK</text><text x="360" y="47" text-anchor="middle" fill="#9ebdcd" font-family="Arial" font-size="12">Asset yön önizlemesi · gerçek oyun ekran görüntüsü değildir</text></svg>'),left:0,top:0});
  const preview=path.join(folder,"laser-directions-preview.webp");
  await sharp({create:{width:720,height:450,channels:4,background:"#0b1d2b"}}).composite(layers).webp({quality:93}).toFile(preview);
  const report={mode:spec.mode,assets:outputs,totalBytes:outputs.reduce((n,f)=>n+f.bytes,0),preview,browserStarted:false,serverStarted:false,realGameplayVerified:false};
  fs.writeFileSync(path.join(root,"qa_reports/laser-yaw-v11-assets-20261016.json"),JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify(report));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
