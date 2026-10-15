"use strict";
const path=require("node:path");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE || "sharp");
const {resolveArtMaster}=require("./resolve-art-master.js");
const directory=path.resolve(__dirname,"../client/assets/ui/chests-casual-v2");
// Technical-only export: do not alter or split Imagegen artwork.
(async()=>{
  let total=0;
  for(const tier of ["bronze","silver","gold","diamond"]){
    for(const [source,suffix,size] of [[tier,"",256],[tier,"-reveal",512],[tier+"-open","-open",512]]){
      const file=resolveArtMaster(`client/assets/ui/chests-casual-v2/${source}.png`);
      if(!(await sharp(file).metadata()).hasAlpha) throw new Error(source+": alpha required");
      const result=await sharp(file).resize(size,size,{fit:"contain",background:{r:0,g:0,b:0,alpha:0}}).webp({lossless:true,effort:6}).toFile(path.join(directory,tier+suffix+".webp"));
      total+=result.size;
      console.log(`${tier}${suffix}: ${size}×${size}, ${result.size} bytes`);
    }
  }
  console.log(`Total: ${total} bytes`);
})().catch(error=>{console.error(error);process.exitCode=1;});
