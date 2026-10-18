"use strict";
// Generated art is only resized/packed here; originals and alpha are retained.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE||'sharp');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts/visual-refresh-pack08c-20261018');
const record=JSON.parse(fs.readFileSync(path.join(root,'docs/GORSEL_DONUSUM_PAKET08C_PROMPTLAR_20261018.json'),'utf8'));
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
async function main(){
 fs.mkdirSync(path.join(out,'masters'),{recursive:true});
 const ready=record.assets.filter(a=>a.source&&fs.existsSync(a.source)),report=[];
 for(const a of ready){
  const master=path.join(out,'masters',a.id+'.png'),dest=path.join(out,a.id+'.webp');
  fs.copyFileSync(a.source,master);const stats=await sharp(master).stats();
  assert.equal(stats.channels.length,4,a.id+' alpha');assert.equal(stats.channels[3].min,0,a.id+' transparent');
  await sharp(master).trim({background:'#00000000',threshold:8}).resize(352,352,{fit:'contain',background:'#00000000'}).extend({top:16,bottom:16,left:16,right:16,background:'#00000000'}).webp({quality:90,alphaQuality:100,effort:6}).toFile(dest);
  report.push({id:a.id,bytes:fs.statSync(dest).size,alpha:true});
 }
 for(const [kind,assets]of[['modules',ready.filter(a=>a.category!=='çekirdek')],['cores',ready.filter(a=>a.category==='çekirdek')]]){
  if(!assets.length)continue;
  const cols=4,width=1200,height=Math.ceil(assets.length/cols)*330,layers=[];
  for(let i=0;i<assets.length;i++){
   const a=assets[i],x=i%cols*300,y=Math.floor(i/cols)*330;
   layers.push({input:await sharp(path.join(out,a.id+'.webp')).resize(260,260).png().toBuffer(),left:x+20,top:y});
   layers.push({input:Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="70"><text x="150" y="26" fill="#edfcff" text-anchor="middle" font-family="Arial" font-size="18">${esc(a.name)}</text><text x="150" y="48" fill="#88b5c8" text-anchor="middle" font-family="Arial" font-size="12">${a.id}</text></svg>`),left:x,top:y+260});
  }
  await sharp({create:{width,height,channels:4,background:'#102a3b'}}).composite(layers).webp({quality:92}).toFile(path.join(out,kind+'-preview.webp'));
 }
 fs.writeFileSync(path.join(out,'asset-checks.json'),JSON.stringify({count:ready.length,expected:23,totalWebpBytes:report.reduce((n,a)=>n+a.bytes,0),files:report,runtimeConnected:false},null,2));
 console.log(JSON.stringify({count:ready.length,out}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
