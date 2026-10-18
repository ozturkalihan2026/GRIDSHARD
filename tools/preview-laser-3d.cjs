"use strict";
// Rasterize the actual runtime mesh for review, without opening the game.
const fs=require("node:fs"),path=require("node:path");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE||"sharp");
const {triangles,render}=require("./build-targeting-3d-pilot.cjs");
const {laserMesh,transformVertex}=require("../client/src/battle/laser-3d-pilot.js");
const out=path.resolve(__dirname,"../artifacts/visual-refresh-pack08b-20261018/laser-3d-pilot");
async function main(){
  fs.mkdirSync(out,{recursive:true});const mesh=laserMesh(),layers=[];
  const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
  for(const [index,yaw] of [Math.PI*.75,Math.PI*.25].entries()){
    triangles.length=0;
    for(let i=0;i<mesh.length;i+=30){
      const part=mesh[i+9],v=[0,10,20].map(k=>{const p=transformVertex(Array.from(mesh.slice(i+k,i+k+3)),part,yaw);p[1]+=.85;return p;});
      const n=transformVertex(Array.from(mesh.slice(i+3,i+6)),part,yaw);
      triangles.push({v,n,c:Array.from(mesh.slice(i+6,i+9)).map(linear),part:0});
    }
    const input=await sharp(await render(0,840)).resize(420,420).png().toBuffer();
    layers.push({input,left:index*420,top:40});
  }
  const label=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="840" height="55"><text x="420" y="30" text-anchor="middle" fill="#eefaff" font-family="Arial" font-size="21">LAZER · GERÇEK 3B · Oyuncu / Rakip yönü</text></svg>');
  layers.push({input:label,left:0,top:0});
  await sharp({create:{width:840,height:460,channels:4,background:"#0d2431"}}).composite(layers).webp({quality:92}).toFile(path.join(out,"laser-preview.webp"));
  console.log(JSON.stringify({triangles:mesh.length/30,bytes:mesh.byteLength,preview:path.join(out,"laser-preview.webp"),runtimeSource:"client/src/battle/laser-3d-pilot.js",directionsProduced:0}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
