"use strict";
// Static review only: render the same meshes used by the shared battle canvas.
const fs=require("node:fs"),path=require("node:path");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE||"sharp");
const {triangles,render}=require("./build-targeting-3d-pilot.cjs");
const {laserMesh,transformVertex,SPECS}=require("../client/src/battle/laser-3d-pilot.js");
const out=path.resolve(__dirname,"../artifacts/real3d-all43-20261018");
const names={laser:"Lazer",pulse_cannon:"Darbe Topu",missile_launcher:"Füze Fırlatıcı",cooler:"Soğutucu",repair:"Onarım",emp:"EMP",shield:"Kalkan",battery:"Batarya",amplifier:"Güçlendirici",armor:"Sönümleyici"};
async function main(){
  fs.mkdirSync(out,{recursive:true});const layers=[],report=[];
  const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
  for(const [index,id]of Object.keys(SPECS).entries()){
    const mesh=laserMesh(id),yaw=SPECS[id].fixed?-.5:-.65;
    triangles.length=0;
    for(let i=0;i<mesh.length;i+=30){
      const part=mesh[i+9],v=[0,10,20].map(k=>{const p=transformVertex(Array.from(mesh.slice(i+k,i+k+3)),SPECS[id].fixed?1:part,yaw);p[1]+=.85;return p;});
      const n=transformVertex(Array.from(mesh.slice(i+3,i+6)),SPECS[id].fixed?1:part,yaw);
      triangles.push({v,n,c:Array.from(mesh.slice(i+6,i+9)).map(linear),part:0});
    }
    const input=await sharp(await render(0,640)).resize(300,300).png().toBuffer();
    await sharp(input).webp({quality:92}).toFile(path.join(out,id+"-review.webp"));
    layers.push({input,left:index%5*300,top:50+Math.floor(index/5)*340});
    const label=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="40"><text x="150" y="25" text-anchor="middle" fill="#effbff" font-family="Arial" font-size="17">${names[id]||id}</text></svg>`);
    layers.push({input:label,left:index%5*300,top:350+Math.floor(index/5)*340});
    report.push({id,triangles:mesh.length/30,bufferBytes:mesh.byteLength,rotation:SPECS[id].fixed?"fixed chassis":SPECS[id].limit?"180 degrees":"360 degrees"});
  }
  layers.push({input:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1500" height="50"><text x="750" y="32" text-anchor="middle" fill="#71efce" font-family="Arial" font-size="24">36 MODÜL + 7 ÇEKİRDEK · GERÇEK 3B · STATİK MODEL İNCELEMESİ</text></svg>'),left:0,top:0});
  await sharp({create:{width:1500,height:50+Math.ceil(Object.keys(SPECS).length/5)*340,channels:4,background:"#102531"}}).composite(layers).webp({quality:92}).toFile(path.join(out,"devices-review.webp"));
  fs.writeFileSync(path.join(out,"report.json"),JSON.stringify({reviewOnly:true,noDirectionAtlases:true,models:report},null,2));
  console.log(JSON.stringify(report));
}
main().catch(e=>{console.error(e);process.exitCode=1});
