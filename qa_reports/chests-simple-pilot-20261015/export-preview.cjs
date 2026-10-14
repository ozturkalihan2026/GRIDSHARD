const path=require('node:path');
const sharp=require(process.env.GRIDSHARD_SHARP_MODULE || 'sharp');
(async()=>{
  const input=sharp(path.join(__dirname,'gold.png'));
  const metadata=await input.metadata();
  if(!metadata.hasAlpha) throw new Error('Transparent source required');
  const result=await input.resize(256,256,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({lossless:true,effort:6}).toFile(path.join(__dirname,'gold.webp'));
  const alpha=(await sharp(path.join(__dirname,'gold.webp')).stats()).channels[3];
  console.log({sourceWidth:metadata.width,sourceHeight:metadata.height,width:result.width,height:result.height,bytes:result.size,alphaMin:alpha.min,alphaMax:alpha.max});
})().catch(error=>{console.error(error);process.exitCode=1;});
