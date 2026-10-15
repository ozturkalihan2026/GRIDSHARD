"use strict";

// Same technical-only workflow as dock icons: unchanged Imagegen PNG masters,
// small lossless WebP runtime derivatives, true alpha preserved.
const path=require("node:path");
const fs=require("node:fs");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE || "sharp");
const {resolveArtMaster}=require("./resolve-art-master.js");
const directory=path.resolve(__dirname,"../client/assets/ui/chests-painted-v1");

(async()=>{
  fs.mkdirSync(directory,{recursive:true});
  for(const tier of ["bronze","silver","gold","diamond"]){
    const source=resolveArtMaster(`client/assets/ui/chests-painted-v1/${tier}.png`);
    const metadata=await sharp(source).metadata();
    if(!metadata.hasAlpha) throw new Error(`${tier}: transparent master required`);
    const result=await sharp(source)
      .resize(256,256,{fit:"contain",background:{r:0,g:0,b:0,alpha:0}})
      .webp({lossless:true,effort:6})
      .toFile(path.join(directory,`${tier}.webp`));
    console.log(`${tier}: ${result.width}×${result.height}, ${result.size} bytes`);
  }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
