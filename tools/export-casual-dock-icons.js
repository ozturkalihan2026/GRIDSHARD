"use strict";
// Technical format export only. Imagegen masters remain unchanged and retain alpha.
const path=require("node:path");
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE || "sharp");
const {resolveArtMaster}=require("./resolve-art-master.js");
const directory=path.resolve(__dirname,"../client/assets/ui/dock-casual-v1");
(async()=>{
  let total=0;
  for(const name of ["shop-chamfer-v2","cards","battle-swords-v2","team","events"]){
    const source=resolveArtMaster(`client/assets/ui/dock-casual-v1/${name}.png`);
    if(!(await sharp(source).metadata()).hasAlpha) throw new Error(`${name}: transparent master required`);
    const result=await sharp(source).resize(256,256,{fit:"contain",background:{r:0,g:0,b:0,alpha:0}})
      .webp({lossless:true,effort:6}).toFile(path.join(directory,`${name}.webp`));
    total+=result.size;
    console.log(`${name}: ${result.width}×${result.height}, ${result.size} bytes`);
  }
  console.log(`Total: ${total} bytes`);
})().catch(error=>{console.error(error);process.exitCode=1;});
