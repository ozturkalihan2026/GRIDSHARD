"use strict";
// Mechanical asset preparation only: preserve generated alpha/shape, downscale
// and encode. No painted replacement, runtime build, browser or server.
const fs=require("node:fs"), path=require("node:path"), assert=require("node:assert/strict");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE || "sharp");
const root=path.resolve(__dirname,".."), runtime=path.join(root,"client/assets/ui/detail-icons-v1");
const source=JSON.parse(fs.readFileSync(path.join(root,"docs/GORSEL_DONUSUM_BILGI_KARTLARI_PROMPTLARI_20261016.json"),"utf8"));
async function main(){
  fs.mkdirSync(runtime,{recursive:true});
  const records=[], layers=[];
  for(let i=0;i<source.assets.length;i++){
    const item=source.assets[i], metadata=await sharp(item.source).metadata();
    assert.ok(metadata.hasAlpha,`${item.id}: generator must provide real alpha`);
    const buffer=await sharp(item.source).trim({threshold:4}).resize(176,176,{fit:"contain",background:"#00000000"})
      .extend({top:8,bottom:8,left:8,right:8,background:"#00000000"}).webp({quality:90,alphaQuality:100,effort:6}).toBuffer();
    const target=path.join(runtime,`${item.id}.webp`);
    fs.writeFileSync(target,buffer);
    const stats=await sharp(buffer).stats(), decoded=await sharp(buffer).metadata();
    assert.equal(decoded.width,192);assert.equal(decoded.height,192);
    assert.equal(stats.channels[3].min,0);assert.equal(stats.channels[3].max,255);
    records.push({id:item.id,path:path.relative(root,target).replaceAll('\\','/'),bytes:buffer.length,width:192,height:192,alpha:true});
    const x=20+(i%5)*160,y=52+Math.floor(i/5)*210;
    layers.push({input:await sharp(buffer).resize(120,120).png().toBuffer(),left:x+20,top:y});
    const labels={core:"Çekirdek",team:"Takım",rarity:"Enderlik",hp:"Can",damage:"Hasar",cycle:"Aralık",energy:"Enerji",talent:"Yetenek",grid:"Sınıf",guard:"Savunma"};
    const label=Buffer.from(`<svg width="160" height="65"><text x="80" y="22" text-anchor="middle" fill="#e8f8ff" font-family="Arial" font-weight="bold" font-size="16">${labels[item.id]}</text><text x="80" y="46" text-anchor="middle" fill="#8ab6c7" font-family="Arial" font-size="12">24 px / 32 px</text></svg>`);
    layers.push({input:label,left:x,top:y+122});
    layers.push({input:await sharp(buffer).resize(24,24).png().toBuffer(),left:x+48,top:y+178});
    layers.push({input:await sharp(buffer).resize(32,32).png().toBuffer(),left:x+87,top:y+174});
  }
  const header=Buffer.from('<svg width="840" height="46"><text x="420" y="29" text-anchor="middle" fill="#79efdc" font-family="Arial" font-weight="bold" font-size="19">GRIDSHARD · BİLGİ KARTI İKONLARI</text></svg>');
  layers.push({input:header,left:0,top:0});
  const previewDir=path.join(root,"artifacts/visual-refresh-detail-cards-20261016");fs.mkdirSync(previewDir,{recursive:true});
  const preview=path.join(previewDir,"detail-icons-preview.webp");
  await sharp({create:{width:840,height:490,channels:4,background:"#0a1c2c"}}).composite(layers).webp({quality:92}).toFile(preview);
  const report={generatedWith:"built-in image_gen",totalBytes:records.reduce((n,a)=>n+a.bytes,0),assets:records,preview,browserStarted:false,serverStarted:false};
  fs.writeFileSync(path.join(root,"qa_reports/detail-icons-v10-20261016.json"),JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify(report));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
