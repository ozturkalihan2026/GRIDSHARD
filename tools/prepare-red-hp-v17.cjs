"use strict";
// Mechanical alpha-preserving downscale only; the artwork is image_gen output.
const fs=require("node:fs"),path=require("node:path"),assert=require("node:assert/strict");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE||"sharp");
const root=path.resolve(__dirname,"..");
async function main(){
  const spec=JSON.parse(fs.readFileSync(path.join(root,"docs/HP_KIRMIZI_V17_PROMPT_20261017.json"),"utf8"));
  assert.ok((await sharp(spec.source).metadata()).hasAlpha,"Generated source needs true alpha");
  const buffer=await sharp(spec.source).trim({threshold:4}).resize(176,176,{fit:"contain",background:"#00000000"})
    .extend({top:8,bottom:8,left:8,right:8,background:"#00000000"}).webp({quality:90,alphaQuality:100,effort:6}).toBuffer();
  const meta=await sharp(buffer).metadata(),stats=await sharp(buffer).stats();
  assert.equal(meta.width,192);assert.equal(meta.height,192);assert.ok(meta.hasAlpha);
  assert.equal(stats.channels[3].min,0);assert.equal(stats.channels[3].max,255);
  assert.ok(buffer.length<20000,"Runtime icon should stay small");
  fs.writeFileSync(path.join(root,spec.runtime),buffer);
  console.log(JSON.stringify({file:spec.runtime,bytes:buffer.length,width:192,height:192,trueAlpha:true,mode:spec.mode}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
