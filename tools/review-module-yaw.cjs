"use strict";
// Static inspection of packaged paintings. Does not launch the game/browser.
const fs=require("node:fs"),path=require("node:path");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE||"sharp");
const layers=require("../client/src/module-layer-data.js");
const id=process.argv[2],root=path.resolve(__dirname,".."),out=process.argv[3];
if(!/^[a-z][a-z0-9_]*$/.test(id||"")||!out)throw new Error("review-module-yaw.cjs <id> <output.webp>");
(async()=>{
  if(id==="overview"){
    const ids=["virus","quantum_repeater","nano_medic","ion_spear","quantum_cannon","phoenix_repair","overclock_unit","disruptor","singularity_projector","swarm_fabricator","plasma_mortar","emp"],pieces=[];
    for(const[row,device]of ids.entries())for(const[col,key]of["reference","y00","y04","y12"].entries()){
      const relative=key==="reference"?`assets/ui/modules-physical-${device==="emp"?"v1":"v2"}/${device}.webp`:layers[device].heads[key].src;
      pieces.push({input:await sharp(path.join(root,"client",relative)).resize(180,180,{fit:"contain"}).png().toBuffer(),left:col*200+10,top:row*205+25});
      pieces.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="25"><text x="100" y="18" text-anchor="middle" font-family="Arial" font-size="12" fill="#e2f7ff">${device} · ${key}</text></svg>`),left:col*200,top:row*205});
    }
    const destination=path.resolve(out);fs.mkdirSync(path.dirname(destination),{recursive:true});
    await sharp({create:{width:800,height:ids.length*205,channels:4,background:"#132a36"}}).composite(pieces).webp({quality:90}).toFile(destination);
    console.log(destination);return;
  }
  const entry=layers[id];if(!entry?.heads)throw new Error("Yön kaydı bulunamadı: "+id);
  const pieces=[],labels=["E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW","N","NNE","NE","ENE"];
  for(let i=0;i<16;i++){
    const part=entry.heads["y"+String(i).padStart(2,"0")];if(!part)throw new Error("Eksik kare: "+i);
    const file=path.join(root,"client",part.src),x=i%4*220,y=Math.floor(i/4)*240;
    const image=await sharp(file).resize(210,210).png().toBuffer();pieces.push({input:image,left:x+5,top:y+25});
    pieces.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="220" height="25"><text x="110" y="19" text-anchor="middle" font-family="Arial" font-size="15" fill="#e2f7ff">${id} · ${i} ${labels[i]}</text></svg>`),left:x,top:y});
    if(![part.left,part.top,part.size,part.emitter.x,part.emitter.y].every(Number.isFinite))throw new Error("Geçersiz ölçüm: "+i);
  }
  const destination=path.resolve(out);fs.mkdirSync(path.dirname(destination),{recursive:true});
  await sharp({create:{width:880,height:960,channels:4,background:"#132a36"}}).composite(pieces).webp({quality:92}).toFile(destination);
  console.log(destination);
})().catch(e=>{console.error(e);process.exitCode=1;});
