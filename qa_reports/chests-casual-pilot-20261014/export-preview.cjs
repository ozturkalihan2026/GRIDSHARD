// Technical preview derivatives only, no edits to the generated PNG masters.
const path=require('node:path');
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE || 'sharp');
(async()=>{
  for(const tier of ['bronze','silver','gold','diamond']){
    const source=path.join(__dirname,tier+'.png');
    if(!(await sharp(source).metadata()).hasAlpha) throw new Error(tier+': missing alpha');
    const result=await sharp(source).resize(256,256,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({lossless:true,effort:6}).toFile(path.join(__dirname,tier+'.webp'));
    console.log(tier+': '+result.size+' bytes');
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
