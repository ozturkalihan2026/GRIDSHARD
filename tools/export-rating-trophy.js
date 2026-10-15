"use strict";
// Technical alpha-preserving export only; the approved Imagegen master is unchanged.
const path=require("node:path");
const fs=require("node:fs");
const {resolveArtMaster}=require("./resolve-art-master.js");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE || "sharp");
const root=path.resolve(__dirname,"..");
const input=resolveArtMaster("qa_reports/rating-trophy-pilot-20261015/gold-rating-trophy-v2.png");
const directory=path.join(root,"client/assets/ui/rating-trophy-v1");
(async()=>{
  if(!(await sharp(input).metadata()).hasAlpha) throw new Error("Transparent trophy master required");
  fs.mkdirSync(directory,{recursive:true});
  const output=path.join(directory,"rating-trophy.webp");
  const result=await sharp(input).resize(128,128,{fit:"contain",background:{r:0,g:0,b:0,alpha:0}})
    .webp({lossless:true,effort:6}).toFile(output);
  if(!(await sharp(output).metadata()).hasAlpha) throw new Error("Export lost alpha");
  console.log(`Rating trophy: ${result.width}×${result.height}, ${result.size} bytes, lossless WebP + alpha`);
})().catch(error=>{console.error(error);process.exitCode=1;});
